const { prisma } = require('../../infraestructura/bd')
const ContabilidadDom = require('../ventas/servicios/contabilidad.dominio');

/**
 * Calcula el Estado de Resultados (Ingresos, Costos, Gastos, Utilidad)
 */
async function obtenerEstadoResultados(fechaInicio, fechaFin) {
    const fInicio = new Date(fechaInicio);
    const fFin = new Date(fechaFin);
    fFin.setUTCHours(23, 59, 59, 999);

    // 1. Obtener Ventas y Devoluciones mediante el dominio centralizado
    const { ventasBrutas, totalDevoluciones, ventasNetas } = await ContabilidadDom.obtenerVentasNetasPeriodo(prisma, { start: fInicio, end: fFin });

    // 2. Calcular otros detalles (IVA, Subtotal)
    const ventasAggr = await prisma.venta.aggregate({
        where: { fecha: { gte: fInicio, lte: fFin } },
        _sum: { subtotal: true, impuestos: true }
    });

    const ingresosNetosVentas = ventasAggr._sum.subtotal || 0;
    const totalIVA = ventasAggr._sum.impuestos || 0;

    // 3. Costos de Ventas (Netos)
    const todosLosDetalles = await prisma.detalleVenta.findMany({
        where: { venta: { fecha: { gte: fInicio, lte: fFin } } }
    });

    let costosVentas = 0;
    todosLosDetalles.forEach(d => {
        costosVentas += (d.precioCosto || 0) * d.cantidad;
    });

    // Detalle de Devoluciones para restar del costo
    const detallesDevoluciones = await prisma.detalleDevolucion.findMany({
        where: { devolucion: { fecha: { gte: fInicio, lte: fFin } } }
    });

    let costoDevoluciones = 0;
    detallesDevoluciones.forEach(dd => {
        costoDevoluciones += (dd.precioCosto || 0) * dd.cantidad;
    });

    const costos = costosVentas - costoDevoluciones;

    // 4. Utilidad Bruta
    // La utilidad bruta se basa en ingresos netos (sin IVA y sin devoluciones) - costos netos
    // Asumimos que el subtotal de las ventas ya no incluye IVA. 
    // Para las devoluciones, necesitamos el impacto en el subtotal.
    const subtotalDevoluciones = detallesDevoluciones.reduce((acc, dd) => acc + (dd.subtotal || 0), 0);
    const utilidadBruta = (ingresosNetosVentas - subtotalDevoluciones) - costos;

    // 5. Gastos
    const gastosData = await prisma.gasto.aggregate({
        where: { fechaRegistro: { gte: fInicio, lte: fFin } },
        _sum: { montoTotal: true }
    });
    const gastos = gastosData._sum.montoTotal || 0;

    // 6. Utilidad Neta
    const utilidadNeta = utilidadBruta - gastos;

    return {
        ingresos: ventasNetas, // USAMOS NETO POR REQUERIMIENTO
        ingresosBrutos: ventasBrutas,
        devoluciones: totalDevoluciones,
        ingresosNetosContables: ingresosNetosVentas - subtotalDevoluciones,
        impuestosRecaudados: totalIVA,
        costos,
        utilidadBruta,
        gastos,
        utilidadNeta,
        fechaInicio,
        fechaFin,
        moneda: 'USD'
    };
}

/**
 * Calcula el Flujo de Caja (Efectivo real que entra y sale)
 */
async function obtenerFlujoCaja(fechaInicio, fechaFin) {
    const fInicio = new Date(fechaInicio);
    const fFin = new Date(fechaFin);
    fFin.setUTCHours(23, 59, 59, 999);

    // Saldo Inicial: Suma de montos iniciales de cajas + movimientos previos (Balance consolidado)
    let saldoHistorico = 0;

    const cajasPrevias = await prisma.caja.findMany({ where: { fechaApertura: { lt: fInicio } } });
    const movsPrevios = await prisma.movimientoCaja.findMany({ where: { fecha: { lt: fInicio } } });

    cajasPrevias.forEach(c => saldoHistorico += Number(c.montoInicial || 0));
    movsPrevios.forEach(m => {
        const tipoNorm = m.tipo.toUpperCase();
        const monto = Number(m.monto || 0);
        if (['INGRESO', 'VENTA', 'ABONO_VENTA', 'ABONO_DEUDA'].includes(tipoNorm)) {
            saldoHistorico += monto;
        } else if (['EGRESO', 'PAGO_GASTO', 'RETIRO'].includes(tipoNorm)) {
            saldoHistorico -= monto;
        }
    });

    // 1. Saldo Inicial del periodo = Saldo histórico + Bases de cajas abiertas en el periodo
    const cajasPeriodo = await prisma.caja.findMany({ where: { fechaApertura: { gte: fInicio, lte: fFin } } });
    let saldoBaseCajas = 0;
    cajasPeriodo.forEach(c => saldoBaseCajas += Number(c.montoInicial || 0));

    const saldoInicial = saldoHistorico + saldoBaseCajas;

    // 2. Entradas y Salidas Operativas (Ventas, Gastos, etc)
    const movimientosPeriodo = await prisma.movimientoCaja.findMany({
        where: { fecha: { gte: fInicio, lte: fFin } }
    });

    let ingresosVentas = 0;
    let otrosIngresos = 0;
    let devoluciones = 0;
    let salidasGastos = 0;
    let otrasSalidas = 0;

    movimientosPeriodo.forEach(m => {
        const tipoNorm = m.tipo.toUpperCase();
        const desc = (m.descripcion || '').toLowerCase();
        const monto = Number(m.monto || 0);

        if (tipoNorm === 'VENTA' || m.ventaId) {
            if (tipoNorm === 'EGRESO' && desc.includes('devolución')) {
                devoluciones += monto;
            } else if (tipoNorm === 'EGRESO') {
                otrasSalidas += monto;
            } else {
                ingresosVentas += monto;
            }
        } else if (['ABONO_VENTA', 'ABONO_DEUDA', 'INGRESO'].includes(tipoNorm)) {
            otrosIngresos += monto;
        } else if (tipoNorm === 'PAGO_GASTO') {
            salidasGastos += monto;
        } else if (['EGRESO', 'RETIRO'].includes(tipoNorm)) {
            otrasSalidas += monto;
        }
    });

    // Para consistencia visual para el usuario:
    // Entradas: Todo lo que entró (Ventas Brutas + Otros Ingresos)
    // Salidas: Todo lo que salió (Gastos + Otros Egresos + Devoluciones)
    const entradasTotales = ingresosVentas + otrosIngresos;
    const salidasTotales = salidasGastos + otrasSalidas + devoluciones;
    const saldoFinal = saldoInicial + entradasTotales - salidasTotales;

    return {
        saldoInicial,
        ingresosVentas,
        devoluciones,
        ingresosNetos: ingresosVentas - devoluciones,
        otrosIngresos,
        entradasTotales,
        entradas: entradasTotales, // Alias para el frontend
        salidasGastos,
        otrasSalidas,
        salidasTotales,
        salidas: salidasTotales, // Alias para el frontend
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
