import { defineConfig } from 'drizzle-kit';

// Csak a migrációk generálásához kell (`npm run db:generate`); futásidőben az
// alkalmazás maga futtatja le őket (src/lib/db/index.ts).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
});
