// --- IMPORTACIONES DESDE app.js ---
// Este módulo ya no importa desde app.js para evitar dependencias circulares.
// En su lugar, recibe las dependencias a través de la función initializeGallery.

// --- 1. DEPENDENCIAS Y ESTADO LOCAL ---
let dependencies = {
    supabaseClient: null,
    appState: null,
    showAlert: null,
    showConfirm: null,
    buildProfileLayout: null,
    DOMElements: null,
    updateLivePreview: null,
    markSettingsAsDirty: null,
    openImageZoomModal: null,
};
let galleryCropper = null;
let currentFile = null;
let editingImageId = null;
let sortableGallery = null; // Instancia de SortableJS para la galería

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

        const cropData = galleryCropper.getData();
        const originalImage = new Image();
        originalImage.src = DOMElements.cropperImage.src;
        await new Promise(resolve => { originalImage.onload = resolve });

        const focusPointY = (cropData.y + cropData.height / 2) / originalImage.naturalHeight;
        const focusPoint = `50% ${Math.round(focusPointY * 100)}%`;

        const thumbnailCanvas = galleryCropper.getCroppedCanvas({ width: 512, height: 512 });
        const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve, 'image/webp', 0.9));
        const compressedThumbnail = await imageCompression(thumbnailBlob, { maxSizeMB: 0.1, useWebWorker: true });

        const compressedOriginal = await imageCompression(currentFile, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });

        const originalPath = `${userId}/gallery/${Date.now()}_original.webp`;
        const thumbnailPath = `${userId}/gallery/${Date.now()}_thumb.webp`;

        await supabaseClient.storage.from('gallery-images').upload(originalPath, compressedOriginal, { contentType: 'image/webp' });
        await supabaseClient.storage.from('gallery-images').upload(thumbnailPath, compressedThumbnail, { contentType: 'image/webp' });

        const { data: { publicUrl: imageUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(originalPath);
        const { data: { publicUrl: thumbnailUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(thumbnailPath);

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

        appState.galleryImages.push(savedImage);

        renderGalleryEditor(appState.galleryImages);
        buildProfileLayout(appState.previewProfile || appState.myProfile, true);

        showAlert('Imagen añadida a la galería.');
        closeEditModal();

    } catch (error) {
        console.error("Error al guardar la imagen:", error);
        showAlert(`Error al guardar la imagen: ${error.message}`);
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
            <img src="${image.thumbnail_url || image.image_url}" class="w-full h-full object-cover pointer-events-none rounded-md">
            <button class="delete-thumb-btn absolute top-1 right-1" data-id="${image.id}">
                <i data-lucide="x-circle" class="w-5 h-5 pointer-events-none"></i>
            </button>
        `;
        listEl.appendChild(item);
    });

    updateAddImageButtonState();
    initializeSortableGallery();
    lucide.createIcons();
}

export function renderPublicGallery(container, profileData, images = []) {
    container.innerHTML = '';
    if (!images || images.length === 0) return;

    const style = profileData.gallery_style || 'rectangular';
    let galleryHTML = '';

    if (style === 'cuadrada') {
        const gridItemsHTML = images.slice(0, 6).map((img, index) => `
            <div class="gallery-grid-item" data-index="${index}" title="${img.caption || ''}">
                <img src="${img.thumbnail_url || img.image_url}" alt="${img.caption || `Imagen ${index + 1}`}">
            </div>
        `).join('');

        galleryHTML = `<div class="gallery-grid-container">${gridItemsHTML}</div>`;

    } else { // Estilo rectangular
        const mainImage = images[0];
        const thumbnailsHTML = images.length > 1 ? images.map((img, index) => `
            <button class="gallery-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${img.thumbnail_url}" alt="Miniatura ${index + 1}">
            </button>
        `).join('') : '';

        galleryHTML = `
            <div class="gallery-container-rectangular">
                <div class="gallery-main-image" data-index="0">
                    <img id="gallery-main-img" src="${mainImage.image_url}" style="object-position: ${mainImage.focus_point || 'center'};" alt="Imagen principal de la galería">
                    <p id="gallery-main-caption" class="gallery-caption">${mainImage.caption || ''}</p>
                </div>
                ${images.length > 1 ? `<div class="gallery-thumbnails-strip">${thumbnailsHTML}</div>` : ''}
            </div>
        `;
    }

    container.innerHTML = galleryHTML;

    // Lógica de Event Listeners
    if (style === 'cuadrada') {
        container.addEventListener('click', (e) => {
            const gridItem = e.target.closest('.gallery-grid-item');
            if (gridItem) {
                const index = parseInt(gridItem.dataset.index, 10);
                dependencies.openImageZoomModal(images, index);
            }
        });
    } else {
        const mainImgContainer = container.querySelector('.gallery-main-image');
        const mainImg = container.querySelector('#gallery-main-img');
        const mainCaption = container.querySelector('#gallery-main-caption');
        const thumbnailsContainer = container.querySelector('.gallery-thumbnails-strip');

        if (mainImgContainer) {
            mainImgContainer.addEventListener('click', () => {
                 const index = parseInt(mainImgContainer.dataset.index, 10);
                 dependencies.openImageZoomModal(images, index);
            });
        }
        
        if (thumbnailsContainer) {
            thumbnailsContainer.addEventListener('click', (e) => {
                const thumbnail = e.target.closest('.gallery-thumbnail');
                if (!thumbnail) return;

                thumbnailsContainer.querySelector('.active')?.classList.remove('active');
                thumbnail.classList.add('active');

                const index = parseInt(thumbnail.dataset.index, 10);
                const selectedImage = images[index];

                mainImgContainer.dataset.index = index;
                mainImg.src = selectedImage.image_url;
                mainImg.style.objectPosition = selectedImage.focus_point || 'center';
                mainCaption.textContent = selectedImage.caption || '';
            });
        }
    }
}


function updateAddImageButtonState() {
    const { appState } = dependencies;
    const canUpload = (appState.galleryImages || []).length < 6;
    DOMElements.addGalleryImageBtn.disabled = !canUpload;
    DOMElements.addGalleryImageBtn.textContent = canUpload
        ? `Añadir Imágenes (${(appState.galleryImages || []).length}/6)`
        : 'Galería Llena (6/6)';
}

async function handleDeleteImage(imageId) {
    const { supabaseClient, appState, showAlert, showConfirm, buildProfileLayout } = dependencies;
    const imageToDelete = appState.galleryImages.find(img => img.id == imageId);
    if (!imageToDelete) return;

    showConfirm("¿Estás seguro de que quieres eliminar esta imagen?", async (confirmed) => {
        if (!confirmed) return;

        try {
            const pathsToRemove = [imageToDelete.image_path, imageToDelete.thumbnail_path].filter(Boolean);
            if (pathsToRemove.length > 0) {
                await supabaseClient.storage.from('gallery-images').remove(pathsToRemove);
            }

            await supabaseClient.from('gallery_images').delete().eq('id', imageId);

            appState.galleryImages = appState.galleryImages.filter(img => img.id != imageId);

            renderGalleryEditor(appState.galleryImages);
            buildProfileLayout(appState.previewProfile || appState.myProfile, true);

            showAlert('Imagen eliminada correctamente.');

        } catch (error) {
            console.error("Error al eliminar la imagen:", error);
            showAlert(`No se pudo eliminar la imagen: ${error.message}`);
        }
    });
}

function initializeSortableGallery() {
    const listEl = DOMElements.galleryEditorList;
    if (!listEl) return;
    if (sortableGallery) sortableGallery.destroy();

    sortableGallery = new Sortable(listEl, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async () => {
            const { appState, supabaseClient, showAlert, buildProfileLayout } = dependencies;
            
            const newOrderIds = Array.from(listEl.children).map(item => item.dataset.id);

            appState.galleryImages.sort((a, b) => newOrderIds.indexOf(String(a.id)) - newOrderIds.indexOf(String(b.id)));
            buildProfileLayout(appState.previewProfile || appState.myProfile, true);

            // <<-- CORRECCIÓN: Se añade el user_id a los datos de actualización -->>
            const updates = appState.galleryImages.map((image, index) => ({
                id: image.id,
                order_index: index,
                user_id: appState.currentUser.id // Asegura que la política RLS se cumpla
            }));

            const { error } = await supabaseClient.from('gallery_images').upsert(updates);

            if (error) {
                console.error("Supabase upsert error object:", error);
                showAlert(`Error al guardar. Revisa la consola (Code: ${error.code})`);
            }
        },
    });
}

function setupEventListeners() {
    DOMElements.addGalleryImageBtn.addEventListener('click', () => {
        DOMElements.galleryImageUploadInput.click();
    });

    DOMElements.galleryImageUploadInput.addEventListener('change', handleFileSelect);
    DOMElements.saveBtn.addEventListener('click', handleSaveImage);
    DOMElements.cancelBtn.addEventListener('click', closeEditModal);

    if (DOMElements.galleryStyleSelector) {
        DOMElements.galleryStyleSelector.addEventListener('click', (e) => {
            const button = e.target.closest('.gallery-style-btn');
            if (!button) return;

            const { updateLivePreview, markSettingsAsDirty, appState } = dependencies;
            if (!appState.previewProfile) return;

            DOMElements.galleryStyleSelector.querySelectorAll('.gallery-style-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            appState.previewProfile.gallery_style = button.dataset.value;
            markSettingsAsDirty();
            updateLivePreview();
        });
    }

    if (DOMElements.galleryEditorList) {
        DOMElements.galleryEditorList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-thumb-btn');
            if (deleteButton) {
                const imageId = deleteButton.dataset.id;
                handleDeleteImage(imageId);
            }
        });
    }
}

