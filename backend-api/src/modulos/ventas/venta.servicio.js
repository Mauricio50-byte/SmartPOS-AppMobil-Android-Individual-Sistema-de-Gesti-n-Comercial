const { prisma } = require('../../infraestructura/bd')
const { crearDeuda } = require('../deudas/deuda.servicio')

async function listarVentas(filtro = {}) {
  return prisma.venta.findMany({
    where: filtro,
    orderBy: { id: 'desc' },
    include: {
      detalles: {
        include: { producto: true }
      },
      cliente: true,
      usuario: {
        select: { id: true, nombre: true }
      }
    }
  })
}

async function obtenerVentaPorId(id) {
  return prisma.venta.findUnique({
    where: { id },
    include: {
      detalles: {
        include: { producto: true }
      },
      cliente: true,
      usuario: {
        select: { id: true, nombre: true }
      },
      deuda: {
        include: {
          abonos: true
        }
      }
    }
  })
}

async function crearVenta(payload) {
  console.log('--- INICIO CREAR VENTA ---');
  console.log('Payload recibido:', JSON.stringify(payload, null, 2));

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
    } = payload

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Sin items')
    }

    const ventaIdResult = await prisma.$transaction(async tx => {
      let clienteIdFinal = clienteId

      // Si se solicita registrar un nuevo cliente
      if (registrarCliente && datosCliente) {
        const nuevoCliente = await tx.cliente.create({
          data: {
            nombre: datosCliente.nombre,
            telefono: datosCliente.telefono,
            cedula: datosCliente.cedula || null,
            correo: datosCliente.correo || null,
            creditoMaximo: datosCliente.creditoMaximo || 0,
            diasCredito: datosCliente.diasCredito || 30
          }
        })
        clienteIdFinal = nuevoCliente.id
      }

      // Validar crédito disponible si es venta fiada
      if (estadoPago === 'FIADO' && clienteIdFinal) {
        const cliente = await tx.cliente.findUnique({ where: { id: clienteIdFinal } })
        if (!cliente) throw new Error('Cliente no encontrado')

        const productosIds = items.map(i => Number(i.productoId));
        const productos = await tx.producto.findMany({
          where: { id: { in: productosIds } }
        })
        const mapa = new Map(productos.map(p => [p.id, p]))
        let totalCalculado = 0

        items.forEach(i => {
          const p = mapa.get(Number(i.productoId))
          if (p) {
            const precio = Number(p.precioVenta || p.precio || 0);
            totalCalculado += Number(i.cantidad) * precio
          }
        })

        const creditoDisponible = (cliente.creditoMaximo || 0) - (cliente.saldoDeuda || 0)
        if (creditoDisponible < totalCalculado) {
          throw new Error(`Crédito insuficiente. Disponible: $${creditoDisponible}, Solicitado: $${totalCalculado}`)
        }
      }

      // Obtener productos y validar stock
      const productos = await tx.producto.findMany({
        where: { id: { in: items.map(i => Number(i.productoId)) } }
      })
      console.log('Productos recuperados BD:', JSON.stringify(productos, null, 2));

      const mapa = new Map(productos.map(p => [p.id, p]))
      let total = 0
      const detalles = items.map(i => {
        const p = mapa.get(Number(i.productoId))
        if (!p) throw new Error(`Producto con ID ${i.productoId} no existe`)

        if (p.stock < Number(i.cantidad)) {
          throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock}, Solicitado: ${i.cantidad}`)
        }

        const cantidad = Number(i.cantidad)
        const precioUnitario = Number(p.precioVenta || 0);
        const subtotal = cantidad * precioUnitario
        total += subtotal
        return { productoId: p.id, cantidad, precioUnitario, subtotal }
      })

      const montoPagadoFinal = estadoPago === 'PAGADO' ? total : Number(montoPagado || 0)
      const saldoPendiente = total - montoPagadoFinal

      const ventaData = {
        total: Number(total || 0),
        metodoPago,
        estadoPago,
        montoPagado: Number(montoPagadoFinal || 0),
        saldoPendiente: Number(saldoPendiente || 0),
        usuarioId: Number(usuarioId),
        clienteId: clienteIdFinal ? Number(clienteIdFinal) : null
      }

      console.log('Data final para Prisma (Simple IDs):', JSON.stringify(ventaData, null, 2));

      const ventaCreated = await tx.venta.create({
        data: ventaData
      })

      await tx.detalleVenta.createMany({
        data: detalles.map(d => ({
          ventaId: ventaCreated.id,
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal
        }))
      })

      for (const d of detalles) {
        const prodActualizado = await tx.producto.update({
          where: { id: d.productoId },
          data: { stock: { decrement: d.cantidad } }
        })

        // Registrar movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: d.productoId,
            tipo: 'SALIDA',
            cantidad: d.cantidad,
            costoUnitario: Number(prodActualizado.precioCosto || 0),
            valorTotal: Number(prodActualizado.precioCosto || 0) * d.cantidad,
            stockAnterior: prodActualizado.stock + d.cantidad,
            stockNuevo: prodActualizado.stock,
            referencia: ventaCreated.id.toString(),
            tipoReferencia: 'VENTA',
            usuarioId: Number(usuarioId),
            motivo: `Venta #${ventaCreated.id}`
          }
        })

        if (prodActualizado.stock <= (prodActualizado.stockMinimo || 5)) {
          await tx.notificacion.create({
            data: {
              usuarioId: Number(usuarioId),
              titulo: 'Stock Crítico',
              mensaje: `El producto ${prodActualizado.nombre} tiene solo ${prodActualizado.stock} unidades restantes.`,
              tipo: 'urgent',
              link: 'productos'
            }
          })
        }
      }

      if (estadoPago === 'FIADO' && clienteIdFinal) {
        const clienteDeuda = await tx.cliente.findUnique({ where: { id: clienteIdFinal } })
        const dias = clienteDeuda.diasCredito || 30
        const fechaVencimiento = new Date()
        fechaVencimiento.setDate(fechaVencimiento.getDate() + dias)

        await tx.deuda.create({
          data: {
            clienteId: clienteIdFinal,
            ventaId: ventaCreated.id,
            montoTotal: saldoPendiente,
            saldoPendiente: saldoPendiente,
            fechaVencimiento
          }
        })

        await tx.cliente.update({
          where: { id: clienteIdFinal },
          data: { saldoDeuda: { increment: saldoPendiente } }
        })
      }

      if (clienteIdFinal && estadoPago === 'PAGADO') {
        const puntosGanados = Math.floor(total / 1000)
        if (puntosGanados > 0) {
          await tx.cliente.update({
            where: { id: clienteIdFinal },
            data: { puntos: { increment: puntosGanados } }
          })
        }
      }

      // Integración caja
      if (montoPagadoFinal > 0) {
        const cajaAbierta = await tx.caja.findFirst({
          where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
        })

        if (cajaAbierta) {
          const metodoPagoNorm = String(metodoPago).toUpperCase();
          let montoIngresoReal = Number(montoPagadoFinal);
          if (metodoPagoNorm === 'EFECTIVO' && Number(montoRecibido) > montoPagadoFinal) {
            montoIngresoReal = Number(montoRecibido);
          }

          await tx.movimientoCaja.create({
            data: {
              cajaId: cajaAbierta.id,
              usuarioId: Number(usuarioId),
              tipo: 'VENTA',
              metodoPago: metodoPagoNorm,
              monto: montoIngresoReal,
              descripcion: `Venta #${ventaCreated.id} (${metodoPagoNorm})`,
              ventaId: ventaCreated.id,
              fecha: new Date()
            }
          })

          if (metodoPagoNorm === 'EFECTIVO' && Number(montoRecibido) > montoPagadoFinal) {
            const cambio = Number(montoRecibido) - montoPagadoFinal;
            await tx.movimientoCaja.create({
              data: {
                cajaId: cajaAbierta.id,
                usuarioId: Number(usuarioId),
                tipo: 'EGRESO',
                metodoPago: 'EFECTIVO',
                monto: cambio,
                descripcion: `Cambio de Venta #${ventaCreated.id}`,
                ventaId: ventaCreated.id,
                fecha: new Date()
              }
            })
          }
        }
      }

      return ventaCreated.id
    }, {
      maxWait: 10000, // Tiempo máximo para esperar una conexión activa
      timeout: 20000  // Tiempo máximo para que la transacción se ejecute
    })

    const ventaCompleta = await obtenerVentaPorId(ventaIdResult);
    return ventaCompleta;
  } catch (error) {
    console.error('ERROR EN crearVenta:', error)
    throw error
  }
}

module.exports = { listarVentas, obtenerVentaPorId, crearVenta }
