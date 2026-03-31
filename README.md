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
    Map/             # DynamicMarkers, UserLocation, SelectedAlertPanel,
                     # MapAlertCountBadge, RequestLocationOnFirstInteraction
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
    useUserGeolocation.js  # Geolocalización con cache de última posición
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

En producción (por ejemplo en `https://guardian-web-alpha.vercel.app/`) el cliente solo ve:

- Configuración Firebase leída desde variables `VITE_…`.
- Datos de Firestore según reglas de seguridad.
- Sin ningún secreto de servidor ni tokens privados.

---

## 📱 App Móvil

La contraparte móvil de Guardian está desarrollada en **Flutter** y comparte la misma base de datos Firestore. Repositorio: `guardian/`

---

## 🗺️ Funcionalidades Principales

- **Dashboard**: estadísticas en vivo (24h), distribución de alertas por tipo.
- **Mapa**:
  - Render inmediato con centro en la última ubicación conocida (cache local).
  - Solicitud de geolocalización al montar (centrado rápido en el usuario si el navegador lo permite).
  - Botón de “Centrar en mi ubicación” y reintentos explícitos.
  - Muestra alertas recientes con ubicación (incluyendo entidades oficiales como Policía/Bomberos).
  - Leyenda de tipos de alerta colapsable y responsive.
- **Alertas**: listado completo con filtros por tipo
- **Comunidades**:
  - Directorio de comunidades y entidades oficiales.
  - Vista de detalle con pestañas `Alertas` y `Miembros`.
  - Enriquecimiento de nombres de miembros desde `users`/alertas cuando `community_members` no trae displayName.
  - Cuando una comunidad ya no existe, se muestra como **“Comunidad eliminada o inexistente”**.

### Principios de arquitectura aplicados

- **Responsabilidad única (SRP)**:
  - `useUserGeolocation`: geolocalización (solicitud + cache de última posición).
  - `DynamicMarkers`: cálculo y pintado de marcadores (usa `mapUtils` para offsets/clusterización).
  - `SelectedAlertPanel`: panel inferior de alerta seleccionada.
  - `MapAlertCountBadge`: solo badge de conteo de alertas visibles en el mapa.
  - `RequestLocationOnFirstInteraction`: dispara geolocalización solo en gestos de usuario sobre el mapa.
- **Independencia funcional**:
  - `MapPage` se limita a orquestar servicios y componentes (no contiene lógica de Firestore ni de Leaflet).
  - Servicios (`alertService`, `communityService`) son stateless y reutilizables desde otras vistas.
  - Componentes de layout (`Sidebar`, `Header`, `AppLayout`) no dependen de la lógica de dominio.
- **Accesibilidad**:
  - Colores del sidebar ajustados para cumplir contraste mínimo WCAG 2 AA.
  - Área principal envuelta en `<main role="main">` para ofrecer landmark claro a lectores de pantalla.
