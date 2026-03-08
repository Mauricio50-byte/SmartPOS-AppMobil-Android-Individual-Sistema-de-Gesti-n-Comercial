# 🚀 FASE 1 — SmartPOS Multi-Negocio + Publicación en Play Store
> **Objetivo**: Transformar SmartPOS en una aplicación multi-negocio y publicarla gratuitamente en Google Play Store utilizando infraestructura 100% gratuita.
>
> **Stack**: Android (Kotlin) · NestJS (Render Free) · PostgreSQL (Supabase Free) · cron-job.org
>
> **Costo total estimado**: $25 USD (cuenta de desarrollador Play Store, pago único)

---

## 📊 Progreso General

| Módulo | Estado | Tareas |
|--------|--------|--------|
| 🏗️ Arquitectura Multi-Negocio (BD) | 🔴 Pendiente | 0 / 8 |
| ⚙️ Backend Multi-Negocio (API) | 🔴 Pendiente | 0 / 10 |
| 📱 App Android Multi-Negocio | 🔴 Pendiente | 0 / 9 |
| 🔧 Infraestructura (Keep-Alive) | 🔴 Pendiente | 0 / 5 |
| 🔐 Seguridad y Validaciones | 🔴 Pendiente | 0 / 6 |
| 🏪 Publicación en Play Store | 🔴 Pendiente | 0 / 10 |

> 💡 **Cómo usar**: Marca cada tarea con `[x]` cuando la completes. Actualiza el estado del módulo cuando todas sus tareas estén hechas (🔴 Pendiente → 🟡 En progreso → 🟢 Completado).

---

## 🏗️ MÓDULO 1 — Arquitectura Multi-Negocio en Base de Datos

> **Descripción**: Rediseñar el esquema de la base de datos en Supabase para soportar múltiples negocios, donde cada negocio tiene sus propios datos aislados.

### Conceptos Clave
- Cada **negocio** (Business) es una entidad independiente.
- Todos los usuarios pertenecen a **un negocio**.
- Todos los datos (productos, pedidos, clientes, etc.) están **aislados por negocio** mediante `negocio_id`.

### Tareas

