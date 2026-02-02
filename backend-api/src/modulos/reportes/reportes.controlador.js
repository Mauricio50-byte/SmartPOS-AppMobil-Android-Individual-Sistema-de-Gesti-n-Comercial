const reportesServicio = require('./reportes.servicio');

async function obtenerReporteGeneral(req, res) {
    try {
        const { period = 'month', groupBy = 'category' } = req.query;
        const reporte = await reportesServicio.obtenerReporteGeneral(period, groupBy);
        return res.send(reporte);
    } catch (error) {
        req.log.error(error);
        res.code(500).send({ mensaje: 'Error al generar el reporte', error: error.message });
    }
}

module.exports = { obtenerReporteGeneral }
