import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { VentaServices } from 'src/app/core/services/venta.service';
import { ClientesServices } from 'src/app/core/services/cliente.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Cliente } from 'src/app/core/models/cliente';
import { Producto } from 'src/app/core/models/producto';

@Component({
  selector: 'app-sales-cart',
  templateUrl: './sales-cart.component.html',
  styleUrls: ['./sales-cart.component.scss'],
  standalone: false
})
export class SalesCartComponent implements OnInit {
  @Input() cartVisibleMobile: boolean = false;
  @Output() closeCart = new EventEmitter<void>();
  @Output() cartUpdated = new EventEmitter<{ total: number, count: number }>();

  ventaForm: FormGroup;
  clientes: Cliente[] = [];
  tipoVenta: 'CONTADO' | 'FIADO' = 'CONTADO';
  clienteSeleccionado: Cliente | null = null;
  mostrarRegistroCliente: boolean = false;
  currentUserId: number = 1;

  constructor(
    private fb: FormBuilder,
    private ventaService: VentaServices,
    private clienteService: ClientesServices,
    private cajaService: CajaService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.ventaForm = this.fb.group({
      fecha: [new Date().toISOString(), Validators.required],
      usuarioId: [this.currentUserId, Validators.required],
      total: [0, [Validators.required, Validators.min(0)]],
      clienteId: [null],
      metodoPago: ['EFECTIVO', Validators.required],
      estadoPago: ['PAGADO', Validators.required],
      montoPagado: [0],
      registrarCliente: [false],
      datosCliente: this.fb.group({
        nombre: ['', Validators.required],
        telefono: ['', Validators.required],
        cedula: [''],
        correo: ['', [Validators.email]],
        creditoMaximo: [0],
        diasCredito: [30]
      }),
      detalles: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.loadClientes();
    this.loadCurrentUser();

    // Suscribirse a nuevos clientes
    this.clienteService.clienteCreado$.subscribe(cliente => {
      this.loadClientes();
      if (this.mostrarRegistroCliente) {
        this.onClienteSeleccionado(cliente);
      }
    });

    this.datosClienteGroup.disable();
  }

  loadCurrentUser() {
    this.authService.getPerfil$().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.ventaForm.patchValue({ usuarioId: user.id });
      }
    });
  }

  loadClientes() {
    this.clienteService.listarClientes().subscribe({
      next: (data) => {
        this.clientes = data.filter(c => c.activo !== false);
      },
      error: (err) => {
        console.error('Error cargando clientes', err);
      }
    });
  }

  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  get totalControl(): AbstractControl {
    return this.ventaForm.get('total')!;
  }

  get paymentMethodControl(): AbstractControl {
    return this.ventaForm.get('metodoPago')!;
  }

  get datosClienteGroup(): FormGroup {
    return this.ventaForm.get('datosCliente') as FormGroup;
  }

  get totalValue(): number {
    return this.totalControl.value || 0;
  }

  get itemsCount(): number {
    return this.detalles.length;
  }

  addItem(product: Producto) {
    const existingIndex = this.detalles.controls.findIndex(
      (ctrl) => ctrl.value.product.id === product.id
    );

    const precioVenta = Number(product.precioVenta) || 0;

    if (existingIndex > -1) {
      const control = this.detalles.at(existingIndex);
      const newQuantity = Number(control.value.quantity) + 1;
      control.patchValue({
        quantity: newQuantity,
        total: newQuantity * precioVenta
      });
    } else {
      const detalleGroup = this.fb.group({
        product: [product],
        productoId: [product.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        precioUnitario: [precioVenta, Validators.required],
        total: [precioVenta, Validators.required]
      });
      this.detalles.push(detalleGroup);
    }

    this.calculateTotal();
    this.mostrarToast('Producto agregado', 'success', 1000);
  }

  removeFromCart(index: number) {
    this.detalles.removeAt(index);
    this.calculateTotal();
  }

  updateQuantity(event: { item: any, quantity: number }, index: number) {
    const control = this.detalles.at(index);
    if (control) {
      const product = control.value.product;
      control.patchValue({
        quantity: event.quantity,
        total: event.quantity * product.precioVenta
      });
      this.calculateTotal();
    }
  }

  calculateTotal() {
    const total = this.detalles.controls.reduce((acc, ctrl) => acc + ctrl.value.total, 0);
    this.ventaForm.patchValue({ total: total });
    this.cartUpdated.emit({ total: total, count: this.detalles.length });
  }

  setPaymentMethod(method: string) {
    this.ventaForm.patchValue({ metodoPago: method });
  }

  setTipoVenta(value: any) {
    const tipo = value as 'CONTADO' | 'FIADO';
    this.tipoVenta = tipo;

    if (tipo === 'CONTADO') {
      this.ventaForm.patchValue({
        estadoPago: 'PAGADO'
      });
      this.mostrarRegistroCliente = false;
      this.ventaForm.patchValue({ registrarCliente: false });
      this.datosClienteGroup.disable();
    } else {
      this.ventaForm.patchValue({
        estadoPago: 'FIADO'
      });
    }
  }

  onClienteSeleccionado(cliente: Cliente | null) {
    this.clienteSeleccionado = cliente;
    if (cliente) {
      this.ventaForm.patchValue({
        clienteId: cliente.id,
        registrarCliente: false
      });
      this.datosClienteGroup.disable();
    } else {
      this.ventaForm.patchValue({
        clienteId: null
      });
    }
    this.mostrarRegistroCliente = false;
    if (!cliente) {
       this.datosClienteGroup.disable();
    }
  }

  cancelarRegistroCliente() {
    this.mostrarRegistroCliente = false;
    this.ventaForm.patchValue({ registrarCliente: false });
    this.datosClienteGroup.disable();
  }

  async mostrarModalRegistroCliente() {
    const alert = await this.alertController.create({
      header: '¿Registrar Cliente?',
      message: '¿El cliente desea registrarse para acumular puntos y tener acceso a crédito?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            this.mostrarRegistroCliente = false;
            this.ventaForm.patchValue({ registrarCliente: false });
            this.datosClienteGroup.disable();
          }
        },
        {
          text: 'Sí, registrar',
          handler: () => {
            this.mostrarRegistroCliente = true;
            this.ventaForm.patchValue({ registrarCliente: true });
            this.datosClienteGroup.enable();
          }
        }
      ]
    });

    await alert.present();
  }

  async registrarNuevoCliente(datos: any) {
    const loading = await this.loadingController.create({
      message: 'Registrando cliente...'
    });
    await loading.present();

    this.clienteService.crearCliente(datos).subscribe({
      next: async (nuevoCliente) => {
        await loading.dismiss();
        await this.mostrarAlerta('Cliente Registrado', 'El cliente ha sido registrado exitosamente.');
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Error al registrar cliente', err);
        await this.mostrarAlerta('Error', 'No se pudo registrar el cliente');
      }
    });
  }

  async validarCreditoDisponible(): Promise<boolean> {
    if (!this.clienteSeleccionado) return false;

    const loading = await this.loadingController.create({
      message: 'Validando crédito...'
    });
    await loading.present();

    return new Promise((resolve) => {
      this.clienteService.validarCredito(
        this.clienteSeleccionado!.id,
        this.totalControl.value
      ).subscribe({
        next: async (validacion) => {
          await loading.dismiss();

          if (!validacion.disponible) {
            await this.mostrarAlerta(
              'Crédito Insuficiente',
              `El cliente no tiene crédito suficiente.\n\n` +
              `Crédito máximo: $${validacion.creditoMaximo.toLocaleString()}\n` +
              `Deuda actual: $${validacion.saldoDeuda.toLocaleString()}\n` +
              `Crédito disponible: $${validacion.creditoDisponible.toLocaleString()}\n` +
              `Monto solicitado: $${validacion.montoSolicitado.toLocaleString()}`
            );
            resolve(false);
          } else {
            resolve(true);
          }
        },
        error: async (err) => {
          await loading.dismiss();
          console.error('Error validando crédito', err);
          await this.mostrarAlerta('Error', 'No se pudo validar el crédito del cliente');
          resolve(false);
        }
      });
    });
  }

  async pagar() {
    if (this.detalles.length === 0) {
      await this.mostrarAlerta('Carrito Vacío', 'Agregue productos al carrito antes de pagar.');
      return;
    }

    if (this.tipoVenta === 'CONTADO') {
      const cajaAbierta = await this.verificarCajaAbierta();
      if (!cajaAbierta) {
        await this.mostrarAlerta(
          'Caja Cerrada',
          'No se pueden realizar ventas de contado porque no hay una caja abierta. Por favor abra la caja en la sección de Finanzas.'
        );
        return;
      }
    }

    if (this.tipoVenta === 'FIADO') {
      if (!this.clienteSeleccionado && !this.ventaForm.value.registrarCliente) {
        await this.mostrarAlerta(
          'Cliente Requerido',
          'Para ventas fiadas debe seleccionar un cliente o registrar uno nuevo'
        );
        return;
      }

      if (this.ventaForm.value.registrarCliente) {
        const datos = this.datosClienteGroup.value;
        if (!datos.nombre || !datos.telefono) {
          await this.mostrarAlerta(
            'Datos Incompletos',
            'Debe ingresar al menos el nombre y teléfono del cliente'
          );
          return;
        }
      }

      if (this.clienteSeleccionado) {
        const creditoValido = await this.validarCreditoDisponible();
        if (!creditoValido) return;
      }
    }

    if (!this.ventaForm.value.registrarCliente && this.datosClienteGroup.enabled) {
      this.datosClienteGroup.disable();
    }

    if (this.ventaForm.invalid) {
      await this.mostrarAlerta('Formulario Inválido', 'Por favor revise los datos de la venta. Asegúrese de que todos los campos requeridos estén completos.');
      return;
    }

    const confirmAlert = await this.alertController.create({
      header: 'Confirmar Venta',
      subHeader: this.tipoVenta === 'FIADO' ? 'Venta a Crédito' : 'Venta de Contado',
      message: `¿Confirma procesar la venta por valor de $${this.totalControl.value.toLocaleString()}?`,
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel'
        },
        {
          text: 'Procesar Venta',
          handler: () => {
            this.procesarVentaReal();
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  async verificarCajaAbierta(): Promise<boolean> {
    const loading = await this.loadingController.create({
      message: 'Verificando estado de caja...'
    });
    await loading.present();

    return new Promise((resolve) => {
      this.cajaService.obtenerEstadoCaja().subscribe({
        next: async (caja) => {
          await loading.dismiss();
          if (caja && caja.estado === 'ABIERTA') {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: async (err) => {
          await loading.dismiss();
          resolve(false);
        }
      });
    });
  }

  async procesarVentaReal() {
    let loading: HTMLIonLoadingElement | undefined;
    
    try {
      loading = await this.loadingController.create({
        message: 'Procesando venta...'
      });
      await loading.present();

      this.ventaForm.patchValue({ fecha: new Date().toISOString() });

      const ventaData = this.ventaForm.value;
      const payload: any = {
        usuarioId: ventaData.usuarioId,
        metodoPago: ventaData.metodoPago,
        estadoPago: ventaData.estadoPago,
        items: ventaData.detalles.map((d: any) => ({
          productoId: d.productoId,
          cantidad: d.quantity
        }))
      };

      if (this.clienteSeleccionado) {
        payload.clienteId = this.clienteSeleccionado.id;
      }

      if (ventaData.registrarCliente) {
        payload.registrarCliente = true;
        payload.datosCliente = ventaData.datosCliente;
      }

      if (ventaData.estadoPago === 'PAGADO') {
        payload.montoPagado = Number(ventaData.total);
      } else {
        payload.montoPagado = Number(ventaData.montoPagado || 0);
      }

      if (payload.usuarioId) {
        payload.usuarioId = Number(payload.usuarioId);
      }
      
      this.ventaService.crearVenta(payload).subscribe({
        next: async (venta) => {
          if (!venta) {
            // Fallback para venta nula
            venta = {
              id: 0,
              fecha: new Date().toISOString(),
              usuarioId: payload.usuarioId,
              detalles: [],
              total: payload.montoPagado || 0,
              metodoPago: payload.metodoPago,
              estadoPago: payload.estadoPago,
              montoPagado: payload.montoPagado || 0,
              saldoPendiente: 0,
              cliente: payload.registrarCliente ? payload.datosCliente : this.clienteSeleccionado
            } as any;
          }

          if (venta.cliente && payload.registrarCliente) {
            this.clienteService.notificarNuevoCliente(venta.cliente);
          }

          this.detalles.clear();
          this.calculateTotal();
          this.clienteSeleccionado = null;
          this.mostrarRegistroCliente = false;
          this.tipoVenta = 'CONTADO';
          this.ventaForm.patchValue({
            estadoPago: 'PAGADO',
            clienteId: null,
            registrarCliente: false
          });
          this.datosClienteGroup.reset();
          this.datosClienteGroup.disable();

          if (loading) await loading.dismiss();

          let mensaje = `Venta registrada correctamente.\nTotal: $${venta.total.toLocaleString()}\nMetodo: ${venta.metodoPago}`;
          if (venta.estadoPago === 'FIADO') mensaje += `\n\n⚠️ Venta FIADA registrada`;

          const successAlert = await this.alertController.create({
            header: '¡Venta Exitosa!',
            subHeader: venta.estadoPago === 'FIADO' ? 'Registrada en Cuentas por Cobrar' : 'Pago Registrado',
            message: mensaje,
            buttons: ['Aceptar'],
            cssClass: 'success-alert'
          });
          await successAlert.present();

          if (payload.registrarCliente) {
            this.loadClientes();
          }
        },
        error: async (err) => {
          console.error('Error creating sale:', err);
          if (loading) await loading.dismiss();
          
          let friendlyMsg = 'Hubo un problema de conexión o con el servidor.';
          if (err.error && err.error.message) {
            const serverMsg = err.error.message;
            if (serverMsg.includes('Stock insuficiente')) {
              friendlyMsg = 'No hay suficiente cantidad de productos en inventario.';
            } else if (serverMsg.includes('Cliente no encontrado')) {
              friendlyMsg = 'El cliente seleccionado no se encuentra en la base de datos.';
            } else {
              friendlyMsg = serverMsg;
            }
          }
          await this.mostrarAlerta('Atención', friendlyMsg);
        }
      });
    } catch (e) {
      console.error('Error inesperado:', e);
      if (loading) await loading.dismiss();
      await this.mostrarAlerta('Error Crítico', 'Ocurrió un error inesperado al intentar procesar la venta.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger', duration: number = 2000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  toggleCart() {
    this.closeCart.emit();
  }
}
