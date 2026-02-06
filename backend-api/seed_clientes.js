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

async function seedClientes() {
    console.log('--- Insertando Clientes de Prueba ---');

    const clientes = [
        {
            nombre: 'Juan Pérez',
            telefono: '3101234567',
            cedula: '123456789',
            correo: 'juan.perez@email.com',
            creditoMaximo: 500000,
            diasCredito: 30
        },
        {
            nombre: 'María García',
            telefono: '3119876543',
            cedula: '987654321',
            correo: 'maria.garcia@email.com',
            creditoMaximo: 1000000,
            diasCredito: 15
        },
        {
            nombre: 'Carlos López',
            telefono: '3205554433',
            cedula: '456789123',
            correo: 'carlos.lopez@email.com',
            creditoMaximo: 200000,
            diasCredito: 45
        },
        {
            nombre: 'Ana Rodríguez',
            telefono: '3157778899',
            cedula: '321654987',
            correo: 'ana.rod@email.com',
            creditoMaximo: 750000,
            diasCredito: 30
        },
        {
            nombre: 'Luis Martínez',
            telefono: '3001112233',
            cedula: '789123456',
            correo: 'luis.mtz@email.com',
            creditoMaximo: 300000,
            diasCredito: 30
        }
    ];

    for (const c of clientes) {
        await prisma.cliente.upsert({
            where: { cedula: c.cedula },
            update: {},
            create: c
        });
        console.log(`Cliente creado: ${c.nombre}`);
    }
}

seedClientes()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
