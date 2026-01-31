const dashboardServicio = require('./dashboard.servicio');

async function getMetricas(req, res) {
    try {
        const { periodo } = req.query;
        const data = await dashboardServicio.obtenerMetricas(periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getGraficoVentas(req, res) {
    try {
        const { periodo } = req.query;
        const data = await dashboardServicio.obtenerGraficoVentas(periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getProductosTop(req, res) {
    try {
        const { limit, periodo } = req.query;
        const data = await dashboardServicio.obtenerProductosTop(limit ? parseInt(limit) : 5, periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getStockBajo(req, res) {
    try {
        const { limit } = req.query;
        const data = await dashboardServicio.obtenerStockBajo(limit ? parseInt(limit) : 5);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getTransaccionesRecientes(req, res) {
    try {
        const { limit } = req.query;
        const data = await dashboardServicio.obtenerTransaccionesRecientes(limit ? parseInt(limit) : 5);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getDistribucionCategorias(req, res) {
    try {
        const { periodo } = req.query;
        const data = await dashboardServicio.obtenerDistribucionCategorias(periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getDistribucionPagos(req, res) {
    try {
        const { periodo } = req.query;
        const data = await dashboardServicio.obtenerDistribucionPagos(periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

async function getTopClientes(req, res) {
    try {
        const { limit, periodo } = req.query;
        const data = await dashboardServicio.obtenerTopClientes(limit ? parseInt(limit) : 5, periodo);
        res.send(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

module.exports = {
    getMetricas,
    getGraficoVentas,
    getProductosTop,
    getStockBajo,
    getTransaccionesRecientes,
    getDistribucionCategorias,
    getDistribucionPagos,
    getTopClientes
};
