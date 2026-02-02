const { prisma } = require('../../infraestructura/bd')
const { obtenerPlugin } = require('./producto.factory')

const baseInclude = {
  detalleRopa: true,
  detalleAlimento: true,
  detalleServicio: true,
  detalleFarmacia: true,
  detallePapeleria: true,
  detalleRestaurante: true,
  categoriaRel: true
}

async function listarProductos() {
  return prisma.producto.findMany({
    orderBy: { id: 'asc' },
    include: baseInclude
  })
}

async function obtenerProductoPorId(id) {
  return prisma.producto.findUnique({
    where: { id },
    include: baseInclude
  })
}

async function crearProducto(datos) {
  const {
    nombre, sku, descripcion, imagen, categoria, subcategoria, marca,
    precioCosto, precioVenta, descuento, stock, stockMinimo, unidadMedida,
    categoriaId, // Nuevo campo
    margenGanancia, proveedor, activo, tipo,
    ...restoDatos // Datos específicos del plugin
  } = datos

  let categoriaTexto = categoria
  let catId = categoriaId ? Number(categoriaId) : null

  // Si envían ID, aseguramos consistencia con el texto
  if (catId) {
    const catDb = await prisma.categoria.findUnique({ where: { id: catId } })
    if (catDb) {
      categoriaTexto = catDb.nombre
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Crear el producto base
    const producto = await tx.producto.create({
      data: {
        nombre,
        sku,
        descripcion,
        imagen,
        categoria: categoriaTexto,
        categoriaId: catId,
        subcategoria,
        marca,
        precioCosto,
        precioVenta,
        descuento,
        stock,
        stockMinimo,
        unidadMedida,
        margenGanancia,
        proveedor,
        activo: activo !== undefined ? activo : true,
        tipo: tipo || 'GENERAL'
      }
    })

    // 2. Delegar a la estrategia específica si existe
    const plugin = obtenerPlugin(tipo)
    if (plugin) {
      await plugin.crearDetalle(tx, producto.id, restoDatos)
    }

    // 3. Retornar el producto completo
    return tx.producto.findUnique({
      where: { id: producto.id },
      include: baseInclude
    })
  })
}

async function actualizarProducto(id, datos) {
  const {
    nombre, sku, descripcion, imagen, categoria, subcategoria, marca,
    precioCosto, precioVenta, descuento, stock, stockMinimo, unidadMedida,
    categoriaId,
    margenGanancia, proveedor, activo, tipo,
    ...restoDatos
  } = datos

  let categoriaTexto = categoria
  let catId = categoriaId !== undefined ? Number(categoriaId) : undefined

  // Si se envía un ID explícito (aunque sea null)
  if (catId) {
    const catDb = await prisma.categoria.findUnique({ where: { id: catId } })
    if (catDb) {
      categoriaTexto = catDb.nombre
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Actualizar datos base
    const producto = await tx.producto.update({
      where: { id },
      data: {
        nombre,
        sku,
        descripcion,
        imagen,
        categoria: categoriaTexto,
        categoriaId: catId,
        subcategoria,
        marca,
        precioCosto,
        precioVenta,
        descuento,
        stock,
        stockMinimo,
        unidadMedida,
        margenGanancia,
        proveedor,
        activo,
        // No permitimos cambiar el tipo fácilmente por ahora, pero si se requiere:
        // tipo
      }
    })

    // 2. Actualizar detalles específicos
    // Usamos el tipo del producto actual o el nuevo si se envió
    const tipoProducto = tipo || producto.tipo
    const plugin = obtenerPlugin(tipoProducto)

    if (plugin) {
      await plugin.actualizarDetalle(tx, producto.id, restoDatos)
    }

    return tx.producto.findUnique({
      where: { id: producto.id },
      include: baseInclude
    })
  })
}

async function eliminarProducto(id) {
  // El borrado en cascada de la BD debería encargarse de los detalles
  // Pero si no, deberíamos borrar manualmente.
  // Con @relation(onDelete: Cascade) en Prisma schema, es automático.
  return prisma.producto.delete({ where: { id } })
}

async function generarSiguienteSku(categoria) {
  if (!categoria || categoria.length < 3) return null

  // 1. Generar prefijo (3 letras mayúsculas)
  const prefijo = categoria.substring(0, 3).toUpperCase()

  // 2. Buscar último SKU con ese prefijo
  // Buscamos productos que contengan el guión para evitar falsos positivos
  const productos = await prisma.producto.findMany({
    where: {
      sku: {
        startsWith: `${prefijo}-`
      }
    },
    select: { sku: true },
    orderBy: { sku: 'desc' }, // Esto puede no ser perfecto si los números tienen distinta longitud, pero con 001 funciona bien
    take: 1
  })

  let secuencia = 1
  if (productos.length > 0 && productos[0].sku) {
    const parts = productos[0].sku.split('-')
    if (parts.length === 2) {
      const currentSeq = parseInt(parts[1], 10)
      if (!isNaN(currentSeq)) {
        secuencia = currentSeq + 1
      }
    }
  }

  // 3. Formatear con padding de 3 ceros
  const secuenciaStr = secuencia.toString().padStart(3, '0')
  return `${prefijo}-${secuenciaStr}`
}

module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  generarSiguienteSku
}
