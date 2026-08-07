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
- **[09/08] Status sincronizado automático**: `POST /players/:id/payments/:month` recalcula la regla y actualiza `status` (DEUDA↔ACTIVO) en BD; devuelve `{payment, estadoCuota, status}` y el panel aplica esa respuesta (solo como fuente de verdad). Verificado end-to-end (impago mes anterior → DEUDA/no juega; pago → ACTIVO; impago del mes en curso antes del día 11 → PENDIENTE no deudor).
- **[09/08] Columna principal = mes en curso** con nombre legible ("Ago 2026 — pagó / cuota del mes en curso"); meses anteriores solo quedan en el calendario.
- **Usuarios de prueba**:
  - `admin@josehernandez.futbol` / `admin1234` (ADMIN, 10 equipos)
  - `delegado@josehernandez.futbol` / `delegado1234` (DELEGADO, solo C11, del seed)
  - `delegado.elite@josehernandez.futbol` / `Elite1234567` (DELEGADO de prueba, solo JH ELITE — creado con `server/src/scripts/create-delegado-elite.ts`). Credenciales verificadas en prod, 403 en otros equipos.
  - JH ELITE en prod: 17 jugadores + 3 técnicos (DT Mauro Erben, PF Marcos Ruiz Diaz, AT Mauro Schroeder).
- **Pendiente**: continuar con correcciones + front (página pública, login, detalles de UX), OAuth/Supabase Auth, pagos online (Mercado Pago?), limpiar deployments viejos BLOCKED/ERROR en Vercel.

## Decisiones técnicas
- `PlayerTeam` portotype: rol del jugador EN el equipo (JUGADOR | técnico/DIREC) — payments son por jugador, no por equipo.
- `calcularEstadoCuota` en el server es la fuente de verdad; el client lo duplica (`estadoLocal`) solo como fallback si el server no trae estadoCuota.
- `generateMonth(now, i)` usa getFullYear + meses 0..12 → siempre Ene del año "actual" como inicio para simetría simple (puede ir 2026-01 → 2027-01 sin importar el mes real).
- Scripts de creación/corrección de usuarios se corren localmente con `npx tsx src/scripts/xxx.ts` (DATABASE_URL 5432 local apunta a la misma Supabase de prod).