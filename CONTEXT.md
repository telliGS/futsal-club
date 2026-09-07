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
| **CI/CD** | GitHub Actions (tests en cada push) + auto-deploy Vercel |
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
- Front: `https://jh-futsal.vercel.app`
- API: `https://server-tellig.vercel.app`
- Health check: `https://server-tellig.vercel.app/api/health`

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
CI corre ambos en cada push a `master` (GitHub Actions).

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
**Última actualización**: 07/09/2026 — versión pública del contexto (sin credenciales ni datos personales).