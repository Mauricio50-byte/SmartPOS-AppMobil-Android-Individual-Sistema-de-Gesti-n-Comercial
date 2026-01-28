import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController, ModalController, LoadingController } from '@ionic/angular';
import { DeudaService } from 'src/app/core/services/deuda.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { Deuda } from 'src/app/core/models/deuda'; // Adjust path if needed
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';

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

  constructor(
    private deudaService: DeudaService,
    private cajaService: CajaService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline });
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
      const alert = await this.alertController.create({
        header: 'Caja Cerrada',
        message: 'No se pueden registrar abonos porque no hay una caja abierta. Por favor abra la caja en la sección de Caja Diaria.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Primero preguntar por el método de pago para una mejor experiencia
    const alertMethod = await this.alertController.create({
      header: 'Seleccionar Método de Pago',
      subHeader: `Abono para: ${deuda.cliente?.nombre}`,
      message: '¿Cómo desea realizar el abono?',
      buttons: [
        {
          text: 'Efectivo',
          cssClass: 'btn-efectivo',
          handler: () => {
            this.mostrarFormularioAbono(deuda, 'EFECTIVO');
          }
        },
        {
          text: 'Transferencia',
          cssClass: 'btn-transferencia',
          handler: () => {
            this.mostrarFormularioAbono(deuda, 'TRANSFERENCIA');
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alertMethod.present();
  }

  async mostrarFormularioAbono(deuda: Deuda, metodo: string) {
    const inputs: any[] = [
      {
        name: 'monto',
        type: 'number',
        placeholder: 'Monto a abonar',
        min: 1,
        max: deuda.saldoPendiente
      }
    ];

    // Solo pedir monto recibido si es efectivo
    if (metodo === 'EFECTIVO') {
      inputs.push({
        name: 'montoRecibido',
        type: 'number',
        placeholder: 'Monto Recibido (opcional para cambio)'
      });
    }

    inputs.push({
      name: 'nota',
      type: 'text',
      placeholder: 'Nota o referencia (opcional)'
    });

    const alert = await this.alertController.create({
      header: `Registrar Abono (${metodo})`,
      subHeader: `Saldo pendiente: $${deuda.saldoPendiente.toLocaleString()}`,
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar Abono',
          handler: (data) => {
            const monto = parseFloat(data.monto);
            if (!monto || monto <= 0) {
              this.mostrarToast('Monto inválido', 'warning');
              return false;
            }
            if (monto > deuda.saldoPendiente) {
              this.mostrarToast('El monto excede el saldo pendiente', 'warning');
              return false;
            }

            const montoRecibido = parseFloat(data.montoRecibido);
            
            // Si es efectivo y hay vuelto, mostrarlo antes de procesar
            if (metodo === 'EFECTIVO' && montoRecibido && montoRecibido > monto) {
              const cambio = montoRecibido - monto;
              this.mostrarAlertaCambio(cambio);
            }

            this.procesarAbono(deuda.id, monto, data.nota, metodo, montoRecibido);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async mostrarAlertaCambio(cambio: number) {
    const alert = await this.alertController.create({
      header: 'Cambio a Entregar',
      subHeader: 'Por favor entregue el vuelto al cliente:',
      message: `$${cambio.toLocaleString()}`,
      buttons: ['Entendido'],
      cssClass: 'cambio-alert'
    });
    await alert.present();
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
        this.cargarDeudas();
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
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}
