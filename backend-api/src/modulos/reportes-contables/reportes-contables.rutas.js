const reportesContablesControlador = require('./reportes-contables.controlador');

/**
 * Registro de rutas para reportes contables independientes
 */
async function registrarRutasReportesContables(app) {
    // Usamos el mismo permiso que el reporte general por ahora,
    // o podrías definir uno nuevo como 'VER_REPORTES_CONTABLES'
    const preHandler = [app.requierePermiso('VER_REPORTES')];

    app.get('/reportes/estado-resultados', { preHandler }, reportesContablesControlador.obtenerEstadoResultados);
    app.get('/reportes/flujo-caja', { preHandler }, reportesContablesControlador.obtenerFlujoCaja);
    app.get('/reportes/cartera', { preHandler }, reportesContablesControlador.obtenerCartera);
    app.get('/reportes/inventario-valorizado', { preHandler }, reportesContablesControlador.obtenerInventarioValorizado);
    app.get('/reportes/cuentas-por-pagar', { preHandler }, reportesContablesControlador.obtenerCuentasPorPagar);
}

module.exports = { registrarRutasReportesContables }
