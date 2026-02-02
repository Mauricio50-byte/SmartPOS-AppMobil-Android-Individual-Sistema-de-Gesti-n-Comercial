import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MovimientoInventario {
    id: number;
    productoId: number;
    tipo: string;
    cantidad: number;
    costoUnitario: number;
    valorTotal: number;
    stockAnterior: number;
    stockNuevo: number;
    referencia?: string;
    tipoReferencia?: string;
    usuarioId: number;
    motivo?: string;
    fecha: string;
    producto?: {
        id: number;
        nombre: string;
        sku: string;
    };
    usuario?: {
        id: number;
        nombre: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class InventarioService {
    private apiUrl = environment.apiUrl + '/inventario';

    constructor(private http: HttpClient) { }

    listarMovimientos(filtros: any = {}): Observable<{ total: number, movimientos: MovimientoInventario[] }> {
        return this.http.get<{ total: number, movimientos: MovimientoInventario[] }>(`${this.apiUrl}/movimientos`, { params: filtros });
    }

    obtenerMovimientosPorProducto(productoId: number): Observable<MovimientoInventario[]> {
        return this.http.get<MovimientoInventario[]>(`${this.apiUrl}/producto/${productoId}`);
    }

    registrarAjuste(datos: any): Observable<MovimientoInventario> {
        return this.http.post<MovimientoInventario>(`${this.apiUrl}/ajuste`, datos);
    }

    obtenerValorInventario(): Observable<{ valor: number }> {
        return this.http.get<{ valor: number }>(`${this.apiUrl}/valor-total`);
    }
}
