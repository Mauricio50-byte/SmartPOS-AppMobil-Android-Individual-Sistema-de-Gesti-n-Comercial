import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LoadingController, ModalController } from '@ionic/angular';
import { CajaService } from 'src/app/core/services/caja.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Caja, MovimientoCaja } from 'src/app/core/models/caja';
import { TransactionModalComponent } from './components/transaction-modal/transaction-modal.component';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
  standalone: false
})
export class CajaComponent implements OnInit {
  caja: Caja | null = null;
  loading = false;
  movimientos: MovimientoCaja[] = [];
  saldoTransferencia = 0;

  constructor(
    private cajaService: CajaService,
    private authService: AuthService,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.cargarEstadoCaja();
  }

  ionViewWillEnter() {
    this.cargarEstadoCaja();
  }

  hasPermission(permiso: string): boolean {
    return this.authService.hasPermission(permiso);
  }

  async cargarEstadoCaja() {
    if (!this.hasPermission('ABRIR_CAJA') && !this.hasPermission('VER_FINANZAS')) {
       // Si no tiene permisos, no cargamos nada o mostramos error visual
       return;
    }

    this.loading = true;
    this.cajaService.obtenerEstadoCaja().subscribe({
      next: (data) => {
        this.caja = data;
        if (this.caja && this.caja.movimientos) {
            this.movimientos = this.caja.movimientos;
            this.calcularSaldoTransferencia();
        }
        this.loading = false;
      },
      error: (err) => {
        // 404 significa no hay caja abierta, lo cual es normal
        this.caja = null;
        this.movimientos = [];
        this.saldoTransferencia = 0;
        this.loading = false;
      }
    });
  }

  calcularSaldoTransferencia() {
    this.saldoTransferencia = this.movimientos
      .filter(m => m.metodoPago === 'TRANSFERENCIA')
      .reduce((acc, m) => {
        const isIngreso = m.tipo.includes('INGRESO') || m.tipo.includes('VENTA') || m.tipo.includes('ABONO');
        return isIngreso ? acc + Number(m.monto) : acc - Number(m.monto);
      }, 0);
  }

  async abrirCaja() {
    if (!this.hasPermission('ABRIR_CAJA')) {
      this.mostrarToast('No tienes permiso para abrir caja.', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: 'Abrir Caja',
        amountLabel: 'Monto Inicial',
        descriptionLabel: 'Observaciones',
        confirmText: 'Abrir',
        cancelText: 'Cancelar',
        descriptionRequired: false
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      this.ejecutarAbrirCaja(Number(data.monto), data.descripcion || '');
    }
  }

  async ejecutarAbrirCaja(montoInicial: number, observaciones: string) {
    const loading = await this.loadingController.create({ message: 'Abriendo caja...' });
    await loading.present();

    this.cajaService.abrirCaja(montoInicial, observaciones).subscribe({
      next: (caja) => {
        loading.dismiss();
        this.mostrarToast('Caja abierta exitosamente', 'success');
        this.cargarEstadoCaja();
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al abrir caja', 'danger');
      }
    });
  }

  async cerrarCaja() {
    if (!this.caja) return;
    if (!this.hasPermission('CERRAR_CAJA')) {
      this.mostrarToast('No tienes permiso para cerrar caja.', 'warning');
      return;
    }

    // Calcular montos esperados para mostrar en el alert? Sería ideal, pero por ahora simple.
    const saldoSistema = this.caja.resumen?.saldoActual || 0;

    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: 'Cerrar Caja',
        message: `El saldo esperado por el sistema es: $${saldoSistema.toLocaleString()}`,
        amountLabel: 'Monto Real en Caja',
        descriptionLabel: 'Observaciones',
        confirmText: 'Cerrar Caja',
        cancelText: 'Cancelar',
        descriptionRequired: false
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      this.ejecutarCerrarCaja(Number(data.monto), data.descripcion || '');
    }
  }

  async ejecutarCerrarCaja(montoFinal: number, observaciones: string) {
    const loading = await this.loadingController.create({ message: 'Cerrando caja...' });
    await loading.present();

    this.cajaService.cerrarCaja(montoFinal, observaciones).subscribe({
      next: (caja) => {
        loading.dismiss();
        this.mostrarToast('Caja cerrada exitosamente', 'success');
        this.caja = null; // Limpiar estado local
        this.movimientos = [];
        this.cargarEstadoCaja(); // Recargar para confirmar estado
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al cerrar caja', 'danger');
      }
    });
  }

  async registrarMovimiento(tipo: 'INGRESO' | 'EGRESO') {
    if (!this.hasPermission('REGISTRAR_MOVIMIENTO')) {
      this.mostrarToast('No tienes permiso para registrar movimientos manuales.', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: TransactionModalComponent,
      cssClass: 'transaction-modal',
      componentProps: {
        title: `Registrar ${tipo}`,
        amountLabel: 'Monto',
        descriptionLabel: 'Observaciones',
        confirmText: 'Registrar',
        cancelText: 'Cancelar'
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      this.ejecutarMovimiento(tipo, Number(data.monto), data.descripcion);
    }
  }

  async ejecutarMovimiento(tipo: 'INGRESO' | 'EGRESO', monto: number, descripcion: string) {
    const loading = await this.loadingController.create({ message: 'Registrando...' });
    await loading.present();

    // Movimientos manuales por defecto son EFECTIVO en este flujo simple
    // Podríamos agregar un selector de método de pago si fuera necesario
    this.cajaService.registrarMovimiento(tipo, monto, descripcion).subscribe({
      next: () => {
        loading.dismiss();
        this.mostrarToast('Movimiento registrado', 'success');
        this.cargarEstadoCaja();
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar movimiento', 'danger');
      }
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
