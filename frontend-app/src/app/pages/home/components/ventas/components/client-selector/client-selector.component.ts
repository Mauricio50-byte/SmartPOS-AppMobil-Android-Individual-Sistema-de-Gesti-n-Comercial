import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Cliente } from 'src/app/core/models/cliente';

@Component({
    standalone: false,
    selector: 'app-client-selector',
    templateUrl: './client-selector.component.html',
    styleUrls: ['./client-selector.component.scss'],
})
export class ClientSelectorComponent implements OnChanges {
    @Input() clientes: Cliente[] = [];
    @Input() clienteSeleccionado: Cliente | null = null;
    @Input() mostrarRegistroCliente: boolean = false;

    @Output() clienteSeleccionadoChange = new EventEmitter<Cliente | null>();
    @Output() nuevoClienteClick = new EventEmitter<void>();

    filteredClientes: Cliente[] = [];
    searchTerm: string = '';
    isModalOpen: boolean = false;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['clientes']) {
            this.filterClientes();
        }
    }

    openModal() {
        this.isModalOpen = true;
        this.searchTerm = '';
        this.filterClientes();
    }

    closeModal() {
        this.isModalOpen = false;
    }

    onSearch(event: any) {
        this.searchTerm = event.target.value;
        this.filterClientes();
    }

    filterClientes() {
        if (!this.searchTerm) {
            this.filteredClientes = this.clientes;
            return;
        }
        const term = this.searchTerm.toLowerCase();
        this.filteredClientes = this.clientes.filter(c => 
            c.nombre.toLowerCase().includes(term) || 
            (c.telefono && c.telefono.includes(term)) ||
            (c.cedula && c.cedula.includes(term))
        );
    }

    seleccionarCliente(cliente: Cliente) {
        this.clienteSeleccionadoChange.emit(cliente);
        this.closeModal();
    }

    limpiarCliente() {
        this.clienteSeleccionadoChange.emit(null);
    }

    abrirRegistroCliente() {
        this.nuevoClienteClick.emit();
        this.closeModal();
    }

    getAvatarColor(nombre: string): string {
        const colors = [
            'var(--ion-color-primary)',
            'var(--ion-color-secondary)',
            'var(--ion-color-tertiary)',
            'var(--ion-color-success)',
            'var(--ion-color-warning)',
            'var(--ion-color-danger)',
            '#7044ff',
            '#ff44aa',
            '#00ccff'
        ];
        let hash = 0;
        for (let i = 0; i < nombre.length; i++) {
            hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash % colors.length);
        return colors[index];
    }
}
