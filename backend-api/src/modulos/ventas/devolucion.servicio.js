const { prisma } = require('../../infraestructura/bd')

async function crearDevolucion(datos) {
    const { ventaId, items, motivo, usuarioId } = datos

    try {
        return await prisma.$transaction(async tx => {
            // 1. Validar la venta
            const venta = await tx.venta.findUnique({
                where: { id: Number(ventaId) },
                include: { detalles: true }
            })
            if (!venta) throw new Error('Venta no encontrada')

            let totalDevolucion = 0
            const detallesDevolucion = []

            // 2. Procesar ítems a devolver
            for (const item of items) {
                const detalleOriginal = venta.detalles.find(d => d.productoId === Number(item.productoId))
                if (!detalleOriginal) throw new Error(`El producto ${item.productoId} no pertenece a esta venta`)

                if (item.cantidad > detalleOriginal.cantidad) {
                    throw new Error(`No se puede devolver más de lo vendido (${detalleOriginal.cantidad})`)
                }

                const subtotal = item.cantidad * detalleOriginal.precioUnitario
                totalDevolucion += subtotal

                detallesDevolucion.push({
                    productoId: item.productoId,
                    cantidad: item.cantidad,
                    precioUnitario: detalleOriginal.precioUnitario,
                    subtotal
                })

                // 3. Aumentar stock del producto
                const prod = await tx.producto.update({
                    where: { id: item.productoId },
                    data: { stock: { increment: item.cantidad } }
                })

                // 4. Registrar movimiento de inventario (DEVOLUCION)
                await tx.movimientoInventario.create({
                    data: {
                        productoId: item.productoId,
                        tipo: 'DEVOLUCION',
                        cantidad: item.cantidad,
                        costoUnitario: Number(prod.precioCosto || 0),
                        valorTotal: Number(prod.precioCosto || 0) * item.cantidad,
                        stockAnterior: prod.stock - item.cantidad,
                        stockNuevo: prod.stock,
                        referencia: venta.id.toString(),
                        tipoReferencia: 'DEVOLUCION_VENTA',
                        usuarioId: Number(usuarioId),
                        motivo: `Devolución de Venta #${venta.id}. ${motivo || ''}`
                    }
                })
            }

            // 5. Crear el registro de devolución
            const devolucion = await tx.devolucion.create({
                data: {
                    ventaId: Number(ventaId),
                    totalDevuelto: totalDevolucion,
                    motivo,
                    usuarioId: Number(usuarioId),
                    detalles: {
                        create: detallesDevolucion
                    }
                }
            })

            // 6. Manejo financiero (Caja/Deuda)
            if (venta.estadoPago === 'FIADO' && venta.clienteId) {
                // Reducir deuda si existía
                await tx.cliente.update({
                    where: { id: venta.clienteId },
                    data: { saldoDeuda: { decrement: totalDevolucion } }
                })

                const deuda = await tx.deuda.findFirst({ where: { ventaId: venta.id } })
                if (deuda) {
                    await tx.deuda.update({
                        where: { id: deuda.id },
                        data: { saldoPendiente: { decrement: totalDevolucion } }
                    })
                }
            } else if (totalDevolucion > 0) {
                // Si fue pagado, registrar salida de caja si hay caja abierta
                const cajaAbierta = await tx.caja.findFirst({
                    where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
                })

                if (cajaAbierta) {
                    await tx.movimientoCaja.create({
                        data: {
                            cajaId: cajaAbierta.id,
                            usuarioId: Number(usuarioId),
                            tipo: 'EGRESO',
                            metodoPago: venta.metodoPago || 'EFECTIVO',
                            monto: totalDevolucion,
                            descripcion: `Devolución de Venta #${venta.id}`,
                            ventaId: venta.id,
                            fecha: new Date()
                        }
                    })
                }
            }

            return devolucion
        }, {
            maxWait: 10000,
            timeout: 20000
        })
    } catch (error) {
        console.error('[ERROR CRITICO] crearDevolucion:', error)
        throw error
    }
}

async function listarDevoluciones(filtro = {}) {
    return prisma.devolucion.findMany({
        where: filtro,
        include: {
            venta: true,
            usuario: { select: { id: true, nombre: true } },
            detalles: { include: { producto: true } }
        },
        orderBy: { fecha: 'desc' }
    })
}

module.exports = { crearDevolucion, listarDevoluciones }
