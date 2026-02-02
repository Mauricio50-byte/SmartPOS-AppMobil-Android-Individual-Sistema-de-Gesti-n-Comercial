import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoriaService } from 'src/app/core/services/categoria.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Categoria } from 'src/app/core/models/categoria';

@Component({
    selector: 'app-categoria-crud',
    templateUrl: './categoria-crud.component.html',
    styleUrls: ['./categoria-crud.component.scss'],
    standalone: false
})
export class CategoriaCrudComponent implements OnInit {
    categorias: Categoria[] = [];
    form: FormGroup;
    editingId: number | null = null;

    constructor(
        private modalCtrl: ModalController,
        private categoriaService: CategoriaService,
        private alertService: AlertService,
        private alertCtrl: AlertController,
        private fb: FormBuilder
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            descripcion: ['']
        });
    }

    ngOnInit() {
        this.loadCategorias();
    }

    loadCategorias() {
        this.categoriaService.listarCategorias().subscribe({
            next: (data) => this.categorias = data,
            error: (err) => console.error(err)
        });
    }

    cancel() {
        this.modalCtrl.dismiss(null, 'cancel');
    }

    saveCategory() {
        if (this.form.invalid) return;

        const { nombre, descripcion } = this.form.value;

        if (this.editingId) {
            // Update
            this.categoriaService.actualizarCategoria(this.editingId, { nombre, descripcion }).subscribe({
                next: (cat) => {
                    this.alertService.toast('Categoría actualizada', 'success');
                    this.editingId = null;
                    this.form.reset();
                    this.loadCategorias();
                },
                error: (err) => this.alertService.toast('Error al actualizar', 'error')
            });
        } else {
            // Create
            this.categoriaService.crearCategoria(nombre, descripcion).subscribe({
                next: (cat) => {
                    this.alertService.toast('Categoría creada', 'success');
                    this.form.reset();
                    this.loadCategorias();
                },
                error: (err) => this.alertService.toast('Error al crear', 'error')
            });
        }
    }

    editCategory(cat: Categoria) {
        this.editingId = cat.id;
        this.form.patchValue({
            nombre: cat.nombre,
            descripcion: cat.descripcion
        });
    }

    cancelEdit() {
        this.editingId = null;
        this.form.reset();
    }

    async confirmDelete(cat: Categoria) {
        const alert = await this.alertCtrl.create({
            header: 'Confirmar',
            message: `¿Estás seguro de eliminar la categoría ${cat.nombre}?`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: () => {
                        this.categoriaService.eliminarCategoria(cat.id).subscribe({
                            next: () => {
                                this.alertService.toast('Categoría eliminada', 'success');
                                this.loadCategorias();
                            },
                            error: () => this.alertService.toast('Error al eliminar', 'error')
                        });
                    }
                }
            ]
        });
        await alert.present();
    }
}
