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
    let totalImpuestos = 0;
    let totalSubtotalNeto = 0;

    for (const item of items) {
        const p = mapa.get(Number(item.productoId));
        if (!p) throw new Error(`Producto con ID ${item.productoId} no existe`);

        const cantidad = Number(item.cantidad);
        if (p.stock < cantidad) {
            throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock}, Solicitado: ${cantidad}`);
        }

        const precioBruto = Number(p.precioVenta || 0);
        const porcentajeIva = Number(p.porcentajeIva || 0);

        const totalItem = cantidad * precioBruto;
        const subtotalNetoItem = totalItem / (1 + (porcentajeIva / 100));
        const montoIvaItem = totalItem - subtotalNetoItem;

        totalVenta += totalItem;
        totalImpuestos += montoIvaItem;
        totalSubtotalNeto += subtotalNetoItem;

        detalles.push({
            productoId: p.id,
            cantidad,
            precioUnitario: precioBruto,
            precioCosto: Number(p.precioCosto || 0),
            porcentajeIva,
            montoIva: montoIvaItem,
            subtotal: totalItem, // Mantenemos subtotal como total del item para no romper compatibilidad, o lo cambiamos?
            // En Prisma, DetalleVenta.subtotal parece ser el total del item.
            // Pero agregamos subtotalNeto para claridad interna si fuera necesario.
            productoOriginal: p
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

    return { detalles, totalVenta, totalImpuestos, totalSubtotalNeto };
}

module.exports = { validarYDescontarStock };
