import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Venta } from '../models';

@Injectable({
  providedIn: 'root',
})
export class VentaServices {
  apiUrl = environment.apiUrl + '/ventas';
  
  private _ventaRealizada = new Subject<void>();
  public ventaRealizada$ = this._ventaRealizada.asObservable();

  constructor(private http: HttpClient) {}

  listarVentas(filters?: { startDate?: string, endDate?: string }): Observable<Venta[]> {
    let params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    
    return this.http.get<Venta[]>(this.apiUrl, { params });
  }

  obtenerVentaPorId(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }


  
  crearVenta(data: any): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, data).pipe(
      tap(() => this._ventaRealizada.next())
    );
  }



}