import { Component, Input, OnInit } from '@angular/core';

import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from 'src/app/core/models/cliente';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';
import { addIcons } from 'ionicons';
import { closeOutline, lockClosedOutline, createOutline, helpCircleOutline, starOutline } from 'ionicons/icons';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  standalone: false,
  selector: 'app-client-edit-modal',
  templateUrl: './client-edit-modal.component.html',
  styleUrls: ['./client-edit-modal.component.scss']
})
export class ClientEditModalComponent implements OnInit {
  @Input() cliente!: Cliente;
  editForm!: FormGroup;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    addIcons({ closeOutline, lockClosedOutline, createOutline, helpCircleOutline, starOutline });
  }

  ngOnInit() {
    this.editForm = this.fb.group({
      nombre: [this.cliente.nombre, [Validators.required]],
      telefono: [this.cliente.telefono],
      cedula: [this.cliente.cedula],
      correo: [this.cliente.correo],
      creditoMaximo: [this.cliente.creditoMaximo || 0],
      saldoDeuda: [{ value: this.cliente.saldoDeuda || 0, disabled: true }], // Read only by default
      puntos: [{ value: this.cliente.puntos || 0, disabled: true }] // Read only by default
    });
  }

  async intentarEditarDeuda() {
    const deudaActual = this.cliente.saldoDeuda || 0;

    // Advertencia de seguridad
    const confirmed = await this.alertService.confirm(
      '¿Habilitar edición de deuda?',
      'Este campo es crítico para el sistema financiero. Solo debe editarse si el cliente tiene una deuda antigua NO registrada por facturas en el sistema.\n\n¿Desea continuar?',
      'Sí, habilitar',
      'Cancelar'
    );

    if (confirmed) {
      this.editForm.get('saldoDeuda')?.enable();
      this.alertService.toast('Edición de deuda habilitada. Tenga precaución.', 'warning');
    }
  }

  async intentarEditarPuntos() {
    // Advertencia de seguridad
    const confirmed = await this.alertService.confirm(
      '¿Habilitar edición de puntos?',
      'Se recomienda acumular puntos mediante ventas, pero si desea migrar saldos antiguos puede habilitar este campo.\n\n¿Desea continuar?',
      'Sí, habilitar',
      'Cancelar'
    );

    if (confirmed) {
      this.editForm.get('puntos')?.enable();
      this.alertService.toast('Edición de puntos habilitada.', 'warning');
    }
  }

  cancelar() {
    this.modalController.dismiss(null, 'cancel');
  }

  guardar() {
    if (this.editForm.valid) {
      this.modalController.dismiss(this.editForm.getRawValue(), 'confirm');
    }
  }
}