- [ ] **1.1** — Crear tabla `negocios` en Supabase con los campos:
  ```sql
  CREATE TABLE negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    ruc_nit VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    logo_url TEXT,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **1.2** — Crear tabla `negocio_configuracion` para ajustes por negocio:
  ```sql
  CREATE TABLE negocio_configuracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
    moneda VARCHAR(10) DEFAULT 'USD',
    zona_horaria VARCHAR(50) DEFAULT 'America/Lima',
    impuesto_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    prefijo_factura VARCHAR(10) DEFAULT 'FAC',
    UNIQUE(negocio_id)
  );
  ```

- [ ] **1.3** — Agregar columna `negocio_id` a la tabla `usuarios`:
  ```sql
  ALTER TABLE usuarios ADD COLUMN negocio_id UUID REFERENCES negocios(id);
  ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT 'empleado'; -- 'admin', 'empleado'
  ```

- [ ] **1.4** — Agregar columna `negocio_id` a TODAS las tablas de datos:
  - [ ] `productos` → `ALTER TABLE productos ADD COLUMN negocio_id UUID REFERENCES negocios(id);`
  - [ ] `pedidos` → `ALTER TABLE pedidos ADD COLUMN negocio_id UUID REFERENCES negocios(id);`
  - [ ] `clientes` → `ALTER TABLE clientes ADD COLUMN negocio_id UUID REFERENCES negocios(id);`
  - [ ] `categorias` → `ALTER TABLE categorias ADD COLUMN negocio_id UUID REFERENCES negocios(id);`
  - [ ] *(otras tablas existentes)*

- [ ] **1.5** — Crear índices para mejorar rendimiento en consultas por negocio:
  ```sql
  CREATE INDEX idx_productos_negocio ON productos(negocio_id);
  CREATE INDEX idx_pedidos_negocio ON pedidos(negocio_id);
  CREATE INDEX idx_clientes_negocio ON clientes(negocio_id);
  CREATE INDEX idx_usuarios_negocio ON usuarios(negocio_id);
  ```

- [ ] **1.6** — Activar **Row Level Security (RLS)** en Supabase para aislamiento de datos:
  ```sql
  ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
  -- Repetir para todas las tablas con negocio_id
  ```

- [ ] **1.7** — Crear el script de migración completo y guardarlo como `migrations/001_multi_negocio.sql` en el repositorio.

- [ ] **1.8** — Ejecutar la migración en el entorno de producción (Supabase) y verificar que no hay errores.

---

## ⚙️ MÓDULO 2 — Backend Multi-Negocio (API NestJS)

> **Descripción**: Actualizar el backend en NestJS para manejar el contexto de negocio en cada request, aplicando el filtro por `negocio_id` en todos los endpoints.

### Tareas

- [ ] **2.1** — Crear el módulo `NegociosModule` con su servicio, controlador y entidad:
  - `GET /negocios/:id` — Obtener datos del negocio
  - `PUT /negocios/:id` — Actualizar datos del negocio
  - `POST /negocios` — Registrar nuevo negocio

- [ ] **2.2** — Crear el **Guard de Negocio** (`NegocioGuard`) que:
  - Extrae el `negocio_id` del JWT del usuario autenticado
  - Lo inyecta en el contexto de cada request

- [ ] **2.3** — Actualizar el módulo de **Autenticación** (`AuthModule`):
  - El JWT debe incluir `negocio_id` y `rol` del usuario
  - Al registrar un nuevo usuario, asociarlo a su negocio

- [ ] **2.4** — Crear endpoint de **registro de negocio + admin**:
  ```
  POST /auth/registro-negocio
  Body: { nombre_negocio, email_admin, password, nombre_admin }
  ```
  Este endpoint crea el negocio y el usuario administrador en una sola transacción.

- [ ] **2.5** — Actualizar **ProductosService**: filtrar por `negocio_id` en todas las consultas:
  ```typescript
  findAll(negocioId: string) {
    return this.repo.find({ where: { negocio_id: negocioId } });
  }
  ```

- [ ] **2.6** — Actualizar **PedidosService**: filtrar por `negocio_id` en todas las consultas.

- [ ] **2.7** — Actualizar **ClientesService**: filtrar por `negocio_id` en todas las consultas.

- [ ] **2.8** — Actualizar **CategoriasService**: filtrar por `negocio_id` en todas las consultas.

- [ ] **2.9** — Actualizar **todos los demás servicios** para incluir el filtro por `negocio_id`.

- [ ] **2.10** — Implementar endpoint de **health check** (necesario para el keep-alive):
  ```
  GET /health
  Response: { status: "ok", timestamp: "..." }
  ```

---

## 📱 MÓDULO 3 — App Android Multi-Negocio

> **Descripción**: Adaptar la aplicación Android para manejar el contexto de negocio del usuario logueado y los nuevos flujos de registro.

### Tareas

- [ ] **3.1** — Crear pantalla de **Registro de Negocio** (onboarding para nuevos usuarios):
  - Campos: nombre del negocio, nombre del administrador, email, contraseña
  - Llama al endpoint `POST /auth/registro-negocio`

- [ ] **3.2** — Actualizar el **modelo de sesión** local para guardar `negocio_id`, `rol` y `nombre_negocio` del usuario autenticado (SharedPreferences / DataStore).

- [ ] **3.3** — Actualizar el **header de la app** para mostrar el nombre del negocio activo.

- [ ] **3.4** — Crear pantalla de **Configuración del Negocio** (accesible solo para el rol `admin`):
  - Editar nombre, teléfono, dirección, logo, moneda, impuesto.

- [ ] **3.5** — Implementar control de acceso por **roles** en la UI:
  - Rol `admin`: acceso completo
  - Rol `empleado`: sin acceso a configuración, reportes ni gestión de usuarios

- [ ] **3.6** — Crear pantalla de **Gestión de Empleados** (solo admin):
  - Listar empleados del negocio
  - Invitar nuevo empleado (envío de email o código)
  - Desactivar empleado

- [ ] **3.7** — Actualizar **todos los ViewModels** para enviar el `negocio_id` en las llamadas a la API (o confirmar que ya viene en el JWT y el backend lo maneja automáticamente).

- [ ] **3.8** — Actualizar la pantalla de **Login** para mostrar a qué negocio pertenece el usuario tras autenticarse.

- [ ] **3.9** — Realizar pruebas completas del flujo:
  - Registro de nuevo negocio ✅
  - Login de admin ✅
  - Login de empleado ✅
  - Aislamiento de datos entre negocios ✅

---

## 🔧 MÓDULO 4 — Infraestructura Gratuita (Keep-Alive)

> **Descripción**: Configurar tareas automáticas en cron-job.org para evitar que Render duerma el servidor y Supabase pause la base de datos.

### Tareas

- [ ] **4.1** — Registrarse en [cron-job.org](https://cron-job.org) (gratis).

- [ ] **4.2** — Crear cron job para **Render (backend keep-alive)**:
  - URL: `https://TU-APP.onrender.com/health`
  - Método: GET
  - Intervalo: **cada 10 minutos**
  - Descripción: "SmartPOS - Backend Keep Alive"

- [ ] **4.3** — Crear cron job para **Supabase (DB keep-alive)**:
  - Agregar un endpoint liviano en tu backend: `GET /health/db` que ejecute una query simple.
  - URL: `https://TU-APP.onrender.com/health/db`
  - Método: GET
  - Intervalo: **cada 2 días** (la pausa ocurre a los 7 días)
  - Descripción: "SmartPOS - Supabase Keep Alive"

- [ ] **4.4** — Verificar que ambos cron jobs responden con código HTTP 200 en el historial de cron-job.org.

- [ ] **4.5** — Documentar las URLs de keep-alive en el archivo `.env.example` del repositorio para referencia futura.

