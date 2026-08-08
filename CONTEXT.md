# CONTEXT — Club José Hernández (futsal)

## Visión general
Sistema del club de futsal "José Hernández" (Paraná, Entre Ríos): sitio público informativo + panel de delegado para gestión de planteles y cuotas mensuales. MVP en producción con backend serverless en Vercel y frontend Vite.

## Stack
- **Frontend**: React 18 + Vite 6 + TypeScript + Tailwind, paleta del club (primary `#068938`, dark `#0D0D0D`), fuentes Epilogue/Montserrat/JetBrains Mono. Carpeta `client/`.
- **Backend**: Express + Prisma + PostgreSQL (Supabase), serverless en Vercel. Carpeta `server/`.
- **Despliegue**: Vercel (GitHub auto-deploy para client; CLI manual para server).
- **Repo**: `https://github.com/telliGS/futsal-club.git` (branch `master`).
  - Identidad git OBLIGATORIA: `telliGS` / `tellig270@gmail.com` (email viejo `guille@josehernandez.futbol` causa `BLOCKED` en Vercel).

## URLs en producción
- Front: `https://jh-futsal.vercel.app` (project prj_qZUeIBA6zGaVWpDeI8xqxU1NTpK3, rootDirectory `client`)
- API: `https://server-tellig.vercel.app` (alias; tmb `server-telligs-tellig.vercel.app`). Proyecto server, deploy manual CLI.
- Admin: `admin@josehernandez.futbol` / `admin1234` (solo seed; cambiar en prod cuando haya más usuarios)

## Base de datos (Supabase)
- Host: `aws-0-ca-central-1.pooler.supabase.com` — puerto **6543** para serverless (`?pgbouncer=true&connection_limit=1`), **5432** para scripts locales.
- `server/.env` local usa 5432; env de Vercel usa 6543+pgbouncer.
- Modelos: Player, Team, PlayerTeam (rol JUGADOR/técnico, posición, N°), Payment (playerId+month+paid+amount), User (admin/delegados) + UserTeam.
- Scripts de mantenimiento (local, con DATABASE_URL 5432): `server/src/scripts/seed.ts`, `assign-admin-teams.ts`, `fix-telli.ts`.

## Reglas de negocio (cuotas)
- La cuota se paga del **1 al 10 de cada mes**. Se paga el mes CALENDARIO en curso.
- Desde el **día 11** sin pagar el mes en curso (o con meses anteriores impagos) → jugador **DEUDOR** → **no tiene permiso de jugar**.
- Lógica centralizada: `server/src/lib/cuota.ts` → `calcularEstadoCuota(payments, now)` devuelve `{ deudor, alDia, pendiente, puedeJugar, mesesDebe }`. Se expone en `GET /api/teams/:id/players` (campo `estadoCuota` por jugador) y en `GET /api/public/status?document=X` (`deudor`, `puedeJugar`, `diasParaPagar`).
- **Status sincronizado automático**: `POST /api/players/:id/payments/:month` recalcula la regla tras guardar y actualiza el campo `status` del jugador en BD (al marcar/sacar un pago): con deuda → `DEUDA`; sin deuda y estaba ACTIVO/DEUDA → `ACTIVO` (respeta INACTIVO manual). Devuelve `{ payment, estadoCuota, status }` y el panel aplica esa respuesta directo (refactor 09/08).
- El client recalcula en `Dashboard.tsx` (`estadoLocal`) solo como fallback si el server no trae `estadoCuota`.
- Quitar un pago ya registrado (marcar como impago) pide `window.confirm` (anti-accidente).
- La columna principal del panel es SIEMPRE el mes en curso (dinámico); los meses anteriores pasan solo al calendario (historial).

## API (endpoints clave)
- `POST /api/auth/login`, `GET /api/auth/me` (ADMIN ve 10 equipos)
- `GET /api/teams/:teamId/players` → jugadores con payments (take 24) + estadoCuota
- `POST /api/players/:id/payments/:month` (body `{paid, amount}`), `GET /api/players/:id/payments`
- `GET /api/public/status?document=X` (público, sin auth)
- `GET /api/health`

