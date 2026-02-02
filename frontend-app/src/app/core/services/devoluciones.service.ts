import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DevolucionData {
    ventaId: number;
    items: { productoId: number; cantidad: number }[];
    motivo: string;
}

@Injectable({
    providedIn: 'root'
})
export class DevolucionesService {
    private apiUrl = environment.apiUrl + '/ventas';

    constructor(private http: HttpClient) { }

    listarDevoluciones(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/devoluciones`);
    }

    crearDevolucion(data: DevolucionData): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/devolucion`, data);
    }

    buscarVenta(ventaId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${ventaId}`);
    }
}
