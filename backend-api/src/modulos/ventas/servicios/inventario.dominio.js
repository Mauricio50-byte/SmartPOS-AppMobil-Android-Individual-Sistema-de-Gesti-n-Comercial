/**
 * Servicio de Dominio: Inventario
 * Responsable de la integridad del stock físico y movimientos de mercancía.
 */
async function validarYDescontarStock(tx, items, usuarioId, ventaId) {
    const productosIds = items.map(i => Number(i.productoId));
    const productos = await tx.producto.findMany({
        where: { id: { in: productosIds } }
    });

    const mapa = new Map(productos.map(p => [p.id, p]));
    const detalles = [];
    let totalVenta = 0;

    for (const item of items) {
        const p = mapa.get(Number(item.productoId));
        if (!p) throw new Error(`Producto con ID ${item.productoId} no existe`);

        const cantidad = Number(item.cantidad);
        if (p.stock < cantidad) {
            throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock}, Solicitado: ${cantidad}`);
        }

        const precioUnitario = Number(p.precioVenta || 0);
        const subtotal = cantidad * precioUnitario;
        totalVenta += subtotal;

        detalles.push({
            productoId: p.id,
            cantidad,
            precioUnitario,
            precioCosto: Number(p.precioCosto || 0),
            subtotal,
            productoOriginal: p // Para uso posterior en notificaciones o kardex
        });

        // Descontar stock
        const prodActualizado = await tx.producto.update({
            where: { id: p.id },
            data: { stock: { decrement: cantidad } }
        });

        // Registrar Kardex (Movimiento de Inventario)
        await tx.movimientoInventario.create({
            data: {
                productoId: p.id,
                tipo: 'SALIDA',
                cantidad: cantidad,
                costoUnitario: Number(p.precioCosto || 0),
                valorTotal: Number(p.precioCosto || 0) * cantidad,
                stockAnterior: p.stock,
                stockNuevo: prodActualizado.stock,
                referencia: ventaId.toString(),
                tipoReferencia: 'VENTA',
                usuarioId: Number(usuarioId),
                motivo: `Venta #${ventaId}`
            }
        });
    }

    return { detalles, totalVenta };
}

module.exports = { validarYDescontarStock };
