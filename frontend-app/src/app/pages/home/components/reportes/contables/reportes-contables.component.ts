import { Component, OnInit, inject } from '@angular/core';
import { ReportesContablesService, EstadoResultados, FlujoCaja, Cartera, InventarioValorizado, CuentasPorPagar } from '../services/reportes-contables.service';

@Component({
    selector: 'app-reportes-contables',
    templateUrl: './reportes-contables.component.html',
    styleUrls: ['./reportes-contables.component.scss'],
    standalone: false
})
export class ReportesContablesComponent implements OnInit {
    private reportesService = inject(ReportesContablesService);

    activeTab: 'pnl' | 'cashflow' | 'receivables' | 'inventory' | 'payables' = 'pnl';
    loading = false;

    // Filtros de fecha
    fechaInicio: string = '';
    fechaFin: string = '';

    // Datos
    estadoResultados: EstadoResultados | null = null;
    flujoCaja: FlujoCaja | null = null;
    cartera: Cartera | null = null;
    inventario: InventarioValorizado | null = null;
    cuentasPagar: CuentasPorPagar | null = null;

    ngOnInit() {
        // Inicializar fechas al mes actual
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.fechaFin = now.toISOString().split('T')[0];

        this.loadActiveTabData();
    }

    setTab(tab: any) {
        this.activeTab = tab;
        this.loadActiveTabData();
    }

    loadActiveTabData() {
        this.loading = true;
        switch (this.activeTab) {
            case 'pnl':
                this.reportesService.getEstadoResultados(this.fechaInicio, this.fechaFin).subscribe({
                    next: data => { this.estadoResultados = data; this.loading = false; },
                    error: err => { console.error(err); this.loading = false; }
                });
                break;
            case 'cashflow':
                this.reportesService.getFlujoCaja(this.fechaInicio, this.fechaFin).subscribe({
                    next: data => { this.flujoCaja = data; this.loading = false; },
                    error: err => { console.error(err); this.loading = false; }
                });
                break;
            case 'receivables':
                this.reportesService.getCartera().subscribe({
                    next: data => { this.cartera = data; this.loading = false; },
                    error: err => { console.error(err); this.loading = false; }
                });
                break;
            case 'inventory':
                this.reportesService.getInventarioValorizado().subscribe({
                    next: data => { this.inventario = data; this.loading = false; },
                    error: err => { console.error(err); this.loading = false; }
                });
                break;
            case 'payables':
                this.reportesService.getCuentasPorPagar().subscribe({
                    next: data => { this.cuentasPagar = data; this.loading = false; },
                    error: err => { console.error(err); this.loading = false; }
                });
                break;
        }
    }

    onFilterChange() {
        this.loadActiveTabData();
    }
}
