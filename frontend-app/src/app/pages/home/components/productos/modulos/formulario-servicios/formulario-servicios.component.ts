import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';

@Component({
  standalone: true,
  selector: 'app-formulario-servicios',
  templateUrl: './formulario-servicios.component.html',
  styleUrls: ['./formulario-servicios.component.scss'],
  imports: [IonicModule, ReactiveFormsModule, NumericFormatDirective]
})
export class FormularioServiciosComponent {
  @Input() parentForm!: FormGroup;
}
