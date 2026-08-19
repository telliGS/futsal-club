// Arreglo de lints RLS de Supabase:
//  - 0003 (auth_rls_initplan): auth.uid() → (select auth.uid())
//  - 0006 (multiple_permissive_policies): consolidar admin+delegado en UNA policy
//    por (tabla, action, rol) usando OR. La semántica es idéntica: Postgres hace
//    OR entre policies permissive, así que admin y delegado juntas == admin OR delegado.
// Idempotente: DROP POLICY IF EXISTS + CREATE. Uso: npm run db:arreglo-rls
import "dotenv/config";
import { prisma } from "../config.js";

// ---------- Fragmentos comunes (con (select auth.uid()) para lint 0003) ----------
const ADMIN =
  `(EXISTS (SELECT 1 FROM "User" u WHERE u.id = ((select auth.uid()))::text AND u.role = 'ADMIN'))`;
const UID_NOT_NULL = `((select auth.uid()) IS NOT NULL)`;
const DELEGADO_TEAM = (teamIsNull = false) =>
  `(${UID_NOT_NULL} AND ${teamIsNull ? `"teamId" IS NOT NULL AND ` : ""}"teamId" IN (SELECT uta."teamId" FROM "UserTeamAccess" uta WHERE uta."userId" = ((select auth.uid()))::text))`;
const DELEGADO_PLAYER = (playerIsNull = false) =>
  `(${UID_NOT_NULL} AND ${playerIsNull ? `"playerId" IS NOT NULL AND ` : ""}"playerId" IN (SELECT pt."playerId" FROM "PlayerTeam" pt WHERE pt."teamId" IN (SELECT uta."teamId" FROM "UserTeamAccess" uta WHERE uta."userId" = ((select auth.uid()))::text)))`;
const DELEGADO_PLAYER_ID =
  `(${UID_NOT_NULL} AND id IN (SELECT pt."playerId" FROM "PlayerTeam" pt WHERE pt."teamId" IN (SELECT uta."teamId" FROM "UserTeamAccess" uta WHERE uta."userId" = ((select auth.uid()))::text)))`;
const DELEGADO_TEAM_ID =
  `(${UID_NOT_NULL} AND id IN (SELECT uta."teamId" FROM "UserTeamAccess" uta WHERE uta."userId" = ((select auth.uid()))::text))`;

