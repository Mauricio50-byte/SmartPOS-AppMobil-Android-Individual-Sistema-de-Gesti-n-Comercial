import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';

@Component({
  selector: 'app-formulario-servicios',
  templateUrl: './formulario-servicios.component.html',
  styleUrls: ['./formulario-servicios.component.scss'],
  standalone: false
})
export class FormularioServiciosComponent {
  @Input() parentForm!: FormGroup;
}
