import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AlertService } from 'src/app/shared/services/alert.service';
import { DevolucionesService } from 'src/app/core/services/devoluciones.service';

interface ItemDevolucion {
    productoId: number;
    nombreProducto: string;
    sku?: string;
    precioUnitario: number;
    cantidadComprada: number;
    cantidad: number; // Cantidad a devolver
}

@Component({
    standalone: false,
    selector: 'app-modal-devolucion',
    templateUrl: './modal-devolucion.component.html',
    styleUrls: ['./modal-devolucion.component.scss'],
})
export class ModalDevolucionComponent implements OnInit {
    @Input() ventaIdInicial?: number; // Opcional, si se abre desde una venta específica

    searchId: number | null = null;
    venta: any = null;
    itemsDevolucion: ItemDevolucion[] = [];
    motivo: string = '';

    isLoading: boolean = false;
    isSubmitting: boolean = false;

    constructor(
        private modalCtrl: ModalController,
        private devolucionesService: DevolucionesService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        if (this.ventaIdInicial) {
            this.searchId = this.ventaIdInicial;
            this.buscarVenta();
        }
    }

    reset() {
        this.venta = null;
        this.itemsDevolucion = [];
        this.motivo = '';
        this.searchId = null;
    }

    buscarVenta() {
        if (!this.searchId) return;

        this.isLoading = true;
        this.devolucionesService.buscarVenta(this.searchId).subscribe({
            next: (res) => {
                this.venta = res;
                this.itemsDevolucion = res.detalles.map((d: any) => ({
                    productoId: d.productoId,
                    nombreProducto: d.producto.nombre,
                    sku: d.producto.sku,
                    precioUnitario: d.precioUnitario,
                    cantidadComprada: d.cantidad,
                    cantidad: 0
                }));
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.alertService.toast('Venta no encontrada', 'error');
                this.isLoading = false;
            }
        });
    }

    incrementar(item: ItemDevolucion) {
        if (item.cantidad < item.cantidadComprada) {
            item.cantidad++;
        }
    }

    decrementar(item: ItemDevolucion) {
        if (item.cantidad > 0) {
            item.cantidad--;
        }
    }

    calcularTotal() {
        return this.itemsDevolucion.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
    }

    confirmarDevolucion() {
        const itemsADevolver = this.itemsDevolucion
            .filter(i => i.cantidad > 0)
            .map(i => ({ productoId: i.productoId, cantidad: i.cantidad }));

        if (itemsADevolver.length === 0) {
            this.alertService.toast('Seleccione al menos un producto para devolver', 'warning');
            return;
        }

        this.isSubmitting = true;
        const payload = {
            ventaId: this.venta.id,
            items: itemsADevolver,
            motivo: this.motivo
        };

        this.devolucionesService.crearDevolucion(payload).subscribe({
            next: () => {
                this.alertService.toast('Devolución registrada con éxito', 'success');
                this.modalCtrl.dismiss({ success: true });
            },
            error: (err) => {
                console.error(err);
                const msg = err.error?.error || 'Error al procesar la devolución';
                this.alertService.toast(msg, 'error');
                this.isSubmitting = false;
            }
        });
    }

    cerrar() {
        this.modalCtrl.dismiss();
    }
}
