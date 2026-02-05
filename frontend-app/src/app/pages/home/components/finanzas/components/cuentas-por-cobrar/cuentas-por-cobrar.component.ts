import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { DeudaService } from 'src/app/core/services/deuda.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { Deuda } from 'src/app/core/models/deuda';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline, fileTrayOutline, eyeOutline, chevronForwardOutline, closeOutline, personCircleOutline, walletOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { TransactionModalComponent } from '../../../caja/components/transaction-modal/transaction-modal.component';
import { AlertService } from 'src/app/shared/services/alert.service';
import { firstValueFrom } from 'rxjs';

interface ClienteDeudaSummary {
  clienteId: number;
  nombre: string;
  telefono: string;
  totalDeuda: number;
  deudas: Deuda[];
}

@Component({
  selector: 'app-cuentas-por-cobrar',
  templateUrl: './cuentas-por-cobrar.component.html',
  styleUrls: ['./cuentas-por-cobrar.component.scss'],
  standalone: false
})
export class CuentasPorCobrarComponent implements OnInit {
  deudas: Deuda[] = [];
  clientesConDeuda: ClienteDeudaSummary[] = [];
  filteredClientes: ClienteDeudaSummary[] = [];

  searchTerm: string = '';
  loading: boolean = false;

  // Modal state
  selectedCliente: ClienteDeudaSummary | null = null;
  isModalOpen: boolean = false;

  constructor(
    private deudaService: DeudaService,
    private cajaService: CajaService,
    private modalController: ModalController,
    private alertService: AlertService
  ) {
    addIcons({ searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline, fileTrayOutline, eyeOutline, chevronForwardOutline, closeOutline, personCircleOutline, walletOutline });
  }

  ngOnInit() {
    this.cargarDeudas();
  }

  cargarDeudas() {
    this.loading = true;
    // We fetch ALL pending debts to group them correctly
    this.deudaService.listarDeudas({ estado: 'PENDIENTE' })
      .subscribe({
        next: (data) => {
          this.deudas = data;
          this.agruparPorCliente();
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.mostrarToast('Error al cargar deudas', 'danger');
          this.loading = false;
        }
      });
  }

  agruparPorCliente() {
    const mapa = new Map<number, ClienteDeudaSummary>();

    this.deudas.forEach(deuda => {
      if (!deuda.cliente || !deuda.cliente.id) return;

      if (!mapa.has(deuda.cliente.id)) {
        mapa.set(deuda.cliente.id, {
          clienteId: deuda.cliente.id,
          nombre: deuda.cliente.nombre,
          telefono: deuda.cliente.telefono || '',
          totalDeuda: 0,
          deudas: []
        });
      }

      const entry = mapa.get(deuda.cliente.id)!;
      entry.totalDeuda += deuda.saldoPendiente;
      entry.deudas.push(deuda);
    });

    this.clientesConDeuda = Array.from(mapa.values());
    this.filterClientes();
  }

  onSearchInput(event: any) {
    this.searchTerm = event.target.value;
    this.filterClientes();
  }

  filterClientes() {
    if (!this.searchTerm) {
      this.filteredClientes = this.clientesConDeuda;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredClientes = this.clientesConDeuda.filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.telefono.includes(term)
    );
  }

  verDetalleCliente(cliente: ClienteDeudaSummary) {
    this.selectedCliente = cliente;
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.selectedCliente = null;
  }

