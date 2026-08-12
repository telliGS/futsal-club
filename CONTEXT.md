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

## Estado actual (12/08/2026 — después de mejoras visuales)

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

---

## Roadmap (actualizado 12/08/2026)

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

3. **Dashboard para delegados** (se prioriza después de lo público):
   - Refactorizar en componentes más pequeños (postergado).
   - Mejoras de usabilidad (postergado).

4. **Roadmap de Marucha** (pendiente):
   - Panel para profesores.
   - Panel de ventas.
   - Alertas de pagos.
   - PWA.

---

## Decisiones técnicas recientes
- **No refactorizar el Dashboard por ahora**: se prioriza el contenido público y la identidad del club.
- **Placeholder de fotos**: se usa 🏆 hasta que el club proporcione imágenes reales.
- **Botón "Compartir"**: usa `navigator.share` en móviles y `clipboard` en desktop.
- **Hero**: se mantiene la cuenta regresiva (usa `restante`) para mantener la funcionalidad existente.

---

## Notas para desarrolladores
- Al agregar fotos reales, reemplazar los placeholders 🏆 en `Home.tsx` y `Historia.tsx`.
- Las fotos deben ir en `public/images/` y usar rutas relativas.
- El badge "¡Este finde!" se muestra solo en el primer partido de la lista (`i === 0`).
- La página `/historia` está ruteada en `App.tsx`.

---

## Commits recientes (frontend)
- `784d33a`: feat: agregar badge '¡Este finde!' en próximos partidos
- `71cbe4b`: feat: agregar sección Historia y página /historia con redes sociales
- `9d50779`: feat: mejorar Hero con más impacto visual (con corrección de countdown)
- `fix`: corregir export default en Historia.tsx (deploy fix)

---

**Última actualización**: 12/08/2026