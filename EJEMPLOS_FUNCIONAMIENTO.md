# 💡 Ejemplos Prácticos de Funcionamiento del Sistema SmartPOS

## 📝 Índice
1. [Ejemplo 1: Venta en Efectivo](#ejemplo-1-venta-en-efectivo)
2. [Ejemplo 2: Venta a Crédito](#ejemplo-2-venta-a-crédito)
3. [Ejemplo 3: Abono a Deuda](#ejemplo-3-abono-a-deuda)
4. [Ejemplo 4: Pago de Gasto](#ejemplo-4-pago-de-gasto)
5. [Ejemplo 5: Cierre de Caja](#ejemplo-5-cierre-de-caja)
6. [Ejemplo 6: Problema de Stock Negativo](#ejemplo-6-problema-de-stock-negativo)

---

## Ejemplo 1: Venta en Efectivo

### Escenario
Un cliente compra 2 camisas y 1 pantalón, paga en efectivo con un billete de $100,000.

### Estado Inicial
```javascript
// Productos
Camisa Polo (ID: 10)
- Stock: 25
- Precio Costo: $30,000
- Precio Venta: $45,000

Pantalón Jean (ID: 15)
- Stock: 15
- Precio Costo: $50,000
- Precio Venta: $75,000

// Caja
Usuario: Juan (ID: 1)
Caja Abierta: ID 5
Monto Inicial: $100,000
Saldo Actual: $100,000
```

### Request al Backend
```json
POST /api/ventas
{
  "items": [
    { "productoId": 10, "cantidad": 2 },
    { "productoId": 15, "cantidad": 1 }
  ],
  "usuarioId": 1,
  "metodoPago": "EFECTIVO",
  "estadoPago": "PAGADO",
  "montoPagado": 165000,
  "montoRecibido": 200000
}
```

### Proceso en el Sistema

#### 1. Cálculo de Total
```javascript
// venta.servicio.js
Camisa: 2 × $45,000 = $90,000
Pantalón: 1 × $75,000 = $75,000
Total: $165,000
```

#### 2. Creación de Venta
```javascript
// Venta creada
{
  id: 123,
  fecha: "2026-01-31T11:30:00",
  total: 165000,
  metodoPago: "EFECTIVO",
  estadoPago: "PAGADO",
  montoPagado: 165000,
  usuarioId: 1
}
```

#### 3. Detalles de Venta
```javascript
// DetalleVenta
[
  {
    ventaId: 123,
    productoId: 10,
    cantidad: 2,
    precioUnitario: 45000,
    subtotal: 90000
  },
  {
    ventaId: 123,
    productoId: 15,
    cantidad: 1,
    precioUnitario: 75000,
    subtotal: 75000
  }
]
```

#### 4. Actualización de Stock
```javascript
// Antes → Después
Camisa: 25 → 23
Pantalón: 15 → 14
```

#### 5. Movimientos en Caja
```javascript
// Movimiento 1: INGRESO por venta
{
  cajaId: 5,
  usuarioId: 1,
  tipo: "VENTA",
  metodoPago: "EFECTIVO",
  monto: 200000,  // Monto recibido
  descripcion: "Venta #123 (EFECTIVO) - Valor: $165,000 - Recibido: $200,000",
  ventaId: 123
}

// Movimiento 2: EGRESO por cambio
{
  cajaId: 5,
  usuarioId: 1,
  tipo: "EGRESO",
  metodoPago: "EFECTIVO",
  monto: 35000,  // Cambio
  descripcion: "Cambio/Vuelto de Venta #123 - Valor: $165,000 - Recibido: $200,000",
  ventaId: 123
}
```

### Estado Final
```javascript
// Productos
Camisa: Stock 23 (era 25)
Pantalón: Stock 14 (era 15)

// Caja
Saldo Inicial: $100,000
+ Ingreso Venta: $200,000
- Egreso Cambio: $35,000
= Saldo Actual: $265,000 ✅

// Venta
Total Vendido: $165,000
Cambio Entregado: $35,000
Neto en Caja: $165,000 ✅
```

### ✅ Lo que está BIEN
- ✅ Cálculo correcto del total
- ✅ Registro del monto recibido y cambio
- ✅ Actualización automática de stock
- ✅ Movimientos en caja precisos
- ✅ Trazabilidad completa

### ❌ Lo que está MAL
- ❌ **NO se registra el costo de los productos vendidos**
  - Costo Real: (2 × $30,000) + (1 × $50,000) = $110,000
  - Utilidad Real: $165,000 - $110,000 = $55,000
  - **El sistema NO calcula ni guarda esta utilidad**

---

## Ejemplo 2: Venta a Crédito

### Escenario
Cliente frecuente "María López" compra $200,000 a crédito. Tiene límite de $500,000 y ya debe $150,000.

### Estado Inicial
```javascript
// Cliente
{
  id: 5,
  nombre: "María López",
  creditoMaximo: 500000,
  saldoDeuda: 150000,
  diasCredito: 30
}

// Crédito Disponible
creditoDisponible = 500000 - 150000 = $350,000 ✅
```

### Request
```json
POST /api/ventas
{
  "clienteId": 5,
  "items": [
    { "productoId": 20, "cantidad": 5 }
  ],
  "usuarioId": 1,
  "metodoPago": "FIADO",
  "estadoPago": "FIADO",
  "montoPagado": 0
}
```

### Proceso

#### 1. Validación de Crédito
```javascript
// venta.servicio.js línea 100
const creditoDisponible = 500000 - 150000 = 350000
const totalVenta = 200000

if (creditoDisponible < totalVenta) {
  throw Error("Crédito insuficiente")
}
// ✅ Pasa la validación (350,000 > 200,000)
```

#### 2. Creación de Venta
```javascript
{
  id: 124,
  total: 200000,
  clienteId: 5,
  metodoPago: "FIADO",
  estadoPago: "FIADO",
  montoPagado: 0,
  saldoPendiente: 200000
}
```

#### 3. Creación de Deuda
```javascript
{
  id: 45,
  clienteId: 5,
  ventaId: 124,
  montoTotal: 200000,
  saldoPendiente: 200000,
  estado: "PENDIENTE",
  fechaCreacion: "2026-01-31",
  fechaVencimiento: "2026-03-02"  // +30 días
}
```

#### 4. Actualización de Cliente
```javascript
// Antes → Después
saldoDeuda: 150000 → 350000
```

### Estado Final
```javascript
// Cliente
{
  nombre: "María López",
  creditoMaximo: 500000,
  saldoDeuda: 350000,  // Actualizado
  creditoDisponible: 150000  // Reducido
}

// Deuda
{
  montoTotal: 200000,
  saldoPendiente: 200000,
  estado: "PENDIENTE"
}
```

### ✅ Lo que está BIEN
- ✅ Validación estricta de crédito disponible
- ✅ Cálculo automático de fecha de vencimiento
- ✅ Actualización consistente de saldos
- ✅ Trazabilidad venta → deuda

### ❌ Lo que está MAL
- ❌ **NO se registra en caja** (correcto, porque no hay ingreso de efectivo)
- ❌ **NO se registra el costo de venta** (mismo problema que ejemplo 1)

---

## Ejemplo 3: Abono a Deuda

### Escenario
María López abona $100,000 a su deuda de $200,000, paga con $100,000 en efectivo.

### Estado Inicial
```javascript
// Deuda
{
  id: 45,
  clienteId: 5,
  montoTotal: 200000,
  saldoPendiente: 200000,
  estado: "PENDIENTE"
}

// Cliente
{
  saldoDeuda: 350000
}

// Caja
Saldo Actual: $265,000
```

### Request
```json
POST /api/deudas/45/abonos
{
  "monto": 100000,
  "montoRecibido": 100000,
  "metodoPago": "EFECTIVO",
  "usuarioId": 1,
  "nota": "Abono parcial"
}
```

### Proceso

#### 1. Validación
```javascript
// deuda.servicio.js línea 129
if (monto > saldoPendiente) {
  throw Error("Monto mayor al saldo")
}
// ✅ Pasa (100,000 <= 200,000)
```

#### 2. Creación de Abono
```javascript
{
  id: 78,
  deudaId: 45,
  clienteId: 5,
  monto: 100000,
  metodoPago: "EFECTIVO",
  usuarioId: 1,
  nota: "Abono parcial"
}
```

#### 3. Actualización de Deuda
```javascript
// Antes → Después
saldoPendiente: 200000 → 100000
estado: "PENDIENTE" → "PENDIENTE"  // Sigue pendiente
```

#### 4. Actualización de Cliente
```javascript
// Antes → Después
saldoDeuda: 350000 → 250000
```

#### 5. Movimiento en Caja
```javascript
{
  cajaId: 5,
  tipo: "ABONO_VENTA",
  metodoPago: "EFECTIVO",
  monto: 100000,
  descripcion: "Abono Venta #124 - Valor: $100,000",
  abonoId: 78
}
```

### Estado Final
```javascript
// Deuda
{
  montoTotal: 200000,
  saldoPendiente: 100000,  // Reducido
  estado: "PENDIENTE"
}

// Cliente
{
  saldoDeuda: 250000,  // Reducido
  creditoDisponible: 250000  // Aumentado
}

// Caja
Saldo Anterior: $265,000
+ Abono: $100,000
= Saldo Actual: $365,000 ✅
```

### ✅ Lo que está BIEN
- ✅ Actualización consistente de deuda y cliente
- ✅ Registro en caja automático
- ✅ Validación de monto
- ✅ Trazabilidad completa

### ❌ Lo que está MAL
- ❌ Si el abono completa la deuda ($200,000), el estado cambia a "PAGADO" pero **no se registra el costo de venta original** (problema persistente)

---

## Ejemplo 4: Pago de Gasto

### Escenario
Se paga $300,000 al proveedor de luz en efectivo.

### Estado Inicial
```javascript
// Gasto
{
  id: 12,
  proveedor: "Empresa de Energía",
  concepto: "Factura de luz enero",
  montoTotal: 300000,
  saldoPendiente: 300000,
  estado: "PENDIENTE"
}

// Caja
Usuario: Juan (ID: 1)
Caja Abierta: ID 5
Saldo Efectivo: $365,000
```

### Request
```json
POST /api/gastos/12/pagos
{
  "monto": 300000,
  "metodoPago": "EFECTIVO",
  "usuarioId": 1,
  "nota": "Pago completo factura luz"
}
```

### Proceso

#### 1. Validación de Saldo en Caja
```javascript
// gasto.servicio.js línea 107-139
// Calcula saldo disponible en EFECTIVO
saldoDisponible = montoInicial + Σ(ingresos) - Σ(egresos)
saldoDisponible = 100000 + 300000 - 35000 = 365000

if (saldoDisponible < 300000) {
  throw Error("Saldo insuficiente")
}
// ✅ Pasa (365,000 >= 300,000)
```

#### 2. Creación de Pago
```javascript
{
  id: 56,
  gastoId: 12,
  monto: 300000,
  metodoPago: "EFECTIVO",
  usuarioId: 1,
  nota: "Pago completo factura luz"
}
```

#### 3. Actualización de Gasto
```javascript
// Antes → Después
saldoPendiente: 300000 → 0
estado: "PENDIENTE" → "PAGADO"
```

#### 4. Movimiento en Caja
```javascript
{
  cajaId: 5,
  tipo: "PAGO_GASTO",
  metodoPago: "EFECTIVO",
  monto: 300000,
  descripcion: "Pago a gasto: Factura de luz enero (EFECTIVO)",
  gastoId: 12
}
```

### Estado Final
```javascript
// Gasto
{
  montoTotal: 300000,
  saldoPendiente: 0,
  estado: "PAGADO"
}

// Caja
Saldo Anterior: $365,000
- Pago Gasto: $300,000
= Saldo Actual: $65,000 ✅
```

### ✅ Lo que está BIEN
- ✅ Validación de saldo antes de pagar
- ✅ Actualización automática de gasto
- ✅ Registro en caja automático
- ✅ Prevención de sobregiros

### ⚠️ Lo que puede MEJORAR
- ⚠️ **Fallback a cualquier caja abierta** si el usuario no tiene caja
  - Ejemplo: Admin registra pago pero no tiene caja abierta
  - Sistema usa la caja del cajero
  - **Problema:** El descuento se hace en la caja del cajero, no del admin
  - **Solución:** Requerir que el usuario tenga caja abierta O especificar manualmente la caja

---

## Ejemplo 5: Cierre de Caja

### Escenario
Al final del día, Juan cierra su caja. Cuenta $65,000 en efectivo físico.

### Estado Inicial
```javascript
// Caja
{
  id: 5,
  usuarioId: 1,
  montoInicial: 100000,
  estado: "ABIERTA",
  fechaApertura: "2026-01-31T08:00:00"
}

// Movimientos del día
[
  { tipo: "VENTA", metodoPago: "EFECTIVO", monto: 200000 },
  { tipo: "EGRESO", metodoPago: "EFECTIVO", monto: 35000 },  // Cambio
  { tipo: "ABONO_VENTA", metodoPago: "EFECTIVO", monto: 100000 },
  { tipo: "PAGO_GASTO", metodoPago: "EFECTIVO", monto: 300000 },
  { tipo: "VENTA", metodoPago: "TRANSFERENCIA", monto: 50000 }  // No afecta efectivo
]
```

### Request
```json
POST /api/caja/cerrar
{
  "usuarioId": 1,
  "montoFinal": 65000,
  "observaciones": "Cierre turno tarde"
}
```

### Proceso

#### 1. Cálculo de Saldo Esperado (Solo EFECTIVO)
```javascript
// caja.servicio.js línea 72-82
montoInicial = 100000

ingresosEfectivo = 200000 (venta) + 100000 (abono) = 300000
egresosEfectivo = 35000 (cambio) + 300000 (pago gasto) = 335000

montoSistema = 100000 + 300000 - 335000 = 65000
```

#### 2. Cálculo de Diferencia
```javascript
montoFinal = 65000  // Conteo físico
montoSistema = 65000  // Calculado
diferencia = 65000 - 65000 = 0 ✅ CUADRADO
```

#### 3. Actualización de Caja
```javascript
{
  id: 5,
  montoInicial: 100000,
  montoFinal: 65000,
  montoSistema: 65000,
  diferencia: 0,
  estado: "CERRADA",
  fechaCierre: "2026-01-31T18:00:00"
}
```

### Estado Final
```javascript
// Caja Cerrada
{
  montoInicial: $100,000
  Ingresos Efectivo: $300,000
  Egresos Efectivo: $335,000
  Saldo Esperado: $65,000
  Saldo Contado: $65,000
  Diferencia: $0 ✅ PERFECTO
}

// Nota: La venta por transferencia ($50,000) NO afecta el cuadre de efectivo
```

### ✅ Lo que está BIEN
- ✅ Separación correcta entre efectivo y otros métodos
- ✅ Cálculo automático del saldo esperado
- ✅ Detección de diferencias (sobrantes/faltantes)
- ✅ Registro de fecha de cierre

### ⚠️ Lo que puede CONFUNDIR
- ⚠️ **Dos saldos diferentes:**
  - `saldoTotal`: $115,000 (incluye transferencia)
  - `saldoEfectivo`: $65,000 (solo efectivo)
  - **Problema:** El usuario puede confundirse sobre cuál es el "saldo real"
  - **Solución:** Mostrar claramente ambos en el frontend con etiquetas descriptivas

---

## Ejemplo 6: Problema de Stock Negativo

### Escenario
Se intenta vender 10 camisas pero solo hay 5 en stock.

### Estado Inicial
```javascript
// Producto
{
  id: 10,
  nombre: "Camisa Polo",
  stock: 5,
  precioVenta: 45000
}
```

### Request
```json
POST /api/ventas
{
  "items": [
    { "productoId": 10, "cantidad": 10 }
  ],
  "usuarioId": 1,
  "metodoPago": "EFECTIVO"
}
```

### ❌ Comportamiento ACTUAL (INCORRECTO)

```javascript
// venta.servicio.js línea 122-126
// VALIDACIÓN COMENTADA:
// if (p.stock < Number(i.cantidad)) {
//   throw new Error(`Stock insuficiente...`)
// }

// ❌ La venta se procesa sin validar stock
```

#### Resultado:
```javascript
// Venta creada ✅
{
  id: 125,
  total: 450000
}

// Stock actualizado ❌
{
  stock: 5 - 10 = -5  // STOCK NEGATIVO!
}
```

### 🔴 PROBLEMAS GENERADOS

1. **Stock Negativo en BD**
   ```javascript
   Camisa Polo: stock = -5
   ```

2. **Imposible Saber Qué Falta**
   - ¿Hay que comprar 5 camisas o 15?
   - No se sabe cuántas se vendieron sin tener

3. **Descuadre Contable**
   - Se vendió lo que no existe
   - El costo de venta es incorrecto
   - El inventario valorizado es negativo

4. **Notificaciones Incorrectas**
   - No se genera alerta de stock bajo
   - El sistema piensa que hay -5 unidades

### ✅ Comportamiento CORRECTO (Recomendado)

```javascript
// DESCOMENTAR la validación:
if (p.stock < Number(i.cantidad)) {
  throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock}, Solicitado: ${i.cantidad}`)
}
```

#### Resultado:
```javascript
// Error 400
{
  error: "Stock insuficiente para Camisa Polo. Disponible: 5, Solicitado: 10"
}

// Stock sin cambios ✅
{
  stock: 5
}
```

### 💡 Solución Alternativa: Venta Bajo Pedido

```javascript
// Permitir venta con stock insuficiente si se marca como "bajo pedido"
{
  "items": [
    { 
      "productoId": 10, 
      "cantidad": 10,
      "bajoPedido": true  // NUEVO
    }
  ]
}

// Crear venta con estado especial
{
  id: 125,
  total: 450000,
  estadoEntrega: "PENDIENTE",  // NUEVO
  observaciones: "5 unidades entregadas, 5 pendientes de recibir"
}

// Actualizar solo el stock disponible
stock: 5 → 0  // No negativo

// Crear registro de pendiente
{
  ventaId: 125,
  productoId: 10,
  cantidadPendiente: 5,
  estado: "ESPERANDO_PROVEEDOR"
}
```

---

## 📊 Resumen de Ejemplos

| Ejemplo | Estado | Problemas | Recomendación |
|---------|--------|-----------|---------------|
| Venta Efectivo | ✅ Funciona | ❌ No registra costo | Implementar costo de venta |
| Venta Crédito | ✅ Funciona | ❌ No registra costo | Implementar costo de venta |
| Abono Deuda | ✅ Funciona | ✅ Ninguno | Mantener |
| Pago Gasto | ⚠️ Funciona con observación | ⚠️ Fallback a cualquier caja | Requerir caja propia |
| Cierre Caja | ✅ Funciona | ⚠️ Dos saldos confusos | Mejorar UI |
| Stock Negativo | 🔴 CRÍTICO | 🔴 Permite stock negativo | Reactivar validación |

---

## 🎯 Conclusión

### Lo que funciona BIEN ✅
1. Cálculo de totales
2. Manejo de cambio/vuelto
3. Actualización de stock (cuando hay suficiente)
4. Integración con caja
5. Control de crédito
6. Cuadre de caja

### Lo que necesita ATENCIÓN URGENTE 🔴
1. **Reactivar validación de stock** (CRÍTICO)
2. **Implementar registro de costo de ventas** (CRÍTICO)
3. **Mejorar manejo de caja en pagos de gastos** (IMPORTANTE)

### Lo que puede MEJORAR 🟡
1. Mostrar claramente saldos en frontend
2. Implementar ventas bajo pedido
3. Agregar más validaciones
4. Mejorar mensajes de error

---

**Elaborado por:** Antigravity AI Assistant  
**Fecha:** 31 de Enero de 2026
