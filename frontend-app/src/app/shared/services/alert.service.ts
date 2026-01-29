import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  /**
   * Muestra un mensaje tipo Toast (notificación flotante)
   * @param title Título o mensaje a mostrar
   * @param icon Icono (success, error, warning, info, question)
   * @param timer Tiempo en ms (default 3000)
   */
  toast(title: string, icon: SweetAlertIcon = 'success', timer: number = 3000) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center', // Centered position
      showConfirmButton: false,
      timer: timer,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
      customClass: {
        popup: 'colored-toast'
      },
      heightAuto: false
    });

    Toast.fire({
      icon: icon,
      title: title
    });
  }

  success(message: string, title: string = 'Éxito') {
    this.toast(message, 'success');
  }

  error(message: string, title: string = 'Error') {
    this.toast(message, 'error');
  }

  warning(message: string, title: string = 'Advertencia') {
    this.toast(message, 'warning');
  }

  info(message: string, title: string = 'Información') {
    this.toast(message, 'info');
  }

  /**
   * Muestra una alerta modal completa
   */
  async alert(title: string, text: string, icon: SweetAlertIcon = 'info') {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'OK',
      heightAuto: false,
      customClass: {
        container: 'swal2-container' // Ensure z-index
      }
    });
  }

  /**
   * Muestra una confirmación
   * @returns Promise<boolean> true si confirmó, false si canceló
   */
  async confirm(title: string, text: string, confirmButtonText: string = 'Sí, confirmar', cancelButtonText: string = 'Cancelar'): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText,
      cancelButtonText,
      heightAuto: false,
      customClass: {
        container: 'swal2-container'
      }
    });
    return result.isConfirmed;
  }

  /**
   * Generic fire method for custom alerts
   */
  async fire(options: SweetAlertOptions) {
    return Swal.fire({
      heightAuto: false,
      customClass: {
        container: 'swal2-container'
      },
      ...options
    });
  }
}
