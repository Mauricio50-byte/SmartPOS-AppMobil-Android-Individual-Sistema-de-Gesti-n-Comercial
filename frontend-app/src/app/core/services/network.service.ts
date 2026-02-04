import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, map } from 'rxjs';
import Swal from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class NetworkService {
    private onlineStatus$ = new BehaviorSubject<boolean>(navigator.onLine);

    constructor() {
        this.initNetworkMonitoring();
        // Check initial status
        if (!navigator.onLine) {
            this.showConnectionAlert(false);
        }
    }

    private initNetworkMonitoring() {
        merge(
            fromEvent(window, 'online').pipe(map(() => true)),
            fromEvent(window, 'offline').pipe(map(() => false))
        ).subscribe(status => {
            this.onlineStatus$.next(status);
            this.showConnectionAlert(status);
        });
    }

    private showConnectionAlert(isOnline: boolean) {
        if (!isOnline) {
            Swal.fire({
                title: 'Sin conexión',
                text: 'Se ha perdido la conexión a internet. Algunas funciones pueden no estar disponibles.',
                icon: 'warning',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                background: '#fff',
                color: '#721c24',
                iconColor: '#f8d7da'
            });
        } else {
            Swal.fire({
                title: 'Conexión restablecida',
                text: 'Vuelves a estar en línea.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        }
    }

    get isOnline$(): Observable<boolean> {
        return this.onlineStatus$.asObservable();
    }

    get currentStatus(): boolean {
        return this.onlineStatus$.value;
    }
}
