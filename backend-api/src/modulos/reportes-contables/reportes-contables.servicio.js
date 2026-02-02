const { prisma } = require('../../infraestructura/bd')

/**
 * Calcula el Estado de Resultados (Ingresos, Costos, Gastos, Utilidad)
 */
async function obtenerEstadoResultados(fechaInicio, fechaFin) {
    const fInicio = new Date(fechaInicio);
    const fFin = new Date(fechaFin);
    fFin.setHours(23, 59, 59, 999);

    // 1. Ingresos (Ventas)
    const ventas = await prisma.venta.aggregate({
        where: {
            fecha: { gte: fInicio, lte: fFin }
        },
        _sum: { total: true }
    });
    const ingresos = ventas._sum.total || 0;

    // 2. Costos de Ventas (Basado en el precio de costo de los productos vendidos)
    const detallesVentas = await prisma.detalleVenta.findMany({
        where: {
            venta: {
                fecha: { gte: fInicio, lte: fFin }
            }
        },
        include: {
            producto: true
        }
    });

    let costos = 0;
    detallesVentas.forEach(detalle => {
        const precioCosto = detalle.producto?.precioCosto || 0;
        costos += precioCosto * detalle.cantidad;
    });

    // 3. Utilidad Bruta
    const utilidadBruta = ingresos - costos;

    // 4. Gastos (Registrados en el módulo de gastos)
    const gastosData = await prisma.gasto.aggregate({
        where: {
            fechaRegistro: { gte: fInicio, lte: fFin }
        },
        _sum: { montoTotal: true }
    });
    const gastos = gastosData._sum.montoTotal || 0;

    // 5. Utilidad Neta
    const utilidadNeta = utilidadBruta - gastos;

    return {
        ingresos,
        costos,
        utilidadBruta,
        gastos,
        utilidadNeta,
        fechaInicio,
        fechaFin,
        moneda: 'USD' // Opcional: podrías traerlo de configuración
    };
}

/**
 * Calcula el Flujo de Caja (Efectivo real que entra y sale)
 */
async function obtenerFlujoCaja(fechaInicio, fechaFin) {
    const fInicio = new Date(fechaInicio);
    const fFin = new Date(fechaFin);
    fFin.setHours(23, 59, 59, 999);

    // Saldo Inicial: Calculado sumando todos los movimientos antes de la fecha de inicio
    const movsPrevios = await prisma.movimientoCaja.findMany({
        where: { fecha: { lt: fInicio } }
    });

    let saldoInicial = 0;
    movsPrevios.forEach(m => {
        if (['INGRESO', 'VENTA', 'ABONO_VENTA'].includes(m.tipo)) {
            saldoInicial += m.monto;
        } else if (['EGRESO', 'PAGO_GASTO'].includes(m.tipo)) {
            saldoInicial -= m.monto;
        }
    });

    // Entradas y Salidas en el periodo actual
    const movimientosPeriodo = await prisma.movimientoCaja.findMany({
        where: {
            fecha: { gte: fInicio, lte: fFin }
        }
    });

    let entradas = 0;
    let salidas = 0;
    movimientosPeriodo.forEach(m => {
        if (['INGRESO', 'VENTA', 'ABONO_VENTA'].includes(m.tipo.toUpperCase())) {
            entradas += m.monto;
        } else if (['EGRESO', 'PAGO_GASTO'].includes(m.tipo.toUpperCase())) {
            salidas += m.monto;
        }
    });

    const saldoFinal = saldoInicial + entradas - salidas;

    return {
        saldoInicial,
        entradas,
        salidas,
        saldoFinal,
        fechaInicio,
        fechaFin
    };
}

/**
 * Obtiene la Cartera (Cuentas por Cobrar)
 */
async function obtenerCartera(estado = 'PENDIENTE') {
    const deudas = await prisma.deuda.findMany({
        where: {
            estado: estado.toUpperCase()
        },
        include: {
            cliente: true
        }
    });

    let totalPorCobrar = 0;
    let deudasVencidas = 0;
    const hoy = new Date();

    const carteraPorCliente = {};

    deudas.forEach(d => {
        const monto = d.saldoPendiente || 0;
        totalPorCobrar += monto;

        const esVencida = d.fechaVencimiento && new Date(d.fechaVencimiento) < hoy;
        if (esVencida) {
            deudasVencidas += monto;
        }

        const clienteNombre = d.cliente?.nombre || 'Desconocido';
        const clienteId = d.cliente?.id || 0;

        if (!carteraPorCliente[clienteId]) {
            carteraPorCliente[clienteId] = {
                nombre: clienteNombre,
                total: 0,
                vencido: 0,
                detalleDeudas: []
            };
        }

        carteraPorCliente[clienteId].total += monto;
        if (esVencida) {
            carteraPorCliente[clienteId].vencido += monto;
        }

        // Edad de cartera (días desde la creación)
        const diffTime = Math.abs(hoy - new Date(d.fechaCreacion));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        carteraPorCliente[clienteId].detalleDeudas.push({
            id: d.id,
            monto,
            fechaCreacion: d.fechaCreacion,
            fechaVencimiento: d.fechaVencimiento,
            diasAntiguedad: diffDays,
            vencida: esVencida
        });
    });

    return {
        totalPorCobrar,
        deudasVencidas,
        carteraAgrupada: Object.values(carteraPorCliente)
    };
}

/**
 * Calcula el Valor del Inventario actual
 */
async function obtenerInventarioValorizado() {
    const productos = await prisma.producto.findMany({
        where: { activo: true }
    });

    let valorTotal = 0;
    const porCategoria = {};

    productos.forEach(p => {
        const stock = p.stock || 0;
        const costo = p.precioCosto || 0;
        const valorItems = stock * costo;
        valorTotal += valorItems;

        const cat = p.categoria || 'Sin Categoría';
        if (!porCategoria[cat]) {
            porCategoria[cat] = {
                categoria: cat,
                valor: 0,
                items: 0
            };
        }
        porCategoria[cat].valor += valorItems;
        porCategoria[cat].items += stock;
    });

    return {
        valorTotal,
        analisisCategoria: Object.values(porCategoria)
    };
}

/**
 * Obtiene las Cuentas por Pagar (Gastos pendientes)
 */
async function obtenerCuentasPorPagar(estado = 'PENDIENTE') {
    const gastos = await prisma.gasto.findMany({
        where: {
            estado: estado.toUpperCase()
        }
    });

    let totalPorPagar = 0;
    const porProveedor = {};

    gastos.forEach(g => {
        const monto = g.saldoPendiente || 0;
        totalPorPagar += monto;

        const prov = g.proveedor || 'Desconocido';
        if (!porProveedor[prov]) {
            porProveedor[prov] = {
                proveedor: prov,
                total: 0,
                facturas: 0
            };
        }
        porProveedor[prov].total += monto;
        porProveedor[prov].facturas += 1;
    });

    return {
        totalPorPagar,
        analisisProveedor: Object.values(porProveedor)
    };
}

module.exports = {
    obtenerEstadoResultados,
    obtenerFlujoCaja,
    obtenerCartera,
    obtenerInventarioValorizado,
    obtenerCuentasPorPagar
}
