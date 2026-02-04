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

async function main() {
    console.log('Iniciando limpieza de base de datos...');

    try {
        // El orden es importante para evitar errores de llaves foráneas
        // Primero tablas de detalles (plugins)
        await prisma.productoRopa.deleteMany();
        await prisma.productoAlimento.deleteMany();
        await prisma.productoFarmacia.deleteMany();
        await prisma.productoPapeleria.deleteMany();
        await prisma.productoRestaurante.deleteMany();
        await prisma.productoServicio.deleteMany();

        // Luego detalles de ventas e inventario
        await prisma.detalleVenta.deleteMany();
        await prisma.movimientoInventario.deleteMany();
        await prisma.detalleDevolucion.deleteMany();

        // Luego productos
        await prisma.producto.deleteMany();

        // Finalmente categorías
        await prisma.categoria.deleteMany();

        console.log('--- Base de datos de productos y categorías limpiada con éxito ---');
    } catch (error) {
        console.error('Error al limpiar la base de datos:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
