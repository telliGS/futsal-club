# CONTEXT — Club José Hernández (futsal)

## Visión general
Sistema de gestión integral para el Club Social y Deportivo José Hernández (Paraná, Entre Ríos, Argentina). Combina un **sitio público** (partidos, historia, noticias, consulta de cuota por DNI) con un **panel de delegados** para gestionar planteles, cuotas mensuales, seguro, gimnasio y presupuesto. En producción desde agosto de 2026.

## Stack
| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS (paleta del club, mobile-first 375px) |
| **Backend** | Node.js + Express + TypeScript (serverless en Vercel) |
| **Datos** | Prisma ORM + PostgreSQL (Supabase) con RLS (Row Level Security) |
| **Integraciones** | TIMBO (fixtures externos) vía adapter, Google Sheets (importación inicial) |
| **CI/CD** | GitHub Actions (test + sync TIMBO solo en cada push; el deploy del server es MANUAL) |
| **Testing** | `node --test` + loader `tsx` (sin framework extra) |

## Estructura
```
futsal-club/
├── client/                # Frontend React (Vite)
│   ├── public/            # Escudo, imágenes, sitemap, robots
│   └── src/
│       ├── components/    # Layout, panel (modales, vistas), home (secciones de la landing), CookieBanner
│       ├── pages/         # Home, Cronograma, Historia, Status, Login, Dashboard…
│       └── lib/           # api, uso, helpers del panel, hooks de dominio (use-*)
├── server/                # API Express + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/        # auth, players, teams, matches, gym, seguro, presupuesto…
│       ├── controllers/   # Lógica de negocio
│       ├── lib/           # cuota, gym, listas, import, timbo, nativo, player-access…
│       ├── adapters/      # timbo.adapter.ts (integración fixtures)
│       └── scripts/       # seed y utilidades de demo
└── assets/                # Escudo original
```

## Arquitectura y decisiones clave
- **Separación front/back**: `client/` y `server/` se despliegan por separado en Vercel; el front usa proxy a `/api` en dev.
- **RLS en PostgreSQL**: políticas a nivel de fila para que cada usuario vea solo sus datos (perfil → equipos → jugadores). Nunca deshabilitar.
- **Adapter pattern TIMBO**: la lógica del sistema externo de fixtures vive en `server/src/adapters/timbo.adapter.ts` (`NormalizedMatch` es el contrato).
- **Mobile-first**: todo se diseña y verifica a 375px primero.
- **Code-splitting**: `React.lazy` + `Suspense` por ruta (índice ~57 kB gzip).
- **Excel server-side**: exportaciones con `exceljs`; una sola fuente de listas en `server/src/lib/listas.ts`.
- **Fuente única de estado**: cuota/gym se calculan SOLO en el server (sin estado local duplicado en el client).

## URLs de producción
- Repo: `https://github.com/telliGS/futsal-club` (**público** desde 07/09/2026)
- Front: `https://jh-futsal.vercel.app`
- API: `https://server-tellig.vercel.app`
- Health check: `https://server-tellig.vercel.app/api/health`

## Deploy
- **Front**: auto-deploy en Vercel ante cada push a `master`.
- **Server**: deploy **MANUAL** con `npx vercel --prod` desde `server/` (el job `deploy-server` del workflow se quitó de GitHub Actions porque el build prebuilt generaba deployments que colgaban los endpoints). Regla aprendida: NO usar `vercel build --prebuilt` local; deploy normal desde `server/` (necesita `server/.vercel/project.json`, ignorado por git).
- Secrets disponibles en GitHub Actions (de un experimento, hoy sin uso): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Seguridad
- JWT (12 h) firmado con `JWT_SECRET` (solo en env del server).
- CORS allowlist (`CORS_ORIGIN`), rate-limit en login (10 intentos/15 min por IP), helmet.
- Contraseñas hasheadas con `bcryptjs`.
- `.env*`, `*.db` y `*.log` ignorados por git. Credenciales solo en variables de entorno de Vercel/Supabase.
- Scripts internos con datos reales del club se mantienen fuera del repo (carpeta `.private/`, ignerada).

## Puesta en marcha
```bash
# Server (puerto 4000)
cd server
npm install
npx prisma db push        # crea el esquema en la DB local/remota
npm run db:seed           # equipos + admin + delegado de ejemplo
npm run dev

# Client (puerto 5173, proxy a /api)
cd client
npm install
npm run dev
```
Credenciales de ejemplo del seed: `admin@example.com` / `admin1234`, `delegado@example.com` / `delegado1234`. Cambiar antes de un uso real.

## Testing y CI
```bash
cd server && npm test     # node --test + tsx
cd client && npm test
```
CI corre ambos en cada push a `master` (GitHub Actions): `test` (server + client) y `sync` (dispara el sync de TIMBO). El deploy del server NO está en CI (manual, ver sección Deploy).

## Regla de negocio: una persona hoy puede tener VARIOS roles
`PlayerTeam` es many-to-many con `role` por fila (`JUGADOR`, `DT`, `AT`, `PF`, …) y `@@unique([playerId, teamId])`. Ejemplo real en producción: **Mauro Erben** es JUGADOR en JH NEGRO y DT en JH ELITE a la vez (ídem Mauro Schroeder = JUGADOR JH NEGRO + AT JH ELITE). Implicancias implementadas (fix 07/09/2026):
- **Quitar de un equipo** (`DELETE /players/:id` con `teamId` en el body): borra SOLO el vínculo del equipo indicado, jamás a ciegas (`links[0]`). Si hay varios vínculos sin `teamId`, responde 400 pidiendo el equipo.
- **Acceso**: criterio unificado a "al menos un equipo" en payments/delete (antes exigía TODOS los equipos, lo que bloqueaba a delegados con jugadores multi-equipo).
- Avisos de baja de seguro/gym solo si el vínculo eliminado era `JUGADOR` (los DT/AT no llevan seguro) y solo si el jugador deja de ser JUGADOR en todos lados.

