import { Component, OnInit } from '@angular/core';

interface ManualStep {
  image: string;
  title: string;
  description: string;
}

interface ManualSection {
  id: string;
  title: string;
  icon: string;
  folder: string;
  description: string;
  longDescription?: string;
  steps: ManualStep[];
}

@Component({
  selector: 'app-manual-usuario',
  templateUrl: './manual-usuario.component.html',
  styleUrls: ['./manual-usuario.component.scss'],
  standalone: false
})
export class ManualUsuarioComponent implements OnInit {

  searchText: string = '';

  sections: ManualSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'home-outline',
      folder: 'Modulo Dasbohard',
      description: 'El Dashboard es su centro de comando integral.',
      longDescription: 'Utilice el Dashboard para monitorear la salud financiera de su negocio en tiempo real. Esta pantalla le permite identificar rápidamente cuáles son sus productos más populares, qué horas del día tiene más ventas y cómo se distribuyen los métodos de pago. Es la herramienta ideal para la toma de decisiones estratégicas diarias.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Dasbohard/Captura de pantalla 2026-02-02 111458.png',
          title: 'Vista General',
          description: 'Pantalla principal del Dashboard mostrando tarjetas de resumen con indicadores clave de rendimiento (KPIs) del día.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Dasbohard/Captura de pantalla 2026-02-02 111520.png',
          title: 'Gráficos de Ventas',
          description: 'Visualización gráfica del comportamiento de las ventas, permitiendo identificar picos de actividad y tendencias.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Dasbohard/Captura de pantalla 2026-02-02 111613.png',
          title: 'Ventas por Categoría',
          description: 'Desglose circular que muestra qué categorías de productos están generando más ingresos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Dasbohard/Captura de pantalla 2026-02-02 111556.png',
          title: 'Accesos Directos',
          description: 'Botones de acción rápida para navegar a las funciones más utilizadas sin necesidad de usar el menú lateral.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Dasbohard/Captura de pantalla 2026-02-02 111537.png',
          title: 'Notificaciones y Alertas',
          description: 'Panel de avisos sobre stock bajo o actualizaciones importantes del sistema.'
        }
      ]
    },
    {
      id: 'ventas',
      title: 'Punto de Venta (POS)',
      icon: 'cart-outline',
      folder: 'Modulo Ventas',
      description: 'Gestione sus transacciones de forma rápida y sencilla.',
      longDescription: 'El Módulo de Punto de Venta (POS) está diseñado para minimizar el tiempo de atención al cliente. Puede buscar productos por nombre, categoría o usando un lector de códigos de barras. El sistema gestiona automáticamente el inventario cada vez que se completa una venta, asegurando que sus existencias estén siempre actualizadas.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121314.png',
          title: 'Panel de Productos',
          description: 'Interfaz principal de ventas. Aquí visualizará todo su catálogo de productos disponible para la venta inmediata.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121336.png',
          title: 'Selección de Categorías',
          description: 'Filtre sus productos usando la barra de categorías superior para encontrar artículos rápidamente.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121410.png',
          title: 'Búsqueda de Productos',
          description: 'Utilice la barra de búsqueda o el escáner para localizar productos específicos por nombre o código.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121420.png',
          title: 'Agregando al Carrito',
          description: 'Al tocar un producto, este se añade automáticamente al carrito de compras en el panel derecho.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121514.png',
          title: 'Gestión del Carrito',
          description: 'Vista detallada del carrito donde puede aumentar o disminuir cantidades de los ítems seleccionados.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121544.png',
          title: 'Opciones de Item',
          description: 'Opciones adicionales para cada item del carrito, como aplicar descuentos unitarios o eliminar del pedido.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121612.png',
          title: 'Asignación de Cliente',
          description: 'Opción para vincular la venta actual a un cliente registrado, útil para fidelización o facturación.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121631.png',
          title: 'Buscador de Clientes',
          description: 'Ventana emergente para buscar y seleccionar el cliente deseado de su base de datos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121717.png',
          title: 'Datos del Cliente',
          description: 'Confirmación de los datos del cliente seleccionado antes de proceder al pago.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121734.png',
          title: 'Procesar Pago',
          description: 'Pantalla de cobro. Se muestra el total a pagar y las opciones de pago disponibles.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121752.png',
          title: 'Selección de Método de Pago',
          description: 'Seleccione si el pago es en Efectivo, Tarjeta, Transferencia u otro método configurado.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121810.png',
          title: 'Pago en Efectivo',
          description: 'Si selecciona efectivo, ingrese el monto recibido. El sistema calculará automáticamente el cambio a devolver.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121836.png',
          title: 'Confirmación de Venta',
          description: 'Resumen final de la transacción antes de emitir el comprobante.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Ventas/Captura de pantalla 2026-02-02 121930.png',
          title: 'Venta Exitosa',
          description: 'Pantalla de éxito indicando que la venta se ha registrado correctamente y el comprobante ha sido generado.'
        }
      ]
    },
    {
      id: 'historial-ventas',
      title: 'Historial de Ventas',
      icon: 'time-outline',
      folder: 'Modulo Historial de Ventas',
      description: 'Consulte transacciones pasadas, re-imprima tickets y verifique detalles de ventas anteriores.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Historial de Ventas/Captura de pantalla 2026-02-02 122141.png',
          title: 'Lista de Transacciones',
          description: 'Visualice el listado cronológico de todas las ventas realizadas. Puede filtrar por fecha o buscar por número de ticket.'
        }
      ]
    },
    {
      id: 'productos',
      title: 'Productos e Inventario',
      icon: 'pricetags-outline',
      folder: 'Modulo Productos e Inventario',
      description: 'Gestión completa del catálogo. Agregue nuevos productos, edite precios y organice su inventario.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112040.png',
          title: 'Inventario General',
          description: 'Lista maestra de todos los productos en el sistema con sus existencias y precios actuales.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112256.png',
          title: 'Detalles del Producto',
          description: 'Vista detallada de la información de un producto seleccionado.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112437.png',
          title: 'Agregar Nuevo Producto',
          description: 'Inicio del asistente para crear un nuevo producto en el catálogo.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112558.png',
          title: 'Formulario de Datos Básicos',
          description: 'Ingrese nombre, código de barras, categoría y precio del nuevo producto.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112639.png',
          title: 'Configuración de Stock',
          description: 'Defina el stock inicial y los niveles mínimos de alerta para reabastecimiento.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112702.png',
          title: 'Atributos Específicos',
          description: 'Según el tipo de negocio, configure tallas, colores o fechas de vencimiento.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112835.png',
          title: 'Guardar Producto',
          description: 'Finalice la creación guardando el nuevo ítem en la base de datos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112851.png',
          title: 'Gestión de Categorías',
          description: 'Acceso al módulo de administración de categorías para organizar sus productos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 112943.png',
          title: 'Crear Categoría',
          description: 'Añada una nueva categoría asignándole un nombre y un color identificativo.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 113000.png',
          title: 'Edición de Categoría',
          description: 'Modifique o elimine categorías existentes según sus necesidades.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Productos e Inventario/Captura de pantalla 2026-02-02 113022.png',
          title: 'Vista Filtrada',
          description: 'Ejemplo de cómo se ven los productos filtrados por una categoría específica.'
        }
      ]
    },
    {
      id: 'movimientos',
      title: 'Movimientos de Inventario',
      icon: 'swap-vertical-outline',
      folder: 'Modulo Movimientos de Inventario',
      description: 'Auditoría y control de stock. Registre entradas, salidas y ajustes manuales de mercancía.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113214.png',
          title: 'Panel de Movimientos',
          description: 'Historial completo de todas las operaciones que han afectado el inventario.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113228.png',
          title: 'Nuevo Movimiento',
          description: 'Seleccione el tipo de movimiento a realizar: Entrada, Salida o Ajuste.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113324.png',
          title: 'Selección de Producto',
          description: 'Busque el producto al cual desea aplicar el ajuste de stock.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113446.png',
          title: 'Detalle del Ajuste',
          description: 'Ingrese la cantidad a ajustar y una nota explicativa sobre la razón del movimiento.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113514.png',
          title: 'Confirmación',
          description: 'Revise los datos antes de aplicar el cambio en el inventario.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113635.png',
          title: 'Movimiento Registrado',
          description: 'Confirmación de éxito. El stock ha sido actualizado en tiempo real.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113701.png',
          title: 'Kardex de Producto',
          description: 'Vista individual del historial de movimientos de un solo producto.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113840.png',
          title: 'Reporte de Bajos Stock',
          description: 'Alerta visual de productos que están por debajo del nivel mínimo establecido.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113902.png',
          title: 'Filtros de Búsqueda',
          description: 'Herramientas para filtrar el historial de movimientos por fecha o tipo.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 113917.png',
          title: 'Exportar Datos',
          description: 'Opciones para exportar los reportes de inventario a formatos externos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Movimientos de Inventario/Captura de pantalla 2026-02-02 114332.png',
          title: 'Resumen de Valoración',
          description: 'Visualización del valor total del inventario actual en términos monetarios.'
        }
      ]
    },
    {
      id: 'clientes',
      title: 'Gestión de Clientes',
      icon: 'people-outline',
      folder: 'Modulo de Clientes',
      description: 'Administre su base de clientes. Mantenga un registro de contactos y controle cuentas corrientes o créditos.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122243.png',
          title: 'Directorio de Clientes',
          description: 'Lista alfabética de todos los clientes registrados en su negocio.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122254.png',
          title: 'Perfil de Cliente',
          description: 'Vista detallada con información de contacto y saldo actual del cliente.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122333.png',
          title: 'Nuevo Cliente',
          description: 'Formulario para dar de alta a un nuevo cliente en el sistema.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122351.png',
          title: 'Datos de Facturación',
          description: 'Registro de RUC/DNI y dirección para facturación electrónica.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122448.png',
          title: 'Límite de Crédito',
          description: 'Configuración del límite de crédito permitido para fiar a este cliente.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122612.png',
          title: 'Historial de Compras',
          description: 'Registro de todas las compras realizadas por este cliente específico.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122640.png',
          title: 'Estado de Cuenta',
          description: 'Resumen de deudas pendientes y abonos realizados.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Clientes/Captura de pantalla 2026-02-02 122717.png',
          title: 'Edición de Datos',
          description: 'Actualización de información de contacto o preferencias del cliente.'
        }
      ]
    },
    {
      id: 'finanzas',
      title: 'Módulo Financiero',
      icon: 'wallet-outline',
      folder: 'Modulo Finanzas',
      description: 'Salud financiera de su negocio. Controle caja chica, cuentas por cobrar y por pagar.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125020.png',
          title: 'Resumen Financiero',
          description: 'Dashboard financiero con totales de ingresos, egresos y balances.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125038.png',
          title: 'Gestión de Caja',
          description: 'Control de apertura y cierre de caja, y registro de movimientos de efectivo.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125150.png',
          title: 'Cuentas por Cobrar',
          description: 'Listado de clientes con deudas pendientes. Gestión de cobranza.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125208.png',
          title: 'Registrar Abono',
          description: 'Proceso para registrar un pago parcial o total de una deuda de cliente.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125222.png',
          title: 'Cuentas por Pagar',
          description: 'Registro de compromisos financieros con proveedores o gastos fijos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125252.png',
          title: 'Control de Gastos',
          description: 'Registro detallado de salidas de dinero por concepto de gastos operativos.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Finanzas/Captura de pantalla 2026-02-02 125335.png',
          title: 'Historial de Transacciones',
          description: 'Bitácora completa de todos los movimientos financieros del periodo.'
        }
      ]
    },
    {
      id: 'reportes-general',
      title: 'Reportes y Estadísticas',
      icon: 'bar-chart-outline',
      folder: 'Modulo Reportes',
      description: 'Tome decisiones informadas. Analice el rendimiento de su negocio con reportes detallados.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes/Captura de pantalla 2026-02-02 125507.png',
          title: 'Reporte de Ventas',
          description: 'Gráficos y tablas comparativas de ventas por día, semana o mes.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes/Captura de pantalla 2026-02-02 125524.png',
          title: 'Productos Más Vendidos',
          description: 'Ranking de los artícuos con mayor rotación y margen de ganancia.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes/Captura de pantalla 2026-02-02 125544.png',
          title: 'Reporte de Utilidades',
          description: 'Análisis de rentabilidad. Costos vs. Precios de venta para calcular ganancias netas.'
        }
      ]
    },
    {
      id: 'reportes-contables',
      title: 'Contabilidad',
      icon: 'calculator-outline',
      folder: 'Modulo Reportes Contables',
      description: 'Documentación para contadores. Formatos exportables y cierres fiscales.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 125803.png',
          title: 'Centro de Reportes Contables',
          description: 'Acceso a informes especializados para la gestión contable y tributaria.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 125927.png',
          title: 'Libro Diario',
          description: 'Registro detallado de todas las transacciones diarias.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 125935.png',
          title: 'Balance General',
          description: 'Estado de situación financiera de la empresa al momento de la consulta.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 125942.png',
          title: 'Estado de Resultados',
          description: 'Informe de pérdidas y ganancias del periodo seleccionado.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 125952.png',
          title: 'Cierre de Periodo',
          description: 'Herramientas para realizar el cierre contable mensual o anual.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Reportes Contables/Captura de pantalla 2026-02-02 130000.png',
          title: 'Exportación a Excel',
          description: 'Descarga de datos en formato compatible con hojas de cálculo para análisis externo.'
        }
      ]
    },
    {
      id: 'usuarios',
      title: 'Usuarios y Seguridad',
      icon: 'shield-checkmark-outline',
      folder: 'Modulo Usuarios',
      description: 'Controle quién accede a su sistema. Gestione roles, claves y permisos de empleados.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Usuarios/Captura de pantalla 2026-02-02 124132.png',
          title: 'Gestión de Usuarios',
          description: 'Lista de usuarios con acceso al sistema y sus roles asignados (Admin, Cajero, etc.).'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Usuarios/Captura de pantalla 2026-02-02 124148.png',
          title: 'Crear Usuario',
          description: 'Formulario para invitar o crear credenciales para un nuevo empleado.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Usuarios/Captura de pantalla 2026-02-02 124316.png',
          title: 'Asignación de Roles',
          description: 'Defina qué áreas del sistema puede ver o modificar cada usuario.'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo Usuarios/Captura de pantalla 2026-02-02 124547.png',
          title: 'Registro de Actividad',
          description: 'Log de seguridad que muestra quién entró al sistema y qué acciones realizó.'
        }
      ]
    },
    {
      id: 'config-modulos',
      title: 'Configuraciones',
      icon: 'settings-outline',
      folder: 'Modulo de Modulos',
      description: 'Personalice el sistema. Active módulos opcionales y ajuste preferencias globales.',
      steps: [
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Modulos/Captura de pantalla 2026-02-02 124814.png',
          title: 'Selector de Módulos',
          description: 'Active características específicas para su rubro (Farmacia, Restaurante, Ropa, etc.).'
        },
        {
          image: 'assets/Imagenes - Manual de usuario/Modulo de Modulos/Captura de pantalla 2026-02-02 124828.png',
          title: 'Ajustes Generales',
          description: 'Configuración de moneda, impuestos, logo de la empresa y datos del ticket.'
        }
      ]
    }
  ];

  selectedImage: string | null = null;
  selectedTitle: string | null = null;
  isModalOpen = false;

  constructor() { }

  ngOnInit() { }

  get filteredSections() {
    if (!this.searchText) return this.sections;
    const search = this.searchText.toLowerCase();
    return this.sections.filter(s =>
      s.title.toLowerCase().includes(search) ||
      s.description.toLowerCase().includes(search) ||
      (s.longDescription && s.longDescription.toLowerCase().includes(search)) ||
      s.steps.some(step => step.title.toLowerCase().includes(search) || step.description.toLowerCase().includes(search))
    );
  }

  openImage(src: string, title: string) {
    this.selectedImage = src;
    this.selectedTitle = title;
    this.isModalOpen = true;
  }

}
