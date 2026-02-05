import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { VentaServices } from 'src/app/core/services/venta.service';
import { ClientesServices } from 'src/app/core/services/cliente.service';
import { CajaService } from 'src/app/core/services/caja.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Cliente } from 'src/app/core/models/cliente';
import { Producto } from 'src/app/core/models/producto';
import { AlertService } from 'src/app/shared/services/alert.service';

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
    private alertService: AlertService
  ) {
    this.ventaForm = this.fb.group({
      fecha: [new Date().toISOString(), Validators.required],
      usuarioId: [this.currentUserId, Validators.required],
      total: [0, [Validators.required, Validators.min(0)]],
      clienteId: [null],
      metodoPago: ['EFECTIVO', Validators.required],
      estadoPago: ['PAGADO', Validators.required],
      montoPagado: [0],
      montoRecibido: [0], // Nuevo
      registrarCliente: [false],
      datosCliente: this.fb.group({
        nombre: ['', Validators.required],
        telefono: ['', Validators.required],
        cedula: [''],
        correo: ['', [Validators.email]],
        creditoMaximo: [0],
        diasCredito: [30]
      }),
      detalles: this.fb.array([], Validators.required),
      puntosARedimir: [0, [Validators.min(0)]]
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

    // Vigilante de puntos en tiempo real
    this.ventaForm.get('puntosARedimir')?.valueChanges.subscribe(val => {
      if (this.clienteSeleccionado && val) {
        const puntosIngresados = this.puntosARedimirValue;
        const puntosMaximos = this.clienteSeleccionado.puntos || 0;

        if (puntosIngresados > puntosMaximos) {
          this.alertService.toast(`El cliente solo cuenta con ${puntosMaximos.toLocaleString()} puntos`, 'warning');
        }

        // Validar también contra el total de la venta
        const totalVenta = this.detalles.controls.reduce((acc, ctrl) => acc + ctrl.value.total, 0);
        const puntosMaximosVenta = Math.ceil(totalVenta / this.valorPunto);
        if (puntosIngresados > puntosMaximosVenta && puntosIngresados <= puntosMaximos) {
          this.alertService.toast(`No puede redimir más del total de la venta`, 'info');
        }
      }
    });
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

  get montoRecibido(): number {
    return this.ventaForm.get('montoRecibido')?.value || 0;
  }

  get cambio(): number {
    const cambio = this.montoRecibido - this.totalConDescuento;
    return cambio > 0 ? cambio : 0;
  }

  get itemsCount(): number {
    return this.detalles.length;
  }

  get puntosARedimir(): number {
    return this.ventaForm.get('puntosARedimir')?.value || 0;
  }

  get valorPunto(): number {
    return 10; // 1 punto = $10
  }

  get puntosARedimirValue(): number {
    const val = this.ventaForm.get('puntosARedimir')?.value;
    if (typeof val === 'string') {
      return Number(val.replace(/\./g, '')) || 0;
    }
    return Number(val || 0);
  }

  get descuentoPuntos(): number {
    const puntos = this.puntosARedimirValue;
    const puntosMaximos = this.clienteSeleccionado?.puntos || 0;
    const totalVenta = this.detalles.controls.reduce((acc, ctrl) => acc + ctrl.value.total, 0);
    const puntosMaximosVenta = Math.ceil(totalVenta / this.valorPunto);

    // Si los puntos exceden el máximo del cliente o el total de la venta, o si son > 0 pero < 100, no aplicar descuento.
    // Esto obliga al usuario a corregir el número para ver el beneficio.
    if (puntos > puntosMaximos || puntos > puntosMaximosVenta || (puntos > 0 && puntos < 100)) {
      return 0;
    }

    return puntos * this.valorPunto;
  }

  get totalConDescuento(): number {
    const total = this.detalles.controls.reduce((acc, ctrl) => acc + ctrl.value.total, 0);
    const totalFinal = total - this.descuentoPuntos;
    return totalFinal > 0 ? totalFinal : 0;
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
    // El total que se muestra y se envía debe ser el total original, 
    // pero el front debe reflejar el descuento al usuario
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
        registrarCliente: false,
        puntosARedimir: 0
      });
      this.datosClienteGroup.disable();

      // Actualizar validadores de puntos
      const puntosControl = this.ventaForm.get('puntosARedimir');
      if (puntosControl) {
        puntosControl.setValidators([
          Validators.min(0),
          Validators.max(cliente.puntos || 0)
        ]);
        puntosControl.updateValueAndValidity();
      }
    } else {
      this.ventaForm.patchValue({
        clienteId: null,
        puntosARedimir: 0
      });
      this.ventaForm.get('puntosARedimir')?.setValidators([Validators.min(0)]);
      this.ventaForm.get('puntosARedimir')?.updateValueAndValidity();
    }
    this.mostrarRegistroCliente = false;
    if (!cliente) {
      this.datosClienteGroup.disable();
    }
  }

  cancelarRegistroCliente() {
    this.mostrarRegistroCliente = false;
    this.ventaForm.patchValue({ registrarCliente: false });
    this.datosClienteGroup.reset({
      nombre: '',
      telefono: '',
      cedula: '',
      correo: '',
      creditoMaximo: 0,
      diasCredito: 30
    });
    this.datosClienteGroup.disable();
  }

  async mostrarModalRegistroCliente() {
    const confirmed = await this.alertService.confirm(
      '¿Registrar Cliente?',
      '¿El cliente desea registrarse para acumular puntos y tener acceso a crédito?',
      'Sí, registrar',
      'No'
    );

    if (confirmed) {
      this.mostrarRegistroCliente = true;
      this.ventaForm.patchValue({ registrarCliente: true });
      this.datosClienteGroup.enable();
    } else {
      this.mostrarRegistroCliente = false;
      this.ventaForm.patchValue({ registrarCliente: false });
      this.datosClienteGroup.disable();
    }
  }

  async registrarNuevoCliente(datos: any) {
    this.alertService.showLoading('Registrando cliente...', 'Por favor espere.');

    this.clienteService.crearCliente(datos).subscribe({
      next: async (nuevoCliente) => {
        this.alertService.closeLoading();
        this.datosClienteGroup.reset({
          nombre: '',
          telefono: '',
          cedula: '',
          correo: '',
          creditoMaximo: 0,
          diasCredito: 30
        });
        this.mostrarRegistroCliente = false;
        this.ventaForm.patchValue({ registrarCliente: false });
        this.datosClienteGroup.disable();
        await this.mostrarAlerta('Cliente Registrado', 'El cliente ha sido registrado exitosamente.');
      },
      error: async (err) => {
        this.alertService.closeLoading();
        console.error('Error al registrar cliente', err);
        await this.mostrarAlerta('Error', 'No se pudo registrar el cliente');
      }
    });
  }

  async validarCreditoDisponible(): Promise<boolean> {
    if (!this.clienteSeleccionado) return false;

    this.alertService.showLoading('Validando crédito...', 'Verificando saldo disponible.');

    return new Promise((resolve) => {
      this.clienteService.validarCredito(
        this.clienteSeleccionado!.id,
        this.totalControl.value
      ).subscribe({
        next: async (validacion) => {
          this.alertService.closeLoading();

          if (!validacion.disponible) {
            await this.mostrarAlerta(
              'Crédito Insuficiente',
              `El cliente no tiene crédito suficiente.\n\n` +
              `Crédito máximo: $${validacion.creditoMaximo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}\n` +
              `Deuda actual: $${validacion.saldoDeuda.toLocaleString('es-CO', { maximumFractionDigits: 0 })}\n` +
              `Crédito disponible: $${validacion.creditoDisponible.toLocaleString('es-CO', { maximumFractionDigits: 0 })}\n` +
              `Monto solicitado: $${validacion.montoSolicitado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
            );
            resolve(false);
          } else {
            resolve(true);
          }
        },
        error: async (err) => {
          this.alertService.closeLoading();
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
      const puntosControl = this.ventaForm.get('puntosARedimir');
      if (puntosControl?.errors?.['max']) {
        await this.mostrarAlerta('Puntos Insuficientes', `No puede redimir más de ${this.clienteSeleccionado?.puntos} puntos.`);
        return;
      }
      if (puntosControl?.errors?.['min'] || (puntosControl?.value > 0 && puntosControl?.value < 100)) {
        await this.mostrarAlerta('Mínimo de Puntos', 'El mínimo para redimir son 100 puntos.');
        return;
      }

      await this.mostrarAlerta('Formulario Inválido', 'Por favor revise los datos de la venta. Asegúrese de que todos los campos requeridos estén completos.');
      return;
    }

    const confirmed = await this.alertService.confirm(
      'Confirmar Venta',
      `¿Confirma procesar la venta por valor de $${this.totalConDescuento.toLocaleString('es-CO', { maximumFractionDigits: 0 })}?`,
      'Procesar Venta'
    );

    if (confirmed) {
      this.procesarVentaReal();
    }
  }

  async verificarCajaAbierta(): Promise<boolean> {
    this.alertService.showLoading('Verificando caja...', 'Comprobando estado actual.');

    return new Promise((resolve) => {
      this.cajaService.obtenerEstadoCaja().subscribe({
        next: async (caja) => {
          this.alertService.closeLoading();
          if (caja && caja.estado === 'ABIERTA') {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: async (err) => {
          this.alertService.closeLoading();
          resolve(false);
        }
      });
    });
  }

  async mostrarAlertaCambio(cambio: number) {
    // Usamos es-CO para asegurar puntos de miles (ej: 5.000) y 0 decimales
    const cambioFormateado = cambio.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    await this.alertService.alert(
      'Cambio a Entregar',
      `Por favor entregue el vuelto al cliente: $${cambioFormateado}`,
      'info'
    );
  }

  async procesarVentaReal() {
    try {
      this.alertService.showLoading('Procesando venta...', 'Generando factura y aplicando descuentos.');

      const ventaData = this.ventaForm.value;
      const montoRecibido = Number(ventaData.montoRecibido || 0);
      const total = this.totalConDescuento; // Usar el total con descuento para el cambio

      // Verificar si hay cambio que entregar ANTES de llamar al servicio
      if (ventaData.metodoPago === 'EFECTIVO' && montoRecibido > total) {
        const cambio = montoRecibido - total;
        // Cerramos el loading momentáneamente para mostrar el cambio
        this.alertService.closeLoading();
        await this.mostrarAlertaCambio(cambio);
        // Volvemos a mostrar el loading
        this.alertService.showLoading('Finalizando proceso...', 'Guardando información de la venta.');
      }

      this.ventaForm.patchValue({ fecha: new Date().toISOString() });

      const payload: any = {
        usuarioId: ventaData.usuarioId,
        metodoPago: ventaData.metodoPago,
        estadoPago: ventaData.estadoPago,
        montoRecibido: Number(ventaData.montoRecibido || 0),
        puntosARedimir: this.puntosARedimirValue,
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
            registrarCliente: false,
            puntosARedimir: 0,
            montoRecibido: 0 // Limpiar monto recibido
          });
          this.datosClienteGroup.reset({
            nombre: '',
            telefono: '',
            cedula: '',
            correo: '',
            creditoMaximo: 0,
            diasCredito: 30
          });
          this.datosClienteGroup.disable();

          this.alertService.closeLoading();

          let mensaje = `Total: $${venta.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}\nMetodo: ${venta.metodoPago}`;
          if (venta.estadoPago === 'FIADO') mensaje += `\n\n⚠️ Venta FIADA registrada`;

          await this.alertService.alert(
            '¡Venta Exitosa!',
            mensaje,
            'success'
          );

          // Siempre recargar para actualizar puntos si hubo un cliente
          if (payload.clienteId || payload.registrarCliente) {
            this.loadClientes();
          }
        },
        error: async (err) => {
          console.error('Error creating sale:', err);
          this.alertService.closeLoading();

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
      this.alertService.closeLoading();
      await this.mostrarAlerta('Error Crítico', 'Ocurrió un error inesperado al intentar procesar la venta.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    // Map header to icon roughly
    let icon: any = 'info';
    if (header.toLowerCase().includes('error') || header.toLowerCase().includes('crítico')) icon = 'error';
    if (header.toLowerCase().includes('atención') || header.toLowerCase().includes('advertencia') || header.toLowerCase().includes('caja cerrada')) icon = 'warning';
    if (header.toLowerCase().includes('éxito') || header.toLowerCase().includes('correctamente')) icon = 'success';

    await this.alertService.alert(header, message, icon);
  }

  async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger', duration: number = 2000) {
    let icon: any = 'info';
    if (color === 'success') icon = 'success';
    if (color === 'danger') icon = 'error';
    if (color === 'warning') icon = 'warning';

    this.alertService.toast(message, icon, duration);
  }

  toggleCart() {
    this.closeCart.emit();
  }
}
