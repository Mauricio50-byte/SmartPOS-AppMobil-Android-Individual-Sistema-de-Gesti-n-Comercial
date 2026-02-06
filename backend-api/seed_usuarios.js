const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { asegurarPermisosYAdmin } = require('./src/infraestructura/bootstrap');
const { prisma } = require('./src/infraestructura/bd');
const { Pool } = require('pg');

async function seedUsuarios() {
    console.log('--- Iniciando Bootstrap de Usuarios, Roles y Permisos ---');
    try {
        await asegurarPermisosYAdmin();
        console.log('✅ Bootstrap completado exitosamente.');
    } catch (error) {
        console.error('❌ Error durante el bootstrap:', error);
    } finally {
        await prisma.$disconnect();
        // No cerramos pool aquí porque bootstrap usa el prisma de bd.js que comparte el pool
    }
}

seedUsuarios();
