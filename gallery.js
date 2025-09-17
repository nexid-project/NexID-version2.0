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
let currentFile = null; // Almacenará el archivo original al AÑADIR una nueva imagen
let editingImageId = null; // Almacenará el ID de la imagen que se está EDITANDO
let sortableGallery = null;

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

export function initializeGallery(appDependencies) {
    dependencies = appDependencies;
    setupEventListeners();
}

// Abre el modal para AÑADIR una nueva imagen
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentFile = file;
    editingImageId = null; 

    const reader = new FileReader();
    reader.onload = (event) => {
        openEditModal(event.target.result);
    };
    reader.readAsDataURL(file);
}

// <<-- INICIO: NUEVA FUNCIÓN PARA EDITAR IMAGEN EXISTENTE -->>
// Abre el modal para EDITAR una imagen existente
async function openModalForEditing(imageId) {
    const { appState, showAlert } = dependencies;
    const imageToEdit = appState.galleryImages.find(img => img.id == imageId);
    if (!imageToEdit) return showAlert("No se pudo encontrar la imagen para editar.");

    editingImageId = imageId;
    currentFile = null; // No estamos subiendo un archivo nuevo

    openEditModal(imageToEdit.image_url, imageToEdit.caption);
}
// <<-- FIN: NUEVA FUNCIÓN PARA EDITAR IMAGEN EXISTENTE -->>


function openEditModal(imageSrc, caption = '') {
    DOMElements.captionInput.value = caption;
    // Muestra el botón de eliminar solo si estamos editando una imagen existente
    DOMElements.deleteBtn.classList.toggle('hidden', !editingImageId);
    DOMElements.editModal.classList.remove('hidden');

    const img = DOMElements.cropperImage;
    // Necesario para que el navegador permita cargar y recortar una imagen de otro dominio (Supabase)
    img.crossOrigin = "Anonymous"; 
    
    img.onload = () => {
        if (galleryCropper) galleryCropper.destroy();
        galleryCropper = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
        });
    };
    
    img.src = imageSrc;
}

function closeEditModal() {
    DOMElements.editModal.classList.add('hidden');
    if (galleryCropper) galleryCropper.destroy();
    galleryCropper = null;
    currentFile = null;
    editingImageId = null;
    DOMElements.galleryImageUploadInput.value = '';
}


