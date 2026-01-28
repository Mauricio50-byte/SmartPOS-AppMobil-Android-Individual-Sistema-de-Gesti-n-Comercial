import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-formulario-alimentos',
  templateUrl: './formulario-alimentos.component.html',
  styleUrls: ['./formulario-alimentos.component.scss'],
  standalone: false
})
export class FormularioAlimentosComponent {
  @Input() parentForm!: FormGroup;
}
