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
    console.log('--- INICIANDO LIMPIEZA TOTAL DE LA BASE DE DATOS ---');

    try {
        // Ejecutamos en orden inverso de dependencias para evitar errores de llaves foráneas

        console.log('1. Limpiando notificaciones...');
        await prisma.notificacion.deleteMany();

        console.log('2. Limpiando finanzas (Abonos, CxC, CxP)...');
        await prisma.abono.deleteMany();
        await prisma.deuda.deleteMany();
        await prisma.pagoGasto.deleteMany();
        await prisma.gasto.deleteMany();

        console.log('3. Limpiando movimientos de caja...');
        await prisma.movimientoCaja.deleteMany();
        await prisma.caja.deleteMany();

        console.log('4. Limpiando devoluciones...');
        await prisma.detalleDevolucion.deleteMany();
        await prisma.devolucion.deleteMany();

        console.log('5. Limpiando ventas e inventario...');
        await prisma.detalleVenta.deleteMany();
        await prisma.venta.deleteMany();
        await prisma.movimientoInventario.deleteMany();

        console.log('6. Limpiando detalles específicos de productos...');
        await prisma.productoRopa.deleteMany();
        await prisma.productoAlimento.deleteMany();
        await prisma.productoFarmacia.deleteMany();
        await prisma.productoPapeleria.deleteMany();
        await prisma.productoRestaurante.deleteMany();
        await prisma.productoServicio.deleteMany();

        console.log('7. Limpiando productos y categorías...');
        await prisma.producto.deleteMany();
        await prisma.categoria.deleteMany();

        console.log('8. Limpiando clientes...');
        await prisma.cliente.deleteMany();

        // Nota: No limpiamos Usuario, Rol, Permiso ni Modulo por seguridad 
        // para no perder el acceso a la cuenta administradora.

        console.log('\n--- BASE DE DATOS LIMPIADA CON ÉXITO ---');
        console.log('Se han conservado las cuentas de usuario y configuraciones de sistema.');
    } catch (error) {
        console.error('\nERROR DURANTE LA LIMPIEZA:', error);
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
