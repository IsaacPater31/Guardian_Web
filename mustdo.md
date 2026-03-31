# ✅ MUSTDO — Pasos Obligatorios Antes de Subir al Repositorio

> Este archivo describe exactamente qué debes hacer tú después de que los cambios de código estén aplicados.
> Sigue los pasos en orden.

---

## 📋 PASO 1 — Crear tu archivo `.env` local

El archivo `.env` ya fue creado por mí con los valores del proyecto actual, pero **por razones de seguridad NO será commiteado** (está en `.gitignore`).

**Cuando alguien clone el repo por primera vez (incluyendo tú en otra máquina), deberá crearlo manualmente:**

```bash
cp .env.example .env
```

Luego rellena los valores. Aquí está la guía de qué va en cada variable:

---

## 🔑 PASO 2 — ¿Dónde encuentro los valores para `.env`?

Ve a: **[Firebase Console](https://console.firebase.google.com)** → Selecciona tu proyecto `guardian-proyect` → ⚙️ **Project Settings** (engranaje en el menú lateral) → pestaña **"Your apps"** → selecciona la app web → sección **"SDK setup and configuration"** → elige **"Config"**.

Verás algo como:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "guardian-proyect.firebaseapp.com",
  projectId: "guardian-proyect",
  storageBucket: "guardian-proyect.firebasestorage.app",
  messagingSenderId: "100196968...",
  appId: "1:100196968...:web:..."   ← este es el que falta en tu .env actual
};
```

Copia esos valores a tu `.env`:

| Variable en `.env` | Campo en Firebase config |
|--------------------|--------------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` ← **faltaba, agrégalo** |

> ⚠️ **El `VITE_FIREBASE_APP_ID` estaba ausente en tu código original.** Es necesario. Encuéntralo en Firebase Console y agrégalo al `.env`.

---

## 🔐 PASO 3 — Verificar que `.env` NO esté en el repositorio

Antes de hacer cualquier `git add` o commit, verifica:

```bash
git status
```

El archivo `.env` **NO debe aparecer** en la lista de archivos para commit. Si aparece, algo falló con el `.gitignore`. En ese caso, ejecuta:

```bash
git rm --cached .env
```

Y vuelve a verificar con `git status`.

---

## 🧪 PASO 4 — Probar que la app funciona con las variables

```bash
npm run dev
```

Abre `http://localhost:5173`. La app debe:
- Cargar el mapa normalmente
- Mostrar alertas (si hay en Firestore)
- **No mostrar ningún error de Firebase en la consola del navegador**

Si ves un error como `"Firebase: No Firebase App '[DEFAULT]' has been created"` o `"API key not valid"`, revisa que tu `.env` tenga los valores correctos y que Vite haya sido reiniciado después de editar `.env`.

> ⚠️ **Vite no recarga automáticamente los cambios de `.env`.** Siempre detén el servidor (`Ctrl+C`) y vuelve a ejecutar `npm run dev` después de editar `.env`.

---

## 🔒 PASO 5 — Verificar reglas de seguridad en Firestore

Las API Keys de Firebase Web son **identificadores de proyecto**, no secretos de servidor. La verdadera seguridad está en las **Firestore Security Rules**.

Ve a: **Firebase Console** → **Firestore Database** → pestaña **"Rules"**

Asegúrate de que las reglas **no sean** las de desarrollo abierto:

```
// ❌ MUY PELIGROSO — no usar en producción
allow read, write: if true;
```

Las reglas deben requerir autenticación o condiciones específicas, por ejemplo:

```
// ✅ Ejemplo seguro — solo usuarios autenticados
allow read: if request.auth != null;
allow write: if request.auth != null;
```

---

## 📤 PASO 6 — Qué archivos SÍ se suben al repositorio

Antes de tu primer commit, confirma que estos archivos existan y sean correctos:

| Archivo | ¿Se sube? | Notas |
|---------|-----------|-------|
| `.gitignore` | ✅ Sí | Ya actualizado |
| `.env.example` | ✅ Sí | Solo tiene valores vacíos como plantilla |
| `.env` | ❌ NO | Gitignoreado, solo en tu máquina |
| `README.md` | ✅ Sí | Ya actualizado |
| `src/firebase.js` | ✅ Sí | Lee de `import.meta.env`, sin secretos |
| `node_modules/` | ❌ NO | Gitignoreado |
| `dist/` | ❌ NO | Gitignoreado |

---

## 🚀 PASO 7 — Flujo de commit recomendado

```bash
# Verificar qué archivos serán commiteados
git status

# Agregar todo (el .gitignore se encarga de excluir lo sensible)
git add .

# Verificar una última vez antes de commitear
git diff --cached --stat

# Commitear
git commit -m "feat: production-ready webapp setup"
```

---

## 👤 PASO 8 — Para otros desarrolladores que clonen el repo

Comparte con ellos estos pasos:

1. Clonar el repo
2. Ejecutar `npm install`
3. Ejecutar `cp .env.example .env`
4. Pedirte a ti (o al equipo) los valores reales del `.env`
5. Ejecutar `npm run dev`

**Nunca compartas el `.env` en chats públicos, correo sin cifrar, ni en el repo.**

---

*Generado automáticamente por Antigravity — Guardian WebApp v1.0*
