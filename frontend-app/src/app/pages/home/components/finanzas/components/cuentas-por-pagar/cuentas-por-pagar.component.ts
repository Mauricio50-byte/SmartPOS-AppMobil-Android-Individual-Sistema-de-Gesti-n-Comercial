import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { GastoService } from 'src/app/core/services/gasto.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { Gasto } from 'src/app/core/models/gasto';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, addOutline, cashOutline, trashOutline, fileTrayOutline, eyeOutline } from 'ionicons/icons';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';
import { TransactionModalComponent } from '../../../caja/components/transaction-modal/transaction-modal.component';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-cuentas-por-pagar',
  templateUrl: './cuentas-por-pagar.component.html',
  styleUrls: ['./cuentas-por-pagar.component.scss'],
  standalone: false
})
export class CuentasPorPagarComponent implements OnInit {
  gastos: Gasto[] = [];
  filteredGastos: Gasto[] = [];
  searchTerm: string = '';
  filterEstado: string = 'PENDIENTE';
  loading: boolean = false;
  showForm: boolean = false;
  skeletonRows = [1, 2, 3, 4, 5];

  gastoForm: FormGroup;

  constructor(
    private gastoService: GastoService,
    private cajaService: CajaService, // Injected CajaService
    private modalController: ModalController,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    addIcons({ searchOutline, filterOutline, addOutline, cashOutline, trashOutline, fileTrayOutline, eyeOutline });
    this.gastoForm = this.fb.group({
      proveedor: ['', Validators.required],
      concepto: ['', Validators.required],
      montoTotal: [null, [Validators.required, Validators.min(0.01)]],
      fechaVencimiento: [''],
      categoria: ['OPERATIVO']
    });
  }

  ngOnInit() {
    this.cargarGastos();
  }

  cargarGastos() {
    this.loading = true;
    this.gastoService.listarGastos({ estado: this.filterEstado === 'TODOS' ? undefined : this.filterEstado })
      .subscribe({
        next: (data) => {
          this.gastos = data;
          this.filterGastos();
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.mostrarToast('Error al cargar gastos', 'danger');
          this.loading = false;
        }
      });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterGastos();
  }

  onFilterChange(event: any) {
    this.filterEstado = event.detail.value;
    this.cargarGastos();
  }

  filterGastos() {
    if (!this.searchTerm) {
      this.filteredGastos = this.gastos;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredGastos = this.gastos.filter(g =>
      g.proveedor.toLowerCase().includes(term) ||
      g.concepto.toLowerCase().includes(term)
    );
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.gastoForm.reset({ categoria: 'OPERATIVO' });
  }

  guardarGasto() {
    if (this.gastoForm.invalid) {
      this.gastoForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.alertService.showLoading('Registrando gasto...', 'Por favor espere.');

    this.gastoService.crearGasto(this.gastoForm.value).subscribe({
      next: () => {
        this.alertService.closeLoading();
        this.mostrarToast('Gasto registrado exitosamente', 'success');
        this.toggleForm();
        this.cargarGastos();
      },
      error: (err) => {
        this.alertService.closeLoading();
        console.error(err);
        this.mostrarToast('Error al registrar gasto', 'danger');
        this.loading = false;
      }
    });
  }

  async registrarPago(gasto: Gasto) {
    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: 'Registrar Pago',
        message: `Saldo pendiente: $${gasto.saldoPendiente}`,
        amountLabel: 'Monto a pagar',
        descriptionLabel: 'Observaciones',
        confirmText: 'Pagar',
        cancelText: 'Cancelar',
        descriptionRequired: false,
        initialAmount: null,
        initialDescription: '',
        showPaymentMethodSelector: true // Habilitar selector de método de pago
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const monto = Number(data.monto);
      if (!monto || monto <= 0) {
        this.alertService.alert('Monto inválido', 'El monto debe ser mayor a 0', 'warning');
        return;
      }
      if (monto > gasto.saldoPendiente) {
        this.alertService.alert('Monto excedido', 'El monto a pagar no puede ser mayor al saldo pendiente de la deuda.', 'warning');
        return;
      }

      // --- VALIDACIÓN DE CAJA ANTES DE REGISTRAR ---
      if (data.metodoPago === 'EFECTIVO' || data.metodoPago === 'TRANSFERENCIA') {
        const cajaAbierta = await this.verificarCajaAbierta();
        if (!cajaAbierta) {
          await this.alertService.alert('Caja Cerrada', `No hay una caja abierta para procesar este pago (${data.metodoPago}). Si es un fondo externo, usa el método 'EXTERNO'.`, 'warning');
          return;
        }
      }

      this.procesarPago(gasto.id, monto, data.descripcion, data.metodoPago);
    }
  }

  procesarPago(gastoId: number, monto: number, nota: string, metodoPago: string) {
    // metodoPago comes directly as 'EFECTIVO', 'TRANSFERENCIA' or 'EXTERNO' from the modal.
    // 'EFECTIVO' and 'TRANSFERENCIA' will trigger box deduction in backend.
    // 'EXTERNO' will not.

    let notaSuffix = '';
    if (metodoPago === 'EFECTIVO') notaSuffix = ' (Caja Efectivo)';
    else if (metodoPago === 'TRANSFERENCIA') notaSuffix = ' (Caja Transferencia)';
    else notaSuffix = ' (Fondos Externos)';

    this.alertService.showLoading('Procesando pago...', 'Por favor espere mientras registramos su pago.');

    this.gastoService.registrarPago(gastoId, {
      monto,
      metodoPago: metodoPago,
      nota: nota + notaSuffix
    }).subscribe({
      next: (response) => {
        this.alertService.closeLoading();
        this.mostrarToast('Pago registrado exitosamente', 'success');

        // Update with the fresh object from backend which includes updated history
        const gastoIndex = this.gastos.findIndex(g => g.id === gastoId);
        if (gastoIndex !== -1) {
          // Backend returns { pago, gasto }
          this.gastos[gastoIndex] = response.gasto;

          // Check filters to see if we should keep showing it
          const gasto = this.gastos[gastoIndex];
          if (gasto.estado === 'PAGADO' && (this.filterEstado === 'PENDIENTE' || this.filterEstado === 'VENCIDO')) {
            this.gastos.splice(gastoIndex, 1);
          }

          this.filterGastos();
        }
      },
      error: (err) => {
        this.alertService.closeLoading();
        console.error(err);
        // Extraer mensaje de error del backend si existe
        const errorMessage = err.error?.error || err.error?.message || 'Error al registrar pago';
        this.alertService.alert('No se pudo procesar', errorMessage, 'error');
      }
    });
  }

  async verHistorial(gasto: Gasto) {
    try {
      if (!gasto || !gasto.pagos || gasto.pagos.length === 0) {
        this.mostrarToast('No hay pagos registrados para este gasto', 'info');
        return;
      }

      let htmlRows = '';

      gasto.pagos.forEach(pago => {
        let fechaStr = 'Fecha inválida';
        try {
          const fecha = new Date(pago.fecha);
          if (!isNaN(fecha.getTime())) {
            // Formato corto para móvil: "29 ene. 2026"
            fechaStr = fecha.toLocaleString('es-CO', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });
          }
        } catch (e) {
          console.error('Error formateando fecha', e);
          fechaStr = String(pago.fecha);
        }

        let montoStr = '$0';
        try {
          // Sin decimales si son ceros para ahorrar espacio
          montoStr = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(pago.monto);
        } catch (e) {
          montoStr = `$${pago.monto}`;
        }

        const notaStr = pago.nota ? pago.nota : '-';

        htmlRows += `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px 8px; vertical-align: middle;">
              <div style="font-weight: 600; color: #1f2937; font-size: 0.95em;">${montoStr}</div>
              <div style="font-size: 0.75em; color: #6b7280; margin-top: 2px;">${fechaStr}</div>
            </td>
            <td style="padding: 12px 8px; vertical-align: middle; text-align: right; color: #4b5563; font-size: 0.85em; font-style: italic; max-width: 120px; word-wrap: break-word;">
              ${notaStr}
            </td>
          </tr>
        `;
      });

      const tableHtml = `
        <div style="text-align: left; max-height: 350px; overflow-y: auto; border-radius: 8px; border: 1px solid #f3f4f6;">
          <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <thead style="background-color: #f9fafb; position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 0.8em; text-transform: uppercase; color: #6b7280; font-weight: 600;">Detalle Pago</th>
                <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 0.8em; text-transform: uppercase; color: #6b7280; font-weight: 600;">Nota</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
        </div>
      `;

      await this.alertService.fire({
        title: 'Historial de Pagos',
        html: `
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; color: #111827; font-size: 1.1em; margin-bottom: 4px;">${gasto.proveedor}</div>
            <div style="color: #6b7280; font-size: 0.9em;">${gasto.concepto}</div>
          </div>
          ${tableHtml}
        `,
        width: '90%', // Más ancho en móvil
        padding: '1.25em',
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
          container: 'swal2-mobile-friendly',
          popup: 'swal2-rounded-popup'
        }
      });
    } catch (error) {
      console.error('Error mostrando historial:', error);
      this.mostrarToast('Error al abrir el historial', 'danger');
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    let icon: any = 'info';
    if (color === 'success') icon = 'success';
    if (color === 'danger') icon = 'error';
    if (color === 'warning') icon = 'warning';
    this.alertService.toast(mensaje, icon);
  }

  // --- VALIDACIÓN DE CAJA ---
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
}
