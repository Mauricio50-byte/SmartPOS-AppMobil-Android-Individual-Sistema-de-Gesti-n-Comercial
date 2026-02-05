const { prisma } = require('../../infraestructura/bd')
const ContabilidadDom = require('../ventas/servicios/contabilidad.dominio');

/**
 * Obtiene los rangos de fecha para el periodo solicitado y el periodo anterior (para tendencias)
 */
function getPeriodRanges(period = 'month') {
    const now = new Date();
    let start, end, prevStart, prevEnd;

    // Foto actual (Hoy UTC)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    if (period === 'week') {
        // Lunes a Domingo UTC
        const day = now.getUTCDay(); // 0 (Dom) a 6 (Sáb)
        const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);

        start = new Date(now);
        start.setUTCDate(diff);
        start.setUTCHours(0, 0, 0, 0);

        end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 6);
        end.setUTCHours(23, 59, 59, 999);

        prevStart = new Date(start);
        prevStart.setUTCDate(start.getUTCDate() - 7);
        prevEnd = new Date(end);
        prevEnd.setUTCDate(end.getUTCDate() - 7);
        prevEnd.setUTCHours(23, 59, 59, 999);

    } else if (period === 'year') {
        start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear() + 4, 11, 31, 23, 59, 59, 999));

        prevStart = new Date(Date.UTC(now.getUTCFullYear() - 5, 0, 1, 0, 0, 0, 0));
        prevEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
    } else {
        // 'month' (Meses del año actual UTC)
        start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));

        prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0));
        prevEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
    }

    return { start, end, prevStart, prevEnd };
}

async function obtenerMetricas(periodo = 'month') {
    const { start, end, prevStart, prevEnd } = getPeriodRanges(periodo);

    // 1. Obtener Métricas Periodo Actual (Netas)
    const actuales = await ContabilidadDom.obtenerVentasNetasPeriodo(prisma, { start, end });

    // Clientes nuevos no cambian por devoluciones
    const countClientes = await prisma.cliente.count({
        where: { creadoEn: { gte: start, lte: end } }
    });

    // 2. Obtener Métricas Periodo Anterior (Netas)
    const anteriores = await ContabilidadDom.obtenerVentasNetasPeriodo(prisma, { start: prevStart, end: prevEnd });

    const prevCountClientes = await prisma.cliente.count({
        where: { creadoEn: { gte: prevStart, lte: prevEnd } }
    });

    // 3. Calcular Tendencias
    const tendenciaIngresos = anteriores.ventasNetas === 0 ? (actuales.ventasNetas > 0 ? 100 : 0) : ((actuales.ventasNetas - anteriores.ventasNetas) / anteriores.ventasNetas) * 100;
    const tendenciaVentas = anteriores.cantidadVentas === 0 ? (actuales.cantidadVentas > 0 ? 100 : 0) : ((actuales.cantidadVentas - anteriores.cantidadVentas) / anteriores.cantidadVentas) * 100;
    const tendenciaTicket = anteriores.ticketPromedio === 0 ? (actuales.ticketPromedio > 0 ? 100 : 0) : ((actuales.ticketPromedio - anteriores.ticketPromedio) / anteriores.ticketPromedio) * 100;
    const tendenciaClientes = prevCountClientes === 0 ? (countClientes > 0 ? 100 : 0) : ((countClientes - prevCountClientes) / prevCountClientes) * 100;

    return {
        ingresos: { valor: actuales.ventasNetas, tendencia: tendenciaIngresos },
        ventas: { valor: actuales.cantidadVentas, tendencia: tendenciaVentas },
        clientesNuevos: { valor: countClientes, tendencia: tendenciaClientes },
        ticketPromedio: { valor: actuales.ticketPromedio, tendencia: tendenciaTicket }
    };
}

