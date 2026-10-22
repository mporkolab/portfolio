/** Futásidejű környezeti változó (élesben a konténeré, fejlesztésben a .env). */
export function env(name: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[name] || process.env[name];
}
