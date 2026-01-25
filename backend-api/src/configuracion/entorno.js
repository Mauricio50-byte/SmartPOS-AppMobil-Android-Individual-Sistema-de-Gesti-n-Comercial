const getEnv = (name, defaultValue = undefined) => {
  const value = process.env[name];
  if (!value) return defaultValue;
  // Eliminar comillas dobles o simples al inicio y final si existen
  return value.replace(/^["']|["']$/g, '');
}

const PUERTO = getEnv('PUERTO', getEnv('PORT', 3000))
const JWT_SECRETO = getEnv('JWT_SECRETO')
const DATABASE_URL = getEnv('DATABASE_URL')
const ADMIN_CORREO = getEnv('ADMIN_CORREO')
const ADMIN_PASSWORD = getEnv('ADMIN_PASSWORD')
const SUPABASE_URL = getEnv('SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_KEY')
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')

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
