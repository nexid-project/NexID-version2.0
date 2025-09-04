// --- Módulo de Galería para NexID ---
// Importar dependencias y estado desde el módulo principal.
import { supabaseClient, appState, showAlert, buildProfileLayout } from './app.js';

// --- 1. REFERENCIAS A ELEMENTOS DEL DOM DE LA GALERÍA ---
const galleryDOMElements = {
    galleryStyleSelector: document.getElementById('gallery-style-selector'),
    galleryEditorList: document.getElementById('gallery-editor-list'),
    addGalleryImageBtn: document.getElementById('add-gallery-image-btn'),
    galleryImageUploadInput: document.getElementById('gallery-image-upload-input'),
    editModal: document.getElementById('gallery-edit-modal'),
    cropperImage: document.getElementById('gallery-cropper-image'),
    captionInput: document.getElementById('gallery-caption-input'),
    deleteBtn: document.getElementById('gallery-delete-btn'),
    cancelBtn: document.getElementById('gallery-cancel-btn'),
    saveBtn: document.getElementById('gallery-save-btn'),
};

let cropper = null;
let currentFile = null;
let editingImageId = null;

// --- 2. LÓGICA PRINCIPAL ---

/**
 * Abre el modal de edición para una nueva imagen.
 * @param {File} file - El archivo de imagen a editar.
 */
function openEditModalForNewImage(file) {
    currentFile = file;
    editingImageId = null;
    galleryDOMElements.captionInput.value = '';
    galleryDOMElements.deleteBtn.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (event) => {
        galleryDOMElements.cropperImage.src = event.target.result;
        galleryDOMElements.editModal.classList.remove('hidden');
        if(cropper) cropper.destroy();
        cropper = new Cropper(galleryDOMElements.cropperImage, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
        });
    };
    reader.readAsDataURL(file);
}

/**
 * Cierra y resetea el modal de edición.
 */
function closeEditModal() {
    galleryDOMElements.editModal.classList.add('hidden');
    if (cropper) cropper.destroy();
    cropper = null;
    currentFile = null;
    editingImageId = null;
    galleryDOMElements.galleryImageUploadInput.value = ''; // Reset input
}

/**
 * Maneja la selección de archivos del input de subida.
 * Por ahora, solo procesa el primer archivo seleccionado.
 * @param {Event} event - El evento de cambio del input.
 */
function handleImageUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    // TODO: Implementar lógica para manejar múltiples archivos.
    // Por ahora, solo tomamos el primero.
    const firstFile = files[0];
    openEditModalForNewImage(firstFile);
}

/**
 * Procesa y guarda la imagen editada.
 */
async function handleSaveImage() {
    if (!cropper || !currentFile) return;

    galleryDOMElements.saveBtn.disabled = true;
    galleryDOMElements.saveBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>`;

    try {
        const userId = appState.currentUser.id;

        // 1. Obtener datos del recorte para el punto de enfoque
        const cropData = cropper.getData();
        const originalImage = new Image();
        originalImage.src = galleryDOMElements.cropperImage.src;
        await new Promise(resolve => { originalImage.onload = resolve });

        const focusPointY = (cropData.y + cropData.height / 2) / originalImage.naturalHeight;
        const focusPoint = `50% ${Math.round(focusPointY * 100)}%`;

        // 2. Generar y comprimir la miniatura (cuadrada)
        const thumbnailCanvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
        const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve, 'image/webp', 0.9));
        const compressedThumbnail = await imageCompression(thumbnailBlob, { maxSizeMB: 0.1, useWebWorker: true });
        
        // 3. Comprimir la imagen original
        const compressedOriginal = await imageCompression(currentFile, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });

        // 4. Subir ambas imágenes a Supabase Storage
        const originalPath = `${userId}/gallery/${Date.now()}_original.webp`;
        const thumbnailPath = `${userId}/gallery/${Date.now()}_thumb.webp`;

        const { error: originalUploadError } = await supabaseClient.storage.from('gallery-images').upload(originalPath, compressedOriginal, { contentType: 'image/webp' });
        if (originalUploadError) throw originalUploadError;
        
        const { error: thumbnailUploadError } = await supabaseClient.storage.from('gallery-images').upload(thumbnailPath, compressedThumbnail, { contentType: 'image/webp' });
        if (thumbnailUploadError) throw thumbnailUploadError;

        // 5. Obtener URLs públicas
        const { data: { publicUrl: imageUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(originalPath);
        const { data: { publicUrl: thumbnailUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(thumbnailPath);

        // 6. Insertar en la base de datos
        const newImage = {
            user_id: userId,
            image_url: imageUrl,
            image_path: originalPath,
            thumbnail_url: thumbnailUrl,
            thumbnail_path: thumbnailPath,
            caption: galleryDOMElements.captionInput.value,
            focus_point: focusPoint,
            order_index: (appState.myProfile.gallery_images || []).length, // Asignar el siguiente índice
        };

        const { data: savedImage, error: insertError } = await supabaseClient
            .from('gallery_images')
            .insert(newImage)
            .select()
            .single();

        if (insertError) throw insertError;

        // 7. Actualizar el estado local y la UI
        appState.myProfile.gallery_images = [...(appState.myProfile.gallery_images || []), savedImage];
        if (appState.previewProfile) {
            appState.previewProfile.gallery_images = appState.myProfile.gallery_images;
        }

        showAlert('Imagen añadida a la galería.');
        closeEditModal();
        buildProfileLayout(appState.previewProfile || appState.myProfile, true); // Reconstruir para mostrar la nueva imagen

    } catch (error) {
        console.error("Error al guardar la imagen:", error);
        showAlert(`Error al guardar la imagen: ${error.message}`);
    } finally {
        galleryDOMElements.saveBtn.disabled = false;
        galleryDOMElements.saveBtn.textContent = 'Guardar';
    }
}


/**
 * Renderiza las miniaturas de las imágenes en el panel de configuración.
 * @param {Array} images - Un array de objetos de imagen del perfil.
 */
export function renderGalleryEditor(images = []) {
    console.log("Renderizando el editor de la galería con:", images);
    // Próximamente: Lógica para mostrar las imágenes en el panel.
}

/**
 * Renderiza la galería pública en el perfil del usuario.
 * @param {HTMLElement} container - El contenedor donde se renderizará la galería.
 * @param {Object} profileData - Los datos del perfil del usuario.
 */
export function renderPublicGallery(container, profileData) {
    console.log("Renderizando la galería pública.");
    // Próximamente: Lógica para mostrar la galería en el perfil.
}


// --- 3. INICIALIZACIÓN Y MANEJADORES DE EVENTOS ---

function setupEventListeners() {
    galleryDOMElements.addGalleryImageBtn.addEventListener('click', () => {
        galleryDOMElements.galleryImageUploadInput.click();
    });

    galleryDOMElements.galleryImageUploadInput.addEventListener('change', handleImageUpload);
    
    // Event listeners del modal
    galleryDOMElements.saveBtn.addEventListener('click', handleSaveImage);
    galleryDOMElements.cancelBtn.addEventListener('click', closeEditModal);
}

/**
 * Función principal que se exporta para ser llamada desde app.js.
 */
export function initializeGallery() {
    console.log("Módulo de Galería Inicializado.");
    setupEventListeners();
}

