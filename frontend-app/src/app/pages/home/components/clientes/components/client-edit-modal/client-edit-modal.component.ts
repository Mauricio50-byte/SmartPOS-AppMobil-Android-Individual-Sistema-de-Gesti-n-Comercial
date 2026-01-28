import { Component, Input, OnInit } from '@angular/core';

import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from 'src/app/core/models/cliente';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';

@Component({
  selector: 'app-client-edit-modal',
  templateUrl: './client-edit-modal.component.html',
  styleUrls: ['./client-edit-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, NumericFormatDirective]
})
export class ClientEditModalComponent implements OnInit {
  @Input() cliente!: Cliente;
  editForm!: FormGroup;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.editForm = this.fb.group({
      nombre: [this.cliente.nombre, [Validators.required]],
      telefono: [this.cliente.telefono],
      cedula: [this.cliente.cedula],
      correo: [this.cliente.correo],
      creditoMaximo: [this.cliente.creditoMaximo || 0],
      saldoDeuda: [this.cliente.saldoDeuda || 0] // Allow editing balance
    });
  }

  cancelar() {
    this.modalController.dismiss(null, 'cancel');
  }

  guardar() {
    if (this.editForm.valid) {
      this.modalController.dismiss(this.editForm.value, 'confirm');
    }
  }
}
