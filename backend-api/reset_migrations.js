const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script para reiniciar las migraciones de Prisma
 * 1. Borra la carpeta prisma/migrations
 * 2. Ejecuta migrate reset
 * 3. Ejecuta migrate dev
 */

const projectRoot = __dirname;
const migrationsDir = path.join(projectRoot, 'prisma', 'migrations');
const prismaBin = path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js');

function runCommand(command) {
    console.log(`Ejecutando: ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: projectRoot });
    } catch (error) {
        console.error(`Error al ejecutar comando: ${command}`);
        process.exit(1);
    }
}

async function resetMigrations() {
    console.log('--- Iniciando Reinicio de Migraciones ---');

    // 1. Borrar carpeta de migraciones
    if (fs.existsSync(migrationsDir)) {
        console.log(`Borrando carpeta de migraciones: ${migrationsDir}`);
        fs.rmSync(migrationsDir, { recursive: true, force: true });
        console.log('Carpeta borrada.');
    } else {
        console.log('No existe carpeta de migraciones para borrar.');
    }

    // 2. Ejecutar migrate reset
    const resetCmd = `node "${prismaBin}" migrate reset --force`;
    runCommand(resetCmd);

    // 3. Ejecutar migrate dev
    const devCmd = `node "${prismaBin}" migrate dev --name init`;
    runCommand(devCmd);

    // 4. Ejecutar Seeds
    console.log('--- Iniciando Poblamiento de Datos (Seeds) ---');

    const seedUsuariosCmd = `node seed_usuarios.js`;
    runCommand(seedUsuariosCmd);

    const seedDbCmd = `node seed_db.js`;
    runCommand(seedDbCmd);

    const seedClientesCmd = `node seed_clientes.js`;
    runCommand(seedClientesCmd);

    const seedGastosCmd = `node seed_gastos.js`;
    runCommand(seedGastosCmd);

    console.log('✅ Proceso de migración y seeding completado con éxito.');
}

resetMigrations();
