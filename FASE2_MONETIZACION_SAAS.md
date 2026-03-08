# 💼 FASE 2 — SmartPOS Monetización + Infraestructura Profesional
> **Objetivo**: Escalar SmartPOS a un modelo SaaS sostenible. La app permanece **gratis en Play Store**, pero los negocios pagan una suscripción mensual accesible para activar su cuenta. La infraestructura se migra a planes pagos para garantizar disponibilidad 24/7.
>
> **Modelo de negocio**: Freemium → SaaS (Software as a Service)
>
> **Prerequisito**: Haber completado la Fase 1 al 100% ✅

---

## 📊 Progreso General

| Módulo | Estado | Tareas |
|--------|--------|--------|
| 🖥️ Upgrade de Infraestructura | 🔴 Pendiente | 0 / 5 |
| 💳 Modelo de Suscripción y Precios | 🔴 Pendiente | 0 / 4 |
| 🔗 Integración de Pasarela de Pagos | 🔴 Pendiente | 0 / 10 |
| ⚙️ Backend — Gestión de Suscripciones | 🔴 Pendiente | 0 / 8 |
| 📱 App Android — Flujo de Pago | 🔴 Pendiente | 0 / 8 |
| 🛡️ Control de Acceso Premium | 🔴 Pendiente | 0 / 6 |
| 📊 Dashboard de Administración | 🔴 Pendiente | 0 / 5 |
| 🚀 Lanzamiento Fase 2 | 🔴 Pendiente | 0 / 5 |

> 💡 **Cómo usar**: Marca cada tarea con `[x]` cuando la completes. Actualiza el estado del módulo cuando todas sus tareas estén hechas (🔴 Pendiente → 🟡 En progreso → 🟢 Completado).

---

## 🖥️ MÓDULO 1 — Upgrade de Infraestructura

> **Descripción**: Migrar de los planes gratuitos a planes pagos para garantizar disponibilidad 24/7, sin cold starts ni pausas de base de datos.

### Comparativa Fase 1 vs Fase 2

| Servicio | Fase 1 (Gratis) | Fase 2 (Pago) | Diferencia |
|----------|----------------|---------------|------------|
| **Render** | Free (duerme 15 min) | Starter $7/mes | Sin cold start |
| **Supabase** | Free (pausa 7 días) | Pro $25/mes | Sin pausas, 8GB DB |
| **Total infra** | $0/mes | **$32/mes** | ~$384/año |

### Tareas

- [ ] **1.1** — Actualizar Render al plan **Starter ($7/mes)**:
  - Ir a Render Dashboard → tu servicio → Upgrade
  - Verificar que el servidor ya no entra en sleep mode
  - Eliminar el cron job de keep-alive de Render (ya no es necesario)

- [ ] **1.2** — Actualizar Supabase al plan **Pro ($25/mes)**:
  - Ir a Supabase Dashboard → Settings → Billing
  - Verificar que la base de datos ya no se pausa automáticamente
  - Eliminar el cron job de keep-alive de Supabase (ya no es necesario)

- [ ] **1.3** — Configurar **backups automáticos** de la base de datos en Supabase Pro (incluidos en el plan).

- [ ] **1.4** — Configurar **alertas de disponibilidad** con [UptimeRobot](https://uptimerobot.com) (gratis):
  - Alerta si el backend cae por más de 5 minutos
  - Notificación por email al administrador

- [ ] **1.5** — Documentar el costo mensual de infraestructura y el umbral mínimo de negocios pagantes necesario para cubrirlo:
  - Costo fijo: $32/mes
  - Con plan Básico ($4.99): necesitas **7 negocios** para cubrir infraestructura
  - Con plan Estándar ($9.99): necesitas **4 negocios**

---

## 💳 MÓDULO 2 — Modelo de Suscripción y Precios

> **Descripción**: Definir una estructura de precios justa, accesible y escalable. La app es gratuita para descargar, pero cada negocio paga una suscripción mensual para operar.

### 💰 Estructura de Planes Propuesta

| Plan | Precio/mes | Usuarios | Productos | Pedidos/mes | A quién va dirigido |
|------|-----------|----------|-----------|-------------|---------------------|
| 🟢 **Básico** | **$4.99** | 2 usuarios | Hasta 100 | Ilimitados | Emprendedores y micro-negocios |
| 🔵 **Estándar** | **$9.99** | 5 usuarios | Hasta 500 | Ilimitados | Pequeños negocios |
| 🟣 **Profesional** | **$19.99** | 15 usuarios | Ilimitados | Ilimitados | Negocios en crecimiento |
| ⭐ **Empresarial** | **$39.99** | Ilimitados | Ilimitados | Ilimitados + Reportes avanzados | Negocios consolidados |

> 💡 **Período de prueba gratuita**: 14 días gratuitos para todos los planes (incentiva el registro).

### Proyección de Rentabilidad

| Negocios activos | Plan promedio | Ingresos/mes | Ganancia neta (- $32 infra) |
|-----------------|---------------|-------------|------------------------------|
| 10 negocios | Básico $4.99 | $49.90 | $17.90 |
| 20 negocios | Mix $8.00 prom | $160.00 | $128.00 |
| 50 negocios | Mix $8.00 prom | $400.00 | $368.00 |
| 100 negocios | Mix $9.00 prom | $900.00 | $868.00 |

### Tareas

- [ ] **2.1** — Revisar y ajustar los precios de la tabla anterior según el mercado objetivo (país / región).

- [ ] **2.2** — Definir qué funcionalidades son **exclusivas de cada plan** y documentarlas en `PLANES.md`.

- [ ] **2.3** — Crear la tabla `planes_suscripcion` en la base de datos:
  ```sql
  CREATE TABLE planes_suscripcion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL,        -- 'Básico', 'Estándar', etc.
    precio_mensual DECIMAL(8,2),
    max_usuarios INTEGER,               -- NULL = ilimitado
    max_productos INTEGER,              -- NULL = ilimitado
    caracteristicas JSONB,
    activo BOOLEAN DEFAULT true
  );
  ```

- [ ] **2.4** — Poblar la tabla `planes_suscripcion` con los 4 planes definidos:
  ```sql
  INSERT INTO planes_suscripcion (nombre, precio_mensual, max_usuarios, max_productos)
  VALUES
    ('Básico',       4.99,  2,    100),
    ('Estándar',     9.99,  5,    500),
    ('Profesional', 19.99, 15,   NULL),
    ('Empresarial', 39.99, NULL, NULL);
  ```

---

## 🔗 MÓDULO 3 — Integración de Pasarela de Pagos

> **Descripción**: Integrar un sistema de pagos para cobrar las suscripciones mensuales automáticamente.

### Comparativa de Pasarelas de Pago

| Pasarela | Comisión | Disponibilidad | Recomendado si... |
|----------|----------|----------------|-------------------|
| **Stripe** | 2.9% + $0.30 | Internacional | Tu mercado es USA / Europa / Global |
| **MercadoPago** | 3.49% - 5.99% | Latinoamérica | Tu mercado es LATAM (MX, AR, CO, PE, CL) |
| **PayU** | Variable | LATAM + Global | Operaciones en múltiples países LATAM |

> 🎯 **Recomendación**: Si tu mercado es latinoamericano → **MercadoPago**. Si es global → **Stripe**.

### Tareas (usando Stripe como ejemplo — aplica similar para MercadoPago)

- [ ] **3.1** — Crear cuenta en [Stripe](https://stripe.com) o [MercadoPago](https://mercadopago.com).

- [ ] **3.2** — Crear en Stripe los **Productos y Precios** (Plans recurrentes):
  - Plan Básico → $4.99/mes recurrente
  - Plan Estándar → $9.99/mes recurrente
  - Plan Profesional → $19.99/mes recurrente
  - Plan Empresarial → $39.99/mes recurrente

- [ ] **3.3** — Instalar el SDK de Stripe en el backend NestJS:
  ```bash
  npm install stripe @nestjs/config
  ```

- [ ] **3.4** — Crear módulo `PagosModule` en NestJS con:
  - Servicio para crear sesiones de pago (Checkout Sessions)
  - Servicio para gestionar suscripciones (crear, cancelar, actualizar)
  - Webhook handler para recibir eventos de Stripe

- [ ] **3.5** — Implementar los endpoints de pagos:
  ```
  POST /pagos/crear-suscripcion       → Inicia el proceso de pago
  POST /pagos/cancelar-suscripcion    → Cancela la suscripción
  POST /pagos/webhook                 → Recibe eventos de Stripe (pago exitoso, fallido, etc.)
  GET  /pagos/estado                  → Estado actual de la suscripción del negocio
  GET  /pagos/historial               → Historial de pagos del negocio
  ```

- [ ] **3.6** — Crear tabla `suscripciones` en la base de datos:
  ```sql
  CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES negocios(id),
    plan_id UUID REFERENCES planes_suscripcion(id),
    stripe_subscription_id VARCHAR(100),    -- ID de Stripe
    stripe_customer_id VARCHAR(100),        -- ID del cliente en Stripe
    estado VARCHAR(20) DEFAULT 'trial',     -- trial, activa, vencida, cancelada
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,                    -- fin del período actual
    fecha_prueba_gratis_fin TIMESTAMP,      -- fin de los 14 días gratis
    auto_renovar BOOLEAN DEFAULT true,
    UNIQUE(negocio_id)
  );
  ```

- [ ] **3.7** — Implementar el **Webhook de Stripe** para manejar eventos:
  - `invoice.payment_succeeded` → Marcar suscripción como activa, extender fecha
  - `invoice.payment_failed` → Notificar al admin del negocio, dar 3 días de gracia
  - `customer.subscription.deleted` → Marcar suscripción como cancelada

- [ ] **3.8** — Configurar variables de entorno en Render:
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

- [ ] **3.9** — Probar el flujo completo en modo **test** de Stripe con tarjetas de prueba.

- [ ] **3.10** — Activar modo **live** de Stripe una vez validado el flujo.

---

## ⚙️ MÓDULO 4 — Backend — Gestión de Suscripciones

> **Descripción**: Lógica del backend para controlar el acceso a la app según el estado de suscripción del negocio.

### Tareas

- [ ] **4.1** — Crear **SuscripcionGuard** (middleware global) que verifica en cada request si el negocio tiene suscripción activa o en período de prueba:
  ```typescript
  // Si la suscripción está vencida → retorna 403 con mensaje de pago requerido
  // Si está activa o en trial → permite el acceso
  ```

- [ ] **4.2** — Crear **PlanGuard** que verifica los límites del plan activo:
  - Si el negocio intenta agregar el usuario #3 y está en plan Básico → bloquear
  - Si intenta agregar el producto #101 y está en plan Básico → bloquear

- [ ] **4.3** — Implementar el período de **prueba gratuita de 14 días**:
  - Al crear un negocio nuevo, establecer `fecha_prueba_gratis_fin = NOW() + 14 días`
  - El guardia permite acceso durante el trial sin requerir pago

- [ ] **4.4** — Implementar el **período de gracia de 3 días** cuando un pago falla:
  - Permitir acceso 3 días adicionales después del fallo de pago
  - Enviar notificación push al admin del negocio

- [ ] **4.5** — Crear endpoint de **estadísticas para el administrador de SmartPOS**:
  ```
  GET /admin/estadisticas
  → Total negocios, negocios activos, ingresos del mes, plan más popular
  ```
  > ⚠️ Este endpoint debe estar protegido con un rol especial `super_admin`.

- [ ] **4.6** — Implementar sistema de **notificaciones por email** (usando [Resend](https://resend.com) — gratis hasta 3000 emails/mes):
  - Email de bienvenida al registrar negocio
  - Email recordatorio 3 días antes de que venza el trial
  - Email de fallo de pago
  - Email de confirmación de pago

- [ ] **4.7** — Instalar Resend en el backend:
  ```bash
  npm install resend
  ```

- [ ] **4.8** — Actualizar la documentación de la API (Swagger) para incluir todos los endpoints de pagos y suscripciones.

---

## 📱 MÓDULO 5 — App Android — Flujo de Pago y Suscripción

> **Descripción**: Implementar en la app Android las pantallas de selección de plan, estado de suscripción y gestión de pagos.

### Tareas

- [ ] **5.1** — Crear pantalla de **Selección de Plan** (se muestra después del trial o cuando la suscripción vence):
  - Mostrar los 4 planes con sus precios y características
  - Destacar visualmente el plan recomendado (Estándar)
  - Botón "Probar 14 días gratis" para nuevos registros

- [ ] **5.2** — Implementar el flujo de pago mediante **WebView** o enlace externo:
  - Al seleccionar un plan, abrir el Checkout de Stripe en el navegador del dispositivo
  - Al regresar a la app, verificar el estado de la suscripción vía API

- [ ] **5.3** — Crear pantalla de **Mi Suscripción** (dentro de la app):
  - Plan actual, fecha de próximo cobro, estado
  - Botón "Cambiar plan"
  - Botón "Cancelar suscripción"
  - Historial de pagos

- [ ] **5.4** — Crear pantalla de **Suscripción Vencida / Bloqueada**:
  - Mensaje claro y amigable explicando que la cuenta está suspendida
  - Botón directo para renovar el plan
  - Solo mostrar esta pantalla si el negocio está bloqueado (no al usuario nunca sin acceso)

- [ ] **5.5** — Implementar **banner de trial** visible durante los 14 días de prueba:
  - "Te quedan X días de prueba gratuita. ¡Activa tu plan!"
  - Desaparece cuando el negocio tiene una suscripción activa

- [ ] **5.6** — Mostrar **límites del plan** en las pantallas correspondientes:
  - En Productos: "Tienes 87/100 productos (Plan Básico)"
  - En Usuarios: "Tienes 2/2 usuarios (Plan Básico). Upgradeate para agregar más"

- [ ] **5.7** — Implementar notificaciones push para:
  - Recordatorio de fin de trial (3 días antes)
  - Pago exitoso confirmado
  - Pago fallido (acción requerida)

- [ ] **5.8** — Actualizar la descripción en **Play Store** para reflejar el modelo freemium:
  - "Descarga gratuita. Acceso completo 14 días gratis. Planes desde $4.99/mes."

---

## 🛡️ MÓDULO 6 — Control de Acceso Premium

> **Descripción**: Sistema que regula el acceso a las funcionalidades según el plan del negocio.

### Tareas

- [ ] **6.1** — Crear tabla/mapa de **feature flags por plan**:
  ```
  Plan Básico:      reportes básicos, hasta 2 usuarios, hasta 100 productos
  Plan Estándar:    reportes estándar, hasta 5 usuarios, hasta 500 productos
  Plan Profesional: todos los reportes, hasta 15 usuarios, productos ilimitados
  Plan Empresarial: todo + soporte prioritario + exportación de datos
  ```

- [ ] **6.2** — Implementar en el backend la verificación de `max_usuarios` antes de crear un usuario nuevo en el negocio.

- [ ] **6.3** — Implementar en el backend la verificación de `max_productos` antes de crear un producto nuevo.

- [ ] **6.4** — En la app Android, deshabilitar (y mostrar badge "⬆️ Upgrade") los botones de funcionalidades no disponibles en el plan actual.

- [ ] **6.5** — Crear una pantalla de **Comparación de Planes** dentro de la app, accesible desde cualquier lugar donde se tenga un límite bloqueado.

- [ ] **6.6** — Implementar **downgrade graceful**: si un negocio baja de plan, sus datos existentes no se eliminan, pero no puede crear más hasta estar dentro del límite del nuevo plan.

---

## 📊 MÓDULO 7 — Dashboard de Administración (Super Admin)

> **Descripción**: Panel web interno para ti (el dueño de SmartPOS) para monitorear negocios, suscripciones e ingresos.

### Tareas

- [ ] **7.1** — Crear un dashboard web básico (puede ser una app React sencilla o Next.js) con:
  - Total de negocios registrados
  - Negocios activos (con suscripción pagada)
  - Negocios en trial
  - Negocios vencidos/bloqueados
  - Ingresos del mes actual

- [ ] **7.2** — Tabla de negocios con estado de suscripción, plan, fecha de próximo pago.

- [ ] **7.3** — Posibilidad de extender el trial de un negocio manualmente (para atención al cliente).

- [ ] **7.4** — Gráfico de crecimiento de negocios activos a lo largo del tiempo.

- [ ] **7.5** — Exportar reporte mensual de ingresos en CSV.

---

## 🚀 MÓDULO 8 — Lanzamiento Fase 2

### Tareas

- [ ] **8.1** — Actualizar los **Términos de Servicio** y **Política de Privacidad** para reflejar el modelo de pago.

- [ ] **8.2** — Comunicar el cambio a los usuarios existentes (si ya hay negocios registrados en Fase 1):
  - Enviar email explicando el nuevo modelo
  - Ofrecerles un **descuento de lanzamiento** (ej: 1 mes gratis extra)

- [ ] **8.3** — Actualizar la **descripción en Play Store** reflejando el modelo freemium + precios.

- [ ] **8.4** — Actualizar la **versión de la app** (versionCode y versionName en `build.gradle`) y subir nuevo AAB a Play Store.

- [ ] **8.5** — Monitorear durante las primeras 2 semanas:
  - Tasa de conversión trial → pago
  - Errores en el flujo de pago (Stripe Dashboard)
  - Disponibilidad del backend (UptimeRobot)

---

## ✅ Checklist Final — Pre-Lanzamiento Fase 2

- [ ] La infraestructura está en planes pagos (Render Starter + Supabase Pro)
- [ ] Los planes de suscripción están creados en Stripe/MercadoPago
- [ ] El webhook de Stripe está configurado y probado en producción
- [ ] El período de trial de 14 días funciona correctamente
- [ ] Los límites de plan (usuarios, productos) se aplican correctamente
- [ ] Las pantallas de suscripción/pago están implementadas en la app
- [ ] El dashboard de Super Admin está operativo
- [ ] Los emails de notificación funcionan
- [ ] Los Términos de Servicio están actualizados
- [ ] El nuevo AAB fue subido a Play Store

---

## 📈 Proyección Financiera

### Break-even (punto de equilibrio)
> Cuántos negocios necesitas para cubrir los $32/mes de infraestructura:

| Si el plan promedio es... | Negocios mínimos | Tiempo estimado |
|--------------------------|-----------------|----------------|
| $4.99 (Básico) | 7 negocios | Mes 1-2 |
| $9.99 (Estándar) | 4 negocios | Mes 1 |
| $14.00 (Mix promedio) | 3 negocios | Mes 1 |

### Metas sugeridas
| Meta | Ingresos/mes | Tiempo objetivo |
|------|-------------|----------------|
| 🥉 Break-even | $32 | Mes 1 |
| 🥈 Rentable | $200 | Mes 3 |
| 🥇 Escalable | $500 | Mes 6 |
| 🏆 Crecimiento | $1,000 | Mes 12 |

---

## 📅 Cronograma Sugerido — Fase 2

| Semana | Módulo | Horas estimadas |
|--------|--------|----------------|
| Semana 1 | Módulo 1: Upgrade Infra + Módulo 2: Precios | 4-6 hrs |
| Semana 2-3 | Módulo 3: Integración Stripe/MercadoPago | 12-15 hrs |
| Semana 4 | Módulo 4: Backend suscripciones | 8-10 hrs |
| Semana 5-6 | Módulo 5: App Android — Flujo de pago | 12-15 hrs |
| Semana 7 | Módulo 6: Control de acceso + Módulo 7: Dashboard | 8-10 hrs |
| Semana 8 | Módulo 8: Lanzamiento | 4-6 hrs |
| **Total** | | **~48-62 hrs** |

---

*Documento generado el 28/02/2026 — SmartPOS Fase 2*
