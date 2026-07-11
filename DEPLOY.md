# Deploy Vercel (Admin Webapp)

## SPA: evitar 404 al recargar rutas

Incluye `vercel.json` con rewrite a `index.html`. Tras redeploy, rutas como `/communities` no deben devolver 404 al recargar.

## Firebase / dominio

Si este panel se publica en un dominio Vercel (p. ej. `guardian-web-alpha.vercel.app`):

1. Firebase Console → **Authentication → Settings → Authorized domains** → agrega el host (sin `https://`).
2. Vercel → Environment Variables `VITE_FIREBASE_*` (ver `.env.example`).
3. Redeploy.

Firestore no restringe por dominio de hosting; con Auth + Security Rules basta.
