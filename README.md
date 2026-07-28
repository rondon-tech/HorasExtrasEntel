# Horas Extras Entel

Aplicación web para el registro y cálculo de horas extras, viáticos y liquidaciones de sueldo de técnicos de Entel Chile.  Calcula automáticamente haberes imponibles, descuentos legales (AFP, salud, cesantía), impuesto único de segunda categoría, y bonos por TAD/Contingencia según la legislación laboral chilena.

## Stack

| Capa         | Tecnología                    |
| ------------ | ----------------------------- |
| Frontend     | React 19, TypeScript, Vite 8  |
| Backend      | Node.js, Express 5            |
| Base de datos| PostgreSQL (Neon.tech)        |
| Autenticación| JWT                           |
| Estilo       | CSS custom properties (dark/light) |
| Testing      | Vitest                        |
| Despliegue   | Vercel (serverless)           |

## Requisitos previos

- Node.js ≥ 20
- Cuenta en [Neon.tech](https://neon.tech) (PostgreSQL serverless) o PostgreSQL local

## Configuración inicial

1. Clona el repositorio:

   ```bash
   git clone https://github.com/rondon-tech/HorasExtrasEntel.git
   cd horas-extras-app
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Copia el archivo de variables de entorno de ejemplo:

   ```bash
   cp .env.example .env
   ```

4. Edita `.env` con los valores reales (consulta `.env.example` para la documentación de cada variable):

   - `DATABASE_URL` — cadena de conexión de Neon.tech
   - `JWT_SECRET` — secreto fuerte (genera uno con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `ADMIN_USER` y `ADMIN_PASSWORD` — credenciales de acceso

   **Nunca commitees `.env` a git.**

5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev    # Vite frontend (http://localhost:5173)
   npm run server # Express backend (http://localhost:3001)
   ```

   En desarrollo, Vite redirige `/api` al backend automáticamente.

## Scripts disponibles

| Comando           | Descripción                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Inicia el frontend con HMR (Vite dev server)       |
| `npm run server`  | Inicia el backend Express (solo local)             |
| `npm run build`   | Compila TypeScript y genera el bundle de producción|
| `npm run preview` | Previsualiza el build de producción localmente     |
| `npm run lint`    | Ejecuta el linter (Oxlint)                         |
| `npm test`        | Ejecuta los tests con Vitest                       |

## Despliegue (Vercel)

1. Conecta el repositorio a [Vercel](https://vercel.com).
2. Configura las siguientes **variables de entorno** en Project Settings → Environment Variables:

   | Variable          | Descripción                                  |
   | ----------------- | -------------------------------------------- |
   | `DATABASE_URL`    | Conexión a PostgreSQL (Neon.tech)            |
   | `JWT_SECRET`      | Secreto para firmar tokens JWT (≥ 64 bytes)  |
   | `ADMIN_USER`      | Usuario administrador                        |
   | `ADMIN_PASSWORD`  | Contraseña del administrador                 |
   | `FRONTEND_URL`    | URL del frontend (ej: `https://horas-extras.vercel.app`) |
   | `NODE_ENV`        | `production`                                 |

3. Despliega. Vercel usa `vercel.json` para enrutar `/api/*` al backend serverless y `/*` al frontend.

## Estructura del proyecto

```
horas-extras-app/
├── api/                  # Backend Express (JavaScript)
│   ├── config/           # Validación de variables de entorno
│   ├── middlewares/      # Auth, validación, error handler
│   ├── schemas/          # Schemas Zod para validación de inputs
│   ├── services/         # Lógica de negocio (cálculo de payroll)
│   └── utils/            # Logger (Winston), Money utility
├── src/                  # Frontend React (TypeScript)
│   ├── api/              # Cliente Axios con interceptors JWT
│   ├── components/       # Componentes compartidos
│   ├── constants/        # Constantes (tareas, nemónicos, tipos de día)
│   ├── context/          # AuthContext, AppContext
│   ├── screens/          # Pantallas de la aplicación
│   └── utils/            # Formateo, generación de PDFs
├── .env.example          # Template de variables de entorno
├── vercel.json           # Configuración de Vercel
└── package.json
```

## Seguridad

- Las variables de entorno críticas (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`) son validadas al inicio del servidor. Si faltan, el servidor no arranca.
- Helmet.js configura headers de seguridad HTTP (CSP, HSTS, etc.).
- Rate limiting protege el endpoint de login (5 intentos por IP cada 15 minutos).
- Todos los inputs de texto se sanitizan con `xss`.
- El cuerpo de las peticiones está limitado a 1 MB.
- El token JWT se almacena en el frontend (en una fase futura migrará a HttpOnly cookies).

Para más detalles sobre la remediación de seguridad, consulta `SECURITY_REMEDIATION.md` y el plan completo en `PLAN_REMEDIACION.md`.
