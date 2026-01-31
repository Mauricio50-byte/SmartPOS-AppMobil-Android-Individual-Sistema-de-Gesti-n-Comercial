const { prisma } = require('../../infraestructura/bd')

/**
 * Listar todas las deudas con filtros opcionales
 */
async function listarDeudas(filtro = {}) {
    // Nota: Se recomienda implementar paginación si el volumen de datos crece
    return prisma.deuda.findMany({
        where: filtro,
        include: {
            cliente: {
                select: {
                    id: true,
                    nombre: true,
                    cedula: true
                }
            },
            venta: {
                select: {
                    id: true,
                    fecha: true,
                    total: true,
                    metodoPago: true
                }
            }
        },
        orderBy: { fechaCreacion: 'desc' },
        take: 50 // Limitamos a las últimas 50 para mejorar rendimiento inicial
    })
}

/**
 * Obtener deudas pendientes de un cliente específico
 */
async function obtenerDeudasPorCliente(clienteId) {
    return prisma.deuda.findMany({
        where: {
            clienteId,
            estado: { in: ['PENDIENTE', 'VENCIDO'] }
        },
        include: {
            venta: {
                select: {
                    id: true,
                    fecha: true,
                    total: true,
                    saldoPendiente: true
                }
            }
        },
        orderBy: { fechaCreacion: 'desc' }
    })
}

/**
 * Obtener una deuda específica por ID
 */
async function obtenerDeudaPorId(id) {
    return prisma.deuda.findUnique({
        where: { id },
        include: {
            cliente: true,
            venta: {
                include: {
                    detalles: {
                        include: { producto: true }
                    },
                    usuario: true
                }
            },
            abonos: {
                orderBy: { fecha: 'desc' }
            }
        }
    })
}

/**
 * Crear una deuda (se llama automáticamente al crear una venta fiada)
 */
async function crearDeuda(datos) {
    const { clienteId, ventaId, montoTotal, fechaVencimiento } = datos

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) throw new Error('Cliente no encontrado')

    // Crear la deuda
    const deuda = await prisma.deuda.create({
        data: {
            clienteId,
            ventaId,
            montoTotal,
            saldoPendiente: montoTotal,
            fechaVencimiento
        }
    })

    // Actualizar el saldo de deuda del cliente
    await prisma.cliente.update({
        where: { id: clienteId },
        data: {
            saldoDeuda: { increment: montoTotal }
        }
    })

    return deuda
}

/**
 * Registrar un abono a una deuda
 */
