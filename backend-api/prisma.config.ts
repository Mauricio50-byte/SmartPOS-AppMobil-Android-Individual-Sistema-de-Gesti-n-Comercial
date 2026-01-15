import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { 
    // Para migraciones y CLI se usa la conexión directa (puerto 5432)
    url: process.env.DIRECT_URL 
  }
})
