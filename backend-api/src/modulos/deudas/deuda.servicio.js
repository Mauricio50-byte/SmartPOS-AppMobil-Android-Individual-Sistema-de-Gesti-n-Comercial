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

const FidelizacionDom = require('../ventas/servicios/fidelizacion.dominio');

/**
 * Registrar un abono a una deuda
 */
async function registrarAbono(datos) {
    let { deudaId, monto, montoRecibido, metodoPago = 'EFECTIVO', usuarioId, nota } = datos

    // Asegurar que los montos sean números válidos
    const montoNum = Number(monto || 0);
    const montoRecibidoNum = Number(montoRecibido || 0);
    const deudaIdNum = Number(deudaId);
    const usuarioIdNum = usuarioId ? Number(usuarioId) : null;

    if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('El monto del abono debe ser un número mayor a 0');
    }

    console.log(`[Abono] Iniciando proceso: Deuda#${deudaIdNum}, Monto=$${montoNum}, Recibido=$${montoRecibidoNum}, Usuario=${usuarioIdNum}`);

    return prisma.$transaction(async (tx) => {
        // 1. Obtener la deuda actualizada
        const deuda = await tx.deuda.findUnique({
            where: { id: deudaIdNum },
            include: { venta: true }
        })

        if (!deuda) throw new Error('Deuda no encontrada');
        if (deuda.estado === 'PAGADO') throw new Error('Esta deuda ya está pagada');

        // 2. Validar que el monto no sea mayor al saldo pendiente (con margen para errores de redondeo)
        const saldoActualDeuda = Number(deuda.saldoPendiente || 0);
        if (montoNum > (saldoActualDeuda + 0.1)) { // Margen de 0.1 para centavos
            throw new Error(`El monto ($${montoNum}) excede el saldo pendiente ($${saldoActualDeuda})`);
        }

        // 3. Crear el registro del abono
        console.log(`[Abono] Creando registro...`);
        const abono = await tx.abono.create({
            data: {
                deudaId: deudaIdNum,
                clienteId: deuda.clienteId,
                monto: montoNum,
                metodoPago,
                usuarioId: usuarioIdNum,
                nota
            }
        })

        // 4. Calcular y actualizar nuevo saldo de la deuda
        const nuevoSaldo = Math.max(0, saldoActualDeuda - montoNum);
        const nuevoEstado = nuevoSaldo <= 0.1 ? 'PAGADO' : deuda.estado;

        console.log(`[Abono] Actualizando deuda. Nuevo saldo: ${nuevoSaldo}`);
        await tx.deuda.update({
            where: { id: deuda.id },
            data: {
                saldoPendiente: nuevoSaldo,
                estado: nuevoEstado
            }
        })

        // 5. Actualizar el saldo de deuda del cliente
        console.log(`[Abono] Actualizando saldo cliente #${deuda.clienteId}...`);
        await tx.cliente.update({
            where: { id: deuda.clienteId },
            data: {
                saldoDeuda: { decrement: montoNum }
            }
        })

        // 6. FIDELIZACIÓN: Acumular puntos
        console.log(`[Abono] Procesando fidelización...`);
        try {
            await FidelizacionDom.procesarFidelizacion(tx, {
                clienteId: deuda.clienteId,
                totalVenta: montoNum,
                estadoPago: 'PAGADO'
            });
        } catch (fidErr) {
            console.error('[Abono] Error no crítico en fidelización:', fidErr);
            // No detenemos la transacción por puntos
        }

        // 7. INTEGRACIÓN CAJA
        if (usuarioIdNum) {
            console.log(`[Abono] Buscando caja para usuario #${usuarioIdNum}`);
            const cajaAbierta = await tx.caja.findFirst({
                where: { usuarioId: usuarioIdNum, estado: 'ABIERTA' }
            })

            if (cajaAbierta) {
                console.log(`[Abono] Caja encontrada. Registrando movimientos...`);
                // Si es efectivo y dieron más, registramos el ingreso completo y un egreso por el vuelto
                let montoIngresoReal = montoNum;
                if (metodoPago === 'EFECTIVO' && montoRecibidoNum > montoNum) {
                    montoIngresoReal = montoRecibidoNum;
                }

                await tx.movimientoCaja.create({
                    data: {
                        cajaId: cajaAbierta.id,
                        usuarioId: usuarioIdNum,
                        tipo: 'ABONO_VENTA',
                        metodoPago,
                        monto: montoIngresoReal,
                        descripcion: `Abono Deuda Venta #${deuda.ventaId} | Valor: $${montoNum.toLocaleString()} Recibido: $${montoRecibidoNum > 0 ? montoRecibidoNum.toLocaleString() : montoNum.toLocaleString()} ${nota ? '| ' + nota : ''}`,
                        abonoId: abono.id
                    }
                })

                if (metodoPago === 'EFECTIVO' && montoRecibidoNum > montoNum) {
                    const cambio = montoRecibidoNum - montoNum;
                    await tx.movimientoCaja.create({
                        data: {
                            cajaId: cajaAbierta.id,
                            usuarioId: usuarioIdNum,
                            tipo: 'EGRESO',
                            metodoPago: 'EFECTIVO',
                            monto: cambio,
                            descripcion: `Cambio de Abono a Venta #${deuda.ventaId}`,
                            abonoId: abono.id
                        }
                    })
                }
            } else {
                console.log(`[Abono] Usuario #${usuarioIdNum} no tiene caja abierta. Se omite movimiento.`);
            }
        }

        // 8. Actualizar Venta vinculada
        if (deuda.venta) {
            console.log(`[Abono] Sincronizando venta # ${deuda.ventaId}`);
            await tx.venta.update({
                where: { id: deuda.ventaId },
                data: {
                    estadoPago: nuevoEstado === 'PAGADO' ? 'PAGADO' : deuda.venta.estadoPago,
                    montoPagado: { increment: montoNum },
                    saldoPendiente: { decrement: montoNum }
                }
            })
        }

        console.log(`[Abono] ÉXITO en la transacción.`);
        return {
            abono,
            deudaActualizada: await tx.deuda.findUnique({
                where: { id: deuda.id },
                include: { cliente: true, abonos: { orderBy: { fecha: 'desc' } } }
            })
        }
    }, {
        timeout: 10000 // Aumentamos timeout a 10s por si la DB está lenta
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
