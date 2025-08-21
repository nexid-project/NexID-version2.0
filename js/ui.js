// js/ui.js

// --- FUNCIONES DE UTILIDAD (MODALES, ETC.) ---

// Referencias a los elementos del DOM para los modales
const customAlert = document.getElementById('custom-alert');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertClose = document.getElementById('custom-alert-close');
const customConfirm = document.getElementById('custom-confirm');
const customConfirmMessage = document.getElementById('custom-confirm-message');
const customConfirmOk = document.getElementById('custom-confirm-ok');
const customConfirmCancel = document.getElementById('custom-confirm-cancel');

/**
 * Muestra un modal de alerta simple.
 * @param {string} message El mensaje a mostrar.
 */
export function showAlert(message) {
    customAlertMessage.textContent = message;
    customAlert.classList.remove('hidden');
}
customAlertClose.addEventListener('click', () => customAlert.classList.add('hidden'));

/**
 * Muestra un modal de confirmación con callbacks.
 * @param {string} message El mensaje de confirmación.
 * @param {function} onConfirm La función a ejecutar si el usuario confirma.
 */
export function showConfirm(message, onConfirm) {
    customConfirmMessage.textContent = message;
    customConfirm.classList.remove('hidden');
    
    const handleOk = () => {
        customConfirm.classList.add('hidden');
        onConfirm(true);
        customConfirmOk.removeEventListener('click', handleOk);
        customConfirmCancel.removeEventListener('click', handleCancel);
    };
    const handleCancel = () => {
        customConfirm.classList.add('hidden');
        onConfirm(false);
        customConfirmOk.removeEventListener('click', handleOk);
        customConfirmCancel.removeEventListener('click', handleCancel);
    };

    customConfirmOk.addEventListener('click', handleOk);
    customConfirmCancel.addEventListener('click', handleCancel);
}

/**
 * Crea una función debounced que retrasa la invocación de func.
 * @param {function} func La función a 'debounce'.
 * @param {number} delay El número de milisegundos a esperar.
 * @returns {function} La nueva función debounced.
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

/**
 * Configura un botón para mostrar/ocultar el contenido de un campo de contraseña.
 * @param {string} inputId El ID del input de contraseña.
 * @param {string} toggleId El ID del botón que controla la visibilidad.
 */
function setupPasswordToggle(inputId, toggleId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = document.getElementById(toggleId);
    if (!passwordInput || !toggleButton) return;
    toggleButton.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleButton.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>`;
        lucide.createIcons();
    });
}

/**
 * Ajusta automáticamente la altura de un textarea a su contenido.
 * @param {HTMLElement} element El elemento textarea.
 */
function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
}

/**
 * Inicializa todos los manejadores de eventos genéricos de la UI.
 * @param {object} DOMElements Un objeto con referencias a los elementos del DOM necesarios.
 */
export function initUIEventListeners(DOMElements) {
    // --- LÓGICA DEL ACORDEÓN DE CONFIGURACIÓN ---
    DOMElements.settingsAccordion.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (!header) return;
        const item = header.parentElement;
        const currentlyOpen = DOMElements.settingsAccordion.querySelector('.accordion-item.open');
        if (currentlyOpen && currentlyOpen !== item) currentlyOpen.classList.remove('open');
        item.classList.toggle('open');
        if (item.classList.contains('open') && item.querySelector('#description-input')) {
            setTimeout(() => autoResizeTextarea(DOMElements.descriptionInput), 500);
        }
    });

    // --- LÓGICA DEL PANEL REDIMENSIONABLE (MÓVIL) ---
    const dragger = DOMElements.panelDraggerContainer;
    const panel = DOMElements.settingsPanel;
    const handleDrag = (e) => {
        const newHeight = window.innerHeight - e.touches[0].clientY;
        if (newHeight > window.innerHeight * 0.2 && newHeight < window.innerHeight * 0.9) {
            panel.style.height = `${newHeight}px`;
            if (DOMElements.profilePage) DOMElements.profilePage.style.paddingBottom = `${newHeight}px`;
        }
    };
    const stopDrag = () => {
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('touchend', stopDrag);
    };
    dragger.addEventListener('touchstart', (e) => { e.preventDefault(); document.addEventListener('touchmove', handleDrag); document.addEventListener('touchend', stopDrag); });

    // --- LISTENER PARA TEXTAREA ---
    DOMElements.descriptionInput.addEventListener('input', function() { autoResizeTextarea(this); });
    DOMElements.settingsPanelContent.addEventListener('focusin', (e) => {
        if (window.innerWidth < 640 && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        }
    });

    // --- INICIALIZACIÓN DE ICONOS Y TOGGLES DE CONTRASEÑA ---
    lucide.createIcons(); 
    setupPasswordToggle('password-input', 'auth-password-toggle');
    setupPasswordToggle('current-password-input', 'current-password-toggle');
    setupPasswordToggle('new-password-input', 'new-password-toggle');
    setupPasswordToggle('confirm-password-input', 'confirm-password-toggle');
    setupPasswordToggle('update-password-input', 'update-password-toggle');
    setupPasswordToggle('update-confirm-password-input', 'update-confirm-password-toggle');
    setupPasswordToggle('delete-confirm-password-input', 'delete-confirm-password-toggle');
}