async function obtenerGraficoVentas(periodo = 'month') {
    const { start, end } = getPeriodRanges(periodo);
    const ventas = await prisma.venta.findMany({
        where: { fecha: { gte: start, lte: end } },
        select: { fecha: true, total: true }
    });

    const devoluciones = await prisma.devolucion.findMany({
        where: { fecha: { gte: start, lte: end } },
        select: { fecha: true, totalDevuelto: true }
    });

    let labels = [];
    let data = [];

    if (periodo === 'week') {
        labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        data = new Array(7).fill(0);
        ventas.forEach(v => {
            let dayIndex = v.fecha.getDay() - 1; // 0 (Dom) to 6 (Sat)
            if (dayIndex === -1) dayIndex = 6; // Sunday
            data[dayIndex] += v.total;
        });
        devoluciones.forEach(d => {
            let dayIndex = d.fecha.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6;
            data[dayIndex] -= d.totalDevuelto;
        });
    } else if (periodo === 'year') {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 5; i++) {
            labels.push((currentYear + i).toString());
            data.push(0);
        }
        ventas.forEach(v => {
            const year = v.fecha.getFullYear();
            const index = labels.indexOf(year.toString());
            if (index !== -1) data[index] += v.total;
        });
        devoluciones.forEach(d => {
            const year = d.fecha.getFullYear();
            const index = labels.indexOf(year.toString());
            if (index !== -1) data[index] -= d.totalDevuelto;
        });
    } else {
        // 'month'
        labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        data = new Array(12).fill(0);
        ventas.forEach(v => {
            data[v.fecha.getMonth()] += v.total;
        });
        devoluciones.forEach(d => {
            data[d.fecha.getMonth()] -= d.totalDevuelto;
        });
    }

    return { labels, data, label: 'Ventas Netas' };
}

async function obtenerProductosTop(limit = 5, periodo = 'month') {
    const { start, end } = getPeriodRanges(periodo);

    // Agrupar por productoId en DetalleVenta filtrando por fecha de venta
    const topDetalles = await prisma.detalleVenta.groupBy({
        by: ['productoId'],
        where: {
            venta: { fecha: { gte: start, lte: end } }
        },
        _sum: {
            cantidad: true,
            subtotal: true
        },
        orderBy: {
            _sum: { cantidad: 'desc' }
        },
        take: limit
    });

    if (topDetalles.length === 0) return [];

    const productosIds = topDetalles.map(d => d.productoId);
    const productos = await prisma.producto.findMany({
        where: { id: { in: productosIds } }
    });

    const maxQty = topDetalles[0]._sum.cantidad;

    return topDetalles.map(d => {
        const p = productos.find(prod => prod.id === d.productoId);
        return {
            id: d.productoId,
            nombre: p ? p.nombre : `Producto #${d.productoId}`,
            qty: d._sum.cantidad,
            percentage: maxQty > 0 ? (d._sum.cantidad / maxQty) * 100 : 0
        };
    });
}

async function obtenerStockBajo(limit = 5) {
    // Obtenemos los productos con menor stock primero
    const productos = await prisma.producto.findMany({
        where: {
            activo: true
        },
        orderBy: { stock: 'asc' },
        take: 50 // Traemos una muestra suficiente para filtrar
    });

    // Filtrado manual: productos cuyo stock sea menor o igual a su stock mínimo personalizado (o 5 por defecto)
    const filtrados = productos.filter(p => p.stock <= (p.stockMinimo ?? 5))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, limit);

    return filtrados.map(p => ({
        id: p.id,
        nombre: p.nombre,
        stock: p.stock,
        stockMinimo: p.stockMinimo ?? 5
    }));
}

async function obtenerTransaccionesRecientes(limit = 5) {
    const ventas = await prisma.venta.findMany({
        orderBy: { fecha: 'desc' },
        take: limit,
        select: {
            id: true,
            fecha: true,
            total: true,
            estadoPago: true
        }
    });

    return ventas.map(v => ({
        id: v.id,
        fecha: v.fecha,
        total: v.total,
        estado: v.estadoPago === 'PAGADO' ? 'OK' : v.estadoPago
    }));
}

