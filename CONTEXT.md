# CONTEXT — Club José Hernández (futsal)

## Visión general
Sistema del club de futsal "José Hernández" (Paraná, Entre Ríos): sitio público informativo + panel de delegado para gestión de planteles y cuotas mensuales. MVP en producción con backend serverless en Vercel y frontend Vite.

## Stack
- **Frontend**: React 18 + Vite 6 + TypeScript + Tailwind, paleta del club (primary `#008f39`, dark `#121414`), fuentes Epilogue/Montserrat/JetBrains Mono. Carpeta `client/`.
- **Backend**: Express + Prisma + PostgreSQL (Supabase), serverless en Vercel. Carpeta `server/`.
- **Despliegue**: Vercel (GitHub auto-deploy para client; CLI manual para server).
  - Server desplegado a producción con `vercel --prod` (24/08/2026): incluye TIMBO adapter, sync ventana extendida, matches con timezone fix.
  - ⚠️ Cada cambio en `server/` requiere `cd server; vercel --prod` manual; el front se auto-despliega.
- **Repo**: `https://github.com/telliGS/futsal-club.git` (branch `master`).
  - Identidad git OBLIGATORIA: `telliGS` / `tellig270@gmail.com`

---

## URLs en producción
- Front: `https://jh-futsal.vercel.app` (commit `016491f` 24/08/2026 + favicon `escudo-jh.png`)
- API: `https://server-tellig.vercel.app`
- Admin general: `admin@josehernandez.futbol` / `admin1234`
- Admin de élite (acceso a todos los equipos):
  - DT élite: `mauro.erben@josehernandez.futbol` / `EliteAdmin2026!`
  - Delegado élite: `rodrigo.vergara@josehernandez.futbol` (mantiene su contraseña, convertido a ADMIN)
  - Presidente: `mauro.schroeder@josehernandez.futbol` / `Presidente2026!`

---

## Estado actual (24/08/2026 — TIMBO adapter + sync extendido + horarios reales)

### TIMBO Sync y Adapter (24/08/2026)
- **Ventana extendida** (`sync.ts`): el sync ahora busca desde hace 2h hasta el lunes siguiente al próximo finde (+7 días), para traer partidos del próximo finde y entre semana. Ya no se limita al finde en curso.
- **Adapter pattern** (`server/src/adapters/timbo-adapter.ts`): normaliza datos crudos de TIMBO → formato interno limpio. Maneja el bug conocido de TIMBO donde `date_iso` viene con 00:00 cuando el horario no está asignado. Cadenas de resolución: `date_iso` → `time_iso` → `date` → null.
  - `adaptTimboMatch(raw, category, info, result)` → `NormalizedMatch` con `dateTime` (ISO -03:00 o null), venue, rival, isHome, category, goles.
  - `resolveDateTime(match)` prueba en orden: hora real en date_iso, hora en time_iso, hora en campo `date` ("20:30").
- **TIMBO bug conocido**: cuando el horario no está asignado, `date_iso` viene con `00:00-03:00`, pero `time_iso` tiene la hora real (ej. `1970-01-01T20:30:00-03:00`). Si ambos fallan, no hay dato.
- **Fix de timezone en matches.ts**: `desdeEnCurso` ahora usa `ARG_TZ_OFFSET_MS` para calcular correctamente el inicio de la ventana (antes usaba `Date.now()` directo).
- **Token TIMBO**: `tbo_6e7512433d2c4393a5c98308f557d946` (en `server/.env` línea 20). Header: `X-Timbo-Sync-Token`.
- **Sync result reciente** (24/08/2026): 7 partidos actualizados con horarios corregidos. JH NEGRO 00:00→20:30, JH C 00:00→22:30. C20 FEM sin dato (TIMBO no tiene time_iso ni date con hora).

### Frontend: Horarios y countdown
- **`formatHora()` en Home.tsx**: detecta UTC hour 1-5 (equivalente a 00:00 ART) y muestra "A confirmar" en vez de "00:00".
- **`isHorarioConfirmado()`**: helper que verifica si un partido tiene hora real.
- **Partido destacado**: ahora usa `matches.find(m => isHorarioConfirmado(m.dateTime))` en vez de `matches[0]`, para que el countdown y el hero no muestren partidos sin horario.
- **`restante` countdown**: usa `matchDestacado` (partido con hora confirmada) en vez de `matches[0]`.

### Frontend: Cambios visuales y de contenido
- Sección "Historia" en Home, página `/historia` con línea de tiempo.
- Footer con "Seguinos" (Instagram, Facebook).
- Botón "Compartir mi estado" en Status.tsx.
- Badge "¡Este finde!" en primer partido.
- Hero: "Futsal de Paraná", cuenta regresiva.
- Favicon `escudo-jh.png`.

### Mobile-first (en desarrollo, ramas separadas)
- Ramas `01-foundation` a `17-qa-final` planificadas.
- `01-foundation`: fluid type, touch targets, safe areas.
- `02-layout-nav`: nav drawer, skip link.
- `03-home`: Home responsive.
- `04-historia`: Historia responsive.
- `05-status-login`: Status + Login responsive.

