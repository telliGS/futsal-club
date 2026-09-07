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
│       ├── components/    # Layout, panel (modales, vistas), CookieBanner
│       ├── pages/         # Home, Cronograma, Historia, Status, Login, Dashboard…
│       └── lib/           # api, uso, helpers del panel
├── server/                # API Express + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/        # auth, players, teams, matches, gym, seguro, presupuesto…
│       ├── controllers/   # Lógica de negocio
│       ├── lib/           # cuota, gym, listas, import, timbo, nativo…
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
- Commits `[tipo]: mensaje corto` (feat/fix/refactor/docs/polish/test).

## Roadmap
1. Contenido visual: fotos reales del club.
2. Experiencia pública: filtros por categoría en el cronograma, más visibilidad de partidos.
3. Dashboard: confirmaciones destructivas, persistir vista/equipo, resumen de cobros.
4. Roadmap del club: panel de profesores, panel de ventas, alertas de pagos, PWA.

---
**Última actualización**: 07/09/2026 — versión pública del contexto (sin credenciales ni datos personales). Hoy: repo hecho público, fix de doble rol (jugador+DT/AT) con acceso unificado, deploy manual del server documentado, bugs de Home/Cronograma corregidos (emergente de próximo partido, práctica fantasma, filtro por categoría).