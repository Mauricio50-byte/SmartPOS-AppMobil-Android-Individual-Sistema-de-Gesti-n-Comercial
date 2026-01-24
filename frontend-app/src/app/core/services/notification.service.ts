import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of, interval } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductosServices } from './producto.service';
import { DeudaService } from './deuda.service';
import { CajaService } from './caja.service';
import { VentaServices } from './venta.service';
import { Producto, Deuda, Caja } from '../models';

import { AuthService } from './auth.service';

export type NotificationType = 'urgent' | 'info' | 'success' | 'warning';

export interface AppNotification {
  id: string | number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date;
  link?: string;
  source?: 'system' | 'db';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  private apiUrl = `${environment.apiUrl}/notificaciones`;

  constructor(
    private productosService: ProductosServices,
    private deudaService: DeudaService,
    private cajaService: CajaService,
    private ventaService: VentaServices
  ) {
    // Only start if authenticated
    if (this.authService.getToken()) {
      this.refreshNotifications();
    }

    // Refresh every 2 minutes
    interval(2 * 60 * 1000).subscribe(() => {
      if (this.authService.getToken()) {
        this.refreshNotifications();
      }
    });

    // React to system changes immediately
    this.cajaService.cajaCambio$.subscribe(() => {
      if (this.authService.getToken()) this.refreshNotifications();
    });
    this.productosService.productoChanged$.subscribe(() => {
      if (this.authService.getToken()) this.refreshNotifications();
    });
    this.ventaService.ventaRealizada$.subscribe(() => {
      if (this.authService.getToken()) this.refreshNotifications();
    });
  }

  get notifications$(): Observable<AppNotification[]> {
    return this.notifications.asObservable();
  }

  get unreadCount$(): Observable<number> {
    return this.notifications.pipe(
      map(list => list.filter(n => !n.read).length)
    );
  }

  refreshNotifications() {
    // 1. Fetch from DB
    // 2. Fetch system state (low stock, etc.)
    // 3. Merge

    forkJoin({
      dbNotifications: this.http.get<any[]>(this.apiUrl).pipe(
        map(list => list.map(n => ({
          id: n.id,
          title: n.titulo,
          message: n.mensaje,
          type: n.tipo as NotificationType,
          read: n.leido,
          timestamp: new Date(n.creadoEn),
          link: n.link,
          source: 'db' as const
        }))),
        catchError(() => of([]))
      ),
      systemState: this.checkSystemState()
    }).subscribe(({ dbNotifications, systemState }) => {
      // Sort and combine. Local system notifications first? 
      // Actually sort everything by timestamp
      const combined = [...dbNotifications, ...systemState].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      this.notifications.next(combined);
    });
  }

  private checkSystemState(): Observable<AppNotification[]> {
    return forkJoin({
      productos: this.productosService.listarProductos().pipe(catchError(() => of([]))),
      deudas: this.deudaService.listarDeudas({ estado: 'PENDIENTE' }).pipe(catchError(() => of([]))),
      caja: this.cajaService.obtenerEstadoCaja().pipe(catchError(() => of(null)))
    }).pipe(
      map(({ productos, deudas, caja }) => {
        const systemNotifications: AppNotification[] = [];
        const now = new Date();

        // Stock Check
        const lowStockProducts = productos.filter(p => p.stock <= (p.stockMinimo || 5));
        if (lowStockProducts.length > 0) {
          systemNotifications.push(this.createSystemNotification(
            lowStockProducts.length === 1 ? `Stock Bajo: ${lowStockProducts[0].nombre}` : 'Alerta de Inventario',
            lowStockProducts.length === 1
              ? `Quedan solo ${lowStockProducts[0].stock} unidades.`
              : `Hay ${lowStockProducts.length} productos con stock bajo.`,
            'urgent',
            'productos'
          ));
        }

        // Debt Check
        const overdueDebts = deudas.filter(d => d.fechaVencimiento && new Date(d.fechaVencimiento) < now);
        if (overdueDebts.length > 0) {
          systemNotifications.push(this.createSystemNotification(
            'Deudas Vencidas',
            `Tienes ${overdueDebts.length} cuentas por cobrar vencidas.`,
            'warning',
            'finanzas'
          ));
        }

        // Caja Check
        if (caja) {
          if (!caja.fechaCierre) {
            const openTime = new Date(caja.fechaApertura).getTime();
            const hoursOpen = (now.getTime() - openTime) / (1000 * 60 * 60);
            if (hoursOpen > 12) {
              systemNotifications.push(this.createSystemNotification(
                'Caja Abierta',
                `La caja lleva abierta ${Math.floor(hoursOpen)} horas.`,
                'info',
                'finanzas'
              ));
            }
          }
        } else {
          systemNotifications.push(this.createSystemNotification(
            'Caja Cerrada',
            'Abre caja para comenzar el día.',
            'info',
            'dashboard'
          ));
        }

        return systemNotifications;
      })
    );
  }

  private createSystemNotification(title: string, message: string, type: NotificationType, link?: string): AppNotification {
    return {
      id: `sys-${title.replace(/\s/g, '-')}`,
      title,
      message,
      type,
      read: false,
      timestamp: new Date(),
      link,
      source: 'system'
    };
  }

  markAsRead(id: string | number) {
    if (typeof id === 'number') {
      // Backend notification
      this.http.put(`${this.apiUrl}/${id}/leer`, {}).subscribe(() => {
        this.updateLocalReadStatus(id);
      });
    } else {
      // System local notification
      this.updateLocalReadStatus(id);
    }
  }

  private updateLocalReadStatus(id: string | number) {
    const current = this.notifications.value;
    const updated = current.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications.next(updated);
  }

  markAllAsRead() {
    this.http.put(`${this.apiUrl}/leer-todas`, {}).subscribe(() => {
      const current = this.notifications.value;
      const updated = current.map(n => ({ ...n, read: true }));
      this.notifications.next(updated);
    });
  }

  deleteNotification(id: string | number) {
    if (typeof id === 'number') {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
        this.removeLocalNotification(id);
      });
    } else {
      this.removeLocalNotification(id);
    }
  }

  private removeLocalNotification(id: string | number) {
    const current = this.notifications.value;
    const updated = current.filter(n => n.id !== id);
    this.notifications.next(updated);
  }

  // Create a persistent notification for a specific user
  // This would usually be called from other services or backend
  addPersistentNotification(notif: { titulo: string, mensaje: string, tipo?: string, link?: string }) {
    return this.http.post(this.apiUrl, notif).pipe(
      tap(() => this.refreshNotifications())
    );
  }
}
