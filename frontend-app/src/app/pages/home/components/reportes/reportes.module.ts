import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';

import { ReportesComponent } from './reportes.component';
import { ReportesContablesComponent } from './contables/reportes-contables.component';

@NgModule({
  declarations: [
    ReportesComponent,
    ReportesContablesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BaseChartDirective
  ],
  exports: [
    ReportesComponent,
    ReportesContablesComponent
  ]
})
export class ReportesModule { }
