# DESIGN.md — Futsal Club (Club José Hernández)

> Documento de design system consumible por agentes de diseño.
> Estilo base: **High-Contrast Modernism** ("Pitch Dominance") — fondos midnight por niveles, superficies sólidas sin sombras, verde forest como señal de acción. Mobile-first desde 375px.

## Filosofía y reglas no negociables

1. **Sin sombras ni glows**: la profundidad se expresa con *niveles de superficie* (`surface` < `surface-1` < `surface-2`), no con `box-shadow`.
2. **Neón prohibido salvo una excepción**: `action-green` se usa EXCLUSIVAMENTE para el indicador "EN VIVO". Nunca en botones ni hovers.
3. **Verde forest = acción**: `primary` es la única señal de interacción primaria. Hover → `primary-light`.
4. **Mobile-first**: todo componente se diseña y verifica desde 375px de ancho; el desktop es una mejora (`sm:`, `md:`, `lg:`), nunca al revés.
5. **Una sola fuente de verdad**: nunca duplicar árboles de render para "móvil vs desktop"; cambiar la presentación con clases responsive sobre el mismo DOM.
6. **Modo de superficie**: el sitio público **Persuade** (lanza, energía, tipografía display grande); el panel admin **Operate** (datos densos, jerarquía clara, acciones discretas).
7. **Texturas mates**: ruido granulado (`bg-noise`, opacity ≤ 0.04) y líneas de cancha sutiles (`bg-pitch`) como fondo decorativo. Evitar grids decorativos tipo "blueprint".
8. **Motion**: entrada suave y micro-interacciones cortas con `ease-out-soft` (cubic-bezier(0.22,1,0.36,1)). Sin animaciones loop, sin vibración.
9. **Mobile → touch targets**: botones/acciones ≥ 40px en móvil, `active:scale-*` como feedback táctil, `truncate` donde haga falta.

## Design tokens

### Color
| Token | Valor | Uso |
| --- | --- | --- |
| `primary` | `#008f39` | Acción primaria (botones, links, bastones), éxito/estado "al día" |
| `primary-dark` | `#006e2a` | Hero / hover profundos |
| `primary-light` | `#00a342` | Hover de acciones primarias, texto verde legible sobre dark |
| `pitch-deep` | `#00632b` | Detalles cancha / focos profundos |
| `action-green` | `#00ff66` | SOLO indicador "EN VIVO" |
| `accent` | `#FFFFFF` | Detalle del escudo |
| `surface` | `#121414` | Nivel 0 — fondo |
| `surface-1` | `#1e2020` | Nivel 1 — cards / inputs |
| `surface-2` | `#282a2b` | Nivel 2 — modales / hover filas |
| `outline` | `#333535` | Bordes low-contrast |
| Danger (`red-400`/`red-500`) | `#f87171`/`#ef4444` | Deuda, mora, errores, destructivos |
| Warning (`amber-300`/`amber-500`) | `#fcd34d`/`#f59e0b` | Pendiente, formativa, próximo |
| Places | `sky-300`/`purple-300`/`orange-300` | Canchas (La Toma, Borja, Gimnasio) — SOLO cronograma/panel |

### Sistema de color — cómo usarlo (reglas de paleta del club)

La identidad cromática del club es **verde forest + blanco** (escudo). El sistema sigue
**monocromía verde**: el verde `primary` es el ÚNICO color de marca visible en la UI.
Todo lo demás es neutro (`surface`) o semántico de estado. Menos verde = más identidad.

- **El verde habla, el gris estructura.** El fondo casi nunca es verde: los bloques,
  cards y texto viven en la escalera de `surface`/`surface-1`/`surface-2`. El verde
  aparece solo donde hay *identidad o acción*: botones, links, bastón `card--lead`,
  labels de estado, badges. Una vista que "grita" verde está mal hecha.
- **Semáforo del club (thermometer).** Tres estados con lenguaje propio:
  - `primary` = al día / activo / éxito — el verde del club habla por el estado.
  - `amber` = pendiente / formativa / próximo.
  - `red` = deuda / mora / error.
  Regla de render: texto en tono `*-300..400` + fondo `bg-{color}/10..15` + borde
  `border-{color}/30..40`. NUNCA texto de color saturado directo sobre `surface` puro.
