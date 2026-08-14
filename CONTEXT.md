# CONTEXT — Club José Hernández (futsal)

## Visión general
Sistema del club de futsal "José Hernández" (Paraná, Entre Ríos): sitio público informativo + panel de delegado para gestión de planteles y cuotas mensuales. MVP en producción con backend serverless en Vercel y frontend Vite.

## Stack
- **Frontend**: React 18 + Vite 6 + TypeScript + Tailwind, paleta del club (primary `#008f39`, dark `#121414`), fuentes Epilogue/Montserrat/JetBrains Mono. Carpeta `client/`.
- **Backend**: Express + Prisma + PostgreSQL (Supabase), serverless en Vercel. Carpeta `server/`.
- **Despliegue**: Vercel (GitHub auto-deploy para client; CLI manual para server).
- **Repo**: `https://github.com/telliGS/futsal-club.git` (branch `master`).
  - Identidad git OBLIGATORIA: `telliGS` / `tellig270@gmail.com`

---

## URLs en producción
- Front: `https://jh-futsal.vercel.app`
- API: `https://server-tellig.vercel.app`
- Admin: `admin@josehernandez.futbol` / `admin1234`

---

## Estado actual (14/08/2026 — después del refactor del Dashboard)

### Frontend: Cambios visuales y de contenido (commits recientes)
- **Sección "Historia" en el Home**: bloque con texto emotivo, foto placeholder (🏆), botón "Conocé más" y enlace a Instagram.
- **Página `/historia`**: creada con línea de tiempo, galería placeholder (6 fotos), testimonios de ejemplo y enlaces a redes sociales.
- **Footer**: agregada columna "Seguinos" con enlaces a Instagram y Facebook.
- **Botón "Compartir mi estado"** en la consulta de cuota pública (`Status.tsx`): permite compartir el estado de la cuota (al día/pendiente/deuda) por WhatsApp o copiar al portapapeles.
- **Badge "¡Este finde!"** en el primer partido de la lista de próximos partidos (Home).
- **Hero rediseñado**: 
  - Título cambiado a "Futsal de Paraná" con verde en "Paraná".
  - Subtítulo: "10 equipos · más de 100 jugadores · una pasión".
  - Tamaño del escudo y texto aumentados.
  - Padding y espaciado mejorados.
  - Fondo con patrón de líneas sutiles (cancha).
  - Botón "Consultar mi cuota" más grande.
- **Placeholder para fotos**: se usa 🏆 en las secciones donde aún no hay imágenes reales.

### Backend (sin cambios relevantes en este bloque)
- Todo lo documentado en versiones anteriores se mantiene: delegados, cronograma, presupuesto, fichas médicas, TIMBO, RLS, etc.

### Dashboard: refactor completo en componentes (14/08/2026)
- **`client/src/pages/Dashboard.tsx` pasó de ~3900 a 1732 líneas**: ahora es orquestador (estado, handlers y modales importados).
- **Librerías compartidas**:
  - `client/src/lib/panel-types.ts`: tipos del panel (Team, Player, FichaEstado, DocItem, Toast, MeData, DelegadoAdmin, PoliSlot/Bloque/Dia/Semana, PresupuestoData, TotalPresupuesto, etc.).
  - `client/src/lib/panel-helpers.tsx`: helpers (MONTHS, monthRange, monthShort, labelTipo, esCategoriaMayor, tiposBloqueantes, BadgeFicha, ICONS, Icon).
- **5 vistas** en `client/src/components/panel/`: `CalendarioView`, `DelegadosView`, `PoliView`, `PresupuestoView`, `PlayerListView`.
- **10 modales** en `client/src/components/panel/`: `PlayerModal`, `CredencialesModal`, `PoliSlotModal`, `PoliExModal`, `ImportModal`, `FichasModal` (documentos), `DelegadoModal`, `QuotaModal`, `GastoModal`, `InactivoModal`.
- **Toasts** (commit `e2b6377`): `mostrarToast` con tipos success/error/warning/info, contenedor fijo bottom-right, animación `animate-fade-up` definida en `tailwind.config.js`.
- **Exportación a Excel** (commit `624fb4e`): botón "📊 Exportar" tras "Importar Excel", usa `xlsx` ^0.18.5 (instalado con `--save`).

