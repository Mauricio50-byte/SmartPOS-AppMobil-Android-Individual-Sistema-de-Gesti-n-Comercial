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
        try {
            const cuerpo = req.body
            const creado = await crearCategoria(cuerpo)
            res.code(201)
            return creado
        } catch (error) {
            console.error('Error al crear categoría:', error)
            res.code(400)
            return { mensaje: error.message }
        }
    })

    app.put('/categorias/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('EDITAR_PRODUCTO')] }, async (req, res) => {
        try {
            const id = Number(req.params.id)
            const cuerpo = req.body
            const actualizado = await actualizarCategoria(id, cuerpo)
            return actualizado
        } catch (error) {
            console.error('Error al actualizar categoría:', error)
            res.code(400)
            return { mensaje: error.message }
        }
    })

    app.delete('/categorias/:id', { preHandler: [app.requiereModulo('productos'), app.requierePermiso('ELIMINAR_PRODUCTO')] }, async (req, res) => {
        try {
            const id = Number(req.params.id)
            const eliminado = await eliminarCategoria(id)
            return eliminado
        } catch (error) {
            console.error('Error al eliminar categoría:', error)
            res.code(400)
            return { mensaje: error.message }
        }
    })
}

module.exports = { registrarRutasCategoria }
