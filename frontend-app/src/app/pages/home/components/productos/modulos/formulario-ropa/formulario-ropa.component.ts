import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-ropa',
  templateUrl: './formulario-ropa.component.html',
  styleUrls: ['./formulario-ropa.component.scss'],
  imports: [IonicModule, ReactiveFormsModule]
})
export class FormularioRopaComponent {
  @Input() parentForm!: FormGroup;
}
