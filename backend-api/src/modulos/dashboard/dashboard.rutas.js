const dashboardControlador = require('./dashboard.controlador');

async function registrarRutasDashboard(app) {
    app.get('/dashboard/metricas', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getMetricas);
    app.get('/dashboard/grafico-ventas', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getGraficoVentas);
    app.get('/dashboard/productos-top', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getProductosTop);
    app.get('/dashboard/stock-bajo', { preHandler: [app.requierePermiso('VER_INVENTARIO')] }, dashboardControlador.getStockBajo);
    app.get('/dashboard/transacciones-recientes', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getTransaccionesRecientes);
    app.get('/dashboard/distribucion-categorias', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getDistribucionCategorias);
    app.get('/dashboard/distribucion-pagos', { preHandler: [app.requierePermiso('VER_VENTAS')] }, dashboardControlador.getDistribucionPagos);
    app.get('/dashboard/top-clientes', { preHandler: [app.requierePermiso('VER_CLIENTES')] }, dashboardControlador.getTopClientes);
}

module.exports = { registrarRutasDashboard };
