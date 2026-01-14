import { Component, Input } from '@angular/core';

import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-alimentos',
  templateUrl: './formulario-alimentos.component.html',
  styleUrls: ['./formulario-alimentos.component.scss'],
  imports: [IonicModule, ReactiveFormsModule]
})
export class FormularioAlimentosComponent {
  @Input() parentForm!: FormGroup;
}
