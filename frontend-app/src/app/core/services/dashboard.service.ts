import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DashboardMetricas {
    ingresos: { valor: number; tendencia: number };
    ventas: { valor: number; tendencia: number };
    clientesNuevos: { valor: number; tendencia: number };
    ticketPromedio: { valor: number; tendencia: number };
}

export interface ChartDataResponse {
    labels: string[];
    data: number[];
    label: string;
}

export interface TopProduct {
    id: number;
    nombre: string;
    qty: number;
    percentage: number;
}

export interface RecentTransaction {
    id: number;
    fecha: string;
    total: number;
    estado: string;
}

export interface LowStockProduct {
    id: number;
    nombre: string;
    stock: number;
    stockMinimo: number;
}

export interface DistributionData {
    name: string;
    revenue: number;
    percentage: number;
    color: string;
}

export interface TopCustomer {
    id: number;
    name: string;
    totalSpent: number;
    transactionCount: number;
    lastPurchase: string;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/dashboard`;

    getMetricas(periodo: string): Observable<DashboardMetricas> {
        return this.http.get<DashboardMetricas>(`${this.apiUrl}/metricas`, { params: { periodo } });
    }

    getGraficoVentas(periodo: string): Observable<ChartDataResponse> {
        return this.http.get<ChartDataResponse>(`${this.apiUrl}/grafico-ventas`, { params: { periodo } });
    }

    getTopProducts(periodo: string, limit: number = 5): Observable<TopProduct[]> {
        return this.http.get<TopProduct[]>(`${this.apiUrl}/productos-top`, { params: { periodo, limit } });
    }

    getLowStock(limit: number = 5): Observable<LowStockProduct[]> {
        return this.http.get<LowStockProduct[]>(`${this.apiUrl}/stock-bajo`, { params: { limit } });
    }

    getRecentTransactions(limit: number = 5): Observable<RecentTransaction[]> {
        return this.http.get<RecentTransaction[]>(`${this.apiUrl}/transacciones-recientes`, { params: { limit } });
    }

    getDistribucionCategorias(periodo: string): Observable<DistributionData[]> {
        return this.http.get<DistributionData[]>(`${this.apiUrl}/distribucion-categorias`, { params: { periodo } });
    }

    getDistribucionPagos(periodo: string): Observable<DistributionData[]> {
        return this.http.get<DistributionData[]>(`${this.apiUrl}/distribucion-pagos`, { params: { periodo } });
    }

    getTopCustomers(periodo: string, limit: number = 5): Observable<TopCustomer[]> {
        return this.http.get<TopCustomer[]>(`${this.apiUrl}/top-clientes`, { params: { periodo, limit } });
    }
}
