import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-papeleria',
  templateUrl: './formulario-papeleria.component.html',
  styleUrls: ['./formulario-papeleria.component.scss'],
  imports: [IonicModule, ReactiveFormsModule]
})
export class FormularioPapeleriaComponent {
  @Input() parentForm!: FormGroup;
}
