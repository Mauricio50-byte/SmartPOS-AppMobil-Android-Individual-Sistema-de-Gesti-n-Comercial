import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage = 'Ocurrió un error inesperado';

                if (error.status === 0) {
                    // A connection-level error occurred.
                    errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';

                    Swal.fire({
                        title: 'Error de Conexión',
                        text: errorMessage,
                        icon: 'error',
                        confirmButtonText: 'Reintentar',
                        confirmButtonColor: '#3085d6',
                        backdrop: `rgba(0,0,123,0.4)`
                    });
                }

                // You can add more error handling here (401, 403, 500 etc)
                // For now, focusing on connection errors as requested.

                return throwError(() => error);
            })
        );
    }
}
