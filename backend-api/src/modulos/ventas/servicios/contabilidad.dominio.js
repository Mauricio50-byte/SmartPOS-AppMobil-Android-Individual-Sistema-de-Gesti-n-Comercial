const { prisma } = require('../../../infraestructura/bd');

/**
 * Servicio de Dominio: Contabilidad
 * Proporciona cálculos normalizados para todo el sistema.
 */

async function obtenerVentasNetasPeriodo(tx, { start, end, usuarioId = null }) {
    const context = tx || prisma;

    const whereVenta = {
        fecha: { gte: start, lte: end }
    };
    if (usuarioId) whereVenta.usuarioId = Number(usuarioId);

    const whereDevolucion = {
        fecha: { gte: start, lte: end }
    };
    if (usuarioId) whereDevolucion.usuarioId = Number(usuarioId);

    // 1. Ventas Brutas
    const ventasAggr = await context.venta.aggregate({
        where: whereVenta,
        _sum: { total: true },
        _count: { id: true }
    });

    // 2. Devoluciones
    const devolucionesAggr = await context.devolucion.aggregate({
        where: whereDevolucion,
        _sum: { totalDevuelto: true }
    });

    const ventasBrutas = ventasAggr._sum.total || 0;
    const totalDevoluciones = devolucionesAggr._sum.totalDevuelto || 0;
    const ventasNetas = ventasBrutas - totalDevoluciones;
    const cantidadVentas = ventasAggr._count.id || 0;

    return {
        ventasBrutas,
        totalDevoluciones,
        ventasNetas,
        cantidadVentas,
        ticketPromedio: cantidadVentas > 0 ? ventasNetas / cantidadVentas : 0
    };
}

/**
 * Obtiene el resumen de caja normalizado
 */
async function obtenerResumenCaja(tx, cajaId) {
    const context = tx || prisma;

    const caja = await context.caja.findUnique({
        where: { id: cajaId },
        include: { movimientos: true }
    });

    if (!caja) return null;

    // Categorización según requerimiento:
    // "El saldo inicial no es un ingreso"
    // "Las devoluciones deben restar del ingreso"

    let ingresosBrutos = 0; // Solo ventas y abonos
    let devoluciones = 0;
    let otrosIngresos = 0;
    let egresos = 0; // Gastos, retiros, etc.

    caja.movimientos.forEach(m => {
        const tipo = m.tipo.toUpperCase();
        if (tipo === 'VENTA' || m.ventaId) {
            // Nota: El tipo 'VENTA' suele ser el ingreso bruto.
            // Si el movimiento es de una devolución, se registró como EGRESO en el servicio actual.
            if (tipo === 'EGRESO' && m.descripcion && m.descripcion.toLowerCase().includes('devolución')) {
                devoluciones += m.monto;
            } else if (tipo === 'EGRESO') {
                egresos += m.monto;
            } else {
                ingresosBrutos += m.monto;
            }
        } else if (['INGRESO', 'ABONO_VENTA', 'ABONO_DEUDA'].includes(tipo)) {
            ingresosBrutos += m.monto;
        } else if (['EGRESO', 'PAGO_GASTO', 'RETIRO'].includes(tipo)) {
            egresos += m.monto;
        }
    });

    const ingresosNetos = ingresosBrutos - devoluciones;
    const saldoFinal = caja.montoInicial + ingresosNetos - egresos;

    return {
        montoInicial: caja.montoInicial,
        ingresosBrutos,
        devoluciones,
        ingresosNetos,
        egresos,
        saldoFinal
    };
}

module.exports = {
    obtenerVentasNetasPeriodo,
    obtenerResumenCaja
};
