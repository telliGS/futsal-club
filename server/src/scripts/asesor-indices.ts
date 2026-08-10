// Asesor de índices: índices existentes, FKs sin índice, y uso real (pg_stat).
import "dotenv/config";
import { prisma } from "../config.js";

async function main() {
  // 1) Índices existentes por tabla (uso pg_index + pg_class, correcto)
  const idx = await prisma.$queryRawUnsafe(`
    SELECT t.relname AS tabla, i.relname AS indice,
           pg_get_indexdef(x.indexrelid) AS definicion
    FROM pg_class t
    JOIN pg_index x ON t.oid = x.indrelid
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relkind = 'r'
    ORDER BY t.relname, i.relname;
  `) as Array<{ tabla: string; indice: string; definicion: string }>;

  console.log("=== ÍNDICES EXISTENTES ===");
  for (const i of idx) console.log(`  [${i.tabla}] ${i.definicion}`);

  // 2) FK sin índice (sin mejorar: Postgres no indexa FKs automáticamente)
  const fkSinIdx = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name AS tabla, kcu.column_name AS columna, ccu.table_name AS ref_tabla
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `) as Array<{ tabla: string; columna: string; ref_tabla: string }>;

  const idxCols = new Set(idx.map((i) => i.definicion.match(/CREATE INDEX[\s\S]*?ON public\."(\w+)" USING btree \(([^)]+)\)/i)?.slice(1, 3).join(".")));
  console.log("\n=== FK EXISTENTES ===");
  for (const f of fkSinIdx) {
    const tiene = [...idxCols].some((c) => c && c.startsWith(`${f.tabla}.`) && c.includes(f.columna));
    console.log(`  ${f.tabla}.${f.columna} → ${f.ref_tabla}${tiene ? " (indexada ✓)" : " (SIN ÍNDICE ⚠)"}`);
  }

  // 3) Uso real: lecturas vs scans
  const uso = await prisma.$queryRawUnsafe(`
    SELECT relname AS tabla,
           seq_scan, idx_scan,
           n_live_tup AS filas
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC;
  `) as Array<{ tabla: string; seq_scan: number; idx_scan: number; filas: number }>;
  console.log("\n=== USO REAL (pg_stat) ===");
  for (const u of uso) {
    console.log(`  ${u.tabla.padEnd(18)} filas=${String(u.filas).padEnd(6)} seq_scan=${String(u.seq_scan).padEnd(7)} idx_scan=${String(u.idx_scan)}`);
  }

  // 4) Índices sin uso (candidatos a borrar)
  const inusados = await prisma.$queryRawUnsafe(`
    SELECT schemaname, relname AS tabla, indexrelname AS indice,
           idx_scan, idx_tup_read, idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' AND idx_scan = 0
    ORDER BY relname;
  `) as Array<{ tabla: string; indice: string; idx_scan: number }>;
  console.log("\n=== ÍNDICES CON 0 SCANS (posiblemente innecesarios) ===");
  for (const i of inusados) console.log(`  ${i.tabla}.${i.indice} — nunca usado`);
  if (inusados.length === 0) console.log("  (ninguno)");
}

main().catch((e) => { console.error(e); process.exit(1); });