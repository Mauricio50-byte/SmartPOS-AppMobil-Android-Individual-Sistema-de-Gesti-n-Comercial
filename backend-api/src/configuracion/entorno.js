const PUERTO = process.env.PUERTO
const JWT_SECRETO = process.env.JWT_SECRETO
const DATABASE_URL = process.env.DATABASE_URL
const ADMIN_CORREO = process.env.ADMIN_CORREO
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validación básica para asegurar que las variables críticas existan
const requiredEnv = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRETO'
];

const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
  console.error(`Faltan las siguientes variables de entorno requeridas: ${missingEnv.join(', ')}`);
  // No lanzamos error aquí para permitir que el usuario las configure, pero es buena práctica avisar
}

module.exports = { 
  PUERTO, 
  JWT_SECRETO, 
  DATABASE_URL,
  ADMIN_CORREO, 
  ADMIN_PASSWORD,
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY
}
