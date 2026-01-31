import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardService, DashboardMetricas } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();

  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  currentUser: any = null;

  // KPIs
  metricas: DashboardMetricas | null = null;
  totalIngresos = 0;
  totalVentas = 0;
  nuevosClientes = 0;
  ticketPromedio = 0;

  // Tendencias
  tendenciaIngresos = 0;
  tendenciaVentas = 0;
  tendenciaClientes = 0;
  tendenciaTicket = 0;

  // Lists
  recentTransactions: any[] = [];
  lowStockProducts: any[] = [];
  topProducts: any[] = [];

  // Processed Data for Subcomponents
  categoryStats: any[] = [];
  paymentStats: any[] = [];
  customerStats: any[] = [];

  // Charts Data
  public ventasChartData: ChartData<'bar'> | undefined;
  public barChartType: ChartType = 'bar';

  dataLoaded = false;
  timeFilter: 'week' | 'month' | 'year' = 'month';

  // Configuración de Gráficos
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { color: '#6b7280', font: { size: 12 } },
        beginAtZero: true
      }
    }
  };

  ngOnInit() {
    this.authService.getPerfil$().subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDashboardData();
      }
    });
  }

  canAccess(permiso: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.adminPorDefecto === true) return true;
    if (permiso === 'ADMIN') return this.currentUser.adminPorDefecto === true;
    return this.currentUser.permisos ? this.currentUser.permisos.includes(permiso) : false;
  }

  loadDashboardData() {
    this.dataLoaded = false;

    const obs: any = {};

    if (this.canAccess('VER_VENTAS') || this.canAccess('VENDER')) {
      obs.metricas = this.dashboardService.getMetricas(this.timeFilter);
      obs.graficoVentas = this.dashboardService.getGraficoVentas(this.timeFilter);
      obs.productosTop = this.dashboardService.getTopProducts(this.timeFilter);
      obs.transaccionesRecientes = this.dashboardService.getRecentTransactions(5);
      obs.distribucionCategorias = this.dashboardService.getDistribucionCategorias(this.timeFilter);
      obs.distribucionPagos = this.dashboardService.getDistribucionPagos(this.timeFilter);
    }

    if (this.canAccess('VER_INVENTARIO')) {
      obs.stockBajo = this.dashboardService.getLowStock(5);
    }

    if (this.canAccess('VER_CLIENTES') && (this.canAccess('VER_VENTAS') || this.canAccess('VENDER'))) {
      obs.topClientes = this.dashboardService.getTopCustomers(this.timeFilter, 5);
    }

    forkJoin(obs).subscribe({
      next: (results: any) => {
        if (results.metricas) {
          this.totalIngresos = results.metricas.ingresos.valor;
          this.tendenciaIngresos = results.metricas.ingresos.tendencia;
          this.totalVentas = results.metricas.ventas.valor;
          this.tendenciaVentas = results.metricas.ventas.tendencia;
          this.nuevosClientes = results.metricas.clientesNuevos.valor;
          this.tendenciaClientes = results.metricas.clientesNuevos.tendencia;
          this.ticketPromedio = results.metricas.ticketPromedio.valor;
          this.tendenciaTicket = results.metricas.ticketPromedio.tendencia;
        }

        if (results.graficoVentas) {
          this.ventasChartData = {
            labels: results.graficoVentas.labels,
            datasets: [{
              data: results.graficoVentas.data,
              label: results.graficoVentas.label,
              backgroundColor: '#3880ff',
              borderRadius: 4,
              hoverBackgroundColor: '#3dc2ff'
            }]
          };
        }

        this.topProducts = results.productosTop || [];
        this.recentTransactions = results.transaccionesRecientes || [];
        this.lowStockProducts = results.stockBajo || [];

        // Data for subcomponents
        this.categoryStats = results.distribucionCategorias || [];
        this.paymentStats = results.distribucionPagos || [];
        this.customerStats = results.topClientes || [];

        this.dataLoaded = true;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        this.dataLoaded = true;
      }
    });
  }

  onFilterChange(event: any) {
    this.timeFilter = event.detail.value;
    this.loadDashboardData();
  }

  onNavigate(view: string) {
    this.navigate.emit(view);
  }
}
