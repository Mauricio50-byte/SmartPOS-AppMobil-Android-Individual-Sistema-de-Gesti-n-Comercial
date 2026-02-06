const { prisma } = require('../../infraestructura/bd')

/**
 * Listar todos los gastos con filtros opcionales
 */
async function listarGastos(filtro = {}) {
    return prisma.gasto.findMany({
        where: filtro,
        include: {
            pagos: {
                orderBy: { fecha: 'desc' },
                include: { usuario: true }
            }
        },
        orderBy: { fechaRegistro: 'desc' }
    })
}

/**
 * Obtener un gasto específico por ID
 */
async function obtenerGastoPorId(id) {
    return prisma.gasto.findUnique({
        where: { id: parseInt(id) },
        include: {
            pagos: {
                orderBy: { fecha: 'desc' },
                include: { usuario: true }
            }
        }
    })
}

/**
 * Crear un nuevo gasto (Cuenta por Pagar)
 */
async function crearGasto(datos) {
    const { proveedor, concepto, montoTotal, fechaVencimiento, categoria } = datos

    return prisma.gasto.create({
        data: {
            proveedor,
            concepto,
            montoTotal,
            saldoPendiente: montoTotal,
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
            categoria,
            estado: 'PENDIENTE'
        }
    })
}

/**
 * Registrar un pago a un gasto
 */
async function registrarPagoGasto(datos) {
    const { gastoId, monto, metodoPago = 'EFECTIVO', usuarioId, nota } = datos

    return prisma.$transaction(async (tx) => {
        // Obtener el gasto
        const gasto = await tx.gasto.findUnique({ where: { id: parseInt(gastoId) } })
        if (!gasto) throw new Error('Gasto no encontrado')
        if (gasto.estado === 'PAGADO') throw new Error('Este gasto ya está pagado')

        // Validar que el monto no sea mayor al saldo pendiente
        if (monto > gasto.saldoPendiente) {
            throw new Error(`El monto del pago ($${monto}) no puede ser mayor al saldo pendiente ($${gasto.saldoPendiente})`)
        }

        // Crear el pago
        const pago = await tx.pagoGasto.create({
            data: {
                gastoId: parseInt(gastoId),
                monto,
                metodoPago,
                usuarioId,
                nota
            }
        })

        // Calcular nuevo saldo
        const nuevoSaldo = gasto.saldoPendiente - monto
        const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADO' : gasto.estado

        // --- INTEGRACIÓN CAJA ---
        // Se integra con la caja si el método de pago es EFECTIVO o TRANSFERENCIA (ambos afectan el cuadre)
        const metodoPagoUpper = String(metodoPago).toUpperCase();

        console.log(`[DEBUG] Intentando registrar pago gasto en caja. Usuario: ${usuarioId}, Metodo: ${metodoPagoUpper}, Monto: ${monto}`);

        if (usuarioId && (metodoPagoUpper === 'EFECTIVO' || metodoPagoUpper === 'TRANSFERENCIA')) {
            // 1. Intentar buscar caja del usuario actual
            let cajaAbierta = await tx.caja.findFirst({
                where: { usuarioId: Number(usuarioId), estado: 'ABIERTA' }
            })

            // 2. Fallback: Si el usuario no tiene caja abierta (ej. Admin registrando gasto), buscar cualquier caja abierta
            if (!cajaAbierta) {
                console.log('[DEBUG] No se encontró caja para usuario actual, buscando cualquier caja abierta...');
                cajaAbierta = await tx.caja.findFirst({
                    where: { estado: 'ABIERTA' }
                })
            }

            if (cajaAbierta) {
                // --- VALIDACIÓN DE SALDO ---
                // ... (mantenemos validación de saldo)
                const movimientos = await tx.movimientoCaja.findMany({
                    where: {
                        cajaId: cajaAbierta.id,
                        metodoPago: metodoPagoUpper
                    }
                });

                let saldoDisponible = 0;
                if (metodoPagoUpper === 'EFECTIVO') {
                    saldoDisponible += (cajaAbierta.montoInicial || 0);
                }

                for (const mov of movimientos) {
                    if (['INGRESO', 'VENTA', 'ABONO_VENTA', 'ABONO_DEUDA'].includes(mov.tipo)) {
                        saldoDisponible += mov.monto;
                    }
                    else if (['EGRESO', 'PAGO_GASTO', 'RETIRO'].includes(mov.tipo)) {
                        saldoDisponible -= mov.monto;
                    }
                }

                if (saldoDisponible < monto) {
                    throw new Error(`Saldo insuficiente en CAJA (${metodoPagoUpper}). Disponible: $${new Intl.NumberFormat('es-CO').format(saldoDisponible)}. No puedes pagar $${new Intl.NumberFormat('es-CO').format(monto)}.`);
                }

                await tx.movimientoCaja.create({
                    data: {
                        cajaId: cajaAbierta.id,
                        usuarioId: Number(usuarioId),
                        tipo: 'PAGO_GASTO',
                        metodoPago: metodoPagoUpper,
                        monto: monto,
                        descripcion: `Pago a gasto: ${gasto.concepto} (${metodoPagoUpper})`,
                        gastoId: gasto.id,
                        fecha: new Date()
                    }
                })
            } else {
                throw new Error(`No hay una caja abierta para procesar este pago (${metodoPagoUpper}). Si es un fondo externo, usa el método 'EXTERNO'.`);
            }
        } else {
            console.log('[DEBUG] Pago no requiere integración con caja o usuario no definido.');
        }
        // ------------------------

        // Actualizar el gasto
        const gastoActualizado = await tx.gasto.update({
            where: { id: parseInt(gastoId) },
            data: {
                saldoPendiente: nuevoSaldo,
                estado: nuevoEstado
            },
            include: {
                pagos: {
                    orderBy: { fecha: 'desc' },
                    include: { usuario: true }
                }
            }
        })

        return {
            pago,
            gasto: gastoActualizado
        }
    })
}

/**
 * Obtener resumen de finanzas (Totales por cobrar y por pagar)
 */
async function obtenerResumenFinanzas() {
    // Total por cobrar (Deudas de clientes)
    const porCobrar = await prisma.deuda.aggregate({
        _sum: { saldoPendiente: true },
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
    })

    // Total por pagar (Gastos del negocio)
    const porPagar = await prisma.gasto.aggregate({
        _sum: { saldoPendiente: true },
        where: { estado: { in: ['PENDIENTE', 'VENCIDO'] } }
    })

    return {
        totalPorCobrar: porCobrar._sum.saldoPendiente || 0,
        totalPorPagar: porPagar._sum.saldoPendiente || 0
    }
}

module.exports = {
    listarGastos,
    obtenerGastoPorId,
    crearGasto,
    registrarPagoGasto,
    obtenerResumenFinanzas
}
