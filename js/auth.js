// js/auth.js

// Importamos las funciones que necesitamos de otros módulos
import { showAlert, debounce } from './ui.js';

/**
 * Inicializa todos los manejadores de eventos relacionados con la autenticación.
 * @param {SupabaseClient} supabase - La instancia del cliente de Supabase.
 * @param {object} appState - El objeto de estado global de la aplicación.
 * @param {function} showPage - Función para cambiar entre páginas.
 * @param {function} renderProfile - Función para renderizar el perfil de usuario.
 * @param {function} listenToUserLinks - Función para escuchar cambios en los enlaces.
 */
export function initAuthEventListeners(supabase, appState, showPage, renderProfile, listenToUserLinks) {

    // --- MANEJADORES DE EVENTOS DE AUTENTICACIÓN ---

    document.getElementById('register-btn').addEventListener('click', async () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        if (!email || !password) return showAlert("Por favor, completa ambos campos.");
        
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                emailRedirectTo: `${window.location.origin}${window.location.pathname}`
            }
        });

        if (error) {
            if (error.message.toLowerCase().includes('user already registered')) {
                showAlert('Ya existe una cuenta con este correo. Por favor, inicia sesión.');
            } else {
                showAlert(`Error al registrar: ${error.message}`);
            }
        } else if (data.user) {
            if (data.user.identities && data.user.identities.length > 0) {
                showAlert("¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.");
            } else {
                showAlert('Ya existe una cuenta con este correo. Hemos reenviado el enlace de confirmación si es necesario.');
            }
        }
    });

    document.getElementById('login-btn').addEventListener('click', async () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        if (!email || !password) return showAlert("Por favor, completa ambos campos.");
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showAlert('Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.');
            } else {
                showAlert(`Error al iniciar sesión: ${error.message}`);
            }
        }
    });

    document.getElementById('google-login-btn').addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${window.location.pathname}`
            }
        });
        if (error) showAlert(`Error con Google: ${error.message}`);
    });

    // --- LÓGICA DE LA PÁGINA DE BIENVENIDA ---

    const welcomeUsernameInput = document.getElementById('welcome-username-input');
    const usernameFeedback = document.getElementById('username-feedback');
    const completeSetupBtn = document.getElementById('complete-setup-btn');

    welcomeUsernameInput.addEventListener('input', debounce(async (e) => {
        const usernameValue = e.target.value.trim().toLowerCase();
        if (usernameValue.length < 3) {
            usernameFeedback.textContent = 'Debe tener al menos 3 caracteres.';
            usernameFeedback.className = 'text-sm mt-2 h-5 text-yellow-400';
            appState.isUsernameAvailable = false;
        } else {
            usernameFeedback.textContent = 'Comprobando...';
            usernameFeedback.className = 'text-sm mt-2 h-5 text-gray-400';
            const { data } = await supabase.from('profiles').select('username').eq('username', `@${usernameValue}`).single();
            if (data) {
                usernameFeedback.textContent = 'Este nombre de usuario ya está en uso.';
                usernameFeedback.className = 'text-sm mt-2 h-5 text-red-400';
                appState.isUsernameAvailable = false;
            } else {
                usernameFeedback.textContent = '¡Nombre de usuario disponible!';
                usernameFeedback.className = 'text-sm mt-2 h-5 text-green-400';
                appState.isUsernameAvailable = true;
            }
        }
        completeSetupBtn.disabled = !appState.isUsernameAvailable;
    }, 500));

    completeSetupBtn.addEventListener('click', async () => {
        if (!appState.isUsernameAvailable) {
            showAlert("El nombre de usuario no es válido o ya está en uso.");
            return;
        }
        const usernameValue = welcomeUsernameInput.value.trim().toLowerCase();
        const displayName = document.getElementById('welcome-display-name-input').value.trim();
        
        const updates = {
            username: `@${usernameValue}`,
            display_name: displayName || usernameValue,
            username_set: true
        };

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', appState.currentUser.id);

        if (error) {
            showAlert(`Error al completar el perfil: ${error.message}`);
        } else {
            const updatedProfile = { ...appState.profile, ...updates };
            appState.profile = updatedProfile;
            appState.myProfile = updatedProfile;

            if (window.location.protocol !== 'blob:') {
                const profileUrl = `${window.location.pathname}?user=${updatedProfile.username.substring(1)}`;
                history.replaceState(null, '', profileUrl);
            }
            
            renderProfile(updatedProfile, true);
            listenToUserLinks(updatedProfile.id);
            showPage('profile');
        }
    });

    // --- LÓGICA DE RECUPERACIÓN DE CONTRASEÑA ---
    document.getElementById('forgot-password-link').addEventListener('click', (e) => { e.preventDefault(); showPage('forgotPassword'); });
    document.getElementById('back-to-login-link').addEventListener('click', (e) => { e.preventDefault(); appState.isRecoveringPassword = false; showPage('auth'); });
    document.getElementById('send-recovery-btn').addEventListener('click', async () => {
        const email = document.getElementById('recovery-email-input').value;
        if (!email) return showAlert('Por favor, introduce tu correo electrónico.');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
        if (error) showAlert(`Error: ${error.message}`);
        else showAlert('Se ha enviado un enlace de recuperación a tu correo.');
    });
    document.getElementById('update-password-btn').addEventListener('click', async () => {
        const newPassword = document.getElementById('update-password-input').value;
        if (newPassword.length < 6) return showAlert('La contraseña debe tener al menos 6 caracteres.');
        if (newPassword !== document.getElementById('update-confirm-password-input').value) return showAlert('Las contraseñas no coinciden.');

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) showAlert(`Error al actualizar la contraseña: ${error.message}`);
        else {
            appState.isRecoveringPassword = false;
            showAlert('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.');
            await supabase.auth.signOut();
            window.location.hash = '';
            showPage('auth');
        }
    });
}