async function obtenerDistribucionCategorias(periodo = 'month') {
    const { start, end } = getPeriodRanges(periodo);

    const detalles = await prisma.detalleVenta.findMany({
        where: {
            venta: { fecha: { gte: start, lte: end } }
        },
        include: {
            producto: {
                select: { categoria: true }
            }
        }
    });

    const catMap = {};
    let totalRevenue = 0;

    detalles.forEach(d => {
        const cat = d.producto.categoria || 'General';
        catMap[cat] = (catMap[cat] || 0) + d.subtotal;
        totalRevenue += d.subtotal;
    });

    const colors = ['#3880ff', '#3dc2ff', '#5260ff', '#2dd36f', '#ffc409', '#eb445a', '#92949c'];

    return Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, revenue], index) => ({
            name,
            revenue,
            percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
            color: colors[index % colors.length]
        }));
}

async function obtenerDistribucionPagos(periodo = 'month') {
    const { start, end } = getPeriodRanges(periodo);

    const ventas = await prisma.venta.groupBy({
        by: ['metodoPago'],
        where: { fecha: { gte: start, lte: end } },
        _sum: { total: true }
    });

    // Restar devoluciones por método de pago
    // Como las devoluciones tienen ventaId, podemos saber el método de pago original
    const devoluciones = await prisma.devolucion.findMany({
        where: { fecha: { gte: start, lte: end } },
        include: { venta: { select: { metodoPago: true } } }
    });

    const devByMetodo = {};
    devoluciones.forEach(d => {
        const met = d.venta.metodoPago;
        devByMetodo[met] = (devByMetodo[met] || 0) + d.totalDevuelto;
    });

    const netStats = ventas.map(v => {
        const bruto = v._sum.total || 0;
        const dev = devByMetodo[v.metodoPago] || 0;
        return {
            metodoPago: v.metodoPago,
            neto: bruto - dev
        };
    });

    const totalRevenue = netStats.reduce((acc, v) => acc + v.neto, 0);
    const colors = ['#2dd36f', '#3880ff', '#ffc409', '#eb445a'];

    return netStats.map((v, index) => ({
        name: v.metodoPago,
        revenue: v.neto,
        percentage: totalRevenue > 0 ? (v.neto / totalRevenue) * 100 : 0,
        color: colors[index % colors.length]
    }));
}

async function obtenerTopClientes(limit = 5, periodo = 'month') {
    const { start, end } = getPeriodRanges(periodo);

    const topVentas = await prisma.venta.groupBy({
        by: ['clienteId'],
        where: {
            clienteId: { not: null },
            fecha: { gte: start, lte: end }
        },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: limit
    });

    if (topVentas.length === 0) return [];

    const clientesIds = topVentas.map(v => v.clienteId);
    const clientes = await prisma.cliente.findMany({
        where: { id: { in: clientesIds } }
    });

    // Obtener última compra de cada cliente en el periodo
    const ultimasCompras = await Promise.all(
        clientesIds.map(id => prisma.venta.findFirst({
            where: { clienteId: id, fecha: { gte: start, lte: end } },
            orderBy: { fecha: 'desc' },
            select: { fecha: true }
        }))
    );

    return topVentas.map((v, index) => {
        const c = clientes.find(cli => cli.id === v.clienteId);
        return {
            id: v.clienteId,
            name: c ? c.nombre : `Cliente #${v.clienteId}`,
            totalSpent: v._sum.total || 0,
            transactionCount: v._count.id || 0,
            lastPurchase: ultimasCompras[index]?.fecha || null
        };
    });
}

module.exports = {
    obtenerMetricas,
    obtenerGraficoVentas,
    obtenerProductosTop,
    obtenerStockBajo,
    obtenerTransaccionesRecientes,
    obtenerDistribucionCategorias,
    obtenerDistribucionPagos,
    obtenerTopClientes
}