## Panel de delegado (`client/src/pages/Dashboard.tsx`)
- Selector de equipo + toggle **Lista ⇄ Calendario de cuotas** (rango 13 meses: Ene actual (2026-01) → Ene siguiente (2027-01), columnas dinámicas; celdas ✓ pago, ✗ deuda; solo clicables los meses ≥ actual).
- Cuerpo técnico **separado** (rol != JUGADOR, ej DT Marcos Vittor) mostrado debajo **sin opciones de pago**.
- Badge "DEUDOR — NO puede jugar ✕" en filas con deuda.

## Commands
- Build client: `npm run build` (client/) → tsc + vite
- Deploy client: commit+push a master → auto-deploy GitHub (rootDirectory `client`); luego alias al nuevo deploy: `vercel alias <url-nuevo>.vercel.app jh-futsal.vercel.app`
- Deploy server: `vercel deploy --prod --yes --no-wait` (en server/) → poll API hasta READY → `vercel alias <url> server-tellig.vercel.app`
- Token Vercel: `C:\Users\Guille\AppData\Roaming\xdg.data\com.vercel.cli\auth.json`; API para polls: `https://api.vercel.com/...` con `team_u0Xf2d5IqhLVBFQ92tKX7u4h`.
- PowerShell: añadir `$env:Path = ("C:\Program Files\nodejs;$env:APPDATA\npm") + ';' + $env:Path` para node/npx/vercel.

## Estado actual (07/08/2026)
- **En prod**: panel con calendario Ene→Ene, cuerpo técnico separado, regla de cuota 1–10 (verificada con prueba controlada deudor/no-jugar y restaurada), confirmación anti-accidente de pago, endpoint público con `diasParaPagar`.
- **[08/08] Ficha médica/estudios (solo localhost, SIN deploy)**: modelado `JugadorDocumento` (tipo, fileName, mime, size, `data Bytes`, fechaEmision, fechaVencimiento, subidoPor) + endpoints del panel (subir/listar/descargar/borrar) + badges por jugador + modal de subida con fecha de emisión. **Regla por categoría**: mayores (C20+/PRIMERA/ELITE/1ra) → solo ERGO exige (vence 2 años de la emisión); menores (C17-) → solo ELECTRO (vence 1 año). Un jugador en varias categorías → manda la MENOR (ej. C17+C20+JH C → electro). Ficha médica y OTRO = referencia, no bloquean. Lógica central en `server/src/lib/ficha.ts` (`tiposBloqueantes`, `tiposBloqueantesMulti`, `vencimientoPorRegla`, `calcularDocumentos`). Estado expuesto en `GET /teams/:id/players` (campo `fichas` + `apto`) y `GET /api/public/status`.
- **[08/08] Plantilla Excel + import masivo (local, SIN deployar)**: `GET /api/teams/:teamId/template` (xlsx con headers + fila ejemplo + hoja de instrucciones) y `POST /api/teams/:teamId/import` (idempotente por DNI; rol técnico por aliases; fecha dd/mm/aaaa o aaaa-mm-dd; errores por fila). `server/src/lib/import.ts` + `routes/import.ts` (usa `exceljs` ya instalado). UI: botones "Plantilla" / "Importar Excel" en el Dashboard.
- **Fix (08/08)**: `express.json({ limit: "10mb" })` — el default de 100 KB rompía las subidas de carpetas de documentos/Excel con "Error de red" (413).
- **Formato de hora 24h** en Home (partidos) con `hour12: false` (evitaba que el browser pusiera "p. m.").
- **Investigación TIMBO CERRADA (07/08)**: torneo APFS de Paraná localizado (`competencia-oficial-apfs`), API pública con base `admin.timbo.futbol/api` + headers `Rav`/`Api-Version: 99999999999`, categorías e IDs mapeados, partidos del club verificados (C9–C20, Elite masc/fem, 2da Div con JH A/C/NEGRO). Ver sección "Integración TIMBO".
- **[09/08] Status sincronizado automático**: `POST /players/:id/payments/:month` recalcula la regla y actualiza `status` (DEUDA↔ACTIVO) en BD; devuelve `{payment, estadoCuota, status}` y el panel aplica esa respuesta (solo como fuente de verdad). Verificado end-to-end (impago mes anterior → DEUDA/no juega; pago → ACTIVO; impago del mes en curso antes del día 11 → PENDIENTE no deudor).
- **[09/08] Columna principal = mes en curso** con nombre legible ("Ago 2026 — pagó / cuota del mes en curso"); meses anteriores solo quedan en el calendario.
- **Usuarios de prueba**:
  - `admin@josehernandez.futbol` / `admin1234` (ADMIN, 10 equipos)
  - `delegado@josehernandez.futbol` / `delegado1234` (DELEGADO, solo C11, del seed)
  - `delegado.elite@josehernandez.futbol` / `Elite1234567` (DELEGADO de prueba, solo JH ELITE — creado con `server/src/scripts/create-delegado-elite.ts`). Credenciales verificadas en prod, 403 en otros equipos.
  - JH ELITE en prod: 17 jugadores + 3 técnicos (DT Mauro Erben, PF Marcos Ruiz Diaz, AT Mauro Schroeder).
