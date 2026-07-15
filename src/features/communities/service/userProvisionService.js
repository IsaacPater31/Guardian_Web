/**
 * Creación de usuarios oficiales para entidades — Opción "instancia secundaria".
 *
 * `createUserWithEmailAndPassword` inicia sesión automáticamente con el usuario
 * recién creado; si se hiciera sobre la app principal, reemplazaría la sesión
 * del administrador. Por eso se usa una SEGUNDA instancia del SDK (mismo
 * proyecto Firebase, otro contexto de Auth): la cuenta se crea allí, se escribe
 * el perfil + membresía en Firestore y se cierra la sesión secundaria. La
 * sesión del panel admin nunca se toca.
 *
 * Flujo completo:
 *   1. createUserWithEmailAndPassword (instancia secundaria) → Firebase Auth genera el UID
 *   2. users/{uid} → perfil con la misma forma que escribe la app móvil
 *   3. community_members → rol `official` en la entidad
 *   4. signOut de la instancia secundaria
 */
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { Collections } from '@/shared/config/collections';
import { UserFields, MemberFields, CommunityFields } from '@/shared/config/firestoreFields';
import { adminAddCommunityMember } from '@/features/communities/service/communityWriteService';

const SECONDARY_APP_NAME = 'admin-user-provision';

function getSecondaryAuth() {
    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = getApps().some((a) => a.name === SECONDARY_APP_NAME)
        ? getApp(SECONDARY_APP_NAME)
        : initializeApp(config, SECONDARY_APP_NAME);
    return getAuth(app);
}

/**
 * Crea la cuenta en Firebase Auth + perfil en `users/{uid}` + membresía
 * `official` en la entidad indicada.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password — contraseña inicial (el funcionario puede cambiarla luego)
 * @param {string} params.displayName
 * @param {string} params.communityId — entidad a la que se vincula como oficial
 * @returns {Promise<string>} UID del usuario creado
 */
export async function adminCreateOfficialUser({
    email,
    password,
    displayName,
    communityId,
}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(displayName || '').trim();
    if (!cleanEmail || !password || !cleanName) {
        throw new Error('Correo, contraseña y nombre son obligatorios');
    }
    if (!communityId) {
        throw new Error('Debe indicar la entidad a la que pertenece el usuario');
    }
    const communityRef = doc(db, Collections.COMMUNITIES, communityId);
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
        throw new Error('Entidad no encontrada');
    }
    if (communitySnap.data()?.[CommunityFields.isEntity] !== true) {
        throw new Error('Solo se pueden crear oficiales en entidades');
    }

    const secondaryAuth = getSecondaryAuth();
    let uid;
    try {
        const credential = await createUserWithEmailAndPassword(
            secondaryAuth,
            cleanEmail,
            password
        );
        uid = credential.user.uid;
        await updateProfile(credential.user, { displayName: cleanName });
    } catch (e) {
        throw new Error(mapAuthError(e));
    } finally {
        // La sesión secundaria no debe quedar viva; la del admin no se tocó.
        await signOut(secondaryAuth).catch(() => {});
    }

    // Perfil con la misma forma que escribe la app móvil (UserProfileRepository).
    await setDoc(
        doc(db, Collections.USERS, uid),
        {
            [UserFields.name]: cleanName,
            [UserFields.displayName]: cleanName,
            [UserFields.fullName]: cleanName,
            [UserFields.email]: cleanEmail,
            [UserFields.createdAt]: serverTimestamp(),
            [UserFields.updatedAt]: serverTimestamp(),
        },
        { merge: true }
    );

    await adminAddCommunityMember(communityId, uid, MemberFields.roleOfficial);

    return uid;
}

function mapAuthError(e) {
    switch (e?.code) {
        case 'auth/email-already-in-use':
            return 'Este correo ya está registrado.';
        case 'auth/invalid-email':
            return 'Correo no válido.';
        case 'auth/weak-password':
            return 'Contraseña demasiado débil (mínimo 6 caracteres).';
        default:
            return e?.message || 'No se pudo crear el usuario.';
    }
}
