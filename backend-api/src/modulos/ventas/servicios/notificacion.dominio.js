/**
 * Servicio de Dominio: Notificaciones Administrativas
 * Responsable de informar eventos críticos al personal adecuado.
 */
async function dispararAlertasStock(tx, { detalles, usuarioId }) {
    for (const item of detalles) {
        const p = item.productoOriginal;
        // Recargar stock actual después del descuento
        const prodActual = await tx.producto.findUnique({ where: { id: p.id } });

        if (prodActual.stock <= (prodActual.stockMinimo || 5)) {
            await tx.notificacion.create({
                data: {
                    usuarioId: Number(usuarioId),
                    titulo: 'Stock Crítico',
                    mensaje: `El producto ${prodActual.nombre} tiene solo ${prodActual.stock} unidades restantes.`,
                    tipo: 'urgent',
                    link: 'productos'
                }
            });
        }
    }
}

module.exports = { dispararAlertasStock };
