import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { InventarioService } from 'src/app/core/services/inventario.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Producto } from 'src/app/core/models/producto';

@Component({
    standalone: false,
    selector: 'app-modal-ajuste-inventario',
    templateUrl: './modal-ajuste-inventario.component.html',
    styleUrls: ['./modal-ajuste-inventario.component.scss'],
})
export class ModalAjusteInventarioComponent implements OnInit {
    searchTerm: string = '';
    allProducts: Producto[] = [];
    filteredProducts: Producto[] = [];
    selectedProduct: Producto | null = null;

    ajuste = {
        productoId: null as number | null,
        tipo: 'ENTRADA',
        cantidad: 1,
        motivo: ''
    };

    isSubmitting: boolean = false;

    constructor(
        private modalCtrl: ModalController,
        private productoService: ProductosServices,
        private inventarioService: InventarioService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.cargarProductos();
    }

    cargarProductos() {
        this.productoService.listarProductos().subscribe({
            next: (data) => {
                this.allProducts = data || [];
            }
        });
    }

    buscarProducto() {
        if (!this.searchTerm.trim()) {
            this.filteredProducts = [];
            return;
        }
        const term = this.searchTerm.toLowerCase();
        this.filteredProducts = this.allProducts.filter(p =>
            p.nombre.toLowerCase().includes(term) ||
            (p.sku && p.sku.toLowerCase().includes(term))
        ).slice(0, 5);
    }

    seleccionarProducto(p: Producto) {
        this.selectedProduct = p;
        this.ajuste.productoId = p.id;
        this.searchTerm = '';
        this.filteredProducts = [];
    }

    calcularNuevoStock(): number {
        if (!this.selectedProduct) return 0;
        const actual = this.selectedProduct.stock || 0;
        const cant = Number(this.ajuste.cantidad) || 0;

        if (this.ajuste.tipo === 'ENTRADA' || this.ajuste.tipo === 'DEVOLUCION') return actual + cant;
        if (this.ajuste.tipo === 'SALIDA') return actual - cant;
        if (this.ajuste.tipo === 'AJUSTE') return cant;
        return actual;
    }

    esValido(): boolean {
        return !!this.selectedProduct &&
            this.ajuste.cantidad >= 0 &&
            !!this.ajuste.tipo &&
            (this.ajuste.tipo !== 'SALIDA' || this.calcularNuevoStock() >= 0);
    }

    async guardar() {
        if (!this.esValido()) return;

        this.isSubmitting = true;
        this.inventarioService.registrarAjuste(this.ajuste).subscribe({
            next: () => {
                this.alertService.toast('Ajuste de inventario registrado correctamente', 'success');
                this.modalCtrl.dismiss({ success: true });
            },
            error: (err) => {
                console.error('Error al registrar ajuste', err);
                this.alertService.toast(err.error?.error || 'Error al registrar el ajuste', 'error');
                this.isSubmitting = false;
            }
        });
    }

    cerrar() {
        this.modalCtrl.dismiss();
    }
}
