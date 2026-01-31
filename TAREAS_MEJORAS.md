# ✅ Lista de Tareas - Mejoras SmartPOS

**Última actualización:** 31 de Enero de 2026  
**Total de tareas:** 17  
**Progreso:** 0/17 (0%)

---

## 📋 Cómo usar este documento

- [ ] = Tarea pendiente
- [x] = Tarea completada
- 🔴 = Prioridad CRÍTICA
- 🟡 = Prioridad ALTA
- 🟢 = Prioridad MEDIA
- 🔵 = Prioridad BAJA

**Formato de cada tarea:**
```
- [ ] **Nombre de la Tarea** (Esfuerzo: X días)
  - Descripción breve
  - Archivos a modificar
  - Criterios de aceptación
```

---

## 🔴 FASE 1: CRÍTICAS (Semanas 1-2) - 4 tareas

### Tarea 1: Reactivar Validación de Stock
- [x] **Reactivar Validación de Stock en Ventas** (Esfuerzo: 1 hora)
  
  **Descripción:**
  Descomentar la validación de stock en el servicio de ventas para prevenir ventas con stock negativo.
  
  **Archivos a modificar:**
  - `backend-api/src/modulos/ventas/venta.servicio.js` (líneas 122-126)
  
  **Pasos:**
  1. Abrir `venta.servicio.js`
  2. Ir a la línea 122
  3. Descomentar el bloque:
     ```javascript
     if (p.stock < Number(i.cantidad)) {
       throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock}, Solicitado: ${i.cantidad}`)
     }
     ```
  4. Probar creando una venta con stock insuficiente
  5. Verificar que retorna error 400
  
  **Criterios de aceptación:**
  - [x] No se pueden crear ventas con stock insuficiente
  - [x] El mensaje de error es claro y descriptivo
  - [x] El stock no se vuelve negativo
  - [x] Las ventas normales siguen funcionando
  
---

### Tarea 2: Implementar Backend de Dashboard
- [x] **Implementar Backend de Dashboard** (Esfuerzo: 2-3 días)
  
  **Descripción:**
  Migrar todos los cálculos del dashboard del frontend al backend para mejorar el rendimiento, la consistencia de los datos y permitir el crecimiento de la base de datos sin degradar la experiencia de usuario.
  
  **Funcionalidades a Migrar (Estado Actual):**
  - **Métricas (KPIs):** Ingresos Totales, Ventas Totales, Clientes Nuevos (últimos 30 días), Ticket Promedio.
  - **Tendencias:** Cálculo de variación porcentual (%) comparando con el período anterior.
  - **Gráfico de Ventas:** Histórico de ingresos filtrado por período (Semana, Mes, Año).
  - **Top Productos:** Listado de los 5 productos más vendidos con su respectivo porcentaje de peso.
  - **Stock Bajo:** Alertas de productos con stock insuficiente (<= stockMinimo o 5).
  - **Transacciones Recientes:** Listado de las últimas 5 ventas realizadas.
  - **Distribuciones:** 
    - Por Categoría (Doughnut chart data)
    - Por Método de Pago (Doughnut chart data)
  - **Top Clientes:** Listado de clientes con mayor volumen de compras, frecuencia y última visita.

  **Endpoints Requeridos:**

  1. **GET /api/dashboard/metricas?periodo=month**
     ```javascript
     {
       ingresos: { valor: 1545000, tendencia: 12.5 },
       ventas: { valor: 85, tendencia: 5.2 },
       clientesNuevos: { valor: 12, tendencia: 0 },
       ticketPromedio: { valor: 18176, tendencia: 2.1 }
     }
     ```
  
  2. **GET /api/dashboard/grafico-ventas?periodo=month**
     ```javascript
     {
       labels: ["Ene", "Feb", "Mar", ...],
       data: [1200000, 1500000, 1800000, ...],
       label: "Ventas"
     }
     ```
  
  3. **GET /api/dashboard/productos-top?limit=5&periodo=month**
     ```javascript
     [
       { id: 10, nombre: "Producto A", qty: 50, percentage: 100 },
       { id: 12, nombre: "Producto B", qty: 25, percentage: 50 },
       ...
     ]
     ```
  
  4. **GET /api/dashboard/stock-bajo?limit=5**
     ```javascript
     [
       { id: 15, nombre: "Producto B", stock: 2, stockMinimo: 5 },
       ...
     ]
     ```
  
  5. **GET /api/dashboard/transacciones-recientes?limit=5**
     ```javascript
     [
       { id: 101, fecha: "2026-01-31", total: 50000, estado: "OK" },
       ...
     ]
     ```
  
  6. **GET /api/dashboard/distribucion-categorias?periodo=month**
     ```javascript
     [
       { name: "Electrónica", revenue: 500000, percentage: 45, color: "#3880ff" },
       ...
     ]
     ```
  
  7. **GET /api/dashboard/distribucion-pagos?periodo=month**
     ```javascript
     [
       { name: "Efectivo", revenue: 800000, percentage: 60, color: "#2dd36f" },
       ...
     ]
     ```
  
  8. **GET /api/dashboard/top-clientes?limit=5&periodo=month**
     ```javascript
     [
       { id: 1, name: "Juan Perez", totalSpent: 150000, transactionCount: 5, lastPurchase: "2026-01-30" },
       ...
     ]
     ```

  **Criterios de aceptación:**
  - [x] El frontend no realiza ningún cálculo pesado (reduce, filter, etc.) sobre el array total de ventas.
  - [x] Todos los endpoints validan permisos de usuario (`VER_VENTAS`, `VER_INVENTARIO`, `VER_CLIENTES`).
  - [x] Soporte para filtros dinámicos (Semana, Mes, Año) en todos los reportes aplicables.
  - [x] Los colores en los gráficos son consistentes con la identidad visual del app.
  - [x] Tiempo de respuesta de la API < 300ms.
  - [x] Manejo correcto de estados vacíos (cuando no hay ventas en el período).

---

---

### Tarea 3: Implementar Registro de Costo de Ventas
- [ ] **Agregar Costo de Ventas al Modelo y Lógica** (Esfuerzo: 1-2 días)
  
  **Descripción:**
  Registrar el costo de los productos vendidos para poder calcular utilidad bruta y generar reportes financieros.
  
  **Archivos a modificar:**
  
  1. **Esquema de Base de Datos:**
     - `backend-api/prisma/schema.prisma`
     
     Agregar campos a `Venta`:
     ```prisma
     model Venta {
       // ... campos existentes
       costoTotal    Float  @default(0)
       utilidadBruta Float  @default(0)
     }
     ```
     
     Agregar campos a `DetalleVenta`:
     ```prisma
     model DetalleVenta {
       // ... campos existentes
       costoUnitario Float
       costoTotal    Float
     }
     ```
  
  2. **Servicio de Ventas:**
     - `backend-api/src/modulos/ventas/venta.servicio.js`
     
     Modificar función `crearVenta` para calcular costos:
     ```javascript
     let totalCosto = 0
     
     const detalles = items.map(i => {
       const p = mapa.get(Number(i.productoId))
       const cantidad = Number(i.cantidad)
       const precioUnitario = Number(p.precioVenta)
       const costoUnitario = Number(p.precioCosto || 0)
       
       const subtotal = cantidad * precioUnitario
       const costoTotal = cantidad * costoUnitario
       
       total += subtotal
       totalCosto += costoTotal
       
       return { 
         productoId: p.id, 
         cantidad, 
         precioUnitario, 
         subtotal,
         costoUnitario,
         costoTotal
       }
     })
     
     const utilidadBruta = total - totalCosto
     
     const venta = await tx.venta.create({
       data: {
         total,
         costoTotal: totalCosto,
         utilidadBruta: utilidadBruta,
         // ... resto
       }
     })
     ```
  
  **Pasos:**
  1. Modificar `schema.prisma`
  2. Ejecutar migración: `npx prisma migrate dev --name agregar_costo_ventas`
  3. Modificar `venta.servicio.js`
  4. Actualizar tests
  5. Probar creando ventas y verificar que se calculan costos
  
  **Criterios de aceptación:**
  - ✅ Cada venta tiene `costoTotal` y `utilidadBruta`
  - ✅ Cada detalle tiene `costoUnitario` y `costoTotal`
  - ✅ Los cálculos son correctos
  - ✅ Las ventas antiguas tienen costo 0 (no rompe)
  - ✅ Se puede generar reporte de utilidad

---

### Tarea 4: Crear Tabla de Movimientos de Inventario
- [ ] **Implementar Historial de Movimientos de Inventario** (Esfuerzo: 1-2 días)
  
  **Descripción:**
  Crear tabla para registrar todas las entradas y salidas de inventario con trazabilidad completa.
  
  **Archivos a modificar:**
  
  1. **Esquema de Base de Datos:**
     - `backend-api/prisma/schema.prisma`
     
     Agregar nuevo modelo:
     ```prisma
     model MovimientoInventario {
       id              Int      @id @default(autoincrement())
       productoId      Int
       producto        Producto @relation(fields: [productoId], references: [id])
       tipo            String   // ENTRADA, SALIDA, AJUSTE, DEVOLUCION
       cantidad        Int
       costoUnitario   Float
       valorTotal      Float
       stockAnterior   Int
       stockNuevo      Int
       referencia      String?  // ID de venta, compra, etc.
       tipoReferencia  String?  // VENTA, COMPRA, AJUSTE
       usuarioId       Int
       usuario         Usuario  @relation(fields: [usuarioId], references: [id])
       motivo          String?
       fecha           DateTime @default(now())
       
       @@index([productoId, fecha])
       @@index([tipo])
     }
     ```
     
     Actualizar modelo `Producto`:
     ```prisma
     model Producto {
       // ... campos existentes
       movimientos MovimientoInventario[]
     }
     ```
     
     Actualizar modelo `Usuario`:
     ```prisma
     model Usuario {
       // ... campos existentes
       movimientosInventario MovimientoInventario[]
     }
     ```
  
  2. **Servicio de Ventas:**
     - `backend-api/src/modulos/ventas/venta.servicio.js`
     
     Agregar registro de movimiento después de actualizar stock:
     ```javascript
     for (const d of detalles) {
       // ... crear detalle venta
       
       const prodActualizado = await tx.producto.update({
         where: { id: d.productoId },
         data: { stock: { decrement: d.cantidad } }
       })
       
       // NUEVO: Registrar movimiento de inventario
       await tx.movimientoInventario.create({
         data: {
           productoId: d.productoId,
           tipo: 'SALIDA',
           cantidad: d.cantidad,
           costoUnitario: d.costoUnitario,
           valorTotal: d.costoTotal,
           stockAnterior: prodActualizado.stock + d.cantidad,
           stockNuevo: prodActualizado.stock,
           referencia: venta.id.toString(),
           tipoReferencia: 'VENTA',
           usuarioId: usuarioId,
           motivo: `Venta #${venta.id}`
         }
       })
       
       // ... resto del código
     }
     ```
  
  3. **Crear Servicio de Inventario:**
     - `backend-api/src/modulos/inventario/inventario.servicio.js` (nuevo)
     - `backend-api/src/modulos/inventario/inventario.controlador.js` (nuevo)
     - `backend-api/src/modulos/inventario/inventario.rutas.js` (nuevo)
     
     Funciones:
     - `listarMovimientos(filtros)` - Listar movimientos con paginación
     - `obtenerMovimientosPorProducto(productoId)` - Historial de un producto
     - `registrarAjuste(datos)` - Ajuste manual de inventario
     - `obtenerValorInventario()` - Valor total del inventario
  
  **Pasos:**
  1. Modificar `schema.prisma`
  2. Ejecutar migración: `npx prisma migrate dev --name agregar_movimientos_inventario`
  3. Modificar `venta.servicio.js`
  4. Crear servicio de inventario
  5. Crear endpoints REST
  6. Probar creando ventas y verificar movimientos
  
  **Criterios de aceptación:**
  - ✅ Cada venta genera un movimiento de inventario
  - ✅ Se puede consultar historial de un producto
  - ✅ Se puede hacer ajustes manuales de inventario
  - ✅ Se puede calcular el valor total del inventario
  - ✅ Los movimientos tienen trazabilidad completa

---

## 🟡 FASE 2: ALTAS (Semanas 3-4) - 4 tareas

### Tarea 5: Mejorar Módulo de Reportes y Agregar Reportes Contables
- [ ] **Migrar Reportes Existentes al Backend y Agregar Reportes Contables** (Esfuerzo: 3-5 días)
  
  **Descripción:**
  Ya tienes un módulo de reportes funcional en el frontend (`frontend-app/src/app/pages/home/components/reportes/`) que genera reportes operativos por categoría/producto con exportación a PDF/Excel. Esta tarea consiste en:
  1. Migrar los cálculos al backend para mejorar rendimiento
  2. Agregar reportes contables faltantes (Estado de Resultados, Flujo de Caja, etc.)
  
  **Estado Actual:**
  - ✅ Reportes operativos por categoría/producto (frontend)
  - ✅ Exportación a PDF y Excel
  - ✅ Gráficos de barras y pie
  - ✅ Filtros por período (día, todo)
  - ✅ Desglose por método de pago
  - ❌ Todos los cálculos en frontend (lento con muchos datos)
  - ❌ Sin backend (`backend-api/src/modulos/reportes/` vacío)
  - ❌ Usa costo actual del producto, no histórico
  
  **Archivos existentes a modificar:**
  - `frontend-app/src/app/pages/home/components/reportes/services/reportes.service.ts` (simplificar, consumir backend)
  - `frontend-app/src/app/pages/home/components/reportes/reportes.component.ts` (simplificar lógica)
  
  **Archivos a crear:**
  - `backend-api/src/modulos/reportes/reportes.servicio.js`
  - `backend-api/src/modulos/reportes/reportes.controlador.js`
  - `backend-api/src/modulos/reportes/reportes.rutas.js`
  
  **Parte 1: Migrar Reportes Existentes al Backend**
  
  1. **Endpoint de Reporte General** (reemplaza cálculos del frontend)
     - Endpoint: `GET /api/reportes/general?period=day&groupBy=category`
     - Retorna: Todas las métricas que actualmente calcula el frontend
     - Beneficio: Más rápido, escalable
  
  **Parte 2: Agregar Reportes Contables Nuevos**
  
  2. **Estado de Resultados**
     - Endpoint: `GET /api/reportes/estado-resultados?fechaInicio=2026-01-01&fechaFin=2026-01-31`
     - Calcula: Ingresos, Costos, Utilidad Bruta, Gastos, Utilidad Neta
     - **Requiere:** Tarea 3 completada (Costo de Ventas)
  
  3. **Flujo de Caja**
     - Endpoint: `GET /api/reportes/flujo-caja?fechaInicio=2026-01-01&fechaFin=2026-01-31`
     - Calcula: Saldo inicial, Entradas, Salidas, Saldo final
     - Usa datos de MovimientoCaja
  
  4. **Cartera (Cuentas por Cobrar)**
     - Endpoint: `GET /api/reportes/cartera?estado=PENDIENTE`
     - Calcula: Total por cobrar, Edad de cartera, Deudas vencidas
     - Agrupa por cliente y antigüedad
  
  5. **Inventario Valorizado**
     - Endpoint: `GET /api/reportes/inventario-valorizado`
     - Calcula: Valor total del inventario, Por categoría
     - **Requiere:** Tarea 4 completada (Movimientos de Inventario)
  
  6. **Cuentas por Pagar**
     - Endpoint: `GET /api/reportes/cuentas-por-pagar?estado=PENDIENTE`
     - Calcula: Total por pagar, Por proveedor
  
  **Criterios de aceptación:**
  - ✅ Reportes existentes migrados al backend
  - ✅ Frontend consume nuevos endpoints
  - ✅ Rendimiento mejorado (< 1 segundo)
  - ✅ Exportación PDF/Excel sigue funcionando
  - ✅ Nuevos reportes contables implementados
  - ✅ Se pueden filtrar por fecha
  - ✅ Los cálculos son precisos
  
  **Nota:** Esta tarea se puede dividir en dos:
  - **Parte 1 (Prioridad MEDIA):** Migrar reportes existentes al backend
  - **Parte 2 (Prioridad ALTA):** Agregar reportes contables nuevos

---

### Tarea 6: Implementar Soporte para Pagos Mixtos
- [ ] **Permitir Múltiples Métodos de Pago por Venta** (Esfuerzo: 2-3 días)
  
  **Descripción:**
  Permitir que una venta se pague con múltiples métodos (ej: 50% efectivo + 50% tarjeta).
  
  **Archivos a modificar:**
  
  1. **Esquema de Base de Datos:**
     - `backend-api/prisma/schema.prisma`
     
     Modificar modelo `Venta`:
     ```prisma
     model Venta {
       // Eliminar: metodoPago String
       // Agregar:
       pagos PagoVenta[]
     }
     ```
     
     Crear nuevo modelo:
     ```prisma
     model PagoVenta {
       id         Int      @id @default(autoincrement())
       ventaId    Int
       venta      Venta    @relation(fields: [ventaId], references: [id])
       metodoPago String   // EFECTIVO, TRANSFERENCIA, TARJETA
       monto      Float
       referencia String?  // Número de transacción, voucher
       fecha      DateTime @default(now())
     }
     ```
  
  2. **Servicio de Ventas:**
     - `backend-api/src/modulos/ventas/venta.servicio.js`
     
     Modificar para aceptar array de pagos:
     ```javascript
     async function crearVenta(payload) {
       const { items, pagos, usuarioId } = payload
       
       // Validar que la suma de pagos = total
       const totalPagos = pagos.reduce((acc, p) => acc + p.monto, 0)
       if (totalPagos !== total) {
         throw new Error('La suma de pagos no coincide con el total')
       }
       
       // Crear venta
       const venta = await tx.venta.create({ ... })
       
       // Crear pagos
       for (const pago of pagos) {
         await tx.pagoVenta.create({
           data: {
             ventaId: venta.id,
             metodoPago: pago.metodoPago,
             monto: pago.monto,
             referencia: pago.referencia
           }
         })
         
         // Registrar en caja según método
         await registrarMovimientoCaja(pago, venta.id)
       }
     }
     ```
  
  **Pasos:**
  1. Modificar `schema.prisma`
  2. Ejecutar migración: `npx prisma migrate dev --name agregar_pagos_mixtos`
  3. Modificar `venta.servicio.js`
  4. Actualizar frontend para soportar múltiples pagos
  5. Probar con diferentes combinaciones
  
  **Criterios de aceptación:**
  - ✅ Se pueden crear ventas con múltiples métodos de pago
  - ✅ La suma de pagos debe igualar el total
  - ✅ Cada pago se registra correctamente en caja
  - ✅ Las ventas antiguas siguen funcionando (migración)

---

### Tarea 7: Mejorar Manejo de Caja en Pagos de Gastos
- [ ] **Requerir Caja Propia o Especificar Manualmente** (Esfuerzo: 4 horas)
  
  **Descripción:**
  Evitar que los pagos de gastos se descuenten de la caja de otro usuario automáticamente.
  
  **Archivos a modificar:**
  - `backend-api/src/modulos/gastos/gasto.servicio.js`
  
  **Cambio en lógica:**
  ```javascript
  // ANTES (líneas 98-103):
  if (!cajaAbierta) {
    cajaAbierta = await tx.caja.findFirst({
      where: { estado: 'ABIERTA' }
    })
  }
  
  // DESPUÉS:
  if (!cajaAbierta) {
    throw new Error('Debes tener una caja abierta para registrar pagos de gastos. Por favor, abre tu caja primero.')
  }
  
  // O permitir especificar la caja manualmente:
  const { gastoId, monto, metodoPago, usuarioId, cajaId } = datos
  if (cajaId) {
    cajaAbierta = await tx.caja.findUnique({ 
      where: { id: cajaId, estado: 'ABIERTA' } 
    })
    if (!cajaAbierta) {
      throw new Error('La caja especificada no existe o está cerrada')
    }
  } else {
    cajaAbierta = await tx.caja.findFirst({ 
      where: { usuarioId, estado: 'ABIERTA' } 
    })
    if (!cajaAbierta) {
      throw new Error('No tienes una caja abierta')
    }
  }
  ```
  
  **Criterios de aceptación:**
  - ✅ No se puede pagar gasto sin caja abierta
  - ✅ El mensaje de error es claro
  - ✅ Opcionalmente se puede especificar la caja manualmente
  - ✅ Los pagos se registran en la caja correcta

---

### Tarea 8: Implementar Módulo de Bancos y Conciliación
- [ ] **Crear Sistema de Cuentas Bancarias y Conciliación** (Esfuerzo: 4-5 días)
  
  **Descripción:**
  Implementar módulo para gestionar cuentas bancarias y conciliar transferencias/tarjetas.
  
  **Archivos a crear:**
  - `backend-api/src/modulos/bancos/banco.servicio.js`
  - `backend-api/src/modulos/bancos/banco.controlador.js`
  - `backend-api/src/modulos/bancos/banco.rutas.js`
  
  **Modelos a crear:**
  ```prisma
  model CuentaBancaria {
    id              Int      @id @default(autoincrement())
    nombre          String   // "Banco XYZ - Cuenta Corriente"
    numeroCuenta    String
    banco           String
    tipoCuenta      String   // CORRIENTE, AHORROS
    saldoInicial    Float
    saldoActual     Float
    activa          Boolean  @default(true)
    movimientos     MovimientoBancario[]
  }
  
  model MovimientoBancario {
    id                Int             @id @default(autoincrement())
    cuentaId          Int
    cuenta            CuentaBancaria  @relation(fields: [cuentaId], references: [id])
    tipo              String          // DEPOSITO, RETIRO, TRANSFERENCIA
    monto             Float
    fecha             DateTime
    referencia        String?
    descripcion       String
    conciliado        Boolean         @default(false)
    fechaConciliacion DateTime?
    ventaId           Int?
    gastoId           Int?
  }
  ```
  
  **Funcionalidades:**
  1. CRUD de cuentas bancarias
  2. Registro automático de movimientos al crear venta con TRANSFERENCIA/TARJETA
  3. Importación de extracto bancario (CSV)
  4. Conciliación automática por monto y fecha
  5. Reporte de diferencias
  
  **Criterios de aceptación:**
  - ✅ Se pueden crear y gestionar cuentas bancarias
  - ✅ Las ventas por transferencia crean movimientos bancarios
  - ✅ Se puede importar extracto bancario
  - ✅ Se pueden conciliar movimientos
  - ✅ Se genera reporte de diferencias

---

## 🟢 FASE 3: MEDIAS (Semanas 5-6) - 4 tareas

### Tarea 9: Optimización de Consultas y Paginación
- [ ] **Implementar Paginación en Todos los Listados** (Esfuerzo: 2-3 días)
  
  **Descripción:**
  Agregar paginación a todos los endpoints de listado para mejorar rendimiento.
  
  **Archivos a modificar:**
  - `backend-api/src/modulos/productos/producto.servicio.js`
  - `backend-api/src/modulos/ventas/venta.servicio.js`
  - `backend-api/src/modulos/clientes/cliente.servicio.js`
  - `backend-api/src/modulos/deudas/deuda.servicio.js`
  - `backend-api/src/modulos/gastos/gasto.servicio.js`
  
  **Patrón a implementar:**
  ```javascript
  async function listarProductos({ page = 1, limit = 50, filtros = {} }) {
    const skip = (page - 1) * limit
    
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: filtros,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: baseInclude
      }),
      prisma.producto.count({ where: filtros })
    ])
    
    return {
      data: productos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }
  ```
  
  **Criterios de aceptación:**
  - ✅ Todos los listados tienen paginación
  - ✅ Se retorna metadata de paginación
  - ✅ Frontend muestra controles de paginación
  - ✅ Rendimiento mejorado con muchos registros

---

### Tarea 10: Sistema de Auditoría Completo
- [ ] **Implementar Logging de Auditoría** (Esfuerzo: 2-3 días)
  
  **Descripción:**
  Registrar todas las acciones importantes del sistema para auditoría.
  
  **Modelo a crear:**
  ```prisma
  model AuditoriaLog {
    id          Int      @id @default(autoincrement())
    usuarioId   Int
    usuario     Usuario  @relation(fields: [usuarioId], references: [id])
    accion      String   // CREAR, ACTUALIZAR, ELIMINAR
    entidad     String   // VENTA, PRODUCTO, CLIENTE, etc.
    entidadId   Int
    datosAntes  Json?
    datosDespues Json?
    ip          String?
    userAgent   String?
    fecha       DateTime @default(now())
    
    @@index([usuarioId, fecha])
    @@index([entidad, entidadId])
  }
  ```
  
  **Middleware a crear:**
  - `backend-api/src/infraestructura/middlewares/auditoria.middleware.js`
  
  **Criterios de aceptación:**
  - ✅ Se registran todas las acciones importantes
  - ✅ Se puede consultar historial de cambios
  - ✅ Se puede filtrar por usuario, entidad, fecha
  - ✅ Rendimiento no afectado

---

### Tarea 11: Implementar Sistema de Backup Automático
- [ ] **Configurar Backups Diarios Automáticos** (Esfuerzo: 1 día)
  
  **Descripción:**
  Crear script para hacer backups automáticos de la base de datos.
  
  **Archivos a crear:**
  - `backend-api/scripts/backup.js`
  - `backend-api/scripts/restore.js`
  
  **Script de backup:**
  ```javascript
  const { exec } = require('child_process')
  const path = require('path')
  
  async function crearBackup() {
    const fecha = new Date().toISOString().split('T')[0]
    const archivo = `backup-${fecha}.sql`
    const ruta = path.join(__dirname, '../backups', archivo)
    
    const comando = `pg_dump ${process.env.DATABASE_URL} > ${ruta}`
    
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('Error en backup:', error)
        return
      }
      console.log('Backup creado:', archivo)
      
      // Subir a la nube (opcional)
      // subirANube(ruta)
    })
  }
  
  // Ejecutar diariamente
  const cron = require('node-cron')
  cron.schedule('0 2 * * *', crearBackup)  // 2 AM todos los días
  ```
  
  **Criterios de aceptación:**
  - ✅ Se crean backups automáticamente cada día
  - ✅ Los backups se guardan en carpeta segura
  - ✅ Se pueden restaurar backups
  - ✅ Opcionalmente se suben a la nube

---

### Tarea 12: Mejorar Validaciones y Manejo de Errores
- [ ] **Implementar Validaciones Robustas** (Esfuerzo: 2-3 días)
  
  **Descripción:**
  Agregar validaciones con Joi/Zod en todos los endpoints y estandarizar mensajes de error.
  
  **Dependencias a instalar:**
  ```bash
  npm install joi
  ```
  
  **Patrón a implementar:**
  ```javascript
  const Joi = require('joi')
  
  const ventaSchema = Joi.object({
    clienteId: Joi.number().optional(),
    items: Joi.array().items(
      Joi.object({
        productoId: Joi.number().required(),
        cantidad: Joi.number().min(1).required()
      })
    ).min(1).required(),
    metodoPago: Joi.string().valid('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'FIADO').required(),
    // ...
  })
  
  router.post('/ventas', async (req, res) => {
    try {
      const { error, value } = ventaSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
          field: error.details[0].path[0]
        })
      }
      
      const venta = await crearVenta(value)
      res.status(201).json(venta)
    } catch (err) {
      logger.error('Error creando venta:', err)
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: err.message
      })
    }
  })
  ```
  
  **Criterios de aceptación:**
  - ✅ Todos los endpoints tienen validación
  - ✅ Mensajes de error estandarizados
  - ✅ Códigos de error consistentes
  - ✅ Logging estructurado

---

## 🔵 FASE 4: BAJAS (Semanas 7-10) - 5 tareas

### Tarea 13: Implementar Caché con Redis
- [ ] **Agregar Caché para Mejorar Rendimiento** (Esfuerzo: 2 días)
  
  **Descripción:**
  Implementar Redis para cachear consultas frecuentes.
  
  **Dependencias:**
  ```bash
  npm install redis
  ```
  
  **Casos de uso:**
  - Dashboard (5 minutos)
  - Lista de productos activos (10 minutos)
  - Configuración del sistema (1 hora)
  
  **Criterios de aceptación:**
  - ✅ Dashboard carga desde caché
  - ✅ Caché se invalida correctamente
  - ✅ Rendimiento mejorado

---

### Tarea 14: Migrar Logs a Sistema Estructurado
- [ ] **Implementar Winston para Logging** (Esfuerzo: 1 día)
  
  **Descripción:**
  Reemplazar `console.log` por sistema de logging estructurado.
  
  **Dependencias:**
  ```bash
  npm install winston
  ```
  
  **Criterios de aceptación:**
  - ✅ Logs estructurados en JSON
  - ✅ Diferentes niveles (info, warn, error)
  - ✅ Logs guardados en archivos
  - ✅ Rotación de logs

---

### Tarea 15: Implementar Notificaciones Push
- [ ] **Agregar Notificaciones en Tiempo Real** (Esfuerzo: 3-4 días)
  
  **Descripción:**
  Implementar notificaciones push para eventos importantes.
  
  **Casos de uso:**
  - Stock crítico
  - Deuda vencida
  - Diferencia alta en cierre de caja
  
  **Criterios de aceptación:**
  - ✅ Notificaciones en tiempo real
  - ✅ Se pueden marcar como leídas
  - ✅ Historial de notificaciones

---

### Tarea 16: Módulo de Compras a Proveedores
- [ ] **Implementar Gestión de Compras** (Esfuerzo: 5-7 días)
  
  **Descripción:**
  Crear módulo completo para registrar compras a proveedores.
  
  **Modelos a crear:**
  ```prisma
  model Proveedor {
    id       Int      @id @default(autoincrement())
    nombre   String
    nit      String?
    telefono String?
    correo   String?
    compras  Compra[]
  }
  
  model Compra {
    id          Int      @id @default(autoincrement())
    proveedorId Int
    proveedor   Proveedor @relation(fields: [proveedorId], references: [id])
    fecha       DateTime @default(now())
    total       Float
    estadoPago  String   @default("PENDIENTE")
    detalles    DetalleCompra[]
    pagos       PagoCompra[]
  }
  
  model DetalleCompra {
    id            Int      @id @default(autoincrement())
    compraId      Int
    compra        Compra   @relation(fields: [compraId], references: [id])
    productoId    Int
    producto      Producto @relation(fields: [productoId], references: [id])
    cantidad      Int
    costoUnitario Float
    subtotal      Float
  }
  ```
  
  **Criterios de aceptación:**
  - ✅ Se pueden registrar compras
  - ✅ Actualiza inventario automáticamente
  - ✅ Registra movimientos de inventario
  - ✅ Crea cuentas por pagar
  - ✅ Integra con caja al pagar

---

### Tarea 17: Dashboard Avanzado con Gráficos Interactivos
- [ ] **Mejorar Dashboard con Análisis Avanzado** (Esfuerzo: 4-5 días)
  
  **Descripción:**
  Agregar gráficos interactivos y análisis avanzado al dashboard.
  
  **Funcionalidades:**
  - Gráficos de tendencias
  - Comparativas mes a mes, año a año
  - Predicciones básicas
  - Exportación a PDF/Excel
  
  **Criterios de aceptación:**
  - ✅ Gráficos interactivos
  - ✅ Análisis de tendencias
  - ✅ Exportación funcional
  - ✅ Rendimiento óptimo

---

## 📊 Resumen de Progreso

### Por Prioridad
- 🔴 **CRÍTICAS:** 0/4 completadas (0%)
- 🟡 **ALTAS:** 0/4 completadas (0%)
- 🟢 **MEDIAS:** 0/4 completadas (0%)
- 🔵 **BAJAS:** 0/5 completadas (0%)

### Por Fase
- **Fase 1 (Semanas 1-2):** 0/4 completadas
- **Fase 2 (Semanas 3-4):** 0/4 completadas
- **Fase 3 (Semanas 5-6):** 0/4 completadas
- **Fase 4 (Semanas 7-10):** 0/5 completadas

### Esfuerzo Total
- **Estimado:** 38-58 días de desarrollo
- **Completado:** 0 días
- **Restante:** 38-58 días

---

## 🎯 Próximos Pasos Recomendados

1. **Esta Semana:**
   - [ ] Reactivar validación de stock (1 hora)
   - [ ] Comenzar backend de dashboard (2-3 días)

2. **Próxima Semana:**
   - [ ] Implementar costo de ventas (1-2 días)
   - [ ] Crear movimientos de inventario (1-2 días)

3. **Semana 3:**
   - [ ] Comenzar reportes contables (3-5 días)

---

## 📝 Notas

- Marca las tareas completadas cambiando `- [ ]` por `- [x]`
- Actualiza el progreso en la sección de resumen
- Agrega notas o comentarios según sea necesario
- Prioriza según las necesidades del negocio

---

**Última actualización:** 31 de Enero de 2026  
**Creado por:** Antigravity AI Assistant
