import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-farmacia',
  templateUrl: './formulario-farmacia.component.html',
  styleUrls: ['./formulario-farmacia.component.scss'],
  imports: [IonicModule, ReactiveFormsModule]
})
export class FormularioFarmaciaComponent {
  @Input() parentForm!: FormGroup;
}
