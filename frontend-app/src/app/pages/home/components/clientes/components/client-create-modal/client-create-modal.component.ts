import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, personAddOutline, personOutline, callOutline, cardOutline, mailOutline, walletOutline, calendarOutline, saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-client-create-modal',
  templateUrl: './client-create-modal.component.html',
  styleUrls: ['./client-create-modal.component.scss'],
  standalone: false
})
export class ClientCreateModalComponent implements OnInit {
  datosClienteGroup: FormGroup;

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController
  ) {
    addIcons({ 
      closeOutline, 
      personAddOutline, 
      personOutline, 
      callOutline, 
      cardOutline, 
      mailOutline, 
      walletOutline, 
      calendarOutline, 
      saveOutline 
    });

    this.datosClienteGroup = this.fb.group({
      nombre: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      cedula: [''],
      correo: ['', [Validators.email]],
      creditoMaximo: [0],
      diasCredito: [30]
    });
  }

  ngOnInit() {}

  cancelar() {
    this.modalController.dismiss(null, 'cancel');
  }

  guardar(datos: any) {
    if (this.datosClienteGroup.valid) {
      this.modalController.dismiss(datos, 'confirm');
    }
  }
}
