/**
 * Administración de usuarios (perfil Firestore + membresías).
 * Suspensión de cuenta (sin Cloud Functions / sin tocar Auth).
 */
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    deleteField,
} from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { UserFields } from '@/shared/config/firestoreFields';
import { extractUserProfileFields } from '@/shared/utils/userDocParse';

/**
 * @param {string} userId
 */
export async function getUserById(userId) {
    if (!userId) return null;
    const snap = await getDoc(doc(db, Collections.USERS, userId));
    if (!snap.exists()) return null;
    return {
        id: snap.id,
        ...extractUserProfileFields(snap.data() || {}),
    };
}

/**
 * Actualiza nombre y teléfono (campos editables acordados).
 * @param {string} userId
 * @param {{ displayName?: string, phone?: string }} patch
 */
export async function adminUpdateUserProfile(userId, patch) {
    if (!userId) throw new Error('Usuario no indicado');
    const ref = doc(db, Collections.USERS, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    const data = {};
    if (patch.displayName !== undefined) {
        const name = String(patch.displayName || '').trim();
        if (!name) throw new Error('El nombre no puede estar vacío');
        data[UserFields.name] = name;
        data[UserFields.displayName] = name;
        data[UserFields.fullName] = name;
    }
    if (patch.phone !== undefined) {
        const phone = String(patch.phone || '').trim();
        data[UserFields.phone] = phone || null;
    }
    data[UserFields.updatedAt] = serverTimestamp();
    await updateDoc(ref, data);
}

/**
 * Suspende la cuenta: no podrá entrar a Guardian ni Usersweb.
 * Conserva perfil, membresías, reportes y alertas.
 * @param {string} userId
 */
export async function adminSuspendUser(userId) {
    if (!userId) throw new Error('Usuario no indicado');
    const ref = doc(db, Collections.USERS, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    await updateDoc(ref, {
        [UserFields.suspended]: true,
        [UserFields.suspendedAt]: serverTimestamp(),
        [UserFields.updatedAt]: serverTimestamp(),
    });
}

/**
 * Reactiva una cuenta suspendida.
 * @param {string} userId
 */
export async function adminUnsuspendUser(userId) {
    if (!userId) throw new Error('Usuario no indicado');
    const ref = doc(db, Collections.USERS, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    await updateDoc(ref, {
        [UserFields.suspended]: false,
        [UserFields.suspendedAt]: deleteField(),
        [UserFields.updatedAt]: serverTimestamp(),
    });
}
