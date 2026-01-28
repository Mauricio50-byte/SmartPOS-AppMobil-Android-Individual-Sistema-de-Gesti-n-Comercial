import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { ProductCardComponent } from './components/product-card/product-card.component';
import { CartItemComponent } from './components/cart-item/cart-item.component';
import { PaymentSelectorComponent } from './components/payment-selector/payment-selector.component';
import { PermissionsModalComponent } from './components/permissions-modal/permissions-modal.component';
import { NumericFormatDirective } from './directives/numeric-format.directive';

@NgModule({
    declarations: [
        ProductCardComponent,
        CartItemComponent,
        PaymentSelectorComponent,
        PermissionsModalComponent,
        NumericFormatDirective
    ],
    imports: [
        CommonModule,
        IonicModule,
        FormsModule
    ],
    exports: [
        ProductCardComponent,
        CartItemComponent,
        PaymentSelectorComponent,
        PermissionsModalComponent,
        NumericFormatDirective,
        CommonModule,
        IonicModule,
        FormsModule
    ]
})
export class SharedModule { }
