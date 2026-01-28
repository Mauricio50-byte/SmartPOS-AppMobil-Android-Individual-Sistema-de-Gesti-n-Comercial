import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-formulario-farmacia',
  templateUrl: './formulario-farmacia.component.html',
  styleUrls: ['./formulario-farmacia.component.scss'],
  standalone: false
})
export class FormularioFarmaciaComponent {
  @Input() parentForm!: FormGroup;
}
