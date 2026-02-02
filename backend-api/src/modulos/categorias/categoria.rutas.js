const {
    listarCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
} = require('./categoria.servicio')

async function registrarRutasCategoria(app) {
    // Reutilizamos el módulo 'productos' y permiso 'VER_INVENTARIO' por ahora
    app.get('/categorias', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
        const datos = await listarCategorias()
        return res.send(datos)
    })

    app.get('/categorias/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('VER_INVENTARIO')] }, async (req, res) => {
        const id = Number(req.params.id)
        const dato = await obtenerCategoriaPorId(id)
        if (!dato) {
            res.code(404)
            return { mensaje: 'No encontrado' }
        }
        return dato
    })

    app.post('/categorias', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('CREAR_PRODUCTO')] }, async (req, res) => {
        const cuerpo = req.body
        const creado = await crearCategoria(cuerpo)
        res.code(201)
        return creado
    })

    app.put('/categorias/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('EDITAR_PRODUCTO')] }, async (req, res) => {
        const id = Number(req.params.id)
        const cuerpo = req.body
        const actualizado = await actualizarCategoria(id, cuerpo)
        return actualizado
    })

    app.delete('/categorias/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('ELIMINAR_PRODUCTO')] }, async (req, res) => {
        const id = Number(req.params.id)
        const eliminado = await eliminarCategoria(id)
        return eliminado
    })
}

module.exports = { registrarRutasCategoria }
