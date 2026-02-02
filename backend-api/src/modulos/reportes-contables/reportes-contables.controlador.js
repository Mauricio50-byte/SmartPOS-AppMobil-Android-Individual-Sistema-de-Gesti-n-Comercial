const reportesContablesServicio = require('./reportes-contables.servicio');

/**
 * Controlador para Reportes Contables
 */

async function obtenerEstadoResultados(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        if (!fechaInicio || !fechaFin) {
            return res.code(400).send({
                mensaje: 'Se requieren parámetros fechaInicio y fechaFin (YYYY-MM-DD)'
            });
        }
        const reporte = await reportesContablesServicio.obtenerEstadoResultados(fechaInicio, fechaFin);
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar estado de resultados', error: error.message });
    }
}

async function obtenerFlujoCaja(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        if (!fechaInicio || !fechaFin) {
            return res.code(400).send({
                mensaje: 'Se requieren parámetros fechaInicio y fechaFin (YYYY-MM-DD)'
            });
        }
        const reporte = await reportesContablesServicio.obtenerFlujoCaja(fechaInicio, fechaFin);
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar flujo de caja', error: error.message });
    }
}

async function obtenerCartera(req, res) {
    try {
        const { estado = 'PENDIENTE' } = req.query;
        const reporte = await reportesContablesServicio.obtenerCartera(estado);
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar reporte de cartera', error: error.message });
    }
}

async function obtenerInventarioValorizado(req, res) {
    try {
        const reporte = await reportesContablesServicio.obtenerInventarioValorizado();
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar inventario valorizado', error: error.message });
    }
}

async function obtenerCuentasPorPagar(req, res) {
    try {
        const { estado = 'PENDIENTE' } = req.query;
        const reporte = await reportesContablesServicio.obtenerCuentasPorPagar(estado);
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar cuentas por pagar', error: error.message });
    }
}

module.exports = {
    obtenerEstadoResultados,
    obtenerFlujoCaja,
    obtenerCartera,
    obtenerInventarioValorizado,
    obtenerCuentasPorPagar
}
