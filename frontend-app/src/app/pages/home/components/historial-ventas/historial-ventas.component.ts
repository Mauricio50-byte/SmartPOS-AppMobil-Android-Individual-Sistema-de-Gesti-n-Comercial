import { Component, OnInit } from '@angular/core';
import { VentaServices } from 'src/app/core/services/venta.service';
import { Venta } from 'src/app/core/models';
import { AlertService } from 'src/app/shared/services/alert.service';
import { ModalController } from '@ionic/angular';
import { ModalDevolucionComponent } from '../inventario/components/modal-devolucion/modal-devolucion.component';
import { ModalDetalleVentaComponent } from './components/modal-detalle-venta/modal-detalle-venta.component';

@Component({
    standalone: false,
    selector: 'app-historial-ventas',
    templateUrl: './historial-ventas.component.html',
    styleUrls: ['./historial-ventas.component.scss'],
})
export class HistorialVentasComponent implements OnInit {
    ventas: Venta[] = [];
    filteredVentas: Venta[] = [];
    isLoading: boolean = false;

    estadisticas = {
        totalVendido: 0,
        totalTransacciones: 0,
        promedioVenta: 0
    };

    filtros = {
        fechaInicio: '',
        fechaFin: '',
        busqueda: '' // por ID, cliente, etc.
    };

    constructor(
        private ventaService: VentaServices,
        private alertService: AlertService,
        private modalCtrl: ModalController
    ) { }

    ngOnInit() {
        this.cargarVentas();
    }

    cargarVentas() {
        this.isLoading = true;
        const params: any = {};
        if (this.filtros.fechaInicio) params.startDate = this.filtros.fechaInicio;
        if (this.filtros.fechaFin) params.endDate = this.filtros.fechaFin;

        this.ventaService.listarVentas(params).subscribe({
            next: (data) => {
                this.ventas = data || [];
                this.aplicarFiltrosLocales();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error cargando historial', err);
                this.alertService.toast('Error al cargar historial de ventas', 'error');
                this.isLoading = false;
            }
        });
    }

    aplicarFiltrosLocales() {
        let resultado = [...this.ventas];

        // Filtro de búsqueda (ID o Cliente)
        if (this.filtros.busqueda) {
            const term = this.filtros.busqueda.toLowerCase();
            resultado = resultado.filter(v =>
                v.id.toString().includes(term) ||
                (v.cliente?.nombre || '').toLowerCase().includes(term) ||
                (v.usuario?.nombre || '').toLowerCase().includes(term)
            );
        }

        this.filteredVentas = resultado;
        this.calcularEstadisticas();
    }

    calcularEstadisticas() {
        this.estadisticas.totalVendido = this.filteredVentas.reduce((acc, v) => acc + Number(v.total || 0), 0);
        this.estadisticas.totalTransacciones = this.filteredVentas.length;
        this.estadisticas.promedioVenta = this.estadisticas.totalTransacciones > 0
            ? this.estadisticas.totalVendido / this.estadisticas.totalTransacciones
            : 0;
    }

    limpiarFiltros() {
        this.filtros = {
            fechaInicio: '',
            fechaFin: '',
            busqueda: ''
        };
        this.cargarVentas();
    }

    async verDetalleVenta(venta: Venta) {
        const modal = await this.modalCtrl.create({
            component: ModalDetalleVentaComponent,
            componentProps: { ventaId: venta.id },
            cssClass: 'modal-detalle-venta'
        });
        await modal.present();
    }

    async iniciarDevolucion(venta: Venta) {
        const modal = await this.modalCtrl.create({
            component: ModalDevolucionComponent,
            componentProps: { ventaIdInicial: venta.id },
            cssClass: 'modal-devolucion'
        });
        await modal.present();

        const { data } = await modal.onDidDismiss();
        if (data && data.success) {
            this.cargarVentas();
        }
    }
}
