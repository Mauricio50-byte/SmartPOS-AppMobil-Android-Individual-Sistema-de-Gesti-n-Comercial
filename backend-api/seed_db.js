const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Función para calcular Margen Bruto (0-100%)
function calcularMargen(costo, venta) {
    if (!venta || venta <= 0) return 0;
    const margen = ((venta - costo) / venta) * 100;
    return parseFloat(Math.min(Math.max(margen, 0), 100).toFixed(2));
}

async function main() {
    console.log('Iniciando registro masivo de productos (Precios COP y Margen Bruto)...');

    const categoriasData = [
        { nombre: 'Alimentos', descripcion: 'Víveres y productos de consumo' },
        { nombre: 'Ropa y Accesorios', descripcion: 'Moda y complementos' },
        { nombre: 'Farmacia', descripcion: 'Salud y bienestar' },
        { nombre: 'Papelería', descripcion: 'Oficina y escolar' },
        { nombre: 'Restaurante', descripcion: 'Alimentos preparados' },
        { nombre: 'Ferretería', descripcion: 'Herramientas y construcción' },
        { nombre: 'Tecnología', descripcion: 'Equipos electrónicos' },
        { nombre: 'Servicios', descripcion: 'Mantenimiento y consultoría' }
    ];

    const categorias = {};
    for (const cat of categoriasData) {
        const created = await prisma.categoria.upsert({
            where: { nombre: cat.nombre },
            update: { descripcion: cat.descripcion },
            create: { nombre: cat.nombre, descripcion: cat.descripcion, activo: true }
        });
        categorias[cat.nombre] = created;
    }

    const upsertProducto = async (prod) => {
        const { categoriaNombre, detalle, ...datos } = prod;
        const catId = categorias[categoriaNombre]?.id || null;

        // Calcular el margen bruto antes de guardar
        datos.margenGanancia = calcularMargen(datos.precioCosto, datos.precioVenta);

        return await prisma.$transaction(async (tx) => {
            const p = await tx.producto.upsert({
                where: { sku: datos.sku },
                update: { ...datos, categoriaId: catId, categoria: categoriaNombre },
                create: { ...datos, categoriaId: catId, categoria: categoriaNombre }
            });

            if (detalle) {
                const tipo = datos.tipo;
                if (tipo === 'ROPA') await tx.productoRopa.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
                if (tipo === 'ALIMENTOS') await tx.productoAlimento.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
                if (tipo === 'FARMACIA') await tx.productoFarmacia.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
                if (tipo === 'PAPELERIA') await tx.productoPapeleria.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
                if (tipo === 'RESTAURANTE') await tx.productoRestaurante.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
                if (tipo === 'SERVICIOS') await tx.productoServicio.upsert({ where: { productoId: p.id }, update: detalle, create: { productoId: p.id, ...detalle } });
            }
            return p;
        }, { timeout: 30000 });
    };

    const generales = [
        { tipo: 'GENERAL', nombre: 'Martillo de Uña 16oz', sku: 'FER-001', categoriaNombre: 'Ferretería', precioCosto: 12000, precioVenta: 18500, stock: 15, stockMinimo: 3, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'Truper' },
        { tipo: 'GENERAL', nombre: 'Alicate Universal 8"', sku: 'FER-002', categoriaNombre: 'Ferretería', precioCosto: 15000, precioVenta: 22000, stock: 10, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'Stanley' },
        { tipo: 'GENERAL', nombre: 'Bombillo LED 12W', sku: 'TEC-001', categoriaNombre: 'Tecnología', precioCosto: 4500, precioVenta: 8500, stock: 50, stockMinimo: 10, unidadMedida: 'UNIDAD', proveedor: 'Electricos Ltda', marca: 'Philips' },
        { tipo: 'GENERAL', nombre: 'Cable HDMI 2m', sku: 'TEC-002', categoriaNombre: 'Tecnología', precioCosto: 8000, precioVenta: 15000, stock: 20, stockMinimo: 5, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Ugreen' },
        { tipo: 'GENERAL', nombre: 'Mouse Óptico USB', sku: 'TEC-003', categoriaNombre: 'Tecnología', precioCosto: 12000, precioVenta: 25000, stock: 12, stockMinimo: 3, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Logitech' },
        { tipo: 'GENERAL', nombre: 'Cinta Aislante Negra', sku: 'FER-003', categoriaNombre: 'Ferretería', precioCosto: 1800, precioVenta: 3500, stock: 100, stockMinimo: 20, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: '3M' },
        { tipo: 'GENERAL', nombre: 'Pegante Instantáneo', sku: 'FER-004', categoriaNombre: 'Ferretería', precioCosto: 2500, precioVenta: 5000, stock: 40, stockMinimo: 10, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'Loctite' },
        { tipo: 'GENERAL', nombre: 'Candado Macizo 40mm', sku: 'FER-005', categoriaNombre: 'Ferretería', precioCosto: 10500, precioVenta: 18000, stock: 8, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'Cerrajes', marca: 'Yale' },
        { tipo: 'GENERAL', nombre: 'Regleta Eléctrica 6T', sku: 'TEC-004', categoriaNombre: 'Tecnología', precioCosto: 15000, precioVenta: 28000, stock: 10, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'Electricos Ltda', marca: 'Steren' },
        { tipo: 'GENERAL', nombre: 'Destornillador Estrias', sku: 'FER-006', categoriaNombre: 'Ferretería', precioCosto: 4000, precioVenta: 7500, stock: 20, stockMinimo: 5, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'Stanley' },
        { tipo: 'GENERAL', nombre: 'Batería 9V Alcalina', sku: 'TEC-005', categoriaNombre: 'Tecnología', precioCosto: 9000, precioVenta: 16000, stock: 15, stockMinimo: 5, unidadMedida: 'UNIDAD', proveedor: 'Energía Ya', marca: 'Duracell' },
        { tipo: 'GENERAL', nombre: 'Brocha 2 Pulgadas', sku: 'FER-007', categoriaNombre: 'Ferretería', precioCosto: 3500, precioVenta: 6500, stock: 30, stockMinimo: 10, unidadMedida: 'UNIDAD', proveedor: 'Pinturas Global', marca: 'Atlas' },
        { tipo: 'GENERAL', nombre: 'Rodillo Felpa 9"', sku: 'FER-008', categoriaNombre: 'Ferretería', precioCosto: 8000, precioVenta: 14000, stock: 12, stockMinimo: 4, unidadMedida: 'UNIDAD', proveedor: 'Pinturas Global', marca: 'Atlas' },
        { tipo: 'GENERAL', nombre: 'Teclado Estándar USB', sku: 'TEC-006', categoriaNombre: 'Tecnología', precioCosto: 22000, precioVenta: 45000, stock: 8, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Genius' },
        { tipo: 'GENERAL', nombre: 'Audífonos In-Ear', sku: 'TEC-007', categoriaNombre: 'Tecnología', precioCosto: 15000, precioVenta: 35000, stock: 25, stockMinimo: 5, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Sony' },
        { tipo: 'GENERAL', nombre: 'Cargador Pared 2.1A', sku: 'TEC-008', categoriaNombre: 'Tecnología', precioCosto: 18000, precioVenta: 32000, stock: 15, stockMinimo: 3, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Samsung' },
        { tipo: 'GENERAL', nombre: 'Flexómetro 5 metros', sku: 'FER-009', categoriaNombre: 'Ferretería', precioCosto: 7500, precioVenta: 14500, stock: 18, stockMinimo: 5, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'Stanley' },
        { tipo: 'GENERAL', nombre: 'Linterna LED Recargable', sku: 'TEC-009', categoriaNombre: 'Tecnología', precioCosto: 14000, precioVenta: 25000, stock: 10, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'Energía Ya', marca: 'EverActive' },
        { tipo: 'GENERAL', nombre: 'Multímetro Digital', sku: 'TEC-010', categoriaNombre: 'Tecnología', precioCosto: 35000, precioVenta: 65000, stock: 5, stockMinimo: 2, unidadMedida: 'UNIDAD', proveedor: 'TecnoMayor', marca: 'Unit' },
        { tipo: 'GENERAL', nombre: 'Taladro Percutor 1/2"', sku: 'FER-010', categoriaNombre: 'Ferretería', precioCosto: 145000, precioVenta: 210000, stock: 4, stockMinimo: 1, unidadMedida: 'UNIDAD', proveedor: 'Surtiferre', marca: 'DeWalt' },
    ];

    // (El resto de arreglos ropa, farmacia, etc. se mantienen igual, solo cambia el cálculo en upsertProducto)
    const ropa = [
        { tipo: 'ROPA', nombre: 'Camiseta Polo Azul', sku: 'ROP-101', categoriaNombre: 'Ropa y Accesorios', precioCosto: 25000, precioVenta: 55000, stock: 20, unidadMedida: 'UNIDAD', marca: 'Lacoste', detalle: { talla: 'M', color: 'Azul', material: 'Algodón', genero: 'Masculino' } },
        { tipo: 'ROPA', nombre: 'Jean Slim Fit Gris', sku: 'ROP-102', categoriaNombre: 'Ropa y Accesorios', precioCosto: 45000, precioVenta: 95000, stock: 15, unidadMedida: 'UNIDAD', marca: 'Levis', detalle: { talla: '32', color: 'Gris', material: 'Mezclilla', genero: 'Masculino' } },
        { tipo: 'ROPA', nombre: 'Vestido Largo Verano', sku: 'ROP-103', categoriaNombre: 'Ropa y Accesorios', precioCosto: 55000, precioVenta: 120000, stock: 10, unidadMedida: 'UNIDAD', marca: 'Zara', detalle: { talla: 'S', color: 'Floral', material: 'Seda', genero: 'Femenino' } },
        { tipo: 'ROPA', nombre: 'Saco Tejido Lana', sku: 'ROP-104', categoriaNombre: 'Ropa y Accesorios', precioCosto: 35000, precioVenta: 78000, stock: 12, unidadMedida: 'UNIDAD', marca: 'Gef', detalle: { talla: 'L', color: 'Beige', material: 'Lana', genero: 'Unisex' } },
        { tipo: 'ROPA', nombre: 'Gorra Deportiva Negra', sku: 'ROP-105', categoriaNombre: 'Ropa y Accesorios', precioCosto: 12000, precioVenta: 35000, stock: 30, unidadMedida: 'UNIDAD', marca: 'Nike', detalle: { talla: 'Única', color: 'Negro', material: 'Poliéster', genero: 'Unisex' } },
    ];

    const farmacia = [
        { tipo: 'FARMACIA', nombre: 'Doles 500mg (Caja)', sku: 'FAR-101', categoriaNombre: 'Farmacia', precioCosto: 8500, precioVenta: 15000, stock: 40, unidadMedida: 'CAJA', marca: 'Genfar', detalle: { componenteActivo: 'Acetaminofén', laboratorio: 'Genfar', requiereReceta: false, dosis: '500mg' } },
        { tipo: 'FARMACIA', nombre: 'Amoxicilina 500mg', sku: 'FAR-102', categoriaNombre: 'Farmacia', precioCosto: 12000, precioVenta: 22000, stock: 25, unidadMedida: 'CAJA', marca: 'MK', detalle: { componenteActivo: 'Amoxicilina', laboratorio: 'MK', requiereReceta: true, dosis: '500mg' } },
        { tipo: 'FARMACIA', nombre: 'Suero Fisiológico 500ml', sku: 'FAR-103', categoriaNombre: 'Farmacia', precioCosto: 4500, precioVenta: 9500, stock: 15, unidadMedida: 'BOTELLA', marca: 'Baxter', detalle: { componenteActivo: 'Cloruro de Sodio', laboratorio: 'Baxter', requiereReceta: false } },
        { tipo: 'FARMACIA', nombre: 'Vitamina C 500mg', sku: 'FAR-104', categoriaNombre: 'Farmacia', precioCosto: 7800, precioVenta: 14500, stock: 50, unidadMedida: 'FRASCO', marca: 'Redoxon', detalle: { componenteActivo: 'Ácido Ascórbico', laboratorio: 'Redoxon', requiereReceta: false } },
        { tipo: 'FARMACIA', nombre: 'Jarabe para la Tos', sku: 'FAR-105', categoriaNombre: 'Farmacia', precioCosto: 15000, precioVenta: 28000, stock: 10, unidadMedida: 'FRASCO', marca: 'Bayer', detalle: { componenteActivo: 'Ambroxol', laboratorio: 'Bayer', requiereReceta: false } },
    ];

    const alimentos = [
        { tipo: 'ALIMENTOS', nombre: 'Arroz Diana 5kg', sku: 'ALM-101', categoriaNombre: 'Alimentos', precioCosto: 18500, precioVenta: 24500, stock: 20, unidadMedida: 'BULTO', marca: 'Diana', detalle: { esPerecedero: true } },
        { tipo: 'ALIMENTOS', nombre: 'Aceite Girasol 3L', sku: 'ALM-102', categoriaNombre: 'Alimentos', precioCosto: 22000, precioVenta: 32000, stock: 12, unidadMedida: 'UNIDAD', marca: 'Girasol', detalle: { esPerecedero: true } },
        { tipo: 'ALIMENTOS', nombre: 'Café Sello Rojo 500g', sku: 'ALM-103', categoriaNombre: 'Alimentos', precioCosto: 13500, precioVenta: 18000, stock: 30, unidadMedida: 'UNIDAD', marca: 'Sello Rojo', detalle: { esPerecedero: true } },
        { tipo: 'ALIMENTOS', nombre: 'Leche Alpina 1L (Sixpack)', sku: 'ALM-104', categoriaNombre: 'Alimentos', precioCosto: 2100, precioVenta: 29500, stock: 15, unidadMedida: 'PAQUETE', marca: 'Alpina', detalle: { esPerecedero: true } },
        { tipo: 'ALIMENTOS', nombre: 'Sal Refisal 1kg', sku: 'ALM-105', categoriaNombre: 'Alimentos', precioCosto: 1200, precioVenta: 2500, stock: 50, unidadMedida: 'UNIDAD', marca: 'Refisal', detalle: { esPerecedero: false } },
    ];

    const papeleria = [
        { tipo: 'PAPELERIA', nombre: 'Resma Papel Carta', sku: 'PAP-101', categoriaNombre: 'Papelería', precioCosto: 18500, precioVenta: 26000, stock: 20, unidadMedida: 'RESMA', marca: 'Bond', detalle: { tipoPapel: 'Bond', gramaje: '75g' } },
        { tipo: 'PAPELERIA', nombre: 'Kit Marcadores x12', sku: 'PAP-102', categoriaNombre: 'Papelería', precioCosto: 15000, precioVenta: 28000, stock: 15, unidadMedida: 'KIT', marca: 'Pelikan', detalle: { esKit: true } },
        { tipo: 'PAPELERIA', nombre: 'Cuaderno Argollado', sku: 'PAP-103', categoriaNombre: 'Papelería', precioCosto: 8500, precioVenta: 14500, stock: 40, unidadMedida: 'UNIDAD', marca: 'Norma', detalle: { dimensiones: 'Oficio' } },
        { tipo: 'PAPELERIA', nombre: 'Calculadora Científica', sku: 'PAP-104', categoriaNombre: 'Papelería', precioCosto: 35000, precioVenta: 65000, stock: 8, unidadMedida: 'UNIDAD', marca: 'Casio', detalle: {} },
        { tipo: 'PAPELERIA', nombre: 'Caja Lapiceros (50u)', sku: 'PAP-105', categoriaNombre: 'Papelería', precioCosto: 25000, precioVenta: 45000, stock: 10, unidadMedida: 'CAJA', marca: 'BIC', detalle: {} },
    ];

    const restaurante = [
        { tipo: 'RESTAURANTE', nombre: 'Bandeja Paisa', sku: 'RES-101', categoriaNombre: 'Restaurante', precioCosto: 15000, precioVenta: 28000, stock: 10, unidadMedida: 'PLATO', marca: 'Propia', detalle: { tiempoPreparacion: 20, calorias: 1200 } },
        { tipo: 'RESTAURANTE', nombre: 'Limonada de Coco', sku: 'RES-102', categoriaNombre: 'Restaurante', precioCosto: 3500, precioVenta: 12000, stock: 20, unidadMedida: 'VASO', marca: 'Propia', detalle: { tiempoPreparacion: 5, esVegano: true } },
        { tipo: 'RESTAURANTE', nombre: 'Parrillada Mixta', sku: 'RES-103', categoriaNombre: 'Restaurante', precioCosto: 35000, precioVenta: 65000, stock: 30, unidadMedida: 'PLATO', marca: 'Propia', detalle: { tiempoPreparacion: 30 } },
        { tipo: 'RESTAURANTE', nombre: 'Ensalada César', sku: 'RES-104', categoriaNombre: 'Restaurante', precioCosto: 8500, precioVenta: 18500, stock: 40, unidadMedida: 'PLATO', marca: 'Propia', detalle: { tiempoPreparacion: 10, esVegetariano: false } },
        { tipo: 'RESTAURANTE', nombre: 'Cerveza Club Colombia', sku: 'RES-105', categoriaNombre: 'Restaurante', precioCosto: 3500, precioVenta: 8000, stock: 48, unidadMedida: 'BOTELLA', marca: 'Bavaria', detalle: { tieneAlcohol: true } },
    ];

    const servicios = [
        { tipo: 'SERVICIOS', nombre: 'Mantenimiento PC', sku: 'SER-101', categoriaNombre: 'Servicios', precioCosto: 45000, precioVenta: 95000, stock: 27, unidadMedida: 'SERVICIO', marca: 'IT Support', detalle: { duracion: 120, responsable: 'Técnico Senior' } },
        { tipo: 'SERVICIOS', nombre: 'Consultoría Financiera', sku: 'SER-102', categoriaNombre: 'Servicios', precioCosto: 0, precioVenta: 150000, stock: 20, unidadMedida: 'HORA', marca: 'Finanzas OK', detalle: { duracion: 60, responsable: 'Consultor' } },
        { tipo: 'SERVICIOS', nombre: 'Instalación Software', sku: 'SER-103', categoriaNombre: 'Servicios', precioCosto: 10000, precioVenta: 45000, stock: 30, unidadMedida: 'SERVICIO', marca: 'IT Support', detalle: { duracion: 45 } },
        { tipo: 'SERVICIOS', nombre: 'Soporte Remoto 1h', sku: 'SER-104', categoriaNombre: 'Servicios', precioCosto: 0, precioVenta: 60000, stock: 40, unidadMedida: 'HORA', marca: 'IT Support', detalle: { duracion: 60, requiereCita: true } },
        { tipo: 'SERVICIOS', nombre: 'Diseño Flyer Publicitario', sku: 'SER-105', categoriaNombre: 'Servicios', precioCosto: 5000, precioVenta: 85000, stock: 50, unidadMedida: 'DISEÑO', marca: 'Creative Studio', detalle: { duracion: 180, responsable: 'Diseñador' } },
    ];

    const totalProds = [...generales, ...ropa, ...farmacia, ...alimentos, ...papeleria, ...restaurante, ...servicios];

    for (const prod of totalProds) {
        try {
            await upsertProducto(prod);
            console.log(`✅ Procesado: [${prod.sku}] ${prod.nombre}`);
        } catch (err) {
            console.error(`❌ Error en [${prod.sku}]:`, err.message);
        }
    }

    console.log(`\n--- Sembrado Masivo Finalizado con Márgenes Corregidos ---`);
}

main()
    .catch((e) => {
        console.error('Error crítico durante el sembrado:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