## Convenciones
- TypeScript `strict: true`; evitar `any`.
- Archivos `kebab-case.ts`, componentes `PascalCase.tsx`.
- Errores de API siempre `{ success: false, error: string }` + código HTTP.
- Commits `tipo: mensaje corto` o `tipo(scope): mensaje` (ej: `refactor: …`, `fix: …`, `docs: …`). Sin corchetes.
- **Organización del código grande (refactor 08/09/2026)**: las páginas quedan como orquestadores delgados (estado + composición); el JSX pesado va a `components/<pagina>/` (p. ej. `components/home/`); la lógica reutilizada va a hooks `lib/use-*.ts` (client) y la lógica de acceso/negocio a `lib/*.ts` (server). Ej: Dashboard 1984→629 líneas (12 hooks), Home 783→147 líneas (9 componentes), acceso a jugadores unificado en `server/src/lib/player-access.ts`.
- **Patrones de estado y UI**: los hooks que mutan el plantel usan `OnPlayersChange` (`Dispatch<SetStateAction<IPlayer[]>>`, en `panel-types.ts`); operaciones repetidas (pago mensual, base64 de archivos) viven en factories/helpers compartidos (`use-pago-mensual.ts`, `file-utils.ts`); componentes pesados o frecuentes se envuelven en `React.memo` y sus "maps" se calculan con `useMemo`.

## Roadmap
1. Contenido visual: fotos reales del club.
2. Experiencia pública: filtros por categoría en el cronograma, más visibilidad de partidos.
3. Dashboard: confirmaciones destructivas, persistir vista/equipo, resumen de cobros.
4. Roadmap del club: panel de profesores, panel de ventas, alertas de pagos, PWA.
5. (Opcional) README: actualizar el "Último commit deployado" (quedó viejo).

---
**Última actualización**: 08/09/2026 — ronda "10/10" cerrada (commits `fdf61c5`, `99d9ef7`).

**Server** (`fdf61c5`):
- `gym.routes.ts` ahora usa el acceso unificado `assertPlayerAccess` (ALGUNO de sus equipos o ADMIN) y elimina el `checkPlayerAccess` local que exigía **TODOS** los equipos (bloqueaba a delegados con jugadores multi-equipo) y dejaba pasar al jugador sin vínculos. Rutas intactas.
- `players.routes.ts` `cambiar-primera` valida acceso también al equipo de **origen** (`deTeamId`), no solo al destino.
- `players.controller.ts`: import muerto `TipoDocumento`/`aptoParaJugar` eliminado.

**Client** (`99d9ef7`):
- Cuota y gym deduplicados en `client/src/lib/use-pago-mensual.ts` (factory parametrizado por endpoint, campo `payments`/`gymPayments`, si aplica `estadoCuota`/`status` y textos de UX —copiados EXACTOS). `use-cuotas.ts` y `use-gym-pagos.ts` son wrappers que conservan su API pública.
- Tipo único `OnPlayersChange = Dispatch<SetStateAction<IPlayer[]>>` en `panel-types.ts` (antes firmas distintas por hook).
- `use-toasts.ts`: contador en `useRef` (antes byte `counter`, toasts del mismo batch compartían id y se borraban de más).
- Base64 centralizado en `client/src/lib/file-utils.ts` (`fileToBase64`, chunks 0x8000): `use-player-docs` e `use-excel` dejan de duplicarlo.
- `use-player-form.ts`: casts `as unknown as` eliminados (`IPlayer` ya tipa `hasInsurance`/`vaAlGym`/`gymPrecio`), firma unificada, `token` en deps.
- `Home.tsx`: `useMemo` para destacado/agrupaciones y `useCallback` para handlers; los 9 componentes de `components/home/` envueltos en `React.memo` — el tick de reloj de 30 s solo re-renderiza el countdown del Emergente.

Verificado: tsc + builds + tests (6 client / 44 server) en ambas capas. **Pendiente: deploy MANUAL del server** (`npx vercel --prod` desde `server/`) para que `0f78ad9` + `fdf61c5` lleguen a producción — el push por sí solo no deploya el backend.

---

**Última actualización**: 08/09/2026 — fix partidos sin horario de TIMBO (commits `fa71eea`, `1d16bd0`).

TIMBO manda `00:00` como placeholder cuando todavía no asignó la hora real. Un partido así quedaba guardado con `dateTime = 03:00Z` (= 00:00 ARG) y el sitio público lo mostraba como "próximo partido / 00:00". Ahora:
- `Match.dateTime` es `DateTime?` (schema + `npx prisma db push` aplicado en Supabase).
- El sync guarda `dateTime = null` cuando `adaptTimboMatch` no resuelve hora confiable.
- Las queries de próximos/estadísticas (`gte/lte`) excluyen los `null` → el partido sin horario **no aparece** como próximo ni en el destacado.
- Client: `IMatch.dateTime: string | null`, helpers null-safe y un data-fix en producción (`timboId 1952709735` C20 FEM quedó con NULL). Cuando TIMBO confirme la hora, el propio sync lo vuelve a poblar.
- `poli.ts` y `getUpcoming` filtran los `null` explícitamente para TS.
- README: se quitó el "Último commit deployado" hardcodeado (quedaba viejo) → apunta a este CONTEXT.md.

**Pendiente: deploy MANUAL del server** para `0f78ad9` + `fdf61c5` + `fa71eea` (acceso jugador, ronda 10/10 y dateTime null). El front se deploya solo al pushear.