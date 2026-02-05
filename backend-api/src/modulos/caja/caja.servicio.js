const { prisma } = require('../../infraestructura/bd')

async function abrirCaja({ usuarioId, montoInicial, observaciones }) {
  // Verificar si ya tiene una caja abierta
  const cajaAbierta = await prisma.caja.findFirst({
    where: {
      usuarioId,
      estado: 'ABIERTA'
    }
  })

  if (cajaAbierta) {
    throw new Error('Ya tienes una caja abierta. Debes cerrarla antes de abrir una nueva.')
  }

  const monto = parseFloat(montoInicial)
  if (isNaN(monto)) {
    throw new Error('El monto inicial debe ser un número válido.')
  }

  const nuevaCaja = await prisma.caja.create({
    data: {
      usuarioId,
      montoInicial: monto,
      estado: 'ABIERTA',
      observaciones,
      fechaApertura: new Date()
    }
  })

  // Registrar movimiento inicial de apertura si es > 0 (opcional, pero buena práctica)
  // O simplemente el montoInicial es el saldo inicial.

  return nuevaCaja
}

async function cerrarCaja({ usuarioId, montoFinal, observaciones }) {
  const caja = await prisma.caja.findFirst({
    where: {
      usuarioId,
      estado: 'ABIERTA'
    },
    include: {
      movimientos: true
    }
  })

  if (!caja) {
    throw new Error('No tienes una caja abierta para cerrar.')
  }

  const montoFinalNum = parseFloat(montoFinal)
  if (isNaN(montoFinalNum)) {
    throw new Error('El monto final debe ser un número válido.')
  }

  // Tipos que SUMAN al saldo (Ingresos)
  const tiposIngreso = ['INGRESO', 'VENTA', 'ABONO_VENTA', 'ABONO_DEUDA'];
  // Tipos que RESTAN al saldo (Egresos)
  const tiposEgreso = ['EGRESO', 'PAGO_GASTO', 'RETIRO'];

  // Calcular montoSistema solo para EFECTIVO
  const saldoInicialEfectivo = caja.montoInicial;

  let ingresosEfectivoBruto = 0;
  let devolucionesEfectivo = 0;
  let egresosEfectivoReal = 0;

  caja.movimientos.forEach(m => {
    if (m.metodoPago !== 'EFECTIVO') return;

    const tipo = m.tipo.toUpperCase();
    const desc = (m.descripcion || '').toLowerCase();

    if (tiposIngreso.includes(tipo)) {
      ingresosEfectivoBruto += m.monto;
    } else if (tiposEgreso.includes(tipo)) {
      if (desc.includes('devolución')) {
        devolucionesEfectivo += m.monto;
      } else {
        egresosEfectivoReal += m.monto;
      }
    }
  });

  const ingresosEfectivoNeto = ingresosEfectivoBruto - devolucionesEfectivo;
  const montoSistema = saldoInicialEfectivo + ingresosEfectivoNeto - egresosEfectivoReal;
  const diferencia = montoFinalNum - montoSistema;

  const cajaCerrada = await prisma.caja.update({
    where: { id: caja.id },
    data: {
      fechaCierre: new Date(),
      montoFinal: montoFinalNum,
      montoSistema,
      diferencia,
      estado: 'CERRADA',
      observaciones: observaciones ? (caja.observaciones ? caja.observaciones + ' | ' + observaciones : observaciones) : caja.observaciones
    }
  });

  return cajaCerrada;
}

async function registrarMovimiento({ usuarioId, cajaId, tipo, monto, descripcion, ventaId, gastoId, abonoId, metodoPago = 'EFECTIVO' }) {
  // Si no se pasa cajaId, buscar la caja abierta del usuario
  let idCaja = cajaId
  if (!idCaja) {
    const caja = await prisma.caja.findFirst({
      where: { usuarioId, estado: 'ABIERTA' }
    })
    if (!caja) {
      // Si no hay caja abierta, simplemente no registramos el movimiento en caja
      // Esto es válido si se hacen ventas fuera de turno de caja (ej. admin)
      // Pero para mantener consistencia, podríamos forzar apertura.
      // Por ahora, retornamos null para no romper el flujo de ventas.
      console.warn(`Intento de registrar movimiento sin caja abierta. Usuario: ${usuarioId}`)
      return null
    }
    idCaja = caja.id
  }

  const montoNum = parseFloat(monto)
  if (isNaN(montoNum)) {
    throw new Error('El monto debe ser un número válido.')
  }

  const metodoPagoUpper = String(metodoPago).toUpperCase();

  const movimiento = await prisma.movimientoCaja.create({
    data: {
      cajaId: idCaja,
      usuarioId,
      tipo, // INGRESO, EGRESO, VENTA, PAGO_GASTO
      metodoPago: metodoPagoUpper,
      monto: montoNum,
      descripcion,
      ventaId,
      gastoId,
      abonoId,
      fecha: new Date()
    }
  })

  return movimiento
}

