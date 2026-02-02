const inventarioControlador = require('./inventario.controlador')

async function registrarRutasInventario(app) {
    app.get('/inventario/movimientos', {
        preHandler: [app.requierePermiso('VER_INVENTARIO')]
    }, inventarioControlador.listarMovimientos)

    app.get('/inventario/producto/:id', {
        preHandler: [app.requierePermiso('VER_INVENTARIO')]
    }, inventarioControlador.obtenerMovimientosPorProducto)

    app.post('/inventario/ajuste', {
        preHandler: [app.requierePermiso('GESTION_INVENTARIO')]
    }, inventarioControlador.registrarAjuste)

    app.get('/inventario/valor-total', {
        preHandler: [app.requierePermiso('VER_INVENTARIO')]
    }, inventarioControlador.obtenerValorInventario)
}

module.exports = { registrarRutasInventario }