- **Pendiente**: continuar con correcciones + front (página pública, login, detalles de UX), OAuth/Supabase Auth, pagos online (Mercado Pago?), limpiar deployments viejos BLOCKED/ERROR en Vercel.
- **Pendiente (08/08, prioridad baja)**: **PWA** — el club le preguntó a Guille si se puede hacer app además de web. Decisión del usuario: **PWA gratis** (`vite-plugin-pwa` + manifest con logo del club + service worker offline + botón "Instalar"). Backend no necesita cambios; Capacitor sería la vía futura a las stores. NO planear por ahora, solo registrado.

## Integración TIMBO (fixtures del futsal de Paraná) — [07/08] RESUELTA
- **Torneo real encontrado**: `COMPETENCIA OFICIAL APFS` (Asociación Paranaense de Fútbol de Salón, Paraná, Entre Ríos). Slug: `competencia-oficial-apfs` (id 1156294753) — 46 equipos, 1.549 jugadores. Fue hallado vía el link de la bio de IG `@paranafutsalok` ("Torneo Clausura APFS").
- NOTA: los slugs `futsal-parana`, `cafs`, `torneo-cafs-2026`, `copa-coloshp-2024` NO son de Paraná (vacío o de Tierra del Fuego/FFF).
- **Ediciones** (2026): CLAUSURA (slug `clausura-2026-31`, id **836000892**, activa, 12 categorías, inicia 16/07) y APERTURA (slug `apertura-2026-110`, id 829317791). Históricas 2025: clausura-2025-54 (1709217987) y apertura-2025-2025-75 (1637233959).
- **API REAL (pública, sin token)**: base **`https://admin.timbo.futbol/api`** (NO `api.timbo.futbol` → 403) + headers obligatorios `Rav: 99999999999` y `Api-Version: 99999999999` (descubiertos en la función minificada `S2` del bundle Nuxt `Dcrk0dqO.js`).
  - `GET /embeded/tournaments/{slug}` → torneo + ediciones
  - `GET /embeded/tournaments/{slug}/{editionSlug}` → edición + categorías + rounds
  - `GET /embeded/editions/{editionId}/fixtures?round={n}` → categorías del torneo (actualidad)
  - `GET /embeded/editions/{editionId}/fixtures/{zoneId}?round={n}` → partidos (match: id, date_iso, field (nombre/sede), positions[2].roster.team.name, goals[])
  - `GET /embeded/editions/{editionId}/fixtures/interzonal/{catId}?round={n}` y `.../additional/...` → partidos extra
