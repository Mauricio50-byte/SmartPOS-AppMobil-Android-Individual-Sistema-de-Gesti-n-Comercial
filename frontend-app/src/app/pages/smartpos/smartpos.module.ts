import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { QueEsSmartposPage } from './que-es-smartpos.page';
import { ComoMeAyudaPage } from './como-me-ayuda.page';

const routes: Routes = [
    {
        path: 'que-es',
        component: QueEsSmartposPage
    },
    {
        path: 'como-ayuda',
        component: ComoMeAyudaPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes)
    ],
    declarations: [QueEsSmartposPage, ComoMeAyudaPage],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SmartposPageModule { }
