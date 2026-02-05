/**
 * Servicio de Dominio: Fidelización
 * Responsable de la acumulación de puntos y beneficios del cliente.
 */

// Configuración de reglas (pueden ser dinámicas en el futuro)
const VALOR_PUNTO_DINERO = 10; // 1 punto = $10
const MINIMO_PUNTOS_REDIMIR = 100; // Mínimo 100 puntos para redimir

async function procesarFidelizacion(tx, { clienteId, totalVenta, estadoPago }) {
    if (!clienteId || estadoPago !== 'PAGADO') return;

    // Regla de negocio: 1 punto por cada $1000
    const puntosGanados = Math.floor(totalVenta / 1000);

    if (puntosGanados > 0) {
        console.log(`[FIDELIZACION] Acumulando ${puntosGanados} puntos al cliente ${clienteId}`);
        await tx.cliente.update({
            where: { id: clienteId },
            data: { puntos: { increment: puntosGanados } }
        });
    }
}

async function redimirPuntos(tx, { clienteId, puntosARedimir, totalVenta }) {
    if (!clienteId || !puntosARedimir || puntosARedimir <= 0) return 0;

    // 1. Obtener puntos actuales del cliente
    const cliente = await tx.cliente.findUnique({
        where: { id: clienteId },
        select: { puntos: true }
    });

    if (!cliente) throw new Error('Cliente no encontrado');

    // 2. Validaciones
    if (cliente.puntos < puntosARedimir) {
        throw new Error(`Puntos insuficientes. El cliente tiene ${cliente.puntos} puntos.`);
    }

    if (puntosARedimir < MINIMO_PUNTOS_REDIMIR) {
        throw new Error(`El mínimo para redimir es ${MINIMO_PUNTOS_REDIMIR} puntos.`);
    }

    // 3. Calcular descuento en dinero
    const descuento = puntosARedimir * VALOR_PUNTO_DINERO;

    // El descuento no puede ser mayor al total de la venta
    const descuentoFinal = Math.min(descuento, totalVenta);

    // Recalcular puntos a descontar si el descuento fue topado por el total
    const puntosEfectivosRedimidos = Math.ceil(descuentoFinal / VALOR_PUNTO_DINERO);

    // 4. Descontar puntos al cliente
    console.log(`[FIDELIZACION] Redimiendo ${puntosEfectivosRedimidos} puntos al cliente ${clienteId}`);
    await tx.cliente.update({
        where: { id: clienteId },
        data: { puntos: { decrement: puntosEfectivosRedimidos } }
    });

    return descuentoFinal;
}

module.exports = { procesarFidelizacion, redimirPuntos };