- **Categorías CLAUSURA 2026** (categoriaId → zoneId): C11 (1919724182→988433371), C15 (475979060→1777915026), C17 (1999231365→1931711571), C20 Masculina (771802194→1418548496), Elite Femenina (2029178096→933248058), Elite Masculina (1405995841→640741674), Segunda División (178583342→2137527202), 2da Div Femenina (2109731839→352408293), Tercera División (1419181644→1841657768), C99 (378322886→1098047236), C20 Femenina (1926304864→1620054040), C13 (673957919→459559666).
- **José Hernández figura en: C9, C11, C13, C15, C17, C20 Masc, C20 Fem, Elite Fem, Elite Masc, Segunda División** (JH A / JH C / JH NEGRO). Verificado: partidos reales con equipo local, fecha ISO, cancha (BERDUC, UNIÓN ÁRABE, TOMA VIEJA...).
- Referencia completa guardada en `C:\Users\Guille\AppData\Local\Temp\opencode\timbo-api-resumen.json`; html/payloads de ejemplo en mismo directorio (`apfs-*.html`, `api_1.json`, `fx_*.json`).
- **[07/08] Sync implementado (server)**: `POST /api/sync/timbo` (token `X-Timbo-Sync-Token` = env `TIMBO_SYNC_TOKEN`) → lee la ventana del finde (viernes→lunes) por zona+ronda, hace `upsert` en `Match` por `timboId` (idempotente), borra de la ventana los que ya no figuran (reprogramados) y guarda estado en `SyncState` (`key: "timbo"`: editionId, lastSyncAt, window, lastWindowRound por zona — el próximo sync escanea desde `round-2`). Código: `server/src/lib/timbo.ts` (cliente API + mapeo `CLUB_ZONES`) y `server/src/routes/sync.ts`. `GET /api/matches/upcoming?weekend=1` devuelve el finde actual/que viene (viernes→lunes).
- **Mapeo TIMBO → equipos del club** (en `lib/timbo.ts`): C11→C11, C13→C13, C15→C15, C17→C17, C20 Masc→C20, C20 Fem→C20 FEM, Elite Fem→1ra Fem, Elite Masc→JH ELITE, Segunda Div→JH C y JH NEGRO (por nombre TIMBO: "JOSÉ HERNÁNDEZ C/NEGRO"). C9 y Tercera Div sin equipo propio → se ignoran. Rival/localía detectados por nombre TIMBO real del club en el partido.
- **Schema**: `Match.timboId Int? @unique` + modelo `SyncState` (key/value JSON) — ya pusheado a Supabase (`db push` 07/08). Los partidos manuales de delegados (sin timboId) no se tocan.
- **Cron**: `.github/workflows/sync-timbo.yml` — cada 6h UTC (`17 */6 * * *`) + `workflow_dispatch`, llama al server con secrets `TIMBO_API_URL` (https://server-tellig.vercel.app) y `TIMBO_SYNC_TOKEN`. **Auth en GitHub no configurada aún** (gh no logueado): crear los secrets en Settings → Secrets and variables → Actions. El token también está en `server/.env` (mismo valor que en Vercel) y en `C:\Users\Guille\AppData\Local\Temp\opencode\timbo-token.txt`.

## Decisiones técnicas
- `PlayerTeam` portotype: rol del jugador EN el equipo (JUGADOR | técnico/DIREC) — payments son por jugador, no por equipo.
- `calcularEstadoCuota` en el server es la fuente de verdad; el client lo duplica (`estadoLocal`) solo como fallback si el server no trae estadoCuota.
- `generateMonth(now, i)` usa getFullYear + meses 0..12 → siempre Ene del año "actual" como inicio para simetría simple (puede ir 2026-01 → 2027-01 sin importar el mes real).
- Scripts de creación/corrección de usuarios se corren localmente con `npx tsx src/scripts/xxx.ts` (DATABASE_URL 5432 local apunta a la misma Supabase de prod).