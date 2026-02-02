/**
 * Servicio de Dominio: Cartera (Deudas y Créditos)
 * Responsable de la solvencia del cliente y registro de deudas.
 */
async function gestionarCartera(tx, { clienteId, ventaId, totalVenta, montoPagado, estadoPago }) {
    if (estadoPago !== 'FIADO' || !clienteId) return;

    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new Error('Cliente no encontrado para asignar deuda');

    const saldoPendiente = totalVenta - montoPagado;

    // Validar límite de crédito
    const creditoDisponible = (cliente.creditoMaximo || 0) - (cliente.saldoDeuda || 0);
    if (creditoDisponible < saldoPendiente) {
        throw new Error(`Crédito insuficiente. Disponible: $${creditoDisponible}, Requerido: $${saldoPendiente}`);
    }

    const dias = cliente.diasCredito || 30;
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

    // 1. Crear la deuda
    await tx.deuda.create({
        data: {
            clienteId: clienteId,
            ventaId: ventaId,
            montoTotal: saldoPendiente,
            saldoPendiente: saldoPendiente,
            fechaVencimiento
        }
    });

    // 2. Aumentar el saldo deudor del cliente
    await tx.cliente.update({
        where: { id: clienteId },
        data: { saldoDeuda: { increment: saldoPendiente } }
    });
}

module.exports = { gestionarCartera };
