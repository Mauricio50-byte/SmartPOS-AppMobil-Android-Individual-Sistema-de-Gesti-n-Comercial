// Set environment variable for DATABASE_URL if needed, but normally it should be picked up from .env or config
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/smartpos?schema=public"; // Adjust if necessary

const { prisma } = require('./src/infraestructura/bd');

async function checkPoints() {
    try {
        const clientes = await prisma.cliente.findMany({
            select: { id: true, nombre: true, puntos: true },
            orderBy: { id: 'desc' },
            take: 10
        });
        console.log('--- ÚLTIMOS 10 CLIENTES Y SUS PUNTOS ---');
        console.table(clientes);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPoints();
