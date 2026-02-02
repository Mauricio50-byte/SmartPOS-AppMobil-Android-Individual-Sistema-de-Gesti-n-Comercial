/**
 * Servicio de Dominio: Fidelización
 * Responsable de la acumulación de puntos y beneficios del cliente.
 */
async function procesarFidelizacion(tx, { clienteId, totalVenta, estadoPago }) {
    if (!clienteId || estadoPago !== 'PAGADO') return;

    // Regla de negocio: 1 punto por cada $1000
    const puntosGanados = Math.floor(totalVenta / 1000);

    if (puntosGanados > 0) {
        await tx.cliente.update({
            where: { id: clienteId },
            data: { puntos: { increment: puntosGanados } }
        });
    }
}

module.exports = { procesarFidelizacion };
