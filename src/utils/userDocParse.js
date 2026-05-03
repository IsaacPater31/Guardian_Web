/**
 * Lectura normalizada de documentos Firestore `users/{uid}`.
 *
 * **Escritura en móvil (Guardian):** `UserProfileRepository.mergeProfile` escribe
 * `name`, `displayName`, `full_name`, `email`, `created_at`, `updated_at` (merge).
 *
 * **Lectura del nombre en móvil:** `CommunityService._displayName` usa en orden:
 * `name` → `displayName` → parte local del `email` → `'Usuario'`.
 * Aquí replicamos esa prioridad (sin forzar el literal «Usuario» en datos; la UI puede mostrar «—»).
 */
import { UserFields } from '../config/firestoreFields';

export function firstNonEmpty(...candidates) {
    for (const v of candidates) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s !== '') return s;
    }
    return null;
}

/** Parte antes de @, como en Guardian cuando no hay nombre en el doc. */
function emailLocalPart(emailStr) {
    if (emailStr == null || typeof emailStr !== 'string') return null;
    const at = emailStr.indexOf('@');
    if (at <= 0) return null;
    const local = emailStr.slice(0, at).trim();
    return local !== '' ? local : null;
}

/**
 * @param {Record<string, unknown>} d — `doc.data()`
 */
export function extractUserProfileFields(d) {
    const email = firstNonEmpty(d.email, d[UserFields.email], d.userEmail, d.user_email);

    const displayName =
        firstNonEmpty(
            d.name,
            d[UserFields.name],
            d.displayName,
            d[UserFields.displayName],
            d.full_name,
            d[UserFields.fullName],
            d.fullName
        ) ?? emailLocalPart(email);

    const phone = firstNonEmpty(d.phone, d.phoneNumber, d.phone_number, d.mobile);
    const createdAt = d[UserFields.createdAt] ?? d.created_at ?? d.createdAt ?? null;
    const updatedAt = d[UserFields.updatedAt] ?? d.updated_at ?? d.updatedAt ?? null;
    const platformAdmin = d[UserFields.platformAdmin] === true;

    return { displayName, email, phone, createdAt, updatedAt, platformAdmin };
}