### Backend: features completadas
- Múltiples admins con acceso total (ADMIN accede a todos los equipos).
- Pago de cuota con monto + detalle + día límite por jugador (`Player.deadline`).
- Módulo de gimnasio (precio global + flag por jugador + pagos + avisos).
- Ingreso real vs estimado en presupuesto.
- RLS consolidado y blindado (23 policies, 0 duplicadas).

### Dashboard: refactor completado
- `Dashboard.tsx` → orquestador de ~1732 líneas.
- 5 vistas en `components/panel/`: Calendario, Delegados, Poli, Presupuesto, PlayerList.
- 11 modales extraídos.
- Toasts y exportación a Excel.

---

## Roadmap

### Prioridades actuales
1. **Contenido visual**: agregar fotos reales del club (reemplazar placeholders 🏆).
2. **Experiencia pública**: cronograma con filtros por categoría, más visibilidad de partidos.
3. **Dashboard**: mejoras de usabilidad pendientes (confirmaciones destructivas, persistir vista/equipo, resumen cobros, aviso pendientes).
4. **Roadmap de Marucha**: panel profesores, panel ventas, alertas pagos, PWA.

---

## Decisiones técnicas recientes
- **TIMBO Adapter pattern** (24/08/2026): `server/src/adapters/timbo-adapter.ts` normaliza datos crudos de TIMBO (date_iso bug, time_iso fallback, campo date fallback). El sync y los endpoints usan `adaptTimboMatch()` en vez de construir dateTime a mano.
- **Ventana extendida de sync** (24/08/2026): `extendedWindow()` busca desde hace 2h hasta +7 días del fin del finde actual. Ya no se pierden partidos del próximo finde ni entre semana.
- **Refactor del Dashboard** (14/08/2026): orquestador de 1732 líneas, todo UI en `components/panel/`, tipos/helpers en `lib/`.
- **Pago de cuota con monto + detalle** (14/08/2026): `PagoModal` único, `Player.deadline`, `Payment.note`.
- **Módulo de gimnasio** (14/08/2026): `GymConfig`, `Player.vaAlGym`, `GymPayment`, `AvisoGym`.
- **Ingreso real vs estimado** (14/08/2026): recaudado/faltaCobrar por equipo y total + serie por mes.
- **RLS consolidado** (19/08/2026): 23 policies, 0 duplicadas, blindado con `db:blindaje`.
- **Placeholder de fotos**: se usa 🏆 hasta que el club proporcione imágenes reales.

---

## Notas para desarrolladores
- **TIMBO Adapter**: si cambia la API de TIMBO o se agrega otra fuente, solo tocar `server/src/adapters/timbo-adapter.ts`. La interfaz `NormalizedMatch` es el contrato con el resto de la app.
- **TIMBO bug del 00:00**: cuando `date_iso` tiene hora 00:00, el adapter busca en `time_iso` y luego en el campo `date`. Si ninguno tiene hora real, devuelve null (se muestra "A confirmar" en el frontend).
- **Frontend 00:00**: `formatHora()` en Home.tsx detecta UTC hour 1-5 y muestra "A confirmar". `isHorarioConfirmado()` filtra partidos sin hora para el destacado/countdown.
- Al agregar fotos reales, reemplazar los placeholders 🏆 en `Home.tsx` y `Historia.tsx`.
- Las fotos deben ir en `public/images/` y usar rutas relativas.
- El badge "¡Este finde!" se muestra solo en el primer partido de la lista (`i === 0`).
- La página `/historia` está ruteada en `App.tsx`.
- El Dashboard es orquestador: las vistas están en `client/src/components/panel/` y los tipos/helpers en `client/src/lib/`.
- Para exportar Excel se usa `xlsx` ^0.18.5 (no desinstalar).
- `scrollbar-none` está definida como plugin en `tailwind.config.js`.
- **Mobile-first**: diseñar y verificar en pantalla chica primero (máx. ~375px).
- **Terminal Windows**: no soporta `&&`, `grep`, `head`, `tail`. Usar comandos PowerShell nativos o `powershell -Command "..."`.

---

## Commits recientes
- `016491f`: fix: TIMBO adapter para horarios reales (00:00 → time_iso/date) + sync ventana extendida + frontend 'A confirmar'
- `08c755a`: revert: undo factory merge (DeviceProvider + factories eliminados por crash de runtime)
- `d9a3ab3`: fix: timezone ARG en matches.ts (desdeEnCurso con ARG_TZ_OFFSET_MS)
- Commits mobile-first en ramas: `19f2b8d`, `dab8fa9`, `477ad58`, `3e04bb2`, `7476d02`
- `20b264a`: docs: nota anti-regresión índices FKs
- `2172053`: feat: consolidar policies RLS
- `f9054e5`: feat: pago de cuota con monto + detalle
- `1c7a8cf`: feat: cuentas admin de élite
- `e0bbbe5`: feat: ordenar botones panel móvil
- `624fb4e`: feat: exportar plantel a Excel
- `e2b6377`: feat: toasts en el panel

---

**Última actualización**: 24/08/2026 (TIMBO adapter + sync extendido + horarios reales — commit `016491f`)