// <<-- INICIO: LÓGICA DE GUARDADO MEJORADA (AÑADIR vs EDITAR) -->>
async function handleSaveImage() {
    if (!galleryCropper) return;

    DOMElements.saveBtn.disabled = true;
    DOMElements.saveBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>`;

    try {
        if (editingImageId) {
            await updateExistingImage();
        } else {
            await addNewImage();
        }
    } catch (error) {
        console.error("Error al guardar la imagen:", error);
        dependencies.showAlert(`Error al guardar la imagen: ${error.message}`);
    } finally {
        DOMElements.saveBtn.disabled = false;
        DOMElements.saveBtn.textContent = 'Guardar';
        closeEditModal();
    }
}

async function addNewImage() {
    const { supabaseClient, appState, showAlert, buildProfileLayout } = dependencies;
    const userId = appState.currentUser.id;

    // Generar y comprimir imágenes
    const cropData = galleryCropper.getData();
    const originalImage = DOMElements.cropperImage;
    const focusPointY = (cropData.y + cropData.height / 2) / originalImage.naturalHeight;
    const focusPoint = `50% ${Math.round(focusPointY * 100)}%`;

    const thumbnailCanvas = galleryCropper.getCroppedCanvas({ width: 512, height: 512 });
    const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve, 'image/webp', 0.9));
    const compressedThumbnail = await imageCompression(thumbnailBlob, { maxSizeMB: 0.1, useWebWorker: true });
    const compressedOriginal = await imageCompression(currentFile, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });

    // Subir a Supabase
    const originalPath = `${userId}/gallery/${Date.now()}_original.webp`;
    const thumbnailPath = `${userId}/gallery/${Date.now()}_thumb.webp`;
    await supabaseClient.storage.from('gallery-images').upload(originalPath, compressedOriginal);
    await supabaseClient.storage.from('gallery-images').upload(thumbnailPath, compressedThumbnail);

    // Obtener URLs públicas
    const { data: { publicUrl: imageUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(originalPath);
    const { data: { publicUrl: thumbnailUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(thumbnailPath);

    // Insertar en la base de datos
    const newImage = {
        user_id: userId,
        image_url: imageUrl, image_path: originalPath,
        thumbnail_url: thumbnailUrl, thumbnail_path: thumbnailPath,
        caption: DOMElements.captionInput.value,
        focus_point: focusPoint,
        order_index: appState.galleryImages.length,
    };
    const { data: savedImage, error } = await supabaseClient.from('gallery_images').insert(newImage).select().single();
    if (error) throw error;

    // Actualizar UI
    appState.galleryImages.push(savedImage);
    renderGalleryEditor(appState.galleryImages);
    buildProfileLayout(appState.previewProfile || appState.myProfile, true);
    showAlert('Imagen añadida a la galería.');
}

async function updateExistingImage() {
    const { supabaseClient, appState, showAlert, buildProfileLayout } = dependencies;
    const imageToUpdate = appState.galleryImages.find(img => img.id == editingImageId);
    if (!imageToUpdate) throw new Error("La imagen a actualizar no fue encontrada.");
    
    // Generar y comprimir la NUEVA miniatura
    const cropData = galleryCropper.getData();
    const originalImage = DOMElements.cropperImage;
    const focusPointY = (cropData.y + cropData.height / 2) / originalImage.naturalHeight;
    const focusPoint = `50% ${Math.round(focusPointY * 100)}%`;

    const thumbnailCanvas = galleryCropper.getCroppedCanvas({ width: 512, height: 512 });
    const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve, 'image/webp', 0.9));
    const compressedThumbnail = await imageCompression(thumbnailBlob, { maxSizeMB: 0.1, useWebWorker: true });

    // Subir la nueva miniatura
    const newThumbnailPath = `${appState.currentUser.id}/gallery/${Date.now()}_thumb.webp`;
    await supabaseClient.storage.from('gallery-images').upload(newThumbnailPath, compressedThumbnail);
    const { data: { publicUrl: newThumbnailUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(newThumbnailPath);
    
    // Eliminar la miniatura antigua del Storage
    if (imageToUpdate.thumbnail_path) {
        await supabaseClient.storage.from('gallery-images').remove([imageToUpdate.thumbnail_path]);
    }

    // Actualizar el registro en la base de datos
    const updates = {
        thumbnail_url: newThumbnailUrl,
        thumbnail_path: newThumbnailPath,
        caption: DOMElements.captionInput.value,
        focus_point: focusPoint,
    };
    const { data: updatedImage, error } = await supabaseClient.from('gallery_images').update(updates).eq('id', editingImageId).select().single();
    if (error) throw error;

    // Actualizar el estado local y la UI
    const index = appState.galleryImages.findIndex(img => img.id == editingImageId);
    if (index !== -1) appState.galleryImages[index] = updatedImage;
    
    renderGalleryEditor(appState.galleryImages);
    buildProfileLayout(appState.previewProfile || appState.myProfile, true);
    showAlert('Imagen actualizada correctamente.');
}
// <<-- FIN: LÓGICA DE GUARDADO MEJORADA -->>


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

export function renderPublicGallery(container, profileData, images = [], activeIndex = 0) {
    container.innerHTML = '';
    if (!images || images.length === 0) return;

    const style = profileData.gallery_style || 'rectangular';
    let galleryHTML = '';

    if (style === 'cuadrada') {
        const imageCount = images.length;
        const gridItemsHTML = images.slice(0, 6).map((img, index) => `
            <div class="gallery-grid-item" data-index="${index}" title="${img.caption || ''}">
                <img src="${img.thumbnail_url || img.image_url}" alt="${img.caption || `Imagen ${index + 1}`}">
            </div>
        `).join('');
        
        galleryHTML = `<div class="gallery-container-adaptive gallery-${imageCount}">${gridItemsHTML}</div>`;

    } else { // Estilo rectangular
        const mainImage = images[activeIndex];
        const thumbnailsHTML = images.length > 1 ? images.map((img, index) => `
            <button class="gallery-thumbnail ${index === activeIndex ? 'active' : ''}" data-index="${index}">
                <img src="${img.thumbnail_url}" alt="Miniatura ${index + 1}">
            </button>
        `).join('') : '';

        galleryHTML = `
            <div class="gallery-container-rectangular">
                <div class="gallery-main-image" data-index="${activeIndex}">
                    <img id="gallery-main-img" src="${mainImage.image_url}" style="object-position: ${mainImage.focus_point || 'center'};" alt="Imagen principal de la galería">
                    <p id="gallery-main-caption" class="gallery-caption">${mainImage.caption || ''}</p>
                </div>
                ${images.length > 1 ? `<div class="gallery-thumbnails-strip">${thumbnailsHTML}</div>` : ''}
            </div>
        `;
    }

    container.innerHTML = galleryHTML;
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

            const updates = appState.galleryImages.map((image, index) => ({
                id: image.id,
                order_index: index,
                user_id: appState.currentUser.id
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
                return;
            }

            // <<-- INICIO: NUEVA LÓGICA PARA EDITAR -->>
            const thumbnail = e.target.closest('.gallery-editor-thumbnail');
            if (thumbnail) {
                const imageId = thumbnail.dataset.id;
                openModalForEditing(imageId);
            }
            // <<-- FIN: NUEVA LÓGICA PARA EDITAR -->>
        });
    }

    // <<-- AÑADIDO: Evento para el botón de eliminar DENTRO del modal -->>
    if (DOMElements.deleteBtn) {
        DOMElements.deleteBtn.addEventListener('click', () => {
            if (editingImageId) {
                handleDeleteImage(editingImageId);
                closeEditModal();
            }
        });
    }
}

