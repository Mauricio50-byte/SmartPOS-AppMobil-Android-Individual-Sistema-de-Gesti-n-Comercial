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

async function check() {
    try {
        const ventas = await prisma.venta.findMany({ include: { detalles: true } });
        const movs = await prisma.movimientoCaja.findMany();
        const cajas = await prisma.caja.findMany();
        console.log(JSON.stringify({ ventas, movs, cajas }, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

check();
