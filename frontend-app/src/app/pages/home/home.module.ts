import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { SharedModule } from '../../shared/shared.module';
import { VentasComponent } from './components/ventas/ventas.component';
import { ProductosComponent } from './components/productos/productos.component';
import { InventarioComponent } from './components/inventario/inventario.component';
import { ModalAjusteInventarioComponent } from './components/inventario/components/modal-ajuste-inventario/modal-ajuste-inventario.component';

import { HomePageRoutingModule } from './home-routing.module';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UsersComponent } from './components/users/users.component';
import { PermissionsModalComponent } from '../../shared/components/permissions-modal/permissions-modal.component';
import { ClientSelectorComponent } from './components/ventas/components/client-selector/client-selector.component';
import { ClientRegistrationFormComponent } from './components/ventas/components/client-registration-form/client-registration-form.component';
import { SalesCartComponent } from './components/ventas/components/sales-cart/sales-cart.component';
import { ModalDevolucionComponent } from './components/ventas/components/modal-devolucion/modal-devolucion.component';
import { ModulosComponent } from './components/modulos/modulos.component';
import { ProductosListaComponent } from './components/productos/modulos/productos-lista/productos-lista.component';
import { ProductosFormComponent } from './components/productos/modulos/productos-form/productos-form.component';
import { FinanzasComponent } from './components/finanzas/finanzas.component';
import { ClientesComponent } from './components/clientes/clientes.component';
import { ReportesModule } from './components/reportes/reportes.module';
import { BaseChartDirective } from 'ng2-charts';
import { CategoryDistributionComponent } from './components/dashboard/components/category-distribution/category-distribution.component';
import { TopCustomersComponent } from './components/dashboard/components/top-customers/top-customers.component';
import { PaymentDistributionComponent } from './components/dashboard/components/payment-distribution/payment-distribution.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { ManualUsuarioComponent } from './components/configuracion/components/manual-usuario/manual-usuario.component';
import { FormularioRopaComponent } from './components/productos/modulos/formulario-ropa/formulario-ropa.component';
import { FormularioAlimentosComponent } from './components/productos/modulos/formulario-alimentos/formulario-alimentos.component';
import { FormularioServiciosComponent } from './components/productos/modulos/formulario-servicios/formulario-servicios.component';
import { FormularioFarmaciaComponent } from './components/productos/modulos/formulario-farmacia/formulario-farmacia.component';
import { FormularioPapeleriaComponent } from './components/productos/modulos/formulario-papeleria/formulario-papeleria.component';
import { FormularioRestauranteComponent } from './components/productos/modulos/formulario-restaurante/formulario-restaurante.component';
import { CuentasPorPagarComponent } from './components/finanzas/components/cuentas-por-pagar/cuentas-por-pagar.component';
import { CuentasPorCobrarComponent } from './components/finanzas/components/cuentas-por-cobrar/cuentas-por-cobrar.component';
import { CajaComponent } from './components/caja/caja.component';
import { TransactionModalComponent } from './components/caja/components/transaction-modal/transaction-modal.component';
import { ClientEditModalComponent } from './components/clientes/components/client-edit-modal/client-edit-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    CurrencyPipe,
    BaseChartDirective,
    ReportesModule
  ],
  declarations: [
    HomePage,
    DashboardComponent,
    UsersComponent,
    VentasComponent,
    ProductosComponent,
    ClientSelectorComponent,
    ClientRegistrationFormComponent,
    SalesCartComponent,
    ModalDevolucionComponent,
    ModulosComponent,
    CategoryDistributionComponent,
    TopCustomersComponent,
    PaymentDistributionComponent,
    ConfiguracionComponent,
    ManualUsuarioComponent,
    ProductosListaComponent,
    ProductosFormComponent,
    FinanzasComponent,
    ClientesComponent,
    FormularioRopaComponent,
    FormularioAlimentosComponent,
    FormularioServiciosComponent,
    FormularioFarmaciaComponent,
    FormularioPapeleriaComponent,
    FormularioRestauranteComponent,
    CuentasPorPagarComponent,
    CuentasPorCobrarComponent,
    CajaComponent,
    TransactionModalComponent,
    ClientEditModalComponent,
    InventarioComponent,
    ModalAjusteInventarioComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule { }
