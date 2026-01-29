import { Component, Input, OnInit } from '@angular/core';

import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from 'src/app/core/models/cliente';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';
import { addIcons } from 'ionicons';
import { closeOutline, lockClosedOutline } from 'ionicons/icons';

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
    private fb: FormBuilder
  ) {
    addIcons({ closeOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.editForm = this.fb.group({
      nombre: [this.cliente.nombre, [Validators.required]],
      telefono: [this.cliente.telefono],
      cedula: [this.cliente.cedula],
      correo: [this.cliente.correo],
      creditoMaximo: [this.cliente.creditoMaximo || 0],
      saldoDeuda: [{ value: this.cliente.saldoDeuda || 0, disabled: true }] // Read only
    });
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
