import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ClientesServices, EstadoCuenta } from 'src/app/core/services/cliente.service';
import { Cliente } from 'src/app/core/models/cliente';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ClientEditModalComponent } from './components/client-edit-modal/client-edit-modal.component';
import { addIcons } from 'ionicons';
import { createOutline, powerOutline, documentTextOutline, closeOutline, personOutline, searchOutline, filterOutline } from 'ionicons/icons';
import { AlertService } from 'src/app/shared/services/alert.service';

type FiltroEstado = 'TODOS' | 'CON_DEUDA' | 'SIN_DEUDA' | 'CON_FIADOS' | 'SIN_FIADOS';

@Component({
  standalone: false,
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  filtrados: Cliente[] = [];
  searchTerm = '';
  filtroEstado: FiltroEstado = 'TODOS';
  loading = false;

  seleccionado: Cliente | null = null;
  estadoCuenta: EstadoCuenta | null = null;
  loadingEstado = false;

  constructor(
    private clientesService: ClientesServices,
    private modalController: ModalController,
    private alertService: AlertService
  ) {
    addIcons({ createOutline, powerOutline, documentTextOutline, closeOutline, personOutline, searchOutline, filterOutline });
  }

  ngOnInit() {
    this.cargarClientes();
    this.clientesService.clienteCreado$.subscribe((nuevo) => {
      const existe = this.clientes.some(c => c.id === nuevo.id);
      this.clientes = existe ? this.clientes.map(c => c.id === nuevo.id ? nuevo : c) : [nuevo, ...this.clientes];
      this.aplicarFiltros();
    });
  }

  cargarClientes() {
    this.loading = true;
    this.clientesService.listarClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        this.alertService.error('Error al cargar clientes');
      }
    });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail?.value || '';
    this.aplicarFiltros();
  }

  onFilterChange(event: any) {
    this.filtroEstado = event.detail?.value || 'TODOS';
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let temp = [...this.clientes];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(c =>
        c.nombre.toLowerCase().includes(term) ||
        (c.cedula || '').toLowerCase().includes(term) ||
        (c.telefono || '').toLowerCase().includes(term)
      );
    }

    if (this.filtroEstado === 'CON_DEUDA' || this.filtroEstado === 'CON_FIADOS') {
      temp = temp.filter(c => (c.saldoDeuda || 0) > 0);
    } else if (this.filtroEstado === 'SIN_DEUDA' || this.filtroEstado === 'SIN_FIADOS') {
      temp = temp.filter(c => (c.saldoDeuda || 0) === 0);
    }

    this.filtrados = temp;
  }

  creditoDisponible(c: Cliente) {
    const max = c.creditoMaximo || 0;
    const deuda = c.saldoDeuda || 0;
    return Math.max(max - deuda, 0);
  }

  async verEstado(cliente: Cliente) {
    this.seleccionado = cliente;
    this.estadoCuenta = null;
    this.loadingEstado = true;

    this.clientesService.obtenerEstadoCuenta(cliente.id).subscribe({
      next: (data) => {
        this.estadoCuenta = data;
        this.loadingEstado = false;
      },
      error: async () => {
        this.loadingEstado = false;
        this.alertService.alert('Error', 'No se pudo obtener el estado de cuenta', 'error');
      }
    });
  }

  async editarCliente(cliente: Cliente) {
    const modal = await this.modalController.create({
      component: ClientEditModalComponent,
      componentProps: { cliente }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.loading = true;
      this.clientesService.actualizarCliente(data, cliente.id).subscribe({
        next: async (actualizado) => {
          this.loading = false;
          // Actualizar lista local
          this.clientes = this.clientes.map(c => c.id === actualizado.id ? actualizado : c);
          this.aplicarFiltros();
          
          this.alertService.success('Cliente actualizado correctamente');
        },
        error: async (err) => {
          this.loading = false;
          console.error(err);
          this.alertService.error('No se pudo actualizar el cliente');
        }
      });
    }
  }

  async toggleActivo(cliente: Cliente) {
    const nuevoEstado = !cliente.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const confirmed = await this.alertService.confirm(
      `Confirmar ${accion}`,
      `¿Está seguro de que desea ${accion} al cliente ${cliente.nombre}?`,
      'Sí, confirmar',
      'Cancelar'
    );

    if (confirmed) {
      this.loading = true;
      this.clientesService.actualizarCliente({ activo: nuevoEstado }, cliente.id).subscribe({
        next: async (actualizado) => {
          this.loading = false;
          this.clientes = this.clientes.map(c => c.id === actualizado.id ? actualizado : c);
          this.aplicarFiltros();
          this.alertService.success(`Cliente ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
        },
        error: async () => {
          this.loading = false;
          this.alertService.error('Error al cambiar estado');
        }
      });
    }
  }

  cerrarDetalle() {
    this.seleccionado = null;
    this.estadoCuenta = null;
  }
}