- **Éxito = `primary`, no `emerald`.** El "verde de éxito" del club es `primary`/
  `primary-light`. Prohibido usar `emerald`/`teal`/`lime` de Tailwind genérico (no son
  del escudo y desdibujan la monocromía). Un "check de opción correcta" se pinta con
  `primary-light`, no con otra familia verde.
- **Anti-arcoíris funcional.** Los colores de *lugar* (`sky`/`purple`/`orange`) están
  permitidos SOLO para distinguir canchas en cronograma y panel, desaturados
  (`*-300/400` sobre tinte `10%`) y con tope (hoy: 3 lugares + 1 genérico). No se
  agregan colores arbitrarios por sección, categoría ni emoción.
- **Contraste (basado en Material dark + sports color theory).** Todo texto de color
  sobre dark ≥ 4.5:1: usar tonos claros desaturados `100–400` para texto, nunca
  `500+` puro como cuerpo. El `primary` sólido se usa como fondo de botón (texto blanco
  encima), nunca como texto sobre `surface`.
- **Jerarquía de texto por opacidad del blanco.** `white/100` (título) →
  `white/70` (cuerpo) → `white/50` (secundario) → `white/40` (footnotes). Sin grises
  custom fuera de esta rampa.
- **Dorado de títulos = emoji, no token.** El 🏆 y 🥇 son la "herramienta" de los
  logros (uso puntual en hitos/badges). No existe token dorado en UI: la identidad de
  victoria es el verde del escudo, no un color nuevo.
- **Zero hardcode.** Prohibido `text-/bg-/border-[#hex]` fuera de la paleta. Si un
  color se necesita dos veces, se convierte en token. (Excepción conocida: snackbar/loading
  heredado en `App.tsx`.)

### Tipografía (fuentes del club)
| Family | Stack | Uso |
| --- | --- | --- |
| Display | `Epilogue` | Títulos, números hero, logo |
| Body | `Montserrat` | Texto general |
| Mono | `JetBrains Mono` | Labels, datos técnicos, pro-stats |

Escala de títulos típica: `text-5xl md:text-7xl` (hero), `text-3xl/4xl` (secciones), `text-xl/2xl` (subtítulos). Texto secundario a `white/40`–`white/70` sobre fondo `surface`.

### Espaciado y forma
- Radius base: `rounded-lg` (8px). Modales/cards internos pueden usar `rounded-xl`.
- Grilla base: `grid gap-3/4`, cards `p-4/p-6`.
- Bordes: `border-outline` (1px). Espaciado vertical de secciones: `py-16/20/28`.

### Motion
| Token | Valor |
| --- | --- |
| `fade-up` | `0.5s ease-out both` + translateY(12px) |
| `fade-in` | `0.4s ease-out both` |
| `ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Micro-interacción | `active:scale-95/97` (touch), `duration-200` |

## Componentes principales

- **`.btn`** — base rounded-lg px-4 py-2.5, `active:scale-97`, ring `primary/60` en focus.
- **`.btn-primary`** — fondo `primary`, cinta blanca que crece abajo al hover, hover `primary-light`.
- **`.btn-secondary`** — `surface-2` + borde `outline`, cinta `primary-light` al hover.
- **`.card`** — `surface-1` + borde `outline` + `bg-noise`, hover ilumina el borde con `primary/60`.
- **`.card--lead`** — card con bastón lateral `border-l-4 border-l-primary` ("cinta de campeón"), identidad del club.
- **`.card-static`** — sin hover de borde (para contenido).
- **Carátulas públicas (Home/Login/Status/Cronograma)** — Hero `surface` con imagen/escudo, panel lateral verde (`primary-dark`) con título display y texto `white/80`, cuerpo `surface-1`.
- **Panel admin (Dashboard)** — tablas `panel-th`/`panel-tr`, filtros, acciones `row-actions`. En móvil las filas se presentan como tarjetas apiladas SIN duplicar estado; en `md+` como tabla.
- **Badges estado** — chips `bg-{color}/15..25` + texto `{color}-300/400` text-[11px].

## Anti-patterns del proyecto (detector)

El detector `impeccable detect` marca como **no deseados**:
- `border-l-4` como acento lateral SIEMPRE que no sea la `.card--lead` institucional (cinta de campeón). Para señales menores usar badge o `border-l-2`.
- Fondo de rejilla tipo grid-line (Codex) fuera de superficies tipo cancha/tablero; solo se permite `.bg-pitch` sutil.
- Border grueso de color sobre card con esquinas redondeadas (`border-t-2` etc.).