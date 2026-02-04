import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { merge } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, trash, shuffleOutline, addCircleOutline } from 'ionicons/icons';
import { Producto } from 'src/app/core/models/producto';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { CategoriaService } from 'src/app/core/services/categoria.service';
import { Categoria } from 'src/app/core/models/categoria';

import { FormularioRopaComponent } from '../formulario-ropa/formulario-ropa.component';
import { FormularioAlimentosComponent } from '../formulario-alimentos/formulario-alimentos.component';
import { FormularioServiciosComponent } from '../formulario-servicios/formulario-servicios.component';
import { FormularioFarmaciaComponent } from '../formulario-farmacia/formulario-farmacia.component';
import { FormularioPapeleriaComponent } from '../formulario-papeleria/formulario-papeleria.component';
import { FormularioRestauranteComponent } from '../formulario-restaurante/formulario-restaurante.component';
import { NumericFormatDirective } from 'src/app/shared/directives/numeric-format.directive';
import { CategoriaCrudComponent } from '../categoria-crud/categoria-crud.component';

function stockValidator(group: AbstractControl): ValidationErrors | null {
  const stock = Number(group.get('stock')?.value || 0);
  const stockMinimo = Number(group.get('stockMinimo')?.value || 0);

  if (stockMinimo > stock) {
    return { minStockGreaterThanStock: true };
  }
  return null;
}

@Component({
  selector: 'app-productos-form',
  templateUrl: './productos-form.component.html',
  styleUrls: ['./productos-form.component.scss'],
  standalone: false
})
export class ProductosFormComponent implements OnChanges, OnInit {
  @Input() product: Producto | null = null;
  @Input() modulosActivos: Set<string> = new Set();
  @Output() save = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  productForm: FormGroup;
  isEditing: boolean = false;
  categorias: Categoria[] = [];

  constructor(
    private fb: FormBuilder,
    private productoService: ProductosServices,
    private alertService: AlertService,
    private categoriaService: CategoriaService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.productForm = this.initForm();
    addIcons({ camera, trash, 'shuffle-outline': shuffleOutline, 'add-circle-outline': addCircleOutline });
    this.setupMarginCalculation();
    this.setupSkuGeneration();
  }

  ngOnInit() {
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.categoriaService.listarCategorias().subscribe({
      next: (cats) => this.categorias = cats,
      error: (err) => console.error('Error cargando categorias', err)
    });
  }

  async crearNuevaCategoria() {
    const modal = await this.modalController.create({
      component: CategoriaCrudComponent,
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.6,
      handle: true,
      cssClass: 'modal-categoria-crud'
    });

    await modal.present();

    // When modal closes, reload categories to refresh the list
    await modal.onWillDismiss();
    this.cargarCategorias();
  }

  setupSkuGeneration() {
    // Escuchar cambios en categoriaId (Select)
    this.productForm.get('categoriaId')?.valueChanges.pipe(
      distinctUntilChanged()
    ).subscribe(catId => {
      const cat = this.categorias.find(c => c.id === catId);
      if (cat) {
        // Actualizar texto categoria tambien
        this.productForm.patchValue({ categoria: cat.nombre }, { emitEvent: false });
        this.generarSkuAutomatico(cat.nombre);
      }
    });

    // Mantener compatibilidad si cambia el texto manual (aunque intentaremos ocultarlo)
    this.productForm.get('categoria')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(categoria => {
      const skuControl = this.productForm.get('sku');
      if (categoria && categoria.length >= 3) {
        if (skuControl?.pristine || !skuControl?.value) {
          this.generarSkuAutomatico(categoria);
        }
      }
    });
  }

  setupMarginCalculation() {
    // Escuchar cambios en precioCosto y precioVenta de forma combinada
    if (this.productForm.get('precioCosto') && this.productForm.get('precioVenta')) {
      merge(
        this.productForm.get('precioCosto')!.valueChanges,
        this.productForm.get('precioVenta')!.valueChanges
      ).pipe(
        debounceTime(100)
      ).subscribe(() => this.calculateMargin());
    }
  }

  calculateMargin() {
    // Asegurar que leemos números puros
    const costo = Number(this.productForm.get('precioCosto')?.value || 0);
    const venta = Number(this.productForm.get('precioVenta')?.value || 0);

    if (venta > 0) {
      // Fórmula de Margen de Utilidad Bruta: ((Venta - Costo) / Venta) * 100
      const utilidad = venta - costo;
      const margen = (utilidad / venta) * 100;

      // Redondear a 2 decimales y limitar rango 0-100 para limpieza visual
      const margenFinal = Math.max(0, Math.min(parseFloat(margen.toFixed(2)), 100));

      this.productForm.patchValue({ margenGanancia: margenFinal }, { emitEvent: false });
    } else {
      this.productForm.patchValue({ margenGanancia: 0 }, { emitEvent: false });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && this.product) {
      this.isEditing = true;
      this.patchForm(this.product);
    } else if (changes['product'] && !this.product) {
      this.isEditing = false;
      this.resetForm();
    }
  }

  initForm(): FormGroup {
    return this.fb.group({
      // Tipo de Item
      tipo: ['GENERAL', Validators.required],

      // Identificación
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      sku: [''],

      // Descripción
      descripcion: [''],
      imagen: [''],

      // Categorización
      categoriaId: [null],
      categoria: [''],
      subcategoria: [''],
      marca: [''],

      // Precios y Costos
      precioCosto: [0, [Validators.min(0)]],
      precioVenta: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0), Validators.max(100)]],
      porcentajeIva: [0, [Validators.min(0), Validators.max(100)]],

      // Inventario
      stock: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [0, [Validators.min(0)]],
      unidadMedida: [''],

      // Campos específicos para alimentos
      fechaVencimiento: [''],
      lote: [''],
      registroSanitario: [''],
      ingredientes: [''],
      esPerecedero: [true],
      temperaturaConservacion: [''],

      // Campos para ropa
      talla: [''],
      color: [''],
      material: [''],
      genero: [''],
      temporada: [''],

      // Campos específicos para servicios
      duracion: [null, [Validators.min(1)]],
      responsable: [''],
      requiereCita: [false],
      garantiaDias: [0],
      disponible: [true],

      // Campos específicos para farmacia
      componenteActivo: [''],
      presentacion: [''],
      dosis: [''],
      laboratorio: [''],
      requiereReceta: [false],
      registroInvima: [''],

      // Campos específicos para papelería
      tipoPapel: [''],
      gramaje: [''],
      dimensiones: [''],
      esKit: [false],

      // Campos específicos para restaurante
      tiempoPreparacion: [null],
      esVegano: [false],
      esVegetariano: [false],
      tieneAlcohol: [false],
      calorias: [null],

      // Margen de Ganancia
      margenGanancia: [0, [Validators.min(0)]],

      // Proveedor
      proveedor: [''],

      // Notas adicionales
      notas: [''],

      // Estado
      activo: [true]
    }, { validators: stockValidator });
  }

  patchForm(product: Producto) {
    this.previewImage = null;
    const formValue: any = {
      tipo: product.tipo || 'GENERAL',
      nombre: product.nombre,
      sku: product.sku || '',
      descripcion: product.descripcion || '',
      imagen: product.imagen || '',
      categoriaId: product.categoriaId || null,
      categoria: product.categoria || '',
      subcategoria: product.subcategoria || '',
      marca: product.marca || '',
      precioCosto: product.precioCosto || 0,
      precioVenta: product.precioVenta,
      descuento: product.descuento || 0,
      porcentajeIva: product.porcentajeIva || 0,
      stock: product.stock,
      stockMinimo: product.stockMinimo || 0,
      unidadMedida: product.unidadMedida || '',
      margenGanancia: product.margenGanancia || 0,
      proveedor: product.proveedor || '',
      notas: '', // Assuming notas is not in Producto interface or handled elsewhere, initializing empty
      activo: product.activo
    };

    if (product.detalleRopa) Object.assign(formValue, product.detalleRopa);
    if (product.detalleAlimento) Object.assign(formValue, product.detalleAlimento);
    if (product.detalleServicio) Object.assign(formValue, product.detalleServicio);
    if (product.detalleFarmacia) Object.assign(formValue, product.detalleFarmacia);
    if (product.detallePapeleria) Object.assign(formValue, product.detallePapeleria);
    if (product.detalleRestaurante) Object.assign(formValue, product.detalleRestaurante);

    this.productForm.patchValue(formValue);
  }

  resetForm() {
    this.previewImage = null;
    this.productForm.reset({
      tipo: 'GENERAL',
      nombre: '',
      sku: '',
      descripcion: '',
      imagen: '',
      categoriaId: null,
      categoria: '',
      subcategoria: '',
      marca: '',
      precioCosto: 0,
      precioVenta: 0,
      descuento: 0,
      porcentajeIva: 0,
      stock: 0,
      stockMinimo: 0,
      unidadMedida: '',
      fechaVencimiento: '',
      lote: '',
      registroSanitario: '',
      ingredientes: '',
      esPerecedero: true,
      temperaturaConservacion: '',
      talla: '',
      color: '',
      material: '',
      genero: '',
      temporada: '',
      duracion: null,
      responsable: '',
      requiereCita: false,
      garantiaDias: 0,
      disponible: true,
      componenteActivo: '',
      presentacion: '',
      dosis: '',
      laboratorio: '',
      requiereReceta: false,
      registroInvima: '',
      tipoPapel: '',
      gramaje: '',
      dimensiones: '',
      esKit: false,
      tiempoPreparacion: null,
      esVegano: false,
      esVegetariano: false,
      tieneAlcohol: false,
      calorias: null,
      margenGanancia: 0,
      proveedor: '',
      notas: '',
      activo: true
    });
  }

  previewImage: string | null = null;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
        this.productForm.patchValue({ imagen: this.previewImage });
        this.productForm.get('imagen')?.markAsDirty();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.previewImage = null;
    this.productForm.patchValue({ imagen: '' });
    this.productForm.get('imagen')?.markAsDirty();
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.save.emit(this.productForm.value);
  }

  onCancel() {
    this.cancelled.emit();
  }

  isModuleActive(moduleId: string): boolean {
    return this.modulosActivos.has(moduleId);
  }

  generarSkuAutomatico(categoriaInput?: string) {
    const categoria = categoriaInput || this.productForm.get('categoria')?.value;
    if (!categoria || categoria.length < 3) {
      return;
    }

    this.productoService.obtenerSiguienteSku(categoria).subscribe({
      next: (response: any) => {
        if (response && response.sku) {
          const currentSku = this.productForm.get('sku')?.value;
          // Solo actualizamos y notificamos si el SKU cambió
          if (currentSku !== response.sku) {
            this.productForm.patchValue({ sku: response.sku });
            // Notificar al usuario como se solicitó
            this.alertService.toast('Código SKU creado', 'success');
          }
        }
      },
      error: (err) => console.error('Error generando SKU:', err)
    });
  }
}
