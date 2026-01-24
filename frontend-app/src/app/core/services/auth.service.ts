import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UsuarioPerfil, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user'; // Nuevo: Key para guardar el usuario
  private rememberKey = 'remember_email';
  private perfil$ = new BehaviorSubject<UsuarioPerfil | null>(null);
  private http = inject(HttpClient);
  private perfilSubscription: Subscription | undefined;

  // Token management
  private token: string | null = null;

  constructor() {
    // Restaurar token si existe
    const savedToken = localStorage.getItem(this.tokenKey);
    if (savedToken) {
      this.token = savedToken;
      
      // Restaurar usuario si existe (Hydration)
      const savedUser = localStorage.getItem(this.userKey);
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          this.perfil$.next(user);
        } catch (e) {
          console.error('Error parsing saved user', e);
          localStorage.removeItem(this.userKey);
        }
      }

      // Validar y refrescar con datos frescos del servidor
      this.validarYRefrescarPerfil();
    }
  }

  validarYRefrescarPerfil() {
    if (this.perfilSubscription) this.perfilSubscription.unsubscribe();
    this.perfilSubscription = this.fetchPerfil().subscribe({
      next: (p) => {
        this.perfil$.next(p);
        this.saveUser(p); // Actualizar cache local
      },
      error: (err) => { 
        // Si el token es inválido (401), hacemos logout
        if (err?.status === 401) this.logout(); 
      }
    });
  }

  ngOnDestroy(): void {
    if (this.perfilSubscription) {
      this.perfilSubscription.unsubscribe();
    }
  }

  login(correo: string, password: string, remember: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/ingresar`, { correo, password }).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.perfil$.next(resp.usuario);
        this.saveUser(resp.usuario); // Guardar usuario
        if (remember) localStorage.setItem(this.rememberKey, correo);
        else localStorage.removeItem(this.rememberKey);
      })
    );
  }

  fetchPerfil(): Observable<UsuarioPerfil> {
    return this.http.get<{ usuario: UsuarioPerfil }>(`${environment.apiUrl}/auth/perfil`).pipe(
      tap(({ usuario }) => {
        this.perfil$.next(usuario);
        this.saveUser(usuario); // Guardar usuario
      }),
      map(({ usuario }) => usuario)
    );
  }

  getPerfil$(): Observable<UsuarioPerfil | null> { return this.perfil$.asObservable(); }

  hasPermission(clave: string): boolean {
    const perfil = this.perfil$.value;
    if (!perfil) return false;
    
    // Admin global
    if (perfil.adminPorDefecto && perfil.roles?.includes('ADMIN')) return true;
    
    // Permiso explícito
    return perfil.permisos?.includes(clave) || false;
  }

  getRememberedEmail(): string { return localStorage.getItem(this.rememberKey) || ''; }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem(this.tokenKey, token);
  }

  private saveUser(user: UsuarioPerfil): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getToken(): string | null { 
    if (!this.token) {
      this.token = localStorage.getItem(this.tokenKey);
    }
    return this.token; 
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey); // Limpiar usuario
    this.perfil$.next(null);
  }
}
