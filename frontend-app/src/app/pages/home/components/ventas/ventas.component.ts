import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Producto } from 'src/app/core/models/producto';
import { ToastController } from '@ionic/angular';
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
    private toastController: ToastController
  ) {}

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
      this.aplicarFiltroModulosEnProductos();
    });
  }

  loadProducts() {
    this.isLoading = true;
    this.productoService.listarProductos().subscribe({
      next: (data) => {
        this.allProductos = data || [];
        this.productos = this.allProductos;
        this.filteredProductos = this.allProductos;
        this.aplicarFiltroModulosEnProductos();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando productos', err);
        this.mostrarToast('Error al cargar productos', 'danger');
        this.isLoading = false;
      }
    });
  }

  onSearch(event: any) {
    const term = event.target.value;
    this.searchTerm = term;
    if (!term) {
      this.filteredProductos = this.productos;
      return;
    }

    this.filteredProductos = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(term.toLowerCase())
    );
  }

  private aplicarFiltroModulosEnProductos() {
    if (!this.allowedTipos) {
      this.productos = this.allProductos;
    } else {
      this.productos = (this.allProductos || []).filter(p => this.allowedTipos!.has(String(p.tipo || 'GENERAL').toUpperCase()));
    }
    const term = this.searchTerm;
    if (!term) {
      this.filteredProductos = this.productos;
      return;
    }
    const lower = String(term).toLowerCase();
    this.filteredProductos = this.productos.filter(p => p.nombre.toLowerCase().includes(lower));
  }

  addToCart(product: Producto) {
    if (this.salesCart) {
      this.salesCart.addItem(product);
      this.searchTerm = '';
      this.filteredProductos = this.productos;
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
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}
