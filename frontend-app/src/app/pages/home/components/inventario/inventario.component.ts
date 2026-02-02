import { Component, OnInit } from '@angular/core';
import { InventarioService, MovimientoInventario } from 'src/app/core/services/inventario.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { ModalController } from '@ionic/angular';
import { ModalAjusteInventarioComponent } from './components/modal-ajuste-inventario/modal-ajuste-inventario.component';
import { ModalDevolucionComponent } from './components/modal-devolucion/modal-devolucion.component';

@Component({
    standalone: false,
    selector: 'app-inventario',
    templateUrl: './inventario.component.html',
    styleUrls: ['./inventario.component.scss'],
})
export class InventarioComponent implements OnInit {
    movimientos: MovimientoInventario[] = [];
    total: number = 0;
    valorInventario: number = 0;
    isLoading: boolean = false;

    filtros = {
        tipo: '',
        fechaInicio: '',
        fechaFin: '',
        skip: 0,
        take: 20
    };

    constructor(
        private inventarioService: InventarioService,
        private alertService: AlertService,
        private modalCtrl: ModalController
    ) { }

    ngOnInit() {
        this.cargarMovimientos();
        this.cargarValorInventario();
    }

    cargarMovimientos() {
        this.isLoading = true;
        this.inventarioService.listarMovimientos(this.filtros).subscribe({
            next: (res) => {
                this.movimientos = res.movimientos;
                this.total = res.total;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error cargando movimientos', err);
                this.alertService.toast('Error al cargar movimientos', 'error');
                this.isLoading = false;
            }
        });
    }

    cargarValorInventario() {
        this.inventarioService.obtenerValorInventario().subscribe({
            next: (res) => {
                this.valorInventario = res.valor;
            }
        });
    }

    limpiarFiltros() {
        this.filtros = {
            tipo: '',
            fechaInicio: '',
            fechaFin: '',
            skip: 0,
            take: 20
        };
        this.cargarMovimientos();
    }

    cambiarPagina(dir: number) {
        this.filtros.skip += dir * this.filtros.take;
        this.cargarMovimientos();
    }

    mathMin(a: number, b: number) {
        return Math.min(a, b);
    }

    async abrirModalAjuste() {
        const modal = await this.modalCtrl.create({
            component: ModalAjusteInventarioComponent,
            cssClass: 'modal-ajuste-inventario'
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();
        if (data?.success) {
            this.cargarMovimientos();
            this.cargarValorInventario();
        }
    }

    async abrirModalDevolucion() {
        const modal = await this.modalCtrl.create({
            component: ModalDevolucionComponent,
            cssClass: 'modal-devolucion'
        });

        await modal.present();

        const { data } = await modal.onWillDismiss();
        if (data?.success) {
            this.cargarMovimientos();
            this.cargarValorInventario();
        }
    }
}
