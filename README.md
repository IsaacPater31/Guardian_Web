# Guardian — Monitor de Alertas Comunitarias

Panel web de administración y monitoreo para el ecosistema **Guardian**: visualización de alertas en tiempo real, mapa interactivo geolocalizado y gestión de comunidades.

---

## 🖥️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite |
| Routing | React Router DOM v7 |
| Mapa | Leaflet + React-Leaflet |
| Backend | Firebase Firestore (real-time) |
| Iconos | Lucide React |
| Estilos | Vanilla CSS (design tokens) |

---

## ⚙️ Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd webapp
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con los valores reales de tu proyecto Firebase (ver sección Variables de entorno).

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## 🔐 Variables de Entorno

Todas las variables deben tener el prefijo `VITE_` para que Vite las exponga al cliente.  
**Nunca subas el archivo `.env` al repositorio.** Solo `.env.example` es seguro para commits.

| Variable | Descripción | Dónde encontrarla |
|----------|-------------|-------------------|
| `VITE_FIREBASE_API_KEY` | API Key de Firebase | Firebase Console → ⚙️ Project Settings → Your Apps → Web App → Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación | Mismo lugar |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto | Mismo lugar |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de Storage | Mismo lugar |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Mismo lugar |
| `VITE_FIREBASE_APP_ID` | App ID | Mismo lugar |

---

## 📁 Estructura del Proyecto

```
src/
  components/
    Layout/          # AppLayout, Header, Sidebar
    Map/             # DynamicMarkers, UserLocation, SelectedAlertPanel, MapAlertCountBadge
    AlertCard.jsx
    AlertDetailModal.jsx
    MapLegend.jsx
  pages/
    Dashboard.jsx
    MapPage.jsx
    AlertsPage.jsx
    CommunitiesPage.jsx
    CommunityDetailPage.jsx
  services/
    alertService.js
    communityService.js
  utils/
    mapUtils.js      # Haversine, clustering
    markerIcons.js   # SVG icon factory
  hooks/
    useUserGeolocation.js  # Geolocalizacion por etapas: rapida + precisa
  data/
    emergencyTypes.js
  firebase.js        # Inicialización Firebase (lee de .env)
  App.jsx
  main.jsx
```

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `/dist` |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Análisis estático con ESLint |

---

## 🔒 Seguridad

- Las credenciales Firebase **nunca** están hardcodeadas en el código fuente.
- El archivo `.env` está en `.gitignore` y jamás debe commitearse.
- La seguridad real de los datos la proveen las **Firestore Security Rules** en Firebase Console.
- Las API Keys de Firebase Web son identificadores de proyecto (no secretos de servidor), pero igualmente se mantienen fuera del repositorio como buena práctica.

---

## 📱 App Móvil

La contraparte móvil de Guardian está desarrollada en **Flutter** y comparte la misma base de datos Firestore. Repositorio: `guardian/`

---

## 🗺️ Funcionalidades Principales

- **Dashboard**: estadísticas en vivo (24h), distribución de alertas por tipo
- **Mapa**: render inmediato, geolocalizacion por etapas (rapida + precisa), alertas en tiempo real y boton "Centrar"
- **Alertas**: listado completo con filtros por tipo
- **Comunidades**: directorio de comunidades con miembros, roles y feed de alertas

### Principios de arquitectura aplicados

- **Responsabilidad unica (SRP)**: logica de geolocalizacion en `useUserGeolocation`, panel de alerta en `SelectedAlertPanel` y badge de conteo en `MapAlertCountBadge`.
- **Independencia funcional**: cada modulo del mapa puede evolucionar sin acoplarse a `MapPage`.
