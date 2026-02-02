const inventarioServicio = require('./inventario.servicio')

async function listarMovimientos(req, res) {
    try {
        const filtros = req.query
        const resultado = await inventarioServicio.listarMovimientos(filtros)
        return resultado
    } catch (e) {
        console.error('[InventoryController] Error listing movements:', e)
        res.code(500).send({ error: e.message })
    }
}

async function obtenerMovimientosPorProducto(req, res) {
    try {
        const { id } = req.params
        const movimientos = await inventarioServicio.obtenerMovimientosPorProducto(id)
        return movimientos
    } catch (e) {
        console.error('[InventoryController] Error getting product movements:', e)
        res.code(500).send({ error: e.message })
    }
}

async function registrarAjuste(req, res) {
    try {
        const datos = req.body
        datos.usuarioId = req.user.id
        const movimiento = await inventarioServicio.registrarAjuste(datos)
        return movimiento
    } catch (e) {
        console.error('[InventoryController] Error registering adjustment:', e)
        res.code(400).send({ error: e.message })
    }
}

async function obtenerValorInventario(req, res) {
    try {
        const valor = await inventarioServicio.obtenerValorInventario()
        return { valor }
    } catch (e) {
        console.error('[InventoryController] Error getting inventory value:', e)
        res.code(500).send({ error: e.message })
    }
}

module.exports = {
    listarMovimientos,
    obtenerMovimientosPorProducto,
    registrarAjuste,
    obtenerValorInventario
}
