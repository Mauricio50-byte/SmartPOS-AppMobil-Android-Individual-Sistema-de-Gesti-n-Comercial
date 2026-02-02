const { prisma } = require('../../infraestructura/bd')

async function listarMovimientos(filtros = {}) {
    const { productoId, tipo, fechaInicio, fechaFin, usuarioId } = filtros
    const skip = parseInt(filtros.skip) || 0
    const take = parseInt(filtros.take) || 50

    const where = {}
    if (productoId && productoId !== '') where.productoId = Number(productoId)
    if (tipo && tipo !== '') where.tipo = tipo
    if (usuarioId && usuarioId !== '') where.usuarioId = Number(usuarioId)

    if ((fechaInicio && fechaInicio !== '') || (fechaFin && fechaFin !== '')) {
        const fechaFilter = {}
        if (fechaInicio && fechaInicio !== '') fechaFilter.gte = new Date(fechaInicio)
        if (fechaFin && fechaFin !== '') fechaFilter.lte = new Date(fechaFin)

        if (Object.keys(fechaFilter).length > 0) {
            where.fecha = fechaFilter
        }
    }

    try {
        const [total, movimientos] = await Promise.all([
            prisma.movimientoInventario.count({ where }),
            prisma.movimientoInventario.findMany({
                where,
                orderBy: { fecha: 'desc' },
                skip,
                take,
                include: {
                    producto: {
                        select: { id: true, nombre: true, sku: true }
                    },
                    usuario: {
                        select: { id: true, nombre: true }
                    }
                }
            })
        ])

        return { total, movimientos }
    } catch (error) {
        console.error('Prisma Error [listarMovimientos]:', error)
        throw error
    }
}

async function obtenerMovimientosPorProducto(productoId) {
    return prisma.movimientoInventario.findMany({
        where: { productoId: Number(productoId) },
        orderBy: { fecha: 'desc' },
        include: {
            usuario: {
                select: { id: true, nombre: true }
            }
        }
    })
}

async function registrarAjuste(datos) {
    const { productoId, cantidad, tipo, motivo, usuarioId } = datos

    return prisma.$transaction(async tx => {
        const producto = await tx.producto.findUnique({
            where: { id: Number(productoId) }
        })

        if (!producto) throw new Error('Producto no encontrado')

        const stockAnterior = producto.stock
        let stockNuevo = stockAnterior

        if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') stockNuevo += Number(cantidad)
        else if (tipo === 'SALIDA') stockNuevo -= Number(cantidad)
        else if (tipo === 'AJUSTE') stockNuevo = Number(cantidad)

        if (stockNuevo < 0) throw new Error('El stock no puede ser negativo')

        await tx.producto.update({
            where: { id: Number(productoId) },
            data: { stock: stockNuevo }
        })

        const diff = stockNuevo - stockAnterior
        return tx.movimientoInventario.create({
            data: {
                productoId: Number(productoId),
                tipo,
                cantidad: Math.abs(diff),
                costoUnitario: Number(producto.precioCosto || 0),
                valorTotal: Number(producto.precioCosto || 0) * Math.abs(diff),
                stockAnterior,
                stockNuevo,
                usuarioId: Number(usuarioId),
                motivo: motivo || 'Ajuste manual de inventario',
                tipoReferencia: 'AJUSTE'
            }
        })
    })
}

async function obtenerValorInventario() {
    const productos = await prisma.producto.findMany({
        where: { activo: true },
        select: {
            stock: true,
            precioCosto: true
        }
    })

    return productos.reduce((acc, p) => acc + (Number(p.stock || 0) * Number(p.precioCosto || 0)), 0)
}

module.exports = {
    listarMovimientos,
    obtenerMovimientosPorProducto,
    registrarAjuste,
    obtenerValorInventario
}