  async registrarAbono(deuda: Deuda) {
    // Verificar caja abierta antes de permitir el abono
    const cajaAbierta = await this.verificarCajaAbierta();
    if (!cajaAbierta) {
      await this.alertService.alert(
        'Caja Cerrada',
        'No se pueden registrar abonos porque no hay una caja abierta.',
        'warning'
      );
      return;
    }

    const { value: metodo } = await this.alertService.fire({
      title: 'Seleccionar Método de Pago',
      text: `Abono a factura del ${new Date(deuda.fechaCreacion).toLocaleDateString()}`,
      input: 'select',
      inputOptions: {
        'EFECTIVO': 'Efectivo',
        'TRANSFERENCIA': 'Transferencia'
      },
      inputPlaceholder: 'Seleccione un método',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (metodo) {
      this.mostrarFormularioAbono(deuda, metodo);
    }
  }

  async mostrarFormularioAbono(deuda: Deuda, metodo: string) {
    const showCashFields = metodo === 'EFECTIVO';

    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: `Registrar Abono (${metodo})`,
        message: `Saldo pendiente: $${deuda.saldoPendiente.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        amountLabel: 'Monto a abonar',
        descriptionLabel: 'Observaciones',
        confirmText: 'Confirmar Abono',
        cancelText: 'Cancelar',
        showCashPaymentFields: showCashFields,
        amountReceivedLabel: 'Monto Recibido'
      }
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const monto = Number(data.monto);
      if (monto > deuda.saldoPendiente) {
        this.alertService.alert('Monto excedido', 'El monto a pagar no puede ser mayor al saldo pendiente de la deuda.', 'warning');
        return;
      }

      const montoRecibido = showCashFields ? Number(data.montoRecibido) : undefined;

      if (showCashFields && montoRecibido && montoRecibido > monto) {
        const cambio = montoRecibido - monto;
        await this.mostrarAlertaCambio(cambio);
      }

      this.procesarAbono(deuda.id, monto, data.descripcion, metodo, montoRecibido);
    }
  }

  async mostrarAlertaCambio(cambio: number) {
    const cambioFormateado = cambio.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    await this.alertService.alert(
      'Cambio a Entregar',
      `Por favor entregue el vuelto al cliente: $${cambioFormateado}`,
      'info'
    );
  }

  procesarAbono(deudaId: number, monto: number, nota: string, metodoPago: string, montoRecibido?: number) {
    this.alertService.showLoading('Registrando abono...', 'Por favor espere.');

    this.deudaService.registrarAbono(deudaId, {
      monto,
      montoRecibido,
      metodoPago,
      nota
    }).subscribe({
      next: () => {
        this.alertService.closeLoading();
        this.mostrarToast('Abono registrado exitosamente', 'success');
        this.cargarDeudas();
      },
      error: (err) => {
        this.alertService.closeLoading();
        console.error(err);
        const msg = err.error?.mensaje || 'Error al registrar abono';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  // ... helper methods ...
  async verificarCajaAbierta(): Promise<boolean> {
    this.alertService.showLoading('Verificando caja...', 'Comprobando estado actual.');
    return new Promise((resolve) => {
      this.cajaService.obtenerEstadoCaja().subscribe({
        next: (caja) => {
          this.alertService.closeLoading();
          resolve(caja && caja.estado === 'ABIERTA');
        },
        error: () => {
          this.alertService.closeLoading();
          resolve(false);
        }
      });
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    this.alertService.toast(mensaje, color === 'danger' ? 'error' : 'success');
  }

  async abonarGeneral(cliente: ClienteDeudaSummary) {
    // 1. Verificar caja abierta
    const cajaAbierta = await this.verificarCajaAbierta();
    if (!cajaAbierta) {
      await this.alertService.alert('Caja Cerrada', 'Debe abrir caja primero.', 'warning');
      return;
    }

    // 2. Seleccionar método de pago
    const { value: metodo } = await this.alertService.fire({
      title: 'Abono General',
      text: `Cliente: ${cliente.nombre}\nDeuda Total: $${cliente.totalDeuda.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      input: 'select',
      inputOptions: { 'EFECTIVO': 'Efectivo', 'TRANSFERENCIA': 'Transferencia' },
      inputPlaceholder: 'Seleccione método',
      showCancelButton: true,
      confirmButtonText: 'Continuar'
    });

    if (!metodo) return;

    // 3. Pedir monto total
    const showCashFields = metodo === 'EFECTIVO';
    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: `Abono General (${metodo})`,
        message: `Deuda Total: $${cliente.totalDeuda.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        amountLabel: 'Monto a abonar',
        descriptionLabel: 'Observaciones (opcional)',
        confirmText: 'Procesar Pagos',
        cancelText: 'Cancelar',
        showCashPaymentFields: showCashFields,
        amountReceivedLabel: 'Monto Recibido'
      }
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const montoAbonar = Number(data.monto);

      if (montoAbonar <= 0) {
        this.alertService.alert('Monto inválido', 'El monto debe ser mayor a 0', 'warning');
        return;
      }

      if (montoAbonar > cliente.totalDeuda) {
        // Opcional: Permitir abonar más? Generalmente no en "abono a deuda".
        // Pero dejemos que pague todo y sobre cambio si es efectivo.
        // Simplemente ajustamos el pago máximo a la deuda total.
      }

      const montoRecibido = showCashFields ? Number(data.montoRecibido) : undefined;

      // Alerta de cambio global
      if (showCashFields && montoRecibido && montoRecibido > montoAbonar) {
        await this.mostrarAlertaCambio(montoRecibido - montoAbonar);
      }

      await this.procesarAbonoGeneral(cliente, montoAbonar, metodo, data.descripcion, montoRecibido);
    }
  }

  async procesarAbonoGeneral(cliente: ClienteDeudaSummary, montoTotal: number, metodo: string, nota: string, montoRecibidoTotal?: number) {
    this.alertService.showLoading('Procesando pagos...', 'Aplicando abonos a múltiples facturas.');

    try {
      // Ordenar deudas por fecha (más antiguas primero)
      const deudasOrdenadas = [...cliente.deudas].sort((a, b) =>
        new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
      );

      let montoRestante = montoTotal;
      let pagosRealizados = 0;

      for (const deuda of deudasOrdenadas) {
        if (montoRestante <= 0) break;

        const saldoDeuda = deuda.saldoPendiente;
        const montoPagar = Math.min(saldoDeuda, montoRestante);

        const montoRecibidoParaTransaccion = (pagosRealizados === 0 && montoRecibidoTotal) ? montoRecibidoTotal : undefined;

        await firstValueFrom(this.deudaService.registrarAbono(deuda.id, {
          monto: montoPagar,
          metodoPago: metodo,
          nota: `Abono General: ${nota || ''}`,
          montoRecibido: montoRecibidoParaTransaccion
        }));

        montoRestante -= montoPagar;
        pagosRealizados++;
      }

      this.alertService.closeLoading();
      this.mostrarToast(`Se abonaron $${(montoTotal - montoRestante).toLocaleString('es-CO')} a ${pagosRealizados} facturas.`, 'success');
      this.cargarDeudas();
      this.cerrarModal();

    } catch (error: any) {
      console.error(error);
      this.alertService.closeLoading();
      const msg = error.error?.mensaje || 'Error al procesar algunos pagos. Por favor verifique.';
      this.mostrarToast(msg, 'danger');
      this.cargarDeudas();
    }
  }
}
