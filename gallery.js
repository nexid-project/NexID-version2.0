// --- Módulo de Galería para NexID ---
// Este módulo ya no importa desde app.js para evitar dependencias circulares.
// En su lugar, recibe las dependencias a través de la función initializeGallery.

// --- 1. DEPENDENCIAS Y ESTADO LOCAL ---
let dependencies = {
    supabaseClient: null,
    appState: null,
    showAlert: null,
    buildProfileLayout: null,
    DOMElements: null,
};
let galleryCropper = null;
let currentFile = null;
let editingImageId = null;

// --- 2. REFERENCIAS AL DOM DE LA GALERÍA ---
const DOMElements = {
    galleryStyleSelector: document.getElementById('gallery-style-selector'),
    galleryEditorList: document.getElementById('gallery-editor-list'),
    addGalleryImageBtn: document.getElementById('add-gallery-image-btn'),
    galleryImageUploadInput: document.getElementById('gallery-image-upload-input'),
    
    // Modal de Edición
    editModal: document.getElementById('gallery-edit-modal'),
    cropperImage: document.getElementById('gallery-cropper-image'),
    captionInput: document.getElementById('gallery-caption-input'),
    deleteBtn: document.getElementById('gallery-delete-btn'),
    cancelBtn: document.getElementById('gallery-cancel-btn'),
    saveBtn: document.getElementById('gallery-save-btn'),
};

// --- 3. FUNCIONES PRINCIPALES ---

/**
 * Inicializa el módulo de la galería, recibe las dependencias desde app.js.
 * @param {object} appDependencies - Las dependencias que necesita el módulo.
 */
export function initializeGallery(appDependencies) {
    dependencies = appDependencies;
    setupEventListeners();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    editingImageId = null; 

    const reader = new FileReader();
    reader.onload = (event) => {
        DOMElements.cropperImage.src = event.target.result;
        openEditModal(file);
        
        if (galleryCropper) galleryCropper.destroy();
        
        galleryCropper = new Cropper(DOMElements.cropperImage, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
        });
    };
    reader.readAsDataURL(file);
}

function openEditModal(file) {
    currentFile = file;
    DOMElements.captionInput.value = '';
    DOMElements.deleteBtn.classList.add('hidden');
    DOMElements.editModal.classList.remove('hidden');
}

function closeEditModal() {
    DOMElements.editModal.classList.add('hidden');
    if (galleryCropper) galleryCropper.destroy();
    galleryCropper = null;
    currentFile = null;
    editingImageId = null;
    DOMElements.galleryImageUploadInput.value = '';
}

