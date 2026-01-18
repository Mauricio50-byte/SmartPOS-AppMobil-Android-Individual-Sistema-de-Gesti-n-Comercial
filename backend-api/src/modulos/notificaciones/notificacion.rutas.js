const {
    listarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion
} = require('./notificacion.servicio')

async function registrarRutasNotificaciones(app) {
    // Encapsulamos el hook y las rutas para que no afecten a otras partes del servidor
    app.register(async (notifApp) => {
        notifApp.addHook('onRequest', async (req, res) => {
            try {
                await req.jwtVerify()
            } catch (err) {
                res.code(401).send({ error: 'No autorizado' })
            }
        })

        // Get all notifications for the current user
        notifApp.get('/notificaciones', async (req, res) => {
            const usuarioId = req.user?.id
            if (!usuarioId) return []
            return await listarNotificaciones(usuarioId)
        })

        // Mark a specific notification as read
        notifApp.put('/notificaciones/:id/leer', async (req, res) => {
            const id = parseInt(req.params.id)
            if (isNaN(id)) {
                res.code(400)
                return { error: 'ID inválido' }
            }
            return await marcarComoLeida(id)
        })

        // Mark all as read
        notifApp.put('/notificaciones/leer-todas', async (req, res) => {
            const usuarioId = req.user?.id
            if (!usuarioId) {
                res.code(400)
                return { error: 'Usuario no identificado' }
            }
            await marcarTodasComoLeidas(usuarioId)
            return { mensaje: 'Todas las notificaciones marcadas como leídas' }
        })

        // Delete a notification
        notifApp.delete('/notificaciones/:id', async (req, res) => {
            const id = parseInt(req.params.id)
            if (isNaN(id)) {
                res.code(400)
                return { error: 'ID inválido' }
            }
            await eliminarNotificacion(id)
            return { mensaje: 'Notificación eliminada' }
        })
    })
}

module.exports = { registrarRutasNotificaciones }
