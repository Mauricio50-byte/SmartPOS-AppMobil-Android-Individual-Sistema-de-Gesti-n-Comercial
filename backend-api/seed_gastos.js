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

async function seedGastos() {
    console.log('--- Insertando Gastos (Cuentas por Pagar) de Prueba ---');

    const hoy = new Date();
    const proximoMes = new Date();
    proximoMes.setMonth(hoy.getMonth() + 1);

    const gastos = [
        {
            proveedor: 'Distribuidora Global S.A.S',
            concepto: 'Compra de mercancía - Lote Invierno',
            montoTotal: 1500000,
            saldoPendiente: 1500000,
            fechaVencimiento: proximoMes,
            categoria: 'INVENTARIO',
            estado: 'PENDIENTE'
        },
        {
            proveedor: 'Energía del Norte',
            concepto: 'Recibo de luz local comercial - Enero',
            montoTotal: 450000,
            saldoPendiente: 450000,
            fechaVencimiento: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000), // En 7 días
            categoria: 'SERVICIOS',
            estado: 'PENDIENTE'
        },
        {
            proveedor: 'Inmobiliaria Central',
            concepto: 'Arriendo mes de Febrero',
            montoTotal: 2000000,
            saldoPendiente: 2000000,
            fechaVencimiento: hoy,
            categoria: 'ARRIENDO',
            estado: 'PENDIENTE'
        },
        {
            proveedor: 'Internet Fibra Max',
            concepto: 'Servicio de Internet y Telefonía',
            montoTotal: 120000,
            saldoPendiente: 120000,
            fechaVencimiento: proximoMes,
            categoria: 'SERVICIOS',
            estado: 'PENDIENTE'
        },
        {
            proveedor: 'Papelería El Punto',
            concepto: 'Suministros de oficina y bolsas',
            montoTotal: 85000,
            saldoPendiente: 85000,
            fechaVencimiento: hoy,
            categoria: 'SUMINISTROS',
            estado: 'PENDIENTE'
        }
    ];

    for (const g of gastos) {
        await prisma.gasto.create({
            data: g
        });
        console.log(`Gasto creado: ${g.proveedor} - ${g.concepto}`);
    }
}

seedGastos()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