---

## 🔐 MÓDULO 5 — Seguridad y Validaciones

> **Descripción**: Garantizar que los datos estén correctamente aislados y que no haya vulnerabilidades antes de publicar.

### Tareas

- [ ] **5.1** — Verificar que **ningún endpoint** retorne datos de otros negocios (pruebas con 2 negocios distintos en paralelo).

- [ ] **5.2** — Asegurarse de que el `negocio_id` provenga **siempre del JWT** y nunca del body del request (para evitar inyección de negocio_id).

- [ ] **5.3** — Configurar **CORS** correctamente en NestJS para permitir solo requests desde la app.

- [ ] **5.4** — Revisar que las variables de entorno sensibles (`DATABASE_URL`, `JWT_SECRET`, etc.) **no estén en el repositorio** (verificar `.gitignore`).

- [ ] **5.5** — Activar **HTTPS** (Render lo provee automáticamente — verificar que la app Android use `https://` y no `http://`).

- [ ] **5.6** — Implementar **rate limiting** básico en NestJS para evitar abuso:
  ```bash
  npm install @nestjs/throttler
  ```

---

## 🏪 MÓDULO 6 — Publicación en Google Play Store

> **Descripción**: Todos los pasos necesarios para publicar SmartPOS en Google Play Store como app gratuita.

### Tareas

- [ ] **6.1** — Crear cuenta en [Google Play Console](https://play.google.com/console) y pagar los **$25 USD** de registro único.

- [ ] **6.2** — Generar el **Keystore** de firma de la app:
  ```bash
  keytool -genkey -v -keystore smartpos-release.jks \
    -alias smartpos -keyalg RSA -keysize 2048 -validity 10000
  ```
  > ⚠️ **CRÍTICO**: Guardar el archivo `.jks` y la contraseña en un lugar seguro. Si se pierde, no se podrá actualizar la app nunca más.

- [ ] **6.3** — Configurar la firma en `app/build.gradle`:
  ```gradle
  signingConfigs {
    release {
      storeFile file("smartpos-release.jks")
      storePassword "TU_PASSWORD"
      keyAlias "smartpos"
      keyPassword "TU_KEY_PASSWORD"
    }
  }
  ```

- [ ] **6.4** — Generar el **Android App Bundle (AAB)**:
  - Android Studio → Build → Generate Signed Bundle/APK → Android App Bundle

- [ ] **6.5** — Crear la **Política de Privacidad** y hospedarla online:
  - Generar en: [privacypolicygenerator.info](https://www.privacypolicygenerator.info)
  - Hospedar en: GitHub Pages (gratis) o Any free hosting

- [ ] **6.6** — Preparar los **assets gráficos** para la tienda:
  - [ ] Ícono de la app: 512x512 px (PNG)
  - [ ] Banner destacado: 1024x500 px
  - [ ] Capturas de pantalla: mínimo 2, máximo 8 (varios tamaños de pantalla)

- [ ] **6.7** — Completar el **perfil de la tienda** en Play Console:
  - Nombre de la app
  - Descripción corta (80 caracteres)
  - Descripción completa (4000 caracteres)
  - Categoría: Negocios / Productividad
  - Email de contacto

- [ ] **6.8** — Completar todos los **cuestionarios de contenido** (clasificación de contenido, declaraciones de privacidad de datos).

- [ ] **6.9** — Subir el AAB a **Pruebas Internas** primero y probarlo con al menos 2 dispositivos reales.

- [ ] **6.10** — Pasar a producción y publicar la app en **acceso abierto gratuito**.

---

## ✅ Checklist Final — Pre-Lanzamiento

Antes de publicar, confirma que todo esto esté listo:

- [ ] La app funciona correctamente con múltiples negocios aislados
- [ ] El backend está desplegado y respondiendo en Render
- [ ] Los cron jobs de keep-alive están activos en cron-job.org
- [ ] La base de datos en Supabase está activa y con datos de prueba limpios
- [ ] La app usa HTTPS en todas las llamadas a la API
- [ ] El Keystore está guardado en un lugar seguro (2+ copias)
- [ ] La Política de Privacidad está publicada y enlazada en Play Console
- [ ] El AAB fue probado en al menos 2 dispositivos físicos
- [ ] La app está clasificada como **Gratuita** en Play Console

---

## 📅 Cronograma Sugerido

| Semana | Módulo | Horas estimadas |
|--------|--------|----------------|
| Semana 1 | Módulo 1: Base de Datos | 8-10 hrs |
| Semana 2 | Módulo 2: Backend API | 10-12 hrs |
| Semana 3 | Módulo 3: App Android | 10-15 hrs |
| Semana 4 | Módulo 4 + 5: Infra + Seguridad | 4-6 hrs |
| Semana 5 | Módulo 6: Play Store | 4-6 hrs |
| **Total** | | **~36-49 hrs** |

---

*Documento generado el 28/02/2026 — SmartPOS Fase 1*