async function registrarAbono(datos) {
    let { deudaId, monto, montoRecibido = 0, metodoPago = 'EFECTIVO', usuarioId, nota } = datos
    monto = Number(monto)
    montoRecibido = Number(montoRecibido)

    console.log(`[Abono] Registrando abono: DeudaId=${deudaId}, Monto=${monto}, Recibido=${montoRecibido}, Usuario=${usuarioId}`);

    return prisma.$transaction(async (tx) => {
        // Obtener la deuda actualizada
        const deuda = await tx.deuda.findUnique({ where: { id: Number(deudaId) } })
        if (!deuda) throw new Error('Deuda no encontrada')
        if (deuda.estado === 'PAGADO') throw new Error('Esta deuda ya está pagada')

        console.log(`[Abono] Estado actual deuda: Saldo=${deuda.saldoPendiente}, Total=${deuda.montoTotal}`);

        // Validar que el monto no sea mayor al saldo pendiente (con margen para errores de redondeo)
        if (monto > (deuda.saldoPendiente + 0.01)) {
            throw new Error(`El monto del abono ($${monto}) no puede ser mayor al saldo pendiente ($${deuda.saldoPendiente})`)
        }

        // Crear el abono
        const abono = await tx.abono.create({
            data: {
                deudaId: Number(deudaId),
                clienteId: deuda.clienteId,
                monto,
                metodoPago,
                usuarioId: usuarioId ? Number(usuarioId) : null,
                nota
            }
        })

        // Calcular nuevo saldo
        const nuevoSaldo = Math.max(0, deuda.saldoPendiente - monto)
        const nuevoEstado = nuevoSaldo <= 0.01 ? 'PAGADO' : deuda.estado

        console.log(`[Abono] Nuevo estado: Saldo=${nuevoSaldo}, Estado=${nuevoEstado}`);

        // Actualizar la deuda
        await tx.deuda.update({
            where: { id: deuda.id },
            data: {
                saldoPendiente: nuevoSaldo,
                estado: nuevoEstado
            }
        })

        // Actualizar el saldo de deuda del cliente
        await tx.cliente.update({
            where: { id: deuda.clienteId },
            data: {
                saldoDeuda: { decrement: monto }
            }
        })

        // --- INTEGRACIÓN CAJA ---
        // Si hay un usuario responsable y tiene caja abierta, registrar el ingreso
        if (usuarioId) {
            const cajaAbierta = await tx.caja.findFirst({
                where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
            })

            if (cajaAbierta) {
                // CORRECCIÓN SOLICITADA POR USUARIO:
                // Si el pago es en EFECTIVO y se recibe un monto mayor (para dar cambio),
                // registramos el INGRESO por el total recibido y luego el EGRESO por el cambio.
                
                let montoIngresoReal = monto;
                if (metodoPago === 'EFECTIVO' && montoRecibido > monto) {
                    montoIngresoReal = montoRecibido;
                }

                // Registrar el INGRESO del abono
                await tx.movimientoCaja.create({
                    data: {
                        cajaId: cajaAbierta.id,
                        usuarioId: Number(usuarioId),
                        tipo: 'ABONO_VENTA',
                        metodoPago: metodoPago,
                        monto: montoIngresoReal,
                        descripcion: `Abono Venta #${deuda.ventaId} - Valor: $${Number(monto).toLocaleString('es-CO')} Recibido: $${(Number(montoRecibido) > 0 ? Number(montoRecibido) : Number(monto)).toLocaleString('es-CO')} ${nota ? '| ' + nota : ''}`,
                        abonoId: abono.id,
                        fecha: new Date()
                    }
                })

                // Si hubo un monto recibido mayor al del abono, y el método es EFECTIVO, registramos el EGRESO del cambio
                if (metodoPago === 'EFECTIVO' && montoRecibido > monto) {
                    const cambio = montoRecibido - monto;
                    await tx.movimientoCaja.create({
                        data: {
                            cajaId: cajaAbierta.id,
                            usuarioId: Number(usuarioId),
                            tipo: 'EGRESO',
                            metodoPago: 'EFECTIVO',
                            monto: cambio,
                            descripcion: `Cambio/Vuelto de Abono a Venta #${deuda.ventaId} - Valor: $${Number(monto).toLocaleString('es-CO')} - Recibido: $${Number(montoRecibido).toLocaleString('es-CO')} ${nota ? '| ' + nota : ''}`,
                            abonoId: abono.id,
                            fecha: new Date()
                        }
                    })
                }
            }
        }
        // ------------------------

        // Actualizar la venta vinculada de forma consistente
        const venta = await tx.venta.findUnique({ where: { id: deuda.ventaId } })
        if (venta) {
            await tx.venta.update({
                where: { id: deuda.ventaId },
                data: {
                    estadoPago: nuevoEstado === 'PAGADO' ? 'PAGADO' : venta.estadoPago,
                    montoPagado: { increment: monto },
                    saldoPendiente: { decrement: monto }
                }
            })
        }

        return {
            abono,
            deudaActualizada: await tx.deuda.findUnique({
                where: { id: deuda.id },
                include: {
                    cliente: true,
                    abonos: {
                        orderBy: { fecha: 'desc' }
                    }
                }
            })
        }
    })
}

/**
 * Obtener historial de abonos de un cliente
 */
async function obtenerAbonosPorCliente(clienteId) {
    return prisma.abono.findMany({
        where: { clienteId },
        include: {
            deuda: {
                include: {
                    venta: true
                }
            }
        },
        orderBy: { fecha: 'desc' }
    })
}

/**
 * Marcar deudas vencidas
 */
async function marcarDeudasVencidas() {
    const ahora = new Date()

    const resultado = await prisma.deuda.updateMany({
        where: {
            estado: 'PENDIENTE',
            fechaVencimiento: {
                lt: ahora
            }
        },
        data: {
            estado: 'VENCIDO'
        }
    })

    return resultado
}

module.exports = {
    listarDeudas,
    obtenerDeudasPorCliente,
    obtenerDeudaPorId,
    crearDeuda,
    registrarAbono,
    obtenerAbonosPorCliente,
    marcarDeudasVencidas
}
