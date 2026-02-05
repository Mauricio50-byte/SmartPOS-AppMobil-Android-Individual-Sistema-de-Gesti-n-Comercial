const { prisma } = require('./src/infraestructura/bd')

async function main() {
    const deudas = await prisma.deuda.findMany({ include: { venta: true } })
    console.log('Deudas:', JSON.stringify(deudas.map(d => ({ id: d.id, ventaId: d.ventaId, total: d.montoTotal, saldo: d.saldoPendiente, ventaPagado: d.venta.montoPagado })), null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
