import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';

@Component({
  selector: 'app-formulario-restaurante',
  templateUrl: './formulario-restaurante.component.html',
  styleUrls: ['./formulario-restaurante.component.scss'],
  standalone: false
})
export class FormularioRestauranteComponent {
  @Input() parentForm!: FormGroup;
}
