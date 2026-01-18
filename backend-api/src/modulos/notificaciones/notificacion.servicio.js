const { prisma } = require('../../infraestructura/bd')

async function listarNotificaciones(usuarioId) {
    return await prisma.notificacion.findMany({
        where: { usuarioId },
        orderBy: { creadoEn: 'desc' },
        take: 50 // Limit to last 50
    })
}

async function marcarComoLeida(id) {
    return await prisma.notificacion.update({
        where: { id },
        data: { leido: true }
    })
}

async function marcarTodasComoLeidas(usuarioId) {
    return await prisma.notificacion.updateMany({
        where: { usuarioId, leido: false },
        data: { leido: true }
    })
}

async function eliminarNotificacion(id) {
    return await prisma.notificacion.delete({
        where: { id }
    })
}

async function crearNotificacion({ usuarioId, titulo, mensaje, tipo = 'info', link = null }) {
    return await prisma.notificacion.create({
        data: {
            usuarioId,
            titulo,
            mensaje,
            tipo,
            link
        }
    })
}

module.exports = {
    listarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    crearNotificacion
}