async function handleSaveImage() {
    if (!galleryCropper || !currentFile) return;

    DOMElements.saveBtn.disabled = true;
    DOMElements.saveBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>`;

    try {
        const { supabaseClient, appState, showAlert, buildProfileLayout } = dependencies;
        const userId = appState.currentUser.id;

        // 1. Obtener datos del recorte para el punto de enfoque
        const cropData = galleryCropper.getData();
        const originalImage = new Image();
        originalImage.src = DOMElements.cropperImage.src;
        await new Promise(resolve => { originalImage.onload = resolve });

        const focusPointY = (cropData.y + cropData.height / 2) / originalImage.naturalHeight;
        const focusPoint = `50% ${Math.round(focusPointY * 100)}%`;

        // 2. Generar y comprimir la miniatura (cuadrada)
        const thumbnailCanvas = galleryCropper.getCroppedCanvas({ width: 512, height: 512 });
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
            caption: DOMElements.captionInput.value,
            focus_point: focusPoint,
            order_index: (appState.galleryImages || []).length,
        };

        const { data: savedImage, error: insertError } = await supabaseClient
            .from('gallery_images')
            .insert(newImage)
            .select()
            .single();

        if (insertError) throw insertError;

        // 7. Actualizar el estado local y la UI
        appState.galleryImages.push(savedImage);

        showAlert('Imagen añadida a la galería.');
        closeEditModal();
        buildProfileLayout(appState.previewProfile || appState.myProfile, true);

    } catch (error) {
        console.error("Error al guardar la imagen:", error);
        dependencies.showAlert(`Error al guardar la imagen: ${error.message}`);
    } finally {
        DOMElements.saveBtn.disabled = false;
        DOMElements.saveBtn.textContent = 'Guardar';
    }
}

export function renderGalleryEditor(images = []) {
    const listEl = DOMElements.galleryEditorList;
    if (!listEl) return;
    listEl.innerHTML = ''; 

    (images || []).forEach(image => {
        const item = document.createElement('div');
        item.className = 'gallery-editor-thumbnail relative group';
        item.dataset.id = image.id;
        item.innerHTML = `
            <img src="${image.thumbnail_url || image.image_url}" class="w-full h-full object-cover pointer-events-none">
            <button class="delete-thumb-btn absolute top-1 right-1" data-id="${image.id}">
                <i data-lucide="x-circle" class="w-5 h-5 pointer-events-none"></i>
            </button>
        `;
        listEl.appendChild(item);
    });
    
    updateAddImageButtonState();
    lucide.createIcons();
}

export function renderPublicGallery(container, profileData, images = []) {
    container.innerHTML = '';
    if (!images || images.length === 0) return;

    const style = profileData.gallery_style || 'rectangular';
    const mainImage = images[0];

    const thumbnailsHTML = images.map((img, index) => `
        <button class="gallery-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${img.thumbnail_url}" alt="Miniatura ${index + 1}">
        </button>
    `).join('');

    let galleryHTML = '';

    if (style === 'cuadrada') {
        galleryHTML = `
            <div class="gallery-container-square">
                <div class="gallery-main-image-square">
                    <img id="gallery-main-img" src="${mainImage.image_url}" style="object-position: ${mainImage.focus_point || 'center'};" alt="Imagen principal de la galería">
                    <p id="gallery-main-caption" class="gallery-caption">${mainImage.caption || ''}</p>
                </div>
                <div class="gallery-thumbnails-vertical">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    } else { 
        galleryHTML = `
            <div class="gallery-container-rectangular">
                <div class="gallery-main-image">
                    <img id="gallery-main-img" src="${mainImage.image_url}" style="object-position: ${mainImage.focus_point || 'center'};" alt="Imagen principal de la galería">
                    <p id="gallery-main-caption" class="gallery-caption">${mainImage.caption || ''}</p>
                </div>
                <div class="gallery-thumbnails-strip">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    }

    container.innerHTML = galleryHTML;

    const mainImg = container.querySelector('#gallery-main-img');
    const mainCaption = container.querySelector('#gallery-main-caption');
    const thumbnailsContainer = container.querySelector('.gallery-thumbnails-strip, .gallery-thumbnails-vertical');

    if (thumbnailsContainer) {
        thumbnailsContainer.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.gallery-thumbnail');
            if (!thumbnail) return;

            thumbnailsContainer.querySelector('.active')?.classList.remove('active');
            thumbnail.classList.add('active');

            const index = parseInt(thumbnail.dataset.index, 10);
            const selectedImage = images[index];

            mainImg.src = selectedImage.image_url;
            mainImg.style.objectPosition = selectedImage.focus_point || 'center';
            mainCaption.textContent = selectedImage.caption || '';
        });
    }
}

function updateAddImageButtonState() {
    const canUpload = (dependencies.appState.galleryImages || []).length < 6;
    DOMElements.addGalleryImageBtn.disabled = !canUpload;
    DOMElements.addGalleryImageBtn.textContent = canUpload 
        ? `Añadir Imágenes (${(dependencies.appState.galleryImages || []).length}/6)` 
        : 'Galería Llena (6/6)';
}

function setupEventListeners() {
    DOMElements.addGalleryImageBtn.addEventListener('click', () => {
        DOMElements.galleryImageUploadInput.click();
    });

    DOMElements.galleryImageUploadInput.addEventListener('change', handleFileSelect);
    DOMElements.saveBtn.addEventListener('click', handleSaveImage);
    DOMElements.cancelBtn.addEventListener('click', closeEditModal);
}

