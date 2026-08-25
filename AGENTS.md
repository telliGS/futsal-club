# AGENTS.md — Futsal Club (Club José Hernández)

## Contexto del Proyecto
Sistema de gestión integral para el Club José Hernández (futsal). Combina un sitio público (información del club, eventos, noticias) con un panel de administración interno para gestionar socios, reservas de canchas, equipos, partidos y finanzas.

---

## Stack Tecnológico
| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Backend** | Express + Prisma ORM + PostgreSQL |
| **Autenticación** | JWT (sesiones stateless) |
| **Infraestructura** | Vercel (frontend), Railway/Render (backend) |
| **Integraciones** | TIMBO (adaptador para sistema externo) |

---

## Decisiones Arquitectónicas Clave
- **Separación Frontend/Backend**: Front en `client/`, Back en `server/`. Permite escalar cada capa por separado y desplegar independientemente.
- **Adapter Pattern para TIMBO**: Abstrae la lógica de integración con el sistema externo (TIMBO) en `server/src/adapters/`. Facilita cambios o reemplazos futuros sin afectar el resto del código.
- **RLS (Row Level Security) en PostgreSQL**: 23 políticas de seguridad a nivel de base de datos. Cada usuario ve solo sus datos (socios, reservas, etc.) según su rol.
- **Mobile-First**: Diseño pensado desde 375px de ancho. Rama `mobile-first` para desarrollo específico de móviles.

---

## Arquitectura / Capas
```
futsal-club/
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas (rutas)
│   │   ├── lib/           # Helpers, hooks, servicios
│   │   └── styles/        # Tailwind y estilos globales
│   └── public/            # Assets estáticos
├── server/                # Backend (Express + Prisma)
│   ├── src/
│   │   ├── routes/        # Definición de endpoints
│   │   ├── controllers/   # Lógica de negocio
│   │   ├── adapters/      # Adaptadores (TIMBO, etc.)
│   │   ├── middlewares/   # Autenticación, validación
│   │   └── utils/         # Funciones auxiliares
│   ├── prisma/
│   │   └── schema.prisma  # Modelos de base de datos
│   └── .env               # Variables de entorno (no subir)
└── AGENTS.md              # Este archivo
```

---

## Convenciones

### TypeScript
- `strict: true` en `tsconfig.json`.
- Evitar `any`. Usar `unknown` y type guards cuando sea necesario.
- Interfaces para tipos de datos, types para uniones y utilidades.
- Prefijo `I` para interfaces (ej: `IUser`, `IBooking`).

### Nombrado
- Archivos: `kebab-case.ts` (ej: `user-controller.ts`).
- Componentes React: `PascalCase.tsx` (ej: `UserProfile.tsx`).
- Variables y funciones: `camelCase`.
- Constantes y variables de entorno: `SCREAMING_SNAKE_CASE`.

### Tailwind
- Usar clases utilitarias en el JSX.
- Evitar CSS custom. Preferir `tailwind.config.ts` para temas.
- Usar `cn()` (de `clsx` + `tailwind-merge`) para combinar clases condicionales.

---

## Patrones de Código

### Frontend (React)
- **Componentes**: Funcionales con hooks. Usar `React.FC` solo si es necesario.
- **Estado**: Preferir `useState` y `useReducer` local. Context API para estado global compartido.
- **Llamadas API**: Usar `fetch` con manejo de errores y `try/catch`. Abstraer en `lib/api.ts`.
- **Rutas**: Definir en `client/src/pages/` con Vite Router.

### Backend (Express)
- **Rutas**: Organizar por recurso (ej: `users.routes.ts`, `bookings.routes.ts`).
- **Controladores**: Lógica de negocio, reciben `req` y `res`, devuelven JSON.
- **Prisma**: Usar `prisma.$transaction` para operaciones que involucran múltiples tablas.
- **Errores**: Siempre responder con `{ success: false, error: string }` y código HTTP apropiado.

### Adaptadores (TIMBO)
- Ubicación fija: `server/src/adapters/timbo.adapter.ts`.
- Exponer funciones puras que solo interactúan con la API externa.
- Manejar timeouts y reintentos.

---

## Testing
- Pendiente de definir framework (`vitest` o `jest`).
- Priorizar tests unitarios para servicios y adaptadores.
- Tests de integración para rutas críticas.

---

## Seguridad
- **RLS consolidado**: 23 políticas en PostgreSQL. Nunca deshabilitar.
- **Variables de entorno**: No exponer `.env` en el frontend. Usar variables en el servidor.
- **JWT**: Sesiones firmadas con `NEXTAUTH_SECRET` (o similar). Expiración 7 días.
- **CORS**: Configurar en Express con `cors()` y origen permitido.
- **Sanitización**: Validar inputs con `express-validator` o similar.

---

## Errores Comunes y Soluciones

| Error | Causa | Solución |
| :--- | :--- | :--- |
| `RLS policy violation` | La política de RLS bloquea la consulta | Verificar que el usuario tenga el rol adecuado en la sesión. Revisar las políticas en `prisma` |
| `TIMBO adapter timeout` | El servicio externo no responde (timeout) | Verificar credenciales y conectividad de red. Aumentar timeout en el adapter |
| `Prisma not found` | Migraciones no aplicadas | Ejecutar `npx prisma migrate deploy` en el servidor |
| `CORS error` | El backend no permite el origen del frontend | Configurar `cors({ origin: 'URL_FRONT' })` en Express |
| `Error: Cannot find module '...'` | Dependencia faltante o mal instalada | Ejecutar `npm install` y limpiar `node_modules/.cache` |
| `TypeError: Cannot read properties of undefined` | Acceso a propiedad de objeto undefined | Verificar que los datos existan antes de acceder. Usar optional chaining (`?.`) |

---

## Git y Commits
- Rama principal: `master`.
- Identidad: `telliGS` (configurada localmente).
- Formato de commit: `[tipo]: mensaje corto` (ej: `feat: agregar botón de reserva`).
- No subir archivos de entorno (`.env`), logs o `node_modules`.

---

## Comandos del Proyecto
```bash
# Frontend
cd client
npm run dev         # Servidor de desarrollo (Vite)
npm run build       # Build para producción
npm run preview     # Vista previa del build

# Backend
cd server
npm run dev         # Servidor de desarrollo (nodemon)
npm run build       # Compilar TypeScript
npm run start       # Iniciar en producción
npx prisma migrate dev --name nombre  # Migraciones

# Ambos desde la raíz (si están configurados scripts)
npm run dev:full    # Inicia front + back simultáneamente
```

---

## Reglas Específicas para Futsal Club
- **TIMBO**: Solo tocar `server/src/adapters/timbo.adapter.ts`. No replicar lógica en otros lugares.
- **Mobile-First**: Todo nuevo componente debe probarse en ancho 375px.
- **PowerShell nativo**: Los scripts de desarrollo están escritos para PowerShell (Windows). Evitar comandos Bash en documentación.
- **RLS**: Cualquier cambio en el modelo de datos debe actualizar las políticas RLS correspondientes.
- **Despliegue**: Frontend en Vercel (auto-deploy desde master). Backend manual con `vercel --prod`.