async function obtenerEstadoCaja(usuarioId) {
  const caja = await prisma.caja.findFirst({
    where: { usuarioId, estado: 'ABIERTA' },
    include: {
      movimientos: {
        orderBy: { fecha: 'desc' }
      }
    }
  })

  if (!caja) return null

  const tiposIngreso = ['INGRESO', 'VENTA', 'ABONO_VENTA', 'ABONO_DEUDA'];
  const tiposEgreso = ['EGRESO', 'PAGO_GASTO', 'RETIRO'];

  let ingresosBrutos = 0;
  let devoluciones = 0;
  let egresosReales = 0;

  let ingresosEfectivoBruto = 0;
  let devolucionesEfectivo = 0;
  let egresosEfectivoReal = 0;

  caja.movimientos.forEach(m => {
    const tipo = m.tipo.toUpperCase();
    const desc = (m.descripcion || '').toLowerCase();
    const isEfectivo = m.metodoPago === 'EFECTIVO';
    const monto = Number(m.monto || 0);

    if (tiposIngreso.includes(tipo)) {
      ingresosBrutos += monto;
      if (isEfectivo) ingresosEfectivoBruto += monto;
    } else if (tiposEgreso.includes(tipo)) {
      if (desc.includes('devolución')) {
        devoluciones += monto;
        if (isEfectivo) devolucionesEfectivo += monto;
      } else {
        egresosReales += monto;
        if (isEfectivo) egresosEfectivoReal += monto;
      }
    }
  });

  const totalIngresos = ingresosBrutos;
  const totalEgresos = egresosReales + devoluciones;
  const saldoActual = Number(caja.montoInicial || 0) + totalIngresos - totalEgresos;
  const saldoEfectivo = Number(caja.montoInicial || 0) + (ingresosEfectivoBruto - devolucionesEfectivo) - egresosEfectivoReal;

  return {
    ...caja,
    resumen: {
      ingresosBrutos: ingresosBrutos,
      totalIngresos: totalIngresos,
      devoluciones: devoluciones,
      totalEgresos: totalEgresos,
      egresosReales: egresosReales, // Mantener para detalle si es necesario
      saldoActual: saldoActual,
      saldoEfectivo: saldoEfectivo
    }
  }
}

async function obtenerHistorial({ usuarioId, fechaInicio, fechaFin }) {
  const where = {}
  if (usuarioId) where.usuarioId = parseInt(usuarioId)

  if (fechaInicio || fechaFin) {
    where.fechaApertura = {}
    if (fechaInicio) where.fechaApertura.gte = new Date(fechaInicio)
    if (fechaFin) where.fechaApertura.lte = new Date(fechaFin)
  }

  return await prisma.caja.findMany({
    where,
    orderBy: { fechaApertura: 'desc' },
    include: { usuario: { select: { nombre: true } } }
  })
}

async function obtenerEstadisticas({ fechaInicio, fechaFin }) {
  // Estadísticas globales (no por caja individual)
  // Ventas por día, etc. se pueden sacar de Venta, pero aquí nos enfocamos en flujo de caja.

  // Ejemplo: Flujo de caja diario (entradas vs salidas)
  // Necesitamos agrupar movimientos por fecha.

  // Por simplicidad, devolveremos todos los movimientos en el rango y el frontend agrupa,
  // o hacemos una query raw si es mucho datos.

  // Vamos a devolver resumen de cajas cerradas en el periodo
  const cajas = await prisma.caja.findMany({
    where: {
      fechaCierre: {
        gte: fechaInicio ? new Date(fechaInicio) : undefined,
        lte: fechaFin ? new Date(fechaFin) : undefined
      },
      estado: 'CERRADA'
    }
  })

  // Calcular totales
  const totalIngresos = cajas.reduce((acc, c) => acc + (c.montoSistema || 0), 0) // Aproximación
  // Realmente deberíamos sumar movimientos.

  return {
    cantidadCierres: cajas.length,
    promedioCierre: cajas.length > 0 ? totalIngresos / cajas.length : 0,
    cajas
  }
}

module.exports = {
  abrirCaja,
  cerrarCaja,
  registrarMovimiento,
  obtenerEstadoCaja,
  obtenerHistorial,
  obtenerEstadisticas
}
