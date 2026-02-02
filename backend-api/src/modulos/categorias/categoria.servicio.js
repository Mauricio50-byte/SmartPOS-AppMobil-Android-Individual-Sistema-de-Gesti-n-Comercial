const { prisma } = require('../../infraestructura/bd')

async function listarCategorias() {
    return prisma.categoria.findMany({
        orderBy: { nombre: 'asc' },
        where: { activo: true } // Opcional: solo activos
    })
}

async function obtenerCategoriaPorId(id) {
    return prisma.categoria.findUnique({
        where: { id: Number(id) }
    })
}

async function crearCategoria(datos) {
    const { nombre, descripcion } = datos
    return prisma.categoria.create({
        data: {
            nombre,
            descripcion,
            activo: true
        }
    })
}

async function actualizarCategoria(id, datos) {
    const { nombre, descripcion, activo } = datos
    return prisma.categoria.update({
        where: { id: Number(id) },
        data: {
            nombre,
            descripcion,
            activo
        }
    })
}

async function eliminarCategoria(id) {
    // Soft delete para no romper productos
    return prisma.categoria.update({
        where: { id: Number(id) },
        data: { activo: false }
    })
}

module.exports = {
    listarCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
}
