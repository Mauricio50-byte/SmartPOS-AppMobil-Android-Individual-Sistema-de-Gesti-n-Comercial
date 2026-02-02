import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { VentaServices } from 'src/app/core/services/venta.service';
import { Venta } from 'src/app/core/models';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
    standalone: false,
    selector: 'app-modal-detalle-venta',
    templateUrl: './modal-detalle-venta.component.html',
    styleUrls: ['./modal-detalle-venta.component.scss'],
})
export class ModalDetalleVentaComponent implements OnInit {
    @Input() ventaId!: number;

    venta: any = null;
    isLoading: boolean = true;

    constructor(
        private modalCtrl: ModalController,
        private ventaService: VentaServices,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        if (this.ventaId) {
            this.cargarDetalle();
        } else {
            this.isLoading = false;
            this.alertService.toast('No se proporcionó ID de venta', 'error');
        }
    }

    cargarDetalle() {
        this.isLoading = true;
        this.ventaService.obtenerVentaPorId(this.ventaId).subscribe({
            next: (res) => {
                this.venta = res;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error al cargar detalle de venta', err);
                this.alertService.toast('Error al cargar el detalle', 'error');
                this.isLoading = false;
            }
        });
    }

    cerrar() {
        this.modalCtrl.dismiss();
    }

    getBadgeClass(estado: string) {
        if (!estado) return '';
        return estado.toLowerCase() === 'pagado' ? 'badge-success' : 'badge-warning';
    }
}
