import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Categoria } from '../models/categoria';

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {
    apiUrl = environment.apiUrl + '/categorias';

    constructor(private http: HttpClient) { }

    listarCategorias(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.apiUrl);
    }

    obtenerCategoriaPorId(id: number): Observable<Categoria> {
        return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
    }

    crearCategoria(nombre: string, descripcion?: string): Observable<Categoria> {
        return this.http.post<Categoria>(this.apiUrl, { nombre, descripcion });
    }

    actualizarCategoria(id: number, data: any): Observable<Categoria> {
        return this.http.put<Categoria>(`${this.apiUrl}/${id}`, data);
    }

    eliminarCategoria(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
