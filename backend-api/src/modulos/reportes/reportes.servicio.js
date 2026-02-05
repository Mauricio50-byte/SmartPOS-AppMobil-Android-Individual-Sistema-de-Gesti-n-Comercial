const { prisma } = require('../../infraestructura/bd')

/**
 * Obtiene el reporte general de ventas para un período y agrupación específicos.
 * Reclica la lógica que antes estaba en el frontend para centralizar cálculos.
 */
async function obtenerReporteGeneral(periodo = 'month', groupBy = 'category') {
    const { startDate, endDate, prevStartDate, prevEndDate } = getFechaRango(periodo);

    const filtroVentas = {};
    if (startDate && endDate) {
        filtroVentas.fecha = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }

    // Obtener ventas periodo actual
    const ventas = await prisma.venta.findMany({
        where: filtroVentas,
        include: {
            detalles: {
                include: {
                    producto: true
                }
            },
            devoluciones: true
        }
    });

    // Obtener devoluciones periodo actual (para restar de ingresos)
    const devolucionesPeriodo = await prisma.devolucion.findMany({
        where: startDate && endDate ? {
            fecha: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        } : {},
        include: {
            venta: true,
            detalles: {
                include: { producto: true }
            }
        }
    });

    // Obtener ventas periodo anterior para crecimiento
    const ventasAnteriores = await prisma.venta.findMany({
        where: {
            fecha: {
                gte: new Date(prevStartDate),
                lte: new Date(prevEndDate)
            }
        },
        include: {
            detalles: { include: { producto: true } },
            devoluciones: true
        }
    });

    // Obtener devoluciones periodo anterior
    const devolucionesAnteriores = await prisma.devolucion.findMany({
        where: {
            fecha: {
                gte: new Date(prevStartDate),
                lte: new Date(prevEndDate)
            }
        }
    });

    // 1. Obtener Movimientos de Caja para el Recaudo Real
    const movimientos = await prisma.movimientoCaja.findMany({
        where: startDate && endDate ? {
            fecha: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        } : {}
    });

    const statsAgrupados = {};
    let totalRevenue = 0;   // Ventas Facturadas (lo que se acordó vender)
    let totalCollected = 0; // Recaudo Real (lo que entró a caja/banco)
    let totalPending = 0;   // Lo que los clientes deben de estas ventas
    let totalCost = 0;      // Costo de los productos vendidos
    let totalVolume = 0;    // Unidades vendidas

    let revenueCash = 0;
    let revenueTransfer = 0;
    let collectedCash = 0;
    let collectedTransfer = 0;
    let pendingCash = 0;
    let pendingTransfer = 0;
    let volumeContado = 0;
    let volumeFiado = 0;
    let transactionsContado = 0;
    let transactionsFiado = 0;

    // A. PROCESAR MOVIMIENTOS DE CAJA (Fuente primaria de RECAUDO REAL)
    movimientos.forEach(m => {
        const tipo = m.tipo.toUpperCase();
        const metodo = (m.metodoPago || 'EFECTIVO').toUpperCase();
        const monto = Number(m.monto || 0);
        const desc = (m.descripcion || '').toLowerCase();

        // Ingresos: VENTA, ABONO_VENTA, INGRESO manual
        if (['VENTA', 'ABONO_VENTA', 'ABONO_DEUDA', 'INGRESO'].includes(tipo)) {
            totalCollected += monto;
            if (metodo === 'EFECTIVO') collectedCash += monto;
            else collectedTransfer += monto;
        }
        // Egresos que restan del recaudo: Devoluciones y cambios (vuelto)
        else if (tipo === 'EGRESO') {
            // Nota: No restamos PAGO_GASTO aquí porque eso es un gasto operativo, 
            // no una reducción del recaudo por ventas. 
            // Las devoluciones y cambios SÍ restan del recaudo de ventas.
            if (desc.includes('devolución') || desc.includes('cambio') || desc.includes('vuelto') || m.ventaId || m.abonoId) {
                totalCollected -= monto;
                if (metodo === 'EFECTIVO') collectedCash -= monto;
                else collectedTransfer -= monto;
            }
        }
    });

    // B. PROCESAR VENTAS (Fuente de FACTURACIÓN, COSTO y VOLUMEN)
    ventas.forEach(v => {
        const pendiente = Number(v.saldoPendiente) || 0;
        const totalVenta = Number(v.total) || 0;
        const metodo = (v.metodoPago || 'EFECTIVO').toUpperCase();
        const estado = (v.estadoPago || 'PAGADO').toUpperCase();

        if (estado === 'PAGADO') transactionsContado++;
        else transactionsFiado++;

        totalPending += pendiente;

        if (metodo === 'EFECTIVO') {
            revenueCash += totalVenta;
            pendingCash += pendiente;
        } else {
            revenueTransfer += totalVenta;
            pendingTransfer += pendiente;
        }

        v.detalles.forEach(detalle => {
            const product = detalle.producto;
            if (!product) return;

            let key = (groupBy === 'category')
                ? (product.categoria || product.tipo || 'General').trim()
                : product.nombre.trim();

            const qty = Number(detalle.cantidad) || 0;
            const itemRevenue = Number(detalle.subtotal) || 0;
            const unitCost = Number(detalle.precioCosto || product.precioCosto || 0);
            const itemCost = unitCost * qty;

            if (!statsAgrupados[key]) {
                statsAgrupados[key] = { volume: 0, revenue: 0, cost: 0, prevRevenue: 0 };
            }

            statsAgrupados[key].volume += qty;
            statsAgrupados[key].revenue += itemRevenue;
            statsAgrupados[key].cost += itemCost;

            totalRevenue += itemRevenue;
            totalCost += itemCost;
            totalVolume += qty;

            if (estado === 'PAGADO') volumeContado += qty;
            else volumeFiado += qty;
        });
    });

    // C. PROCESAR DEVOLUCIONES (Afectan Facturación, Costo y Volumen)
    devolucionesPeriodo.forEach(dev => {
        const montoDev = Number(dev.totalDevuelto || 0);
        totalRevenue -= montoDev;
        // Nota: NO restamos totalCollected aquí porque ya lo hizo el loop de Movimientos de Caja (EGRESO).

        if (dev.venta) {
            const metodoOrig = (dev.venta.metodoPago || 'EFECTIVO').toUpperCase();
            if (metodoOrig === 'EFECTIVO') revenueCash -= montoDev;
            else revenueTransfer -= montoDev;
        }

        dev.detalles.forEach(dd => {
            const product = dd.producto;
            let key = (groupBy === 'category')
                ? (product?.categoria || product?.tipo || 'General').trim()
                : (product?.nombre || 'Producto Eliminado').trim();

            if (statsAgrupados[key]) {
                statsAgrupados[key].volume -= dd.cantidad;
                statsAgrupados[key].revenue -= dd.subtotal;
                const unitCost = Number(dd.precioCosto || product?.precioCosto || 0);
                statsAgrupados[key].cost -= (unitCost * dd.cantidad);

                totalCost -= (unitCost * dd.cantidad);
                totalVolume -= dd.cantidad;
            }
        });
    });

    // Procesar periodo anterior para crecimiento
    ventasAnteriores.forEach(v => {
        v.detalles.forEach(detalle => {
            const product = detalle.producto;
            if (!product) return;

            let key = '';
            if (groupBy === 'category') {
                key = (product.categoria || product.tipo || 'General').trim();
            } else {
                key = product.nombre.trim();
            }

            const itemRevenue = Number(detalle.subtotal) || 0;

            if (!statsAgrupados[key]) {
                statsAgrupados[key] = { volume: 0, revenue: 0, cost: 0, prevRevenue: 0 };
            }
            statsAgrupados[key].prevRevenue += itemRevenue;
        });
    });

    const metrics = Object.entries(statsAgrupados).map(([name, stats]) => {
        const margin = stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0;
        let growth = 0;
        if (stats.prevRevenue > 0) {
            growth = ((stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100;
        } else if (stats.revenue > 0) {
            growth = 100;
        }

        const share = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;

        return {
            name,
            salesVolume: stats.volume,
            revenue: stats.revenue,
            cost: stats.cost,
            margin,
            growth,
            share
        };
    });

    const totalTransactions = ventas.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
        metrics,
        totalRevenue,
        totalCost,
        totalVolume,
        totalCollected,
        totalPending,
        totalTransactions,
        averageTicket,
        revenueCash,
        revenueTransfer,
        collectedCash,
        collectedTransfer,
        pendingCash,
        pendingTransfer,
        volumeContado,
        volumeFiado,
        transactionsContado,
        transactionsFiado
    };
}

/**
 * Calcula el rango de fechas para el reporte.
 */
function getFechaRango(periodo) {
    if (periodo === 'all') return { startDate: null, endDate: null, prevStartDate: null, prevEndDate: null };

    const now = new Date();
    const end = new Date(now);
    end.setUTCHours(23, 59, 59, 999);

    let start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);

    let prevStart = new Date(start);
    let prevEnd = new Date(end);

    switch (periodo) {
        case 'day':
            prevStart.setDate(prevStart.getDate() - 1);
            prevEnd.setDate(prevEnd.getDate() - 1);
            break;
        case 'week':
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);

            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            break;
        case 'month':
            start.setDate(1);
            prevStart = new Date(start);
            prevStart.setMonth(prevStart.getMonth() - 1);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            break;
        case 'year':
            start.setMonth(0, 1);
            prevStart = new Date(start);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            break;
    }

    return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        prevStartDate: prevStart.toISOString(),
        prevEndDate: prevEnd.toISOString()
    };
}

module.exports = { obtenerReporteGeneral }
