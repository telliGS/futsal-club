// Diagnóstico RLS: tablas del schema public, RLS habilitado? y grants a anon/authenticated.
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  const tablas = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS tabla,
           c.relrowsecurity AS rls_activo,
           c.relforcerowsecurity AS rls_forzado
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `) as Array<{ tabla: string; rls_activo: boolean; rls_forzado: boolean }>;

  console.log("=== TABLAS EN public ===");
  for (const t of tablas) {
    console.log(`  ${t.tabla.padEnd(20)} RLS: ${t.rls_activo ? "ACTIVO" : "NO"}${t.rls_forzado ? " (forzado)" : ""}`);
  }

  // grants a anon/authenticated sobre tablas public
  const grants = await prisma.$queryRawUnsafe(`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
    ORDER BY table_name, grantee, privilege_type;
  `) as Array<{ grantee: string; table_name: string; privilege_type: string }>;
  console.log(`\n=== GRANTS a anon/authenticated (${grants.length}) ===`);
  const porTabla = new Map<string, string[]>();
  for (const g of grants) {
    if (!porTabla.has(g.table_name)) porTabla.set(g.table_name, []);
    porTabla.get(g.table_name)!.push(`${g.grantee}:${g.privilege_type}`);
  }
  for (const [t, ps] of porTabla) console.log(`  ${t.padEnd(20)} ${ps.join(", ")}`);
  if (grants.length === 0) console.log("  (sin grants — solo se puede acceder por rol service/postgres)");

  // policies existentes
  const policies = await prisma.$queryRawUnsafe(`
    SELECT tablename, policyname, cmd
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
  `) as Array<{ tablename: string; policyname: string; cmd: string }>;
  console.log(`\n=== POLICIES EXISTENTES (${policies.length}) ===`);
  for (const p of policies) console.log(`  ${p.tablename}.${p.policyname} [${p.cmd}]`);
  if (policies.length === 0) console.log("  (ninguna)");
}

main().catch((e) => { console.error(e); process.exit(1); });