// ---------- Definición de policies nuevas por tabla ----------
// Cada entrada: { tabla, drop: string[], policies: [{ name, cmd, using, check? }] }
const PLAN: Array<{
  tabla: string;
  drop: string[];
  policies: Array<{ name: string; cmd: string; using: string; check?: string }>;
}> = [
  // Grupo A: admin ALL + delegado por playerId (ambas ALL)
  {
    tabla: "AvisoGym",
    drop: ["admin_avisogym_all", "delegado_avisogym_player_access"],
    policies: [{ name: "avisogym_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_PLAYER(true)})` }],
  },
  {
    tabla: "AvisoSeguro",
    drop: ["admin_avisoseguro_all", "delegado_avisoseguro_player_access"],
    policies: [{ name: "avisoseguro_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_PLAYER(true)})` }],
  },
  {
    tabla: "GymPayment",
    drop: ["admin_gympayment_all", "delegado_gympayment_player_access"],
    policies: [{ name: "gympayment_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_PLAYER(false)})` }],
  },
  {
    tabla: "JugadorDocumento",
    drop: ["admin_jd_all", "delegado_jd_player_access"],
    policies: [{ name: "jd_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_PLAYER(false)})` }],
  },
  {
    tabla: "Payment",
    drop: ["admin_payment_all", "delegado_payment_player_access"],
    policies: [{ name: "payment_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_PLAYER(false)})` }],
  },

  // Grupo B: admin ALL + delegado por teamId (ambas ALL)
  {
    tabla: "GastoExtra",
    drop: ["admin_gastoextra_all", "delegado_gastoextra_team_access"],
    policies: [{ name: "gastoextra_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(false)})` }],
  },
  {
    tabla: "GastoFijo",
    drop: ["admin_gastofijo_all", "delegado_gastofijo_team_access"],
    policies: [{ name: "gastofijo_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(false)})` }],
  },
  {
    tabla: "Match",
    drop: ["admin_match_all", "delegado_match_team_access"],
    policies: [{ name: "match_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(false)})` }],
  },
  {
    tabla: "PlayerTeam",
    drop: ["admin_playteam_all", "delegado_playteam_membership"],
    policies: [{ name: "playteam_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(false)})` }],
  },
  {
    tabla: "PoliException",
    drop: ["admin_poliexception_all", "delegado_poliexception_team_access"],
    policies: [{ name: "poliexception_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(true)})` }],
  },
  {
    tabla: "PoliSlot",
    drop: ["admin_polislot_all", "delegado_polislot_team_access"],
    policies: [{ name: "polislot_access", cmd: "ALL", using: `(${ADMIN} OR ${DELEGADO_TEAM(true)})` }],
  },

  // Grupo C: acciones distintas (Player y Team)
  {
    tabla: "Player",
    drop: ["admin_player_all", "delegado_player_team_access", "delegado_player_write"],
    policies: [
      { name: "player_select", cmd: "SELECT", using: `(${ADMIN} OR ${DELEGADO_PLAYER_ID})` },
      { name: "player_insert", cmd: "INSERT", using: ADMIN, check: ADMIN },
      { name: "player_update", cmd: "UPDATE", using: `(${ADMIN} OR ${DELEGADO_PLAYER_ID})`, check: `(${ADMIN} OR ${DELEGADO_PLAYER_ID})` },
      { name: "player_delete", cmd: "DELETE", using: ADMIN },
    ],
  },
  {
    tabla: "Team",
    drop: ["admin_team_all", "delegado_team_membership"],
    policies: [
      { name: "team_select", cmd: "SELECT", using: `(${ADMIN} OR ${DELEGADO_TEAM_ID})` },
      { name: "team_insert", cmd: "INSERT", using: ADMIN, check: ADMIN },
      { name: "team_update", cmd: "UPDATE", using: ADMIN, check: ADMIN },
      { name: "team_delete", cmd: "DELETE", using: ADMIN },
    ],
  },

  // Grupo D: admin ALL + delegado own
  {
    tabla: "User",
    drop: ["admin_users_all", "delegado_users_own"],
    policies: [
      {
        name: "users_access",
        cmd: "ALL",
        using: `(${ADMIN} OR (${UID_NOT_NULL} AND id = ((select auth.uid()))::text AND (EXISTS (SELECT 1 FROM "User" u WHERE u.id = ((select auth.uid()))::text AND u.role = ANY (ARRAY['DELEGADO'::text, 'ADMIN'::text])))))`,
        check: `(${ADMIN} OR (${UID_NOT_NULL} AND id = ((select auth.uid()))::text))`,
      },
    ],
  },
  {
    tabla: "UserTeamAccess",
    drop: ["admin_uta_all", "delegado_uta_own"],
    policies: [
      {
        name: "uta_access",
        cmd: "ALL",
        using: `(${ADMIN} OR (${UID_NOT_NULL} AND "userId" = ((select auth.uid()))::text AND (EXISTS (SELECT 1 FROM "User" u WHERE u.id = ((select auth.uid()))::text AND u.role = 'DELEGADO'::text))))`,
        check: `(${ADMIN} OR (${UID_NOT_NULL} AND "userId" = ((select auth.uid()))::text))`,
      },
    ],
  },

  // Grupo E: solo admin
  {
    tabla: "GymConfig",
    drop: ["admin_gymconfig_all"],
    policies: [{ name: "gymconfig_access", cmd: "ALL", using: ADMIN }],
  },
  {
    tabla: "SyncState",
    drop: ["admin_syncstate_only"],
    policies: [{ name: "syncstate_access", cmd: "ALL", using: ADMIN }],
  },
];

async function main() {
  console.log("=== ARREGLO LINTS RLS ===\n");

  for (const { tabla, drop, policies } of PLAN) {
    // 1) drop de las policies viejas + las propias (idempotente)
    for (const p of [...drop, ...policies.map((x) => x.name)]) {
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${p}" ON public."${tabla}";`);
    }
    // 2) create de las nuevas (WITH CHECK no aplica a SELECT/DELETE; INSERT solo WITH CHECK)
    for (const pol of policies) {
      let sql: string;
      if (pol.cmd === "SELECT") {
        sql = `CREATE POLICY "${pol.name}" ON public."${tabla}" FOR SELECT TO authenticated USING (${pol.using});`;
      } else if (pol.cmd === "DELETE") {
        sql = `CREATE POLICY "${pol.name}" ON public."${tabla}" FOR DELETE TO authenticated USING (${pol.using});`;
      } else if (pol.cmd === "INSERT") {
        sql = `CREATE POLICY "${pol.name}" ON public."${tabla}" FOR INSERT TO authenticated WITH CHECK (${pol.check ?? pol.using});`;
      } else {
        // ALL / UPDATE → USING + WITH CHECK
        sql = `CREATE POLICY "${pol.name}" ON public."${tabla}" FOR ${pol.cmd} TO authenticated USING (${pol.using}) WITH CHECK (${pol.check ?? pol.using});`;
      }
      await prisma.$executeRawUnsafe(sql);
      console.log(`  ${tabla}.${pol.name} [${pol.cmd}] ✅`);
    }
  }

  // ---------- verificación ----------
  const policies = await prisma.$queryRawUnsafe(`
    SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
  `) as Array<{ tablename: string; policyname: string; cmd: string }>;

  console.log("\n=== POLICIES RESULTANTES ===");
  const porTabla = new Map<string, string[]>();
  for (const p of policies) {
    if (!porTabla.has(p.tablename)) porTabla.set(p.tablename, []);
    porTabla.get(p.tablename)!.push(`${p.policyname} [${p.cmd}]`);
  }
  for (const [t, ps] of [...porTabla.entries()].sort()) {
    console.log(`  ${t.padEnd(18)} ${ps.join(", ")}`);
  }

  // lint 0006: más de una policy permissive para el mismo (tabla, rol, cmd)
  const duplicadas = policies.filter((p, i, arr) => arr.findIndex((x) => x.tablename === p.tablename && x.cmd === p.cmd) !== i);
  console.log(`\nDuplicadas por (tabla, cmd): ${duplicadas.length}`);
  console.log(duplicadas.length === 0 ? "✅ Sin multiple_permissive_policies" : `⚠️ Revisar: ${JSON.stringify(duplicadas)}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });