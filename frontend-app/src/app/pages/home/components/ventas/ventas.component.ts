import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Producto } from 'src/app/core/models/producto';
import { AlertService } from 'src/app/shared/services/alert.service';
import { SalesCartComponent } from './components/sales-cart/sales-cart.component';

@Component({
  standalone: false,
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss'],
})
export class VentasComponent implements OnInit {
  @ViewChild(SalesCartComponent) salesCart!: SalesCartComponent;

  allProductos: Producto[] = [];
  productos: Producto[] = [];
  filteredProductos: Producto[] = [];
  searchTerm: string = '';
  selectedCategoria: string = 'TODOS';
  categorias: string[] = [];

  private allowedTipos: Set<string> | null = null;
  private moduloIdToTipo: Record<string, string> = {
    ropa: 'ROPA',
    alimentos: 'ALIMENTO',
    servicios: 'SERVICIO',
    farmacia: 'FARMACIA',
    papeleria: 'PAPELERIA',
    restaurante: 'RESTAURANTE'
  };

  // Vista móvil
  cartVisibleMobile: boolean = false;
  isLoading: boolean = false;

  // Estado del carrito para el footer móvil
  cartTotal: number = 0;
  cartItemCount: number = 0;

  constructor(
    private productoService: ProductosServices,
    private authService: AuthService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.loadProducts();
    this.loadAllowedModules();

    // Suscribirse a cambios en productos
    this.productoService.productoChanged$.subscribe(() => {
      this.loadProducts();
    });
  }

  loadAllowedModules() {
    this.authService.getPerfil$().subscribe(user => {
      const modulos = Array.isArray(user?.modulos) ? user!.modulos : [];
      const tipos = new Set<string>(['GENERAL']);
      for (const moduloId of modulos) {
        const tipo = this.moduloIdToTipo[String(moduloId).toLowerCase()];
        if (tipo) tipos.add(tipo);
      }
      this.allowedTipos = tipos;
      this.aplicarFiltros();
    });
  }

  loadProducts() {
    this.isLoading = true;
    this.productoService.listarProductos().subscribe({
      next: (data) => {
        // Ordenar por ID descendente: los más nuevos primero
        const sorted = (data || []).slice().sort((a, b) => b.id - a.id);
        this.allProductos = sorted;
        this.productos = sorted;
        this.buildCategorias();
        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando productos', err);
        this.mostrarToast('Error al cargar productos', 'danger');
        this.isLoading = false;
      }
    });
  }

  /** Extrae la lista de categorías únicas para el selector de filtro */
  private buildCategorias() {
    const cats = new Set<string>();
    this.allProductos.forEach(p => {
      const cat = p.categoria || p.tipo;
      if (cat) cats.add(cat);
    });
    this.categorias = Array.from(cats).sort();
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value ?? '';
    this.aplicarFiltros();
  }

  onCategoriaChange(event: any) {
    this.selectedCategoria = event.detail.value;
    this.aplicarFiltros();
  }

  private aplicarFiltros() {
    // Se eliminó el filtro estricto por módulos: aparecen todos los productos en Ventas
    let temp = this.allProductos;

    // Filtro por categoría
    if (this.selectedCategoria && this.selectedCategoria !== 'TODOS') {
      temp = temp.filter(p =>
        p.categoria === this.selectedCategoria || p.tipo === this.selectedCategoria
      );
    }

    // Filtro por búsqueda
    const term = this.searchTerm?.toLowerCase().trim();
    if (term) {
      temp = temp.filter(p =>
        p.nombre.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.proveedor && p.proveedor.toLowerCase().includes(term))
      );
    }

    this.productos = this.allProductos;
    this.filteredProductos = temp;
  }

  addToCart(product: Producto) {
    if (this.salesCart) {
      this.salesCart.addItem(product);
      this.searchTerm = '';
      this.selectedCategoria = 'TODOS';
      this.filteredProductos = this.allProductos;
    } else {
      console.error('SalesCart component not found');
    }
  }

  toggleCartMobile() {
    this.cartVisibleMobile = !this.cartVisibleMobile;
  }

  onCartUpdate(event: { total: number, count: number }) {
    this.cartTotal = event.total;
    this.cartItemCount = event.count;
  }

  async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger', duration: number = 2000) {
    let icon: any = 'info';
    if (color === 'success') icon = 'success';
    if (color === 'danger') icon = 'error';
    if (color === 'warning') icon = 'warning';
    this.alertService.toast(message, icon, duration);
  }
}
