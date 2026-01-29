import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, LoadingController } from '@ionic/angular';
import { DeudaService } from 'src/app/core/services/deuda.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { Deuda } from 'src/app/core/models/deuda'; // Adjust path if needed
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline, fileTrayOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { TransactionModalComponent } from '../../../caja/components/transaction-modal/transaction-modal.component';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-cuentas-por-cobrar',
  templateUrl: './cuentas-por-cobrar.component.html',
  styleUrls: ['./cuentas-por-cobrar.component.scss'],
  standalone: false
})
export class CuentasPorCobrarComponent implements OnInit {
  deudas: Deuda[] = [];
  filteredDeudas: Deuda[] = [];
  searchTerm: string = '';
  filterEstado: string = 'PENDIENTE';
  loading: boolean = false;
  skeletonRows = [1, 2, 3, 4, 5];

  constructor(
    private deudaService: DeudaService,
    private cajaService: CajaService,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService
  ) {
    addIcons({ searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline, fileTrayOutline });
  }

  ngOnInit() {
    this.cargarDeudas();
  }

  cargarDeudas() {
    this.loading = true;
    this.deudaService.listarDeudas({ estado: this.filterEstado === 'TODOS' ? undefined : this.filterEstado })
    .subscribe({
      next: (data) => {
        this.deudas = data;
        this.filterDeudas();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al cargar deudas', 'danger');
        this.loading = false;
      }
    });
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchTerm = query;
    this.applyFilters();
  }

  onFilterChange(event: any) {
    this.filterEstado = event.detail.value;
    this.cargarDeudas();
  }

  applyFilters() {
    this.filterDeudas();
  }

  filterDeudas() {
    if (!this.searchTerm) {
      this.filteredDeudas = this.deudas;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredDeudas = this.deudas.filter(d => 
      d.cliente?.nombre.toLowerCase().includes(term) || 
      d.cliente?.cedula?.includes(term)
    );
  }

  async registrarAbono(deuda: Deuda) {
    // Verificar caja abierta antes de permitir el abono
    const cajaAbierta = await this.verificarCajaAbierta();
    if (!cajaAbierta) {
      await this.alertService.alert(
        'Caja Cerrada',
        'No se pueden registrar abonos porque no hay una caja abierta. Por favor abra la caja en la sección de Caja Diaria.',
        'warning'
      );
      return;
    }

    // Primero preguntar por el método de pago para una mejor experiencia
    const { value: metodo } = await this.alertService.fire({
      title: 'Seleccionar Método de Pago',
      text: `Abono para: ${deuda.cliente?.nombre}`,
      input: 'select',
      inputOptions: {
        'EFECTIVO': 'Efectivo',
        'TRANSFERENCIA': 'Transferencia'
      },
      inputPlaceholder: 'Seleccione un método',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        return !value && 'Debe seleccionar un método'
      }
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
        descriptionRequired: false,
        initialAmount: null,
        initialDescription: '',
        showCashPaymentFields: showCashFields,
        amountReceivedLabel: 'Monto Recibido (Cálculo de cambio)'
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const monto = Number(data.monto);
      if (!monto || monto <= 0) {
        this.mostrarToast('Monto inválido', 'warning');
        return;
      }
      if (monto > deuda.saldoPendiente) {
        this.mostrarToast('El monto excede el saldo pendiente', 'warning');
        return;
      }

      const montoRecibido = showCashFields ? Number(data.montoRecibido) : undefined;
      
      // Procesar abono (la alerta de cambio ya se mostró visualmente en el modal,
      // pero si queremos mantener la alerta nativa adicional al confirmar, la dejamos)
      if (showCashFields && montoRecibido && montoRecibido > monto) {
        // Opcional: Mostrar alerta final de cambio para confirmar que el cajero entregó el dinero
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
    this.deudaService.registrarAbono(deudaId, {
      monto,
      montoRecibido,
      metodoPago,
      nota
    }).subscribe({
      next: () => {
        this.mostrarToast('Abono registrado exitosamente', 'success');
        
        // Actualizar localmente inmediatamente para mejorar la UX
        const deudaIndex = this.deudas.findIndex(d => d.id === deudaId);
        if (deudaIndex !== -1) {
            const deuda = this.deudas[deudaIndex];
            deuda.saldoPendiente -= monto;
            
            // Asumimos que si el saldo es 0, el backend lo marcará como pagado
            if (deuda.saldoPendiente <= 0.01) {
                deuda.saldoPendiente = 0;
                deuda.estado = 'PAGADO';
            }

            // Si estamos filtrando por pendientes y ya se pagó, lo quitamos de la lista
            if (deuda.estado === 'PAGADO' && (this.filterEstado === 'PENDIENTE' || this.filterEstado === 'VENCIDO')) {
                this.deudas.splice(deudaIndex, 1);
            }
            
            // Actualizar la vista filtrada
            this.filterDeudas();
        }
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al registrar abono', 'danger');
      }
    });
  }

  async verificarCajaAbierta(): Promise<boolean> {
    const loading = await this.loadingController.create({
      message: 'Verificando caja...',
      duration: 3000
    });
    await loading.present();

    return new Promise((resolve) => {
      this.cajaService.obtenerEstadoCaja().subscribe({
        next: async (caja) => {
          await loading.dismiss();
          if (caja && caja.estado === 'ABIERTA') {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: async (err) => {
          await loading.dismiss();
          console.error('Error verificando caja', err);
          resolve(false);
        }
      });
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    let icon: any = 'info';
    if (color === 'success') icon = 'success';
    if (color === 'danger') icon = 'error';
    if (color === 'warning') icon = 'warning';
    this.alertService.toast(mensaje, icon);
  }
}
