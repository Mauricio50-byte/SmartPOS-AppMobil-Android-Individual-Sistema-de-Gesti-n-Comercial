import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EstadoResultados {
    ingresos: number;
    costos: number;
    utilidadBruta: number;
    gastos: number;
    utilidadNeta: number;
    fechaInicio: string;
    fechaFin: string;
}

export interface FlujoCaja {
    saldoInicial: number;
    entradas: number;
    salidas: number;
    saldoFinal: number;
    fechaInicio: string;
    fechaFin: string;
}

export interface Cartera {
    totalPorCobrar: number;
    deudasVencidas: number;
    carteraAgrupada: Array<{
        nombre: string;
        total: number;
        vencido: number;
        detalleDeudas: any[];
    }>;
}

export interface InventarioValorizado {
    valorTotal: number;
    analisisCategoria: Array<{
        categoria: string;
        valor: number;
        items: number;
    }>;
}

export interface CuentasPorPagar {
    totalPorPagar: number;
    analisisProveedor: Array<{
        proveedor: string;
        total: number;
        facturas: number;
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class ReportesContablesService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl + '/reportes';

    getEstadoResultados(fechaInicio: string, fechaFin: string): Observable<EstadoResultados> {
        return this.http.get<EstadoResultados>(`${this.apiUrl}/estado-resultados`, {
            params: { fechaInicio, fechaFin }
        });
    }

    getFlujoCaja(fechaInicio: string, fechaFin: string): Observable<FlujoCaja> {
        return this.http.get<FlujoCaja>(`${this.apiUrl}/flujo-caja`, {
            params: { fechaInicio, fechaFin }
        });
    }

    getCartera(estado: string = 'PENDIENTE'): Observable<Cartera> {
        return this.http.get<Cartera>(`${this.apiUrl}/cartera`, {
            params: { estado }
        });
    }

    getInventarioValorizado(): Observable<InventarioValorizado> {
        return this.http.get<InventarioValorizado>(`${this.apiUrl}/inventario-valorizado`);
    }

    getCuentasPorPagar(estado: string = 'PENDIENTE'): Observable<CuentasPorPagar> {
        return this.http.get<CuentasPorPagar>(`${this.apiUrl}/cuentas-por-pagar`, {
            params: { estado }
        });
    }
}
