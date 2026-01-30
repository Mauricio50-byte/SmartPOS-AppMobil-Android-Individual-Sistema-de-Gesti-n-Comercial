import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-transaction-modal',
  templateUrl: './transaction-modal.component.html',
  styleUrls: ['./transaction-modal.component.scss'],
  standalone: false
})
export class TransactionModalComponent implements OnInit {
  @Input() title: string = 'Registrar';
  @Input() amountLabel: string = 'Monto';
  @Input() descriptionLabel: string = 'Descripción';
  @Input() confirmText: string = 'Registrar';
  @Input() cancelText: string = 'Cancelar';
  @Input() initialAmount: number | null = null;
  @Input() initialDescription: string = '';
  @Input() message: string = ''; // Optional message (e.g. for closing box expected balance)

  @Input() showCashPaymentFields: boolean = false; // Nuevo input para habilitar campos de pago en efectivo
  @Input() amountReceivedLabel: string = 'Monto Recibido';
  
  @Input() showPaymentMethodSelector: boolean = false; // Nuevo: Selector de método de pago

  form: FormGroup;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      monto: [null, [Validators.required, Validators.min(1)]],
      montoRecibido: [null], // Campo opcional por defecto
      descripcion: ['', Validators.required],
      metodoPago: ['EFECTIVO'] // Default updated
    });
  }

  ngOnInit() {
    if (this.initialAmount !== null) {
      this.form.patchValue({ monto: this.initialAmount });
    }
    if (this.initialDescription) {
      this.form.patchValue({ descripcion: this.initialDescription });
    }
    
    // Ajustar validador de descripción basado en el input descriptionRequired
    const descControl = this.form.get('descripcion');
    if (this.descriptionRequired) {
      descControl?.setValidators([Validators.required]);
    } else {
      descControl?.clearValidators();
    }
    descControl?.updateValueAndValidity();

    // Validadores condicionales para pago en efectivo
    if (this.showCashPaymentFields) {
      this.form.get('montoRecibido')?.setValidators([
        Validators.required, 
        Validators.min(0)
      ]);
    } else {
      this.form.get('montoRecibido')?.clearValidators();
    }
    this.form.get('montoRecibido')?.updateValueAndValidity();
  }

  get cambio(): number {
    const monto = this.form.get('monto')?.value || 0;
    const recibido = this.form.get('montoRecibido')?.value || 0;
    const diff = recibido - monto;
    return diff > 0 ? diff : 0;
  }

  @Input() descriptionRequired: boolean = true;

  cancel() {
    this.modalController.dismiss(null, 'cancel');
  }

  confirm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalController.dismiss(this.form.value, 'confirm');
  }
}
