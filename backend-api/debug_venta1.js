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
        const v = await prisma.venta.findUnique({ where: { id: 1 }, include: { detalles: true } });
        console.log(JSON.stringify(v, null, 2));

        let sumDetails = 0;
        v.detalles.forEach(d => {
            sumDetails += d.subtotal;
        });
        console.log('Sum of Details for Venta #1:', sumDetails);
        console.log('Venta #1 Total:', v.total);
        console.log('Difference:', v.total - sumDetails);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

check();