### Toasts y Excel en producción
- Bundle actual en `jh-futsal.vercel.app`: `index-DxJSi9lA.js` (verificado tras el refactor).

---

## Roadmap (actualizado 14/08/2026)

### Prioridades actuales (según conversación con el usuario)
1. **Darle vida al club con contenido visual y emocional** (✅ en proceso):
   - Historia, fotos, testimonios, redes sociales.
   - Hero con más impacto.
   - Badges y llamados a la acción.
   - **Próximo**: agregar fotos reales del club (reemplazar placeholders).

2. **Mejorar experiencia pública**:
   - Consulta de cuota más amigable y compartible (✅ botón "Compartir").
   - Cronograma con filtros por categoría (pendiente).
   - Más visibilidad de partidos (✅ badge "¡Este finde!").

3. **Dashboard para delegados**:
   - ✅ **Refactor completo en componentes** (14/08/2026): Dashboard orquestador de 1732 líneas, 5 vistas + 10 modales extraídos.
   - Mejoras de usabilidad (pendiente).

4. **Roadmap de Marucha** (pendiente):
   - Panel para profesores.
   - Panel de ventas.
   - Alertas de pagos.
   - PWA.

---

## Decisiones técnicas recientes
- **Refactor del Dashboard completado** (14/08/2026): el archivo quedó como orquestador de 1732 líneas; todo lo de UI vive en `components/panel/` y la lógica compartida en `lib/panel-types.ts` + `lib/panel-helpers.tsx`.
- **Placeholder de fotos**: se usa 🏆 hasta que el club proporcione imágenes reales.
- **Botón "Compartir"**: usa `navigator.share` en móviles y `clipboard` en desktop.
- **Hero**: se mantiene la cuenta regresiva (usa `restante`) para mantener la funcionalidad existente.

---

## Notas para desarrolladores
- Al agregar fotos reales, reemplazar los placeholders 🏆 en `Home.tsx` y `Historia.tsx`.
- Las fotos deben ir en `public/images/` y usar rutas relativas.
- El badge "¡Este finde!" se muestra solo en el primer partido de la lista (`i === 0`).
- La página `/historia` está ruteada en `App.tsx`.
- El Dashboard es orquestador: las vistas están en `client/src/components/panel/` y los tipos/helpers en `client/src/lib/`. Antes de tocar UI, mirar ahí.
- Para exportar Excel se usa `xlsx` ^0.18.5 (no desinstalar).

---

## Commits recientes (frontend)
- `bd2aa1f`: refactor: extraer modales restantes (Fichas, Delegado, Quota, Gasto, Inactivo) del Dashboard
- `546c324`: refactor: extraer modales PoliSlot, PoliEx e Import del Dashboard
- `510dc93`: refactor: extraer CredencialesModal del Dashboard
- `b75645a`: refactor: extraer PlayerModal del Dashboard
- `862d529`: refactor: extraer PlayerListView del Dashboard
- `398c2f6`: refactor: extraer PresupuestoView del Dashboard
- `784d6e7`: refactor: extraer PoliView del Dashboard
- `db73b71`: refactor: extraer DelegadosView del Dashboard
- `36c16fa`: refactor: extraer CalendarioView del Dashboard
- `820720c`: refactor: extraer helpers compartidos (panel-helpers)
- `57a696c`: refactor: extraer tipos compartidos (panel-types)
- `624fb4e`: feat: exportar plantel a Excel
- `e2b6377`: feat: toasts en el panel
- `784d33a`: feat: agregar badge '¡Este finde!' en próximos partidos
- `71cbe4b`: feat: agregar sección Historia y página /historia con redes sociales
- `9d50779`: feat: mejorar Hero con más impacto visual (con corrección de countdown)
- `fix`: corregir export default en Historia.tsx (deploy fix)

---

**Última actualización**: 14/08/2026