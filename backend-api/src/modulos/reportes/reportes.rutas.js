const reportesControlador = require('./reportes.controlador');

async function registrarRutasReportes(app) {
    // Aseguramos que solo usuarios con permiso de reportes o admin puedan acceder
    // Si no existe el permiso 'REPORTES_VER', usamos 'VENTAS_VER' o similar por ahora, 
    // pero lo ideal es tener 'REPORTES'
    app.get('/reportes/general', {
        preHandler: [app.requierePermiso('VER_REPORTES')]
    }, reportesControlador.obtenerReporteGeneral);
}

module.exports = { registrarRutasReportes }
