import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-restaurante',
  templateUrl: './formulario-restaurante.component.html',
  styleUrls: ['./formulario-restaurante.component.scss'],
  imports: [IonicModule, ReactiveFormsModule]
})
export class FormularioRestauranteComponent {
  @Input() parentForm!: FormGroup;
}
