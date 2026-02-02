/**
 * Servicio de Dominio: Finanzas
 * Responsable del flujo de dinero en efectivo y arqueo de caja.
 */
async function procesarFlujoCaja(tx, { usuarioId, ventaId, montoPagado, metodoPago, montoRecibido }) {
    if (montoPagado <= 0) return;

    const cajaAbierta = await tx.caja.findFirst({
        where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
    });

    if (!cajaAbierta) {
        // Si es FIADO o pago digital podría no requerir caja física, 
        // pero si hay flujo de efectivo (>0) y no hay caja, es una advertencia.
        if (metodoPago === 'EFECTIVO') {
            console.warn(`Venta #${ventaId} con efectivo pero sin caja abierta.`);
        }
        return;
    }

    const metodoPagoNorm = String(metodoPago).toUpperCase();
    let montoIngresoReal = Number(montoPagado);

    // Si es efectivo y recibimos más, el ingreso inicial es el monto recibido
    if (metodoPagoNorm === 'EFECTIVO' && Number(montoRecibido) > montoPagado) {
        montoIngresoReal = Number(montoRecibido);
    }

    // 1. Registrar el ingreso de la venta
    await tx.movimientoCaja.create({
        data: {
            cajaId: cajaAbierta.id,
            usuarioId: Number(usuarioId),
            tipo: 'VENTA',
            metodoPago: metodoPagoNorm,
            monto: montoIngresoReal,
            descripcion: `Venta #${ventaId} (${metodoPagoNorm})`,
            ventaId: ventaId,
            fecha: new Date()
        }
    });

    // 2. Si hubo cambio (vuelto), registrar el egreso
    if (metodoPagoNorm === 'EFECTIVO' && Number(montoRecibido) > montoPagado) {
        const cambio = Number(montoRecibido) - montoPagado;
        await tx.movimientoCaja.create({
            data: {
                cajaId: cajaAbierta.id,
                usuarioId: Number(usuarioId),
                tipo: 'EGRESO',
                metodoPago: 'EFECTIVO',
                monto: cambio,
                descripcion: `Cambio de Venta #${ventaId}`,
                ventaId: ventaId,
                fecha: new Date()
            }
        });
    }
}

module.exports = { procesarFlujoCaja };
