import { Component, OnInit } from '@angular/core';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { Producto } from 'src/app/core/models/producto';
import { LoadingController } from '@ionic/angular';
import { ModuloService } from 'src/app/core/services/modulo.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  standalone: false,
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss'],
})
export class ProductosComponent implements OnInit {
  segment: 'info' | 'gestion' = 'info';
  products: Producto[] = [];
  selectedProduct: Producto | null = null;
  modulosActivos: Set<string> = new Set();
  isLoading: boolean = false;

  constructor(
    private productoService: ProductosServices,
    private moduloService: ModuloService,
    private loadingController: LoadingController,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadModulos();
  }

  loadModulos() {
    this.moduloService.listarModulos().subscribe(modulos => {
      const nuevosModulos = new Set<string>();
      modulos.forEach(m => {
        if (m.activo) nuevosModulos.add(m.id);
      });
      this.modulosActivos = nuevosModulos;
    });
  }

  segmentChanged(event: any) {
    this.segment = event.detail.value;
    if (this.segment === 'info') {
      this.loadProducts();
      this.selectedProduct = null;
    }
  }

  loadProducts() {
    this.isLoading = true;
    this.productoService.listarProductos().subscribe({
      next: (data) => {
        this.products = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.alertService.error('Error al cargar productos');
        this.isLoading = false;
      }
    });
  }

  onEdit(product: Producto) {
    this.selectedProduct = product;
    this.segment = 'gestion';
  }

  async onDelete(product: Producto) {
    this.deleteConfirm(product);
  }

  async deleteConfirm(product: Producto) {
    const confirmed = await this.alertService.confirm(
      'Confirmar Eliminación',
      `¿Estás seguro de eliminar el producto <strong>${product.nombre}</strong>?`,
      'Eliminar'
    );

    if (confirmed) {
      this.deleteProduct(product.id);
    }
  }

  deleteProduct(id: number) {
    this.productoService.eliminarProductos(id).subscribe({
      next: () => {
        this.alertService.success('Producto eliminado');
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        this.alertService.error('Error al eliminar producto');
      }
    });
  }

  async onSave(productData: any) {
    const loading = await this.loadingController.create({ message: 'Guardando...' });
    await loading.present();

    if (this.selectedProduct) {
      this.productoService.actualizarProductos(productData, this.selectedProduct.id).subscribe({
        next: async () => {
          await loading.dismiss();
          this.alertService.success('Producto actualizado correctamente');
          this.selectedProduct = null;
          this.segment = 'info';
          this.loadProducts();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.alertService.error('Error al actualizar producto');
        }
      });
    } else {
      this.productoService.crearProductos(productData).subscribe({
        next: async () => {
          await loading.dismiss();
          this.alertService.success('Producto creado correctamente');
          this.segment = 'info';
          this.loadProducts();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.alertService.error('Error al crear producto');
        }
      });
    }
  }

  onCancel() {
    this.selectedProduct = null;
    this.segment = 'info';
  }
}
