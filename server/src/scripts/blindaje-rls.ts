// Blindaje RLS: idempotente. 1) diagnostica, 2) ENABLE RLS en tablas public,
// 3) REVOKE ALL a anon/authenticated (tablas + sequences), 4) re-diagnostica.
// Uso: npx tsx src/scripts/blindaje-rls.ts
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  // ---------- 1) diagnóstico ----------
  const tablas = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `) as Array<{ tabla: string; rls_activo: boolean }>;

  console.log("=== ANTES ===");
  for (const t of tablas) console.log(`  ${t.tabla.padEnd(20)} RLS: ${t.rls_activo ? "ACTIVO" : "NO"}`);

  // ---------- 2) ENABLE RLS en todas las tablas public (default deny) ----------
  for (const t of tablas) {
    if (!t.rls_activo) {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${t.tabla}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  → RLS activado en ${t.tabla}`);
    }
  }

  // ---------- 3) REVOKE ALL a anon/authenticated (tablas + sequences) ----------
  await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`);
  await prisma.$executeRawUnsafe(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;`);
  console.log("  → Grants revocados a anon/authenticated (tablas + sequences)");

  // ---------- 4) verificación ----------
  const despues = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `) as Array<{ tabla: string; rls_activo: boolean }>;

  const grants = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS n FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
  `) as Array<{ n: number }>;

  console.log("\n=== DESPUÉS ===");
  const todosActivos = despues.every((t) => t.rls_activo);
  for (const t of despues) console.log(`  ${t.tabla.padEnd(20)} RLS: ${t.rls_activo ? "ACTIVO ✅" : "NO ❌"}`);
  console.log(`\nGrants restantes a anon/authenticated: ${grants[0].n}`);
  console.log(todosActivos && grants[0].n === 0 ? "\n✅ BLINDAJE COMPLETO (default deny total)" : "\n⚠️ FALTA algo (revisar arriba)");
}

main().catch((e) => { console.error(e); process.exit(1); });