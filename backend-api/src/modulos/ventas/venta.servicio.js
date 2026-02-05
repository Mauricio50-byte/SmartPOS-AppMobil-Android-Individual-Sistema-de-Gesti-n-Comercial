const { prisma } = require('../../infraestructura/bd');
const InventarioDom = require('./servicios/inventario.dominio');
const FinanzasDom = require('./servicios/finanzas.dominio');
const CarteraDom = require('./servicios/cartera.dominio');
const FidelizacionDom = require('./servicios/fidelizacion.dominio');
const NotificacionDom = require('./servicios/notificacion.dominio');

/**
 * Orquestador de Ventas
 * Coordina los servicios de dominio dentro de una transacción para asegurar consistencia.
 */

async function listarVentas(filtro = {}) {
  return prisma.venta.findMany({
    where: filtro,
    orderBy: { id: 'desc' },
    include: {
      detalles: { include: { producto: true } },
      cliente: true,
      usuario: { select: { id: true, nombre: true } }
    }
  });
}

async function obtenerVentaPorId(id) {
  return prisma.venta.findUnique({
    where: { id },
    include: {
      detalles: { include: { producto: true } },
      cliente: true,
      usuario: { select: { id: true, nombre: true } },
      deuda: { include: { abonos: true } }
    }
  });
}

async function crearVenta(payload) {
  console.log('--- INICIANDO ORQUESTACIÓN DE VENTA ---');

  try {
    const {
      clienteId = null,
      items = [],
      usuarioId,
      metodoPago = 'EFECTIVO',
      estadoPago = 'PAGADO',
      montoPagado = 0,
      montoRecibido = 0,
      registrarCliente = false,
      datosCliente = null
    } = payload;

    if (!Array.isArray(items) || items.length === 0) throw new Error('La venta no tiene productos');

    // 1. Iniciar Transacción Atómica
    const ventaIdResult = await prisma.$transaction(async (tx) => {
      let idClienteFinal = clienteId;

      // A. Gestión de Cliente Nuevo (Si aplica)
      if (registrarCliente && datosCliente) {
        const nuevoCliente = await tx.cliente.create({
          data: {
            nombre: datosCliente.nombre,
            telefono: datosCliente.telefono,
            cedula: datosCliente.cedula || null,
            correo: datosCliente.correo || null,
            creditoMaximo: Number(datosCliente.creditoMaximo || 0),
            diasCredito: Number(datosCliente.diasCredito || 30)
          }
        });
        idClienteFinal = nuevoCliente.id;
      }

      // B. Fase de Inventario (Validación y Descuento)
      // Generamos un ID temporal para la referencia o lo hacemos después
      // Nota: Necesitamos el ventaId para el Kardex, pero ventaId se genera al crear la venta.
      // Solución: Creamos la venta primero con total 0 y luego actualizamos, o usamos un placeholder.
      // Mejor: Creamos el registro de venta primero.

      const ventaPrevia = await tx.venta.create({
        data: {
          total: 0,
          usuarioId: Number(usuarioId),
          clienteId: idClienteFinal ? Number(idClienteFinal) : null,
          metodoPago,
          estadoPago,
          montoPagado: 0,
          saldoPendiente: 0
        }
      });

      const { detalles, totalVenta, totalImpuestos, totalSubtotalNeto } = await InventarioDom.validarYDescontarStock(tx, items, usuarioId, ventaPrevia.id);

      // C. Fase de Cartera (Créditos y Deudas)
      await CarteraDom.gestionarCartera(tx, {
        clienteId: idClienteFinal,
        ventaId: ventaPrevia.id,
        totalVenta,
        montoPagado: Number(montoPagado),
        estadoPago
      });

      // E. Fase de Fidelización (Redención de Puntos)
      const descuentoPuntos = await FidelizacionDom.redimirPuntos(tx, {
        clienteId: idClienteFinal,
        puntosARedimir: Number(payload.puntosARedimir || 0),
        totalVenta
      });

      const totalVentaFinal = totalVenta - descuentoPuntos;

      // F. Fase de Finanzas (Flujo de Caja)
      await FinanzasDom.procesarFlujoCaja(tx, {
        usuarioId,
        ventaId: ventaPrevia.id,
        montoPagado: estadoPago === 'PAGADO' ? totalVentaFinal : Number(montoPagado),
        metodoPago,
        montoRecibido
      });

      // G. Fase de Fidelización (Acumulación de Puntos)
      // Se acumulan puntos sobre el saldo efectivamente pagado
      await FidelizacionDom.procesarFidelizacion(tx, {
        clienteId: idClienteFinal,
        totalVenta: totalVentaFinal,
        estadoPago
      });

      // H. Fase de Notificaciones (Alertas)
      await NotificacionDom.dispararAlertasStock(tx, { detalles, usuarioId });

      // I. Finalización del Registro de Venta
      const saldoPendiente = estadoPago === 'FIADO' ? (totalVentaFinal - Number(montoPagado)) : 0;
      const montoPagadoFinal = estadoPago === 'PAGADO' ? totalVentaFinal : Number(montoPagado);

      await tx.venta.update({
        where: { id: ventaPrevia.id },
        data: {
          total: totalVentaFinal,
          subtotal: totalSubtotalNeto,
          impuestos: totalImpuestos,
          montoPagado: montoPagadoFinal,
          saldoPendiente: saldoPendiente
        }
      });

      // Insertar detalles uno por uno dentro de la transacción para mayor compatibilidad
      for (const d of detalles) {
        await tx.detalleVenta.create({
          data: {
            ventaId: ventaPrevia.id,
            productoId: d.productoId,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            precioCosto: d.precioCosto,
            porcentajeIva: d.porcentajeIva,
            montoIva: d.montoIva,
            subtotal: d.subtotal
          }
        });
      }

      return ventaPrevia.id;
    }, {
      maxWait: 10000,
      timeout: 25000
    });

    return await obtenerVentaPorId(ventaIdResult);

  } catch (error) {
    console.error('ERROR EN ORQUESTADOR DE VENTA:', error.message);
    throw error;
  }
}

module.exports = { listarVentas, obtenerVentaPorId, crearVenta };
