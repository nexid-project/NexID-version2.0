const { createClient } = supabase;

// --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
const SUPABASE_URL = 'https://ukowtlaytmqgdhjygulq.supabase.co';	
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrb3d0bGF5dG1xZ2RoanlndWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTEyMTgsImV4cCI6MjA2OTIyNzIxOH0.Kmg90Xdcu0RzAP55YwwuYfuRYj2U5LU90KAiKbEtLQg';

const backgroundLibraryUrls = [
	'https://ukowtlaytmqgdhjygulq.supabase.co/storage/v1/object/public/library-backgrounds//wallpaperflare.com_wallpaper.jpg',
	'https://placehold.co/1920x1080/1E40AF/FFFFFF?text=Fondo+2',
	'https://placehold.co/1920x1080/991B1B/FFFFFF?text=Fondo+3',
	'https://placehold.co/1920x1080/166534/FFFFFF?text=Fondo+4',
	'https://placehold.co/1920x1080/854D0E/FFFFFF?text=Fondo+5',
	'https://placehold.co/1920x1080/581C87/FFFFFF?text=Fondo+6',
	'https://placehold.co/1920x1080/9D174D/FFFFFF?text=Fondo+7',
	'https://placehold.co/1920x1080/374151/FFFFFF?text=Fondo+8',
];

let supabaseClient;

// --- Lógica de carga dinámica de fuentes ---
const fontMap = {
	'font-inter': { name: 'Inter (Sans-serif)', query: 'Inter:wght@400;500;700' },
	'font-lora': { name: 'Lora (Serif)', query: 'Lora:wght@400;500;700' },
	'font-roboto-mono': { name: 'Roboto Mono (Mono)', query: 'Roboto+Mono:wght@400;500;700' },
	'font-playfair-display': { name: 'Playfair Display (Serif)', query: 'Playfair+Display:wght@400;500;700' },
	'font-poppins': { name: 'Poppins (Sans-serif)', query: 'Poppins:wght@400;500;700' },
	'font-jetbrains-mono': { name: 'JetBrains Mono (Mono)', query: 'JetBrains+Mono:wght@400;500;700' },
	'font-lato': { name: 'Lato (Sans-serif)', query: 'Lato:wght@400;700' },
	'font-montserrat': { name: 'Montserrat (Sans-serif)', query: 'Montserrat:wght@400;500;700' },
	'font-oswald': { name: 'Oswald (Condensed)', query: 'Oswald:wght@400;500;700' },
	'font-lobster': { name: 'Lobster (Cursive)', query: 'Lobster:wght@400' },
};
const loadedFonts = new Set(['font-inter']);

function loadFontIfNeeded(fontClass) {
	if (!fontClass || loadedFonts.has(fontClass)) return;
	const fontData = fontMap[fontClass];
	if (!fontData) return;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `https://fonts.googleapis.com/css2?family=${fontData.query.replace(/ /g, "+")}&display=swap`;
	document.head.appendChild(link);
	loadedFonts.add(fontClass);
}

// --- 2. ESTADO GLOBAL DE LA APLICACIÓN ---
let appState = {
	currentUser: null,
	myProfile: null,
	profile: null,
	links: [],
    galleryImages: [],
	socialButtons: [],
	tempBackgroundImagePath: null,
	tempLayoutOrder: null,
	subscriptions: { auth: null, links: null },
	sortable: { layout: null, gallery: null },
	cropper: null,
    thumbnailCropper: null,
    editingGalleryImageId: null,
	isUsernameAvailable: false,
	isSettingsDirty: false,
	isDesignModeActive: false,
	isRecoveringPassword: false
};

// --- 3. REFERENCIAS A ELEMENTOS DEL DOM ---
const DOMElements = {
	loadingPage: document.getElementById('loading-page'),
	authPage: document.getElementById('auth-page'),
	welcomePage: document.getElementById('welcome-page'),
	profilePage: document.getElementById('profile-page'),
	forgotPasswordPage: document.getElementById('forgot-password-page'),
	updatePasswordPage: document.getElementById('update-password-page'),
	reactivateAccountPage: document.getElementById('reactivate-account-page'),
	settingsPanel: document.getElementById('settings-panel'),
	settingsPanelContent: document.getElementById('settings-panel-content'),
	panelDraggerContainer: document.getElementById('panel-dragger-container'),
	settingsOverlay: document.getElementById('settings-overlay'),
	imageUploadInput: document.getElementById('image-upload-input'),
	cropperModal: document.getElementById('cropper-modal'),
	cropperImage: document.getElementById('cropper-image'),
    thumbnailCropperModal: document.getElementById('thumbnail-cropper-modal'),
    thumbnailCropperImage: document.getElementById('thumbnail-cropper-image'),
    galleryEditModal: document.getElementById('gallery-edit-modal'),
	geminiModal: document.getElementById('gemini-modal'),
	uploadBackgroundBtn: document.getElementById('upload-background-btn'),
	backgroundUploadInput: document.getElementById('background-upload-input'),
	openLibraryBtn: document.getElementById('open-library-btn'),
	libraryModal: document.getElementById('library-modal'),
	libraryGrid: document.getElementById('library-grid'),
	libraryCloseBtn: document.getElementById('library-close-btn'),
	themeTabsContainer: document.getElementById('theme-tabs'),
	globalBackground: document.getElementById('global-background'),
	searchContainer: document.getElementById('search-container'),
	searchInput: document.getElementById('search-input'),
	searchIconBtn: document.getElementById('search-icon-btn'),
	searchResults: document.getElementById('search-results'),
	backToMyProfileBtn: document.getElementById('back-to-my-profile-btn'),
	settingsAccordion: document.getElementById('settings-accordion'),
	removeBackgroundBtn: document.getElementById('remove-background-btn'),
	descriptionInput: document.getElementById('description-input'),
	contentWrapper: document.querySelector('#profile-page .content-wrapper'),
	customFontSelector: document.getElementById('custom-font-selector'),
	fontSelectorBtn: document.getElementById('font-selector-btn'),
	fontSelectorLabel: document.getElementById('font-selector-label'),
	fontSelectorOptions: document.getElementById('font-selector-options'),
	fontFamilyValue: document.getElementById('font-family-value'),
    registerModal: document.getElementById('register-modal'),
    showRegisterModalBtn: document.getElementById('show-register-modal-btn'),
    createAccountBtn: document.getElementById('create-account-btn'),
    backToLoginLink: document.getElementById('back-to-login-link'),
    registerEmailInput: document.getElementById('register-email-input'),
    registerPasswordInput: document.getElementById('register-password-input'),
    registerConfirmPasswordInput: document.getElementById('register-confirm-password-input'),
    featuredVideoUrlInput: document.getElementById('featured-video-url-input'),
    galleryEditorList: document.getElementById('gallery-editor-list'),
    addGalleryImageBtn: document.getElementById('add-gallery-image-btn'),
    galleryImageUploadInput: document.getElementById('gallery-image-upload-input'),
};

// --- 4. FUNCIONES DE UTILIDAD (MODALES, ETC.) ---
const customAlert = document.getElementById('custom-alert');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertClose = document.getElementById('custom-alert-close');
function showAlert(message) {
	customAlertMessage.textContent = message;
	customAlert.classList.remove('hidden');
}
customAlertClose.addEventListener('click', () => customAlert.classList.add('hidden'));

const customConfirm = document.getElementById('custom-confirm');
const customConfirmMessage = document.getElementById('custom-confirm-message');
const customConfirmOk = document.getElementById('custom-confirm-ok');
const customConfirmCancel = document.getElementById('custom-confirm-cancel');
function showConfirm(message, onConfirm) {
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

function debounce(func, delay) {
	let timeout;
	return function(...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(context, args), delay);
	};
}

function isValidUrl(string) {
	const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
	return urlRegex.test(string);
}

function extractUsername(input, socialKey) {
    if (!input) return '';
    let username = input.trim();
    if (socialKey === 'whatsapp') {
        return input.replace(/\D/g, '');
    }
    try {
        const url = new URL(username.startsWith('http') ? username : `https://${username}`);
        const pathParts = url.pathname.split('/').filter(part => part && part !== 'in' && part !== 'c');
        if (pathParts.length > 0) {
            username = pathParts[pathParts.length - 1];
        }
    } catch (e) {
        // Not a URL, it's a username
    }
    return username.split('?')[0].replace(/[/]/g, '').replace('@', '');
}

// --- 5. LÓGICA PRINCIPAL DE LA APLICACIÓN ---

function initializeApp() {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('TU_SUPABASE_URL')) {
		showAlert('CONFIGURACIÓN NECESARIA: Por favor, añade tus claves de API de Supabase en el código y sigue las instrucciones de la base de datos.');
		showPage('auth');
		return;
	}
	
	supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	populateIconGrid();
	populateFontSelector();
	
	if (appState.subscriptions.auth) {
		appState.subscriptions.auth.unsubscribe();
	}

	if (window.location.hash.includes('type=recovery')) {
		appState.isRecoveringPassword = true;
	}
	
	appState.subscriptions.auth = supabaseClient.auth.onAuthStateChange((event, session) => {
		if (event === 'PASSWORD_RECOVERY') {
			appState.isRecoveringPassword = true;
			showPage('updatePassword');
		} else {
			handleAuthStateChange(session);
		}
	});
}

async function fetchUserProfileWithRetry(userId, retries = 3, delay = 500) {
	for (let i = 0; i < retries; i++) {
		const { data: profile, error } = await supabaseClient
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (profile) {
			return { profile, error: null };
		}
		
		if (error && error.code === 'PGRST116') {
			await new Promise(res => setTimeout(res, delay));
		} else {
			return { profile: null, error };
		}
	}
	return { profile: null, error: { message: "Profile not found after multiple attempts." } };
}

async function handleAuthStateChange(session) {
	if (appState.isRecoveringPassword) return;

	if (appState.isSettingsDirty && DOMElements.settingsPanel.classList.contains('open')) {
		return;
	}

	if (appState.subscriptions.links) appState.subscriptions.links.unsubscribe();
	
	appState.currentUser = null;
	appState.myProfile = null;

	const urlParams = new URLSearchParams(window.location.search);
	const publicUsername = urlParams.get('user');
	
	const mainHeader = document.getElementById('main-header');

	if (session?.user) {
		appState.currentUser = session.user;
		mainHeader.classList.remove('hidden');
		
		const { profile: myProfile, error: myProfileError } = await fetchUserProfileWithRetry(appState.currentUser.id);

		if (myProfileError) {
			console.error("Error fetching profile:", myProfileError);
			showAlert("No se pudo cargar tu perfil. Por favor, intenta recargar la página.");
			showPage('auth');
			return;
		}
		
		appState.myProfile = myProfile;

		if (myProfile.is_deactivated) {
			const deletionDate = new Date(myProfile.deletion_scheduled_at);
			deletionDate.setDate(deletionDate.getDate() + 30);
			document.getElementById('deletion-date').textContent = deletionDate.toLocaleDateString();
			showPage('reactivateAccount');
			return;
		}

        const { data: galleryImages } = await supabaseClient.from('gallery_images').select('*').eq('user_id', appState.currentUser.id).order('order_index', { ascending: true });
        appState.galleryImages = galleryImages || [];

		if (publicUsername && myProfile.username && myProfile.username !== `@${publicUsername}`) {
			const backBtn = document.getElementById('back-to-my-profile-btn');
			backBtn.classList.remove('hidden');
			backBtn.href = `${window.location.pathname}?user=${myProfile.username.substring(1)}`;
			loadPublicProfile(publicUsername);
		} else {
			document.getElementById('back-to-my-profile-btn').classList.add('hidden');
			appState.profile = myProfile;
			const { data: links } = await supabaseClient.from('links').select('*').eq('user_id', appState.currentUser.id).order('order_index', { ascending: true });
			appState.links = links || [];
			appState.socialButtons = myProfile.social_buttons || [];
			
			if (myProfile && myProfile.username_set) {
				if (window.location.protocol !== 'blob:') {
					const profileUrl = `${window.location.pathname}?user=${myProfile.username.substring(1)}`;
					history.replaceState(null, '', profileUrl);
				}
				renderProfile(myProfile, true);
				renderLinksEditor(appState.links);
                renderGalleryEditor();
				listenToUserLinks(myProfile.id);
				showPage('profile');
			} else {
				if (window.location.protocol !== 'blob:') {
					history.replaceState(null, '', window.location.pathname);
				}
				showPage('welcome');
			}
		}
	} else if (publicUsername) {
		mainHeader.classList.add('hidden');
		loadPublicProfile(publicUsername);
	} else {
		mainHeader.classList.add('hidden');
		document.getElementById('email-input').value = '';
		document.getElementById('password-input').value = '';
		showPage('auth');
        
        const urlParamsOnLoad = new URLSearchParams(window.location.search);
        if (urlParamsOnLoad.get('action') === 'register') {
            DOMElements.registerModal.classList.remove('hidden');
        }
	}
}

async function loadPublicProfile(username) {
	try {
		const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('username', `@${username}`).single();
		if (profileError || !profile || profile.is_deactivated) {
			showPage('profile');
			document.getElementById('profile-layout-container').innerHTML = '<h1 class="text-3xl font-bold text-center">Usuario no encontrado</h1>';
			return;
		}
		
		const { data: links } = await supabaseClient.from('links').select('*').eq('user_id', profile.id).order('order_index', { ascending: true });
        const { data: galleryImages } = await supabaseClient.from('gallery_images').select('*').eq('user_id', profile.id).order('order_index', { ascending: true });

		appState.profile = profile;
		appState.links = links || [];
        appState.galleryImages = galleryImages || [];
		appState.socialButtons = profile.social_buttons || [];
		
		const isOwner = appState.currentUser && appState.currentUser.id === profile.id;
		renderProfile(profile, isOwner);
		showPage('profile');

	} catch (error) {
		showAlert("Ocurrió un error al cargar el perfil.");
	}
}

async function refreshLinks() {
	if (!appState.currentUser) return;
	const { data: linksData, error: linksError } = await supabaseClient
		.from('links')
		.select('*')
		.eq('user_id', appState.currentUser.id)
		.order('order_index', { ascending: true });

	if (linksError) {
        console.error("Error refreshing links:", linksError);
        return;
    }
	
	appState.links = linksData || [];
	
	renderLinksEditor(appState.links);
    updateLivePreview();
}

function listenToUserLinks(userId) {
	if (appState.subscriptions.links) appState.subscriptions.links.unsubscribe();
	
	appState.subscriptions.links = supabaseClient
		.channel(`public:links:user_id=eq.${userId}`)
		.on('postgres_changes',	{ event: '*', schema: 'public', table: 'links' },	() => refreshLinks())
		.subscribe();
}


// --- 6. FUNCIONES DE RENDERIZADO ---

function showPage(pageName) {
	Object.values(DOMElements).forEach(el => {
		if (el && el.id && (el.id.endsWith('-page'))) el.classList.add('hidden');
	});
	if (DOMElements[`${pageName}Page`]) {
		DOMElements[`${pageName}Page`].classList.remove('hidden');
	}
	DOMElements.globalBackground.style.opacity = pageName === 'profile' ? '1' : '0';
}

function parseVideoUrl(url) {
    if (!url) return null;
    let embedUrl = null;
    try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(fullUrl);

        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            const videoId = urlObj.hostname.includes('youtu.be')
                ? urlObj.pathname.slice(1)
                : urlObj.searchParams.get('v');
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (urlObj.hostname.includes('vimeo.com')) {
            const videoId = urlObj.pathname.split('/').pop();
            if (videoId && /^\d+$/.test(videoId)) {
                 embedUrl = `https://player.vimeo.com/video/${videoId}`;
            }
        }
    } catch (error) {
        console.error("Invalid video URL:", error);
        return null;
    }
    return embedUrl;
}

const profileSectionTemplates = {
	'profile-image': (profileData, isOwner) => `
		<div data-section="profile-image" class="draggable-item flex justify-center items-center p-2">
			<div class="relative">
				<img id="public-profile-img" src="${profileData.profile_image_url || 'https://placehold.co/128x128/7f9cf5/1F2937?text=...'}" alt="Foto de perfil" class="w-32 h-32 rounded-full border-4 shadow-lg object-cover">
				${isOwner ? `<button id="edit-profile-img-btn" class="absolute bottom-1 right-1 bg-gray-800 bg-opacity-70 p-2 rounded-full text-white hover:bg-opacity-100 transition-colors"><i data-lucide="camera" class="w-5 h-5"></i></button>` : ''}
				<div id="image-actions-container" class="absolute top-1/2 -translate-y-1/2 left-full ml-4 flex flex-col items-center gap-3"></div>
			</div>
		</div>`,
	'display-name': (profileData) => {
		if (profileData.display_name && profileData.display_name.trim() !== '' && profileData.display_name.trim() !== 'Nombre de Perfil') {
			return `<div data-section="display-name" class="text-center draggable-item p-2"><h1 id="public-display-name" class="text-3xl font-bold">${profileData.display_name}</h1></div>`;
		}
		return '';
	},
	'username': (profileData) => `<div data-section="username" class="text-center draggable-item p-2"><p id="public-username" class="text-lg opacity-80">${profileData.username || ''}</p></div>`,
	'description': (profileData) => `<div data-section="description" class="text-center draggable-item p-2"><p id="public-description" class="opacity-90">${profileData.description || ''}</p></div>`,
    'featured-video': (profileData) => {
        if (parseVideoUrl(profileData.featured_video_url)) {
            return `<div data-section="featured-video" class="draggable-item p-2"></div>`;
        }
        return '';
    },
    'gallery': () => {
        if (appState.galleryImages && appState.galleryImages.length > 0) {
            return `<div data-section="gallery" id="gallery-container" class="draggable-item p-2"></div>`;
        }
        return '';
    },
	'social-buttons': () => {
        if (appState.profile.social_buttons && appState.profile.social_buttons.length > 0) {
            return `<section id="social-buttons-section" data-section="social-buttons" class="draggable-item p-2"></section>`;
        }
        return '';
    },
	'socials': () => {
        if (appState.profile.socials && Object.keys(appState.profile.socials).length > 0) {
            return `<footer id="socials-footer" data-section="socials" class="pt-4 pb-2 draggable-item p-2"></footer>`;
        }
        return '';
    }
};

function renderSingleLink(linkData, profileData) {
	const buttonStyle = profileData.button_style || 'filled';
	const buttonShape = profileData.button_shape_style || 'rounded-lg';
	
	let iconHtml = '';
	if (linkData.icon_tag) {
		iconHtml = `<i data-lucide="${linkData.icon_tag}" class="w-6 h-6"></i>`;
	} else {
		const socialIconSvg = getSocialIconForUrl(linkData.url);
		if (socialIconSvg) iconHtml = socialIconSvg;
	}

	let linkClasses = ['public-link-button', 'font-medium', 'py-3', 'px-5', 'w-full', 'flex', 'items-center'];
	if (buttonShape !== 'underline') linkClasses.push(`btn-${buttonStyle}`);
	linkClasses.push(buttonShape);
	
	const linkContent = iconHtml 
		? `<span class="w-6 h-6">${iconHtml}</span><span class="flex-grow text-center">${linkData.title}</span><span class="w-6 h-6"></span>`
		: `<span class="flex-grow text-center">${linkData.title}</span>`;

	const linkHtml = `<a href="#" draggable="false" data-url="${linkData.url}" data-link-id="${linkData.id}" rel="noopener noreferrer" class="${linkClasses.join(' ')}">${linkContent}</a>`;

	return `<div data-section="link_${linkData.id}" class="draggable-item my-2">${linkHtml}</div>`;
}

function renderProfile(profileData, isOwner) {
	if (!profileData) return;
	
	const theme = profileData.theme || 'grafito';
	const font = profileData.font_family || 'font-inter';
	
	loadFontIfNeeded(font);
	
	document.body.className = `bg-gray-900 text-white min-h-screen overflow-x-hidden theme-${theme}`;
	DOMElements.globalBackground.className = `theme-${theme}`;
	DOMElements.profilePage.className = `px-4 sm:px-6 ${font}`;
	
	if (appState.isDesignModeActive) DOMElements.profilePage.classList.add('design-mode');
	
	const backgroundImageUrl = profileData.background_image_url || '';
	const overlayOpacity = profileData.background_overlay_opacity ?? 0.4;

	if (backgroundImageUrl) {
		DOMElements.globalBackground.style.backgroundImage = `linear-gradient(rgba(var(--overlay-rgb), ${overlayOpacity}), rgba(var(--overlay-rgb), ${overlayOpacity})), url('${backgroundImageUrl}')`;
		DOMElements.globalBackground.style.backgroundColor = 'var(--background)';
	} else {
		DOMElements.globalBackground.style.backgroundImage = 'none';
		DOMElements.globalBackground.style.backgroundColor = 'var(--background)';
	}

	const layoutContainer = document.getElementById('profile-layout-container');
	layoutContainer.innerHTML = '';
	
	const allSections = ["profile-image", "display-name", "username", "description", "featured-video", "gallery", "social-buttons", "socials"];
	let layoutOrder = appState.tempLayoutOrder || profileData.layout_order || [...allSections];

    allSections.forEach(section => {
        if (!layoutOrder.includes(section)) {
            const socialsIndex = layoutOrder.indexOf('socials');
            if (socialsIndex !== -1) {
                layoutOrder.splice(socialsIndex, 0, section);
            } else {
                layoutOrder.push(section);
            }
        }
    });

	const linksIndex = layoutOrder.indexOf('links');
	if (linksIndex !== -1) {
		const linkIds = appState.links.map(link => `link_${link.id}`);
		layoutOrder.splice(linksIndex, 1, ...linkIds);
	}

	layoutOrder.forEach(sectionId => {
		if (profileSectionTemplates[sectionId]) {
			layoutContainer.innerHTML += profileSectionTemplates[sectionId](profileData, isOwner);
		} else if (sectionId.startsWith('link_')) {
			const linkId = sectionId.replace('link_', '');
			const linkData = appState.links.find(l => String(l.id) === linkId);
			if (linkData) {
				layoutContainer.innerHTML += renderSingleLink(linkData, profileData);
			}
		}
	});

    const galleryContainer = layoutContainer.querySelector('#gallery-container');
    if (galleryContainer) {
        renderImmersiveGallery(appState.galleryImages);
    }
    const videoContainer = layoutContainer.querySelector('[data-section="featured-video"]');
    if (videoContainer) {
        const embedUrl = parseVideoUrl(profileData.featured_video_url);
        if (embedUrl) {
            videoContainer.innerHTML = `
                <div class="video-wrapper">
                    <iframe class="w-full h-full rounded-lg absolute inset-0" src="${embedUrl}" title="Video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
        }
    }
    const socialButtonsContainer = layoutContainer.querySelector('#social-buttons-section');
    if (socialButtonsContainer) {
        renderSocialButtons(profileData.social_buttons);
    }
    const socialsFooterContainer = layoutContainer.querySelector('#socials-footer');
    if (socialsFooterContainer) {
        renderSocialIcons(profileData.socials, profileData.socials_order);
    }

	if (!appState.currentUser) {
		layoutContainer.innerHTML += `
			<div class="mt-8 text-center">
				 <a href="/app.html" class="join-nexid-button inline-flex items-center justify-center py-3 px-8 font-bold text-lg rounded-full transition-transform duration-200 hover:scale-110">
					Únete a NexID
				</a>
			</div>
		`;
	}

	if (isOwner) {
		const editProfileImgBtn = document.getElementById('edit-profile-img-btn');
		if(editProfileImgBtn) editProfileImgBtn.addEventListener('click', (e) => { e.stopPropagation(); DOMElements.imageUploadInput.click(); });
	}

	renderProfileActions(profileData);
	
	updateContainerVisibilityInDesignMode(profileData);

	const isDesignMode = DOMElements.profilePage.classList.contains('design-mode');
	document.getElementById('user-actions').classList.toggle('hidden', !isOwner || isDesignMode);
	document.getElementById('layout-actions').classList.toggle('hidden', !isDesignMode);

	lucide.createIcons();
}

function updateContainerVisibilityInDesignMode(profileData) {
	if (!appState.isDesignModeActive) return;
	
    const isEmpty = (data) => !data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0);

    const descriptionContainer = document.querySelector('[data-section="description"]');
	if (descriptionContainer) descriptionContainer.classList.toggle('is-empty', !profileData.description || profileData.description.trim() === '');
	
    const socialButtonsContainer = document.querySelector('[data-section="social-buttons"]');
	if (socialButtonsContainer) socialButtonsContainer.classList.toggle('is-empty', isEmpty(profileData.social_buttons));
	
    const socialsFooterContainer = document.querySelector('[data-section="socials"]');
	if (socialsFooterContainer) socialsFooterContainer.classList.toggle('is-empty', isEmpty(profileData.socials));
    
    const videoContainer = document.querySelector('[data-section="featured-video"]');
    if(videoContainer) videoContainer.classList.toggle('is-empty', !parseVideoUrl(profileData.featured_video_url));

    const galleryContainer = document.querySelector('[data-section="gallery"]');
    if(galleryContainer) galleryContainer.classList.toggle('is-empty', isEmpty(appState.galleryImages));
}

function renderLinksEditor(links) {
	const linksListEditor = document.getElementById('links-list-editor');
	linksListEditor.innerHTML = '';
	(links || []).forEach(link => {
		const linkEl = document.createElement('div');
		linkEl.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-md';
		linkEl.dataset.id = link.id;
		
		let iconHtml = '';
		if (link.icon_tag) {
			iconHtml = `<i data-lucide="${link.icon_tag}" class="w-5 h-5"></i>`;
		} else {
			const socialIconSvg = getSocialIconForUrl(link.url);
			if (socialIconSvg) iconHtml = socialIconSvg;
		}

		const leftSide = document.createElement('div');
		leftSide.className = 'flex items-center gap-3 overflow-hidden';

		const editTrigger = document.createElement('div');
		editTrigger.className = 'edit-link-trigger flex-grow overflow-hidden';
		editTrigger.dataset.id = link.id;
		editTrigger.dataset.title = link.title;
		editTrigger.dataset.url = link.url;
		editTrigger.dataset.icon = link.icon_tag || '';

		const titleDiv = document.createElement('div');
		titleDiv.className = 'font-semibold truncate';
		titleDiv.textContent = link.title;

		const urlP = document.createElement('p');
		urlP.className = 'text-sm text-gray-400 truncate';
		urlP.textContent = link.url;

		editTrigger.appendChild(titleDiv);
		editTrigger.appendChild(urlP);
		
		if (iconHtml) {
			const iconWrapper = document.createElement('div');
			iconWrapper.className = 'flex-shrink-0 text-white';
			iconWrapper.innerHTML = iconHtml;
			leftSide.appendChild(iconWrapper);
		}
		leftSide.appendChild(editTrigger);

		const rightSide = document.createElement('div');
		rightSide.className = 'flex items-center gap-3 flex-shrink-0';
		rightSide.innerHTML = `
			<div class="flex items-center gap-1 text-cyan-400" title="Clics totales">
				<i data-lucide="bar-chart-2" class="w-4 h-4"></i>
				<span class="font-bold text-sm">${link.click_count || 0}</span>
			</div>
			<button data-id="${link.id}" class="delete-link-btn p-2 text-red-500 hover:text-red-400"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
		`;

		linkEl.appendChild(leftSide);
		linkEl.appendChild(rightSide);
		linksListEditor.appendChild(linkEl);
	});
	lucide.createIcons();
}

const socialIcons = {
	instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
	twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`,
	github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.577.688.482A10.001 10.001 0 0 0 22 12c0-5.523-4.477-10-10-10z"></path></svg>`,
	linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>`,
	tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 122.8 122.8V209.9z"/></svg>`,
	youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>`,
	facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
	whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.31-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>`, 
	behance: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.07,6.35H15V7.76h5.09ZM19,16.05a2.23,2.23,0,0,1-1.3.37A2.23,2.23,0,0,1,16,15.88a2.49,2.49,0,0,1-.62-1.76H22a6.47,6.47,0,0,0-.17-2,5.08,5.08,0,0,0-.8-1.73,4.17,4.17,0,0,0-1.42-1.21,4.37,4.37,0,0,0-2-.45,4.88,4.88,0,0,0-1.9.37,4.51,4.51,0,0,0-1.47,1,4.4,4.4,0,0,0-.95,1.52,5.4,5.4,0,0,0-.33,1.91,5.52,5.52,0,0,0,.32,1.94A4.46,4.46,0,0,0,14.16,17a4,4,0,0,0,1.46,1,5.2,5.2,0,0,0,1.94.34,4.77,4.77,0,0,0,2.64-.7,4.21,4.21,0,0,0,1.63-2.35H19.62A1.54,1.54,0,0,1,19,16.05Zm-3.43-4.12a1.87,1.87,0,0,1,1-1.14,2.28,2.28,0,0,1,1-.2,1.73,1.73,0,0,1,1.36.49,2.91,2.91,0,0,1,.63,1.45H15.41A3,3,0,0,1,15.52,11.93Zm-5.29-.48a3.06,3.06,0,0,0,1.28-1,2.72,2.72,0,0,0,.43-1.58,3.28,3.28,0,0,0-.29-1.48,2.4,2.4,0,0,0-.82-1,3.24,3.24,0,0,0-1.27-.52,7.54,7.54,0,0,0-1.64-.16H2V18.29H8.1a6.55,6.55,0,0,0,1.65-.21,4.55,4.55,0,0,0,1.43-.65,3.13,3.13,0,0,0,1-1.14,3.41,3.41,0,0,0,.37-1.65,3.47,3.47,0,0,0-.57-2A3,3,0,0,0,10.23,11.45ZM4.77,7.86H7.36a4.17,4.17,0,0,1,.71.06,1.64,1.64,0,0,1,.61.22,1.05,1.05,0,0,1,.42.44,1.42,1.42,0,0,1,.16.72,1.36,1.36,0,0,1-.47,1.15,2,2,0,0,1-1.22.35H4.77ZM9.61,15.3a1.28,1.28,0,0,1-.45.5,2,2,0,0,1-.65.26,3.33,3.33,0,0,1-.78.08h-3V12.69h3a2.4,2.4,0,0,1,1.45.41,1.65,1.65,0,0,1,.54,1.39A1.77,1.77,0,0,1,9.61,15.3Z"/></svg>`,
	pinterest: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.018 0C5.381 0 0 5.368 0 11.988c0 5.078 3.166 9.416 7.637 11.16 -0.106 -0.948 -0.199 -2.402 0.041 -3.438 0.22 -0.936 1.41 -5.957 1.41 -5.957s-0.36 -0.72 -0.36 -1.781c0 -1.663 0.97 -2.911 2.173 -2.911 1.026 0 1.522 0.768 1.522 1.687 0 1.03 -0.654 2.568 -0.995 3.992 -0.286 1.193 0.602 2.165 1.78 2.165 2.134 0 3.778 -2.244 3.778 -5.486 0 -2.861 -2.068 -4.87 -5.021 -4.87 -3.418 0 -5.422 2.562 -5.422 5.2 0 1.032 0.395 2.143 0.89 2.741 0.1 0.12 0.113 0.226 0.085 0.346 -0.09 0.374 -0.293 1.199 -0.335 1.362 -0.053 0.226 -0.172 0.271 -0.402 0.166 -1.499 -0.69 -2.438 -2.878 -2.438 -4.646 0 -3.775 2.755 -7.252 7.939 -7.252 4.169 0 7.41 2.966 7.41 6.923 0 4.135 -2.614 7.462 -6.248 7.462 -1.217 0 -2.359 -0.629 -2.765 -1.379l-0.75 2.849c-0.27 1.044 -1.008 2.352 -1.502 3.145A12 12 0 0 0 11.986 24C18.61 24 24 18.636 24 12.012 24 5.392 18.608 0.028 11.986 0.028z"/></svg>`,
	twitch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.149 0l-2.149 4.773v16.454h5.741v2.773h3.223l2.773-2.773h5.292l6.219-6.219v-14.227h-21.099zm18.378 13.59l-3.223 3.223h-5.741l-2.773 2.773v-2.773h-4.654v-14.89h16.391v11.667zm-5.292-7.371v5.546h-2.149v-5.546h2.149zm-5.291 0v5.546h-2.149v-5.546h2.149z"/></svg>`,
	discord: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.0031,4 C15.74742,4 16.532444,4.2597504 17.2533144,4.5466496 L17.7803,4.76328 L17.7803,4.76328 C19.0402,5.29134 19.7484,6.39876 20.2975,7.61613 C21.1882,9.59078 21.8067,12.2238 22.0209,14.2256 C22.1227,15.1766 22.1483,16.1321 21.9647,16.7747 C21.76838,17.46166 21.0975,17.947788 20.4466008,18.3303128 L20.1251058,18.5133917 L20.1251058,18.5133917 L19.7907,18.6986 C19.61865,18.794725 19.442175,18.8900812 19.2660703,18.9830547 L18.7436625,19.2532125 L18.7436625,19.2532125 L18.0271553,19.610458 L18.0271553,19.610458 L17.4503,19.8944 L17.4503,19.8944 C16.9564,20.1414 16.3557,19.9412 16.1087,19.4472 C15.8617,18.9532 16.0619,18.3526 16.5559,18.1056 L17.3469,17.7158 L17.3469,17.7158 L16.7663,17.1071 C15.3765,17.6777 13.7389,18 12.0001,18 C10.2612,18 8.6236,17.6777 7.23378,17.1071 L6.65415,17.7148 L7.44727,18.1056 L7.44727,18.1056 C7.94124,18.3526 8.14147,18.9532 7.89448,19.4472 C7.64749,19.9412 7.04682,20.1414 6.55284,19.8944 L6.00922,19.6247 C5.60650667,19.4255667 5.20386444,19.2265222 4.80574963,19.0185 L3.87804989,18.5133917 L3.87804989,18.5133917 L3.55657432,18.3303128 C2.9057004,17.947788 2.234774,17.46166 2.03851,16.7747 C1.85493,16.1321 1.88051,15.1766 1.98227,14.2256 C2.19645,12.2238 2.81496,9.59078 3.70567,7.61613 C4.25479,6.39877 4.96296,5.29134 6.22289,4.76328 C7.05903,4.41284 8.07171,4 9.00004,4 C9.60303,4 10.0767,4.55523 9.98927,5.14727 C10.6366,5.05075 11.3099,5 12.0001,5 C12.6914,5 13.3657,5.05091 14.014,5.14774 C13.9263,4.55557 14.4,4 15.0031,4 Z M8.75006,10.5 C7.78356,10.5 7.00006,11.2835 7.00006,12.25 C7.00006,13.2165 7.78356,14 8.75006,14 C9.71656,14 10.5001,13.2165 10.5001,12.25 C10.5001,11.2835 9.71656,10.5 8.75006,10.5 Z M15.2501,10.5 C14.2836,10.5 13.5001,11.2835 13.5001,12.25 C13.5001,13.2165 14.2836,14 15.2501,14 C16.2166,14 17.0001,13.2165 17.0001,12.25 C17.0001,11.2835 16.2166,10.5 15.2501,10.5 Z"/></svg>`,
	spotify: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.161 17.218c-.21.315-.576.42-.892.21-2.553-1.56-5.75-1.91-9.52-1.047-.36.084-.696-.134-.78-.494s.134-.696.494-.78c4.13-1.007 7.62-0.608 10.45 1.132.316.21.42.576.21.892zm1.201-2.73c-.255.38-.71.504-1.09.248-2.887-1.758-7.15-2.22-10.59-1.21-.434.12-.87-.135-.99-.565s.135-.87.565-.99c3.85-1.12 8.52-0.61 11.8 1.388.38.256.504.71.248 1.09zm.12-2.99c-3.48-2.03-9.21-2.22-12.32-1.21-.525.165-.99-.22-1.155-.745s.22-.99.745-1.155c3.62-1.12 10.02-.89 13.97 1.388.465.255.63.84.375 1.305-.255.465-.84.63-1.305.375z"/></svg>`,
	soundcloud: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7,19a1,1,0,0,1-1-1V8A1,1,0,0,1,8,8V18A1,1,0,0,1,7,19ZM3,18a1,1,0,0,1-1-1V11a1,1,0,0,1,2,0v6A1,1,0,0,1,3,18Z"></path><path d="M18.76,10.2A7,7,0,0,0,12,5a5.89,5.89,0,0,0-1.18.11,1,1,0,0,0-.82,1V18a1,1,0,0,0,1,1h6.5a4.49,4.49,0,0,0,1.26-8.8Z"></path></svg>`,
	telegram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71 3.655s1.942 -0.757 1.78 1.082c-0.053 0.757 -0.539 3.409 -0.917 6.277l-1.295 8.495s-0.108 1.244 -1.079 1.461c-0.971 0.216 -2.428 -0.757 -2.698 -0.974 -0.216 -0.163 -4.047 -2.598 -5.396 -3.788 -0.378 -0.325 -0.81 -0.974 0.054 -1.732L16.825 9.065c0.647 -0.65 1.295 -2.165 -1.403 -0.325l-7.555 5.14s-0.864 0.541 -2.482 0.054l-3.508 -1.083s-1.295 -0.811 0.917 -1.623c5.396 -2.543 12.034 -5.14 17.916 -7.575"/></svg>`,
};
const largeSocialIcons = { ...socialIcons }; // En este caso son los mismos, pero se mantiene la estructura por si se quiere cambiar en el futuro.

const socialBaseUrls = {
	instagram: 'https://instagram.com/', twitter: 'https://twitter.com/', github: 'https://github.com/', linkedin: 'https://linkedin.com/in/',
	tiktok: 'https://tiktok.com/@', youtube: 'https://youtube.com/c/', facebook: 'https://facebook.com/', whatsapp: 'https://wa.me/',
	behance: 'https://www.behance.net/', pinterest: 'https://pinterest.com/', twitch: 'https://twitch.tv/', discord: 'https://discord.gg/',
	spotify: 'https://open.spotify.com/user/', soundcloud: 'https://soundcloud.com/', telegram: 'https://t.me/'
};

const socialButtonStyles = {
	instagram: { name: 'Instagram', icon: largeSocialIcons.instagram, color: 'text-white', bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500', hover: 'hover:opacity-90' },
	twitter: { name: 'Twitter / X', icon: largeSocialIcons.twitter, color: 'text-white', bg: 'bg-black', hover: 'hover:bg-gray-800' },
	github: { name: 'GitHub', icon: largeSocialIcons.github, color: 'text-white', bg: 'bg-gray-800', hover: 'hover:bg-gray-700' },
	linkedin: { name: 'LinkedIn', icon: largeSocialIcons.linkedin, color: 'text-white', bg: 'bg-blue-700', hover: 'hover:bg-blue-600' },
	tiktok: { name: 'TikTok', icon: largeSocialIcons.tiktok, color: 'text-white', bg: 'bg-black', hover: 'hover:bg-gray-800' },
	youtube: { name: 'YouTube', icon: largeSocialIcons.youtube, color: 'text-white', bg: 'bg-red-600', hover: 'hover:bg-red-500' },
	facebook: { name: 'Facebook', icon: largeSocialIcons.facebook, color: 'text-white', bg: 'bg-blue-800', hover: 'hover:bg-blue-700' },
	whatsapp: { name: 'WhatsApp', icon: largeSocialIcons.whatsapp, color: 'text-white', bg: 'bg-green-500', hover: 'hover:bg-green-400' },
	behance: { name: 'Behance', icon: largeSocialIcons.behance, color: 'text-white', bg: 'bg-blue-600', hover: 'hover:bg-blue-500' },
	pinterest: { name: 'Pinterest', icon: largeSocialIcons.pinterest, color: 'text-white', bg: 'bg-red-700', hover: 'hover:bg-red-600' },
	twitch: { name: 'Twitch', icon: largeSocialIcons.twitch, color: 'text-white', bg: 'bg-purple-600', hover: 'hover:bg-purple-500' },
	discord: { name: 'Discord', icon: largeSocialIcons.discord, color: 'text-white', bg: 'bg-indigo-600', hover: 'hover:bg-indigo-500' },
	spotify: { name: 'Spotify', icon: largeSocialIcons.spotify, color: 'text-white', bg: 'bg-green-600', hover: 'hover:bg-green-500' },
	soundcloud: { name: 'SoundCloud', icon: largeSocialIcons.soundcloud, color: 'text-white', bg: 'bg-orange-500', hover: 'hover:bg-orange-400' },
	telegram: { name: 'Telegram', icon: largeSocialIcons.telegram, color: 'text-white', bg: 'bg-sky-500', hover: 'hover:bg-sky-400' }
};

const socialCategories = [
    { id: 'popular', name: 'Populares', icon: 'star', socials: ['instagram', 'facebook', 'twitter', 'tiktok', 'pinterest'] },
    { id: 'comunicacion', name: 'Comunicación', icon: 'messages-square', socials: ['whatsapp', 'telegram', 'discord'] },
    { id: 'profesional', name: 'Profesional', icon: 'briefcase', socials: ['linkedin', 'github', 'behance'] },
    { id: 'contenido', name: 'Contenido', icon: 'play-circle', socials: ['youtube', 'twitch', 'spotify', 'soundcloud'] }
];

const SOCIAL_ICON_ORDER = socialCategories.flatMap(category => category.socials);

function getSocialInfoForUrl(url) {
	if (!url) return null;
	const domainToInfoKey = {
		'instagram.com': 'instagram', 'twitter.com': 'twitter', 'x.com': 'twitter', 'github.com': 'github',
		'linkedin.com': 'linkedin', 'tiktok.com': 'tiktok', 'youtube.com': 'youtube', 'facebook.com': 'facebook',
		'whatsapp.com': 'whatsapp', 'wa.me': 'whatsapp', 'behance.net': 'behance', 'pinterest.com': 'pinterest',
		'twitch.tv': 'twitch', 'discord.gg': 'discord', 'spotify.com': 'spotify', 'soundcloud.com': 'soundcloud',
		't.me': 'telegram'
	};
	for (const domain in domainToInfoKey) {
		if (url.includes(domain)) {
			const key = domainToInfoKey[domain];
			return { key, ...socialButtonStyles[key] };
		}
	}
	return null;
}

function getSocialIconForUrl(url) {
	const info = getSocialInfoForUrl(url);
	return info ? socialIcons[info.key] : null;
}

function renderSocialIcons(socials, socialsOrder) {
    const footer = document.getElementById('socials-footer');
    if (!footer) return;

    footer.innerHTML = ''; 
    const hasIcons = socials && Object.keys(socials).length > 0;
    
    if (!hasIcons) {
        return; 
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'social-icons-wrapper';
    
    const order = socialsOrder && socialsOrder.length > 0 ? socialsOrder : SOCIAL_ICON_ORDER;
    
    order.forEach(key => {
        const username = socials[key];
        if (username && socialIcons[key]) {
            const link = document.createElement('a');
            link.href = `${socialBaseUrls[key]}${username}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.innerHTML = socialIcons[key];
            link.className = 'opacity-70 hover:opacity-100 transition-opacity';
            link.dataset.socialKey = key;
            wrapper.appendChild(link);
        }
    });

    if (wrapper.children.length > 0) {
        footer.appendChild(wrapper);
    }
}

function renderSocialButtons(buttons) {
    const section = document.getElementById('social-buttons-section');
    if (!section) return;

    section.innerHTML = '';
    const buttonList = buttons || [];

    if (buttonList.length === 0) {
        return;
    }

	buttonList.forEach(buttonData => {
		const info = getSocialInfoForUrl(buttonData.url);
		if (!info) return;

		const buttonEl = document.createElement('a');
		buttonEl.href = '#';
		buttonEl.dataset.url = buttonData.url;
		buttonEl.rel = 'noopener noreferrer';
		buttonEl.className = `social-button flex items-center justify-center rounded-lg transition-all duration-200 transform hover:scale-105 ${info.bg} ${info.color} ${info.hover} draggable-item`;
		buttonEl.innerHTML = `${largeSocialIcons[info.key]}`;
		section.appendChild(buttonEl);
	});

	// --- Lógica de alineación inteligente ---
	const buttonCount = buttonList.length;
	// Resetea los estilos en línea para empezar de cero
	section.style.justifyContent = '';
	section.style.gap = '';

	if (buttonCount > 0 && buttonCount <= 3) {
		section.style.justifyContent = 'center';
		section.style.gap = '20px';
	} else if (buttonCount === 4) {
		section.style.justifyContent = 'space-evenly';
	} else if (buttonCount === 5) {
		section.style.justifyContent = 'space-around';
	} else if (buttonCount === 6) {
		section.style.justifyContent = 'space-between';
	} else if (buttonCount >= 7) {
		section.style.justifyContent = 'center';
		section.style.gap = '12px';
	}
}

function renderProfileActions(profileData) {
	const container = document.getElementById('image-actions-container');
	if (!container) return;

	container.innerHTML = '';

	if (profileData.username) {
		const shareButton = document.createElement('button');
		shareButton.className = 'opacity-70 hover:opacity-100 transition-opacity p-2';
		shareButton.innerHTML = `<i data-lucide="share-2" class="w-6 h-6"></i>`;
		shareButton.title = "Compartir Perfil";
		shareButton.addEventListener('click', () => handleShare(profileData));
		container.appendChild(shareButton);
	}
	
	const contact = profileData.contact_info || {};
	if (contact.name || contact.phone || contact.email || contact.website) {
		const vcardButton = document.createElement('button');
		vcardButton.className = 'opacity-70 hover:opacity-100 transition-opacity p-2';
		vcardButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm9 1.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0-.5.5M9 8a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4A.5.5 0 0 0 9 8m1 2.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 0-1h-3a.5.5 0 0 0-.5.5m-1 2C9 10.567 7.21 9 5 9c-2.086 0-3.8 1.398-3.984 3.181A1 1 0 0 0 2 13h6.96q.04-.245.04-.5M7 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0"/></svg>`;
		vcardButton.title = "Guardar Contacto";
		vcardButton.addEventListener('click', () => handleVCardDownload(profileData));
		container.appendChild(vcardButton);
	}

	lucide.createIcons();
}

// --- 7. MANEJADORES DE EVENTOS ---

function closeRegisterModal() {
    DOMElements.registerModal.classList.add('hidden');
    DOMElements.registerPasswordInput.value = '';
    DOMElements.registerConfirmPasswordInput.value = '';
}

DOMElements.showRegisterModalBtn.addEventListener('click', () => {
    DOMElements.registerEmailInput.value = document.getElementById('email-input').value;
    DOMElements.registerPasswordInput.value = document.getElementById('password-input').value;
    DOMElements.registerModal.classList.remove('hidden');
});

DOMElements.backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    closeRegisterModal();
});

DOMElements.createAccountBtn.addEventListener('click', async () => {
    const email = DOMElements.registerEmailInput.value;
    const password = DOMElements.registerPasswordInput.value;
    const confirmPassword = DOMElements.registerConfirmPasswordInput.value;

    if (!email || !password || !confirmPassword) {
        return showAlert("Por favor, completa todos los campos.");
    }
    if (password !== confirmPassword) {
        return showAlert("Las contraseñas no coinciden.");
    }

    const { data, error } = await supabaseClient.auth.signUp({
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
        showAlert("¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.");
        closeRegisterModal();
    }
});


document.getElementById('login-btn').addEventListener('click', async () => {
	const email = document.getElementById('email-input').value;
	const password = document.getElementById('password-input').value;
	if (!email || !password) return showAlert("Por favor, completa ambos campos.");
	
	const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
	
	if (error) {
		if (error.message.includes('Invalid login credentials')) {
			showAlert('Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.');
		} else {
			showAlert(`Error al iniciar sesión: ${error.message}`);
		}
	}
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
	const { error } = await supabaseClient.auth.signInWithOAuth({ 
		provider: 'google',
		options: {
			redirectTo: `${window.location.origin}${window.location.pathname}`
		}
	});
	if (error) showAlert(`Error con Google: ${error.message}`);
});

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
		const { data } = await supabaseClient.from('profiles').select('username').eq('username', `@${usernameValue}`).single();
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

	const { error } = await supabaseClient
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

document.getElementById('logout-btn').addEventListener('click', async () => {	
	appState.isRecoveringPassword = false;
	document.getElementById('email-input').value = '';
	document.getElementById('password-input').value = '';
	await supabaseClient.auth.signOut({ scope: 'local' });	
	window.location.replace('/index.html');
});
document.getElementById('configure-btn').addEventListener('click', openSettingsPanel);
document.getElementById('close-settings-btn').addEventListener('click', closeSettingsPanel);
DOMElements.settingsOverlay.addEventListener('click', closeSettingsPanel);

async function handleShare(profileData) {
	const shareData = {	
		title: `Perfil de ${profileData.display_name || profileData.username || 'NexID'}`,	
		text: `Mira mi perfil de NexID: ${profileData.description || ''}`,	
		url: `${window.location.origin}${window.location.pathname}?user=${profileData.username.substring(1)}`
	};
	
	const fallbackCopy = () => {
		const textArea = document.createElement("textarea");
		textArea.value = shareData.url;
		textArea.style.position = "fixed";
		textArea.style.left = "-9999px";
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		try {
			document.execCommand('copy');
			showAlert('¡Enlace copiado al portapapeles!');
		} catch (err) {
			console.error('Fallback copy failed:', err);
			showAlert('No se pudo copiar el enlace.');
		}
		document.body.removeChild(textArea);
	};

	try {
		if (navigator.share) {
			await navigator.share(shareData);
		} else {
			fallbackCopy();
		}
	} catch (err) {
		console.error("Error al compartir:", err);
		fallbackCopy();
	}
}

function handleVCardDownload(profileData) {
	const contact = profileData.contact_info || {};
	const name = contact.name || profileData.display_name || '';
	const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
N:${name};;;;
${contact.phone ? `TEL;TYPE=CELL:${contact.phone}` : ''}
${contact.email ? `EMAIL:${contact.email}` : ''}
${contact.website ? `URL:${contact.website}` : ''}
END:VCARD`;
	const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${profileData.username || 'contact'}.vcf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

// --- 8. LÓGICA DEL PANEL DE CONFIGURACIÓN ---

function markSettingsAsDirty() {
	appState.isSettingsDirty = true;
}

function renderSocialTabs(container, mode, data) {
    container.innerHTML = `
        <div class="social-tabs-container">
            <nav class="social-tabs-nav"></nav>
            <div class="social-tabs-content"></div>
        </div>
    `;

    const nav = container.querySelector('.social-tabs-nav');
    const content = container.querySelector('.social-tabs-content');

    socialCategories.forEach((category, index) => {
        const button = document.createElement('button');
        button.className = `social-tab-button ${index === 0 ? 'active' : ''}`;
        button.dataset.tab = category.id;
        button.title = category.name;
        button.innerHTML = `<i data-lucide="${category.icon}" class="w-5 h-5"></i>`;
        nav.appendChild(button);

        const pane = document.createElement('div');
        pane.className = `social-tab-pane ${index === 0 ? 'active' : ''}`;
        pane.id = `${mode}-${category.id}`;
        content.appendChild(pane);

        category.socials.forEach(key => {
            const item = document.createElement('div');
            const info = socialButtonStyles[key];
            
            if (mode === 'icons') {
                const value = data?.[key] || '';
                item.className = 'flex items-center bg-gray-200 rounded-md focus-within:ring-2 focus-within:ring-cyan-500 w-full';
                item.innerHTML = `
                    <span class="pl-3 pr-2 text-gray-500">${socialIcons[key]}</span>
                    <input type="text" data-social="${key}" placeholder="${info.name}" class="w-full p-2 text-gray-900 bg-transparent focus:outline-none" value="${value}">
                `;
            } else { // mode === 'buttons'
                const existingButton = (data || []).find(btn => getSocialInfoForUrl(btn.url)?.key === key);
                const value = existingButton ? existingButton.url : '';
                item.className = 'flex items-center gap-3';
                const preview = `<div class="social-button flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${info.bg} ${info.color}">${info.icon.replace(/width="32"/g, 'width="20"').replace(/height="32"/g, 'height="20"')}</div>`;
                const input = `<div class="flex-grow flex items-center bg-gray-200 rounded-md focus-within:ring-2 focus-within:ring-cyan-500 w-full"><input type="text" data-social-button="${key}" placeholder="${info.name}" class="w-full p-2 text-gray-900 bg-transparent focus:outline-none" value="${value}"></div>`;
                item.innerHTML = preview + input;
            }
            pane.appendChild(item);
        });
    });
    lucide.createIcons();
}

DOMElements.settingsPanel.addEventListener('click', (e) => {
    const tabButton = e.target.closest('.social-tab-button');
    if (tabButton) {
        const container = tabButton.closest('.social-tabs-container');
        const tabId = tabButton.dataset.tab;

        container.querySelectorAll('.social-tab-button').forEach(btn => btn.classList.remove('active'));
        container.querySelectorAll('.social-tab-pane').forEach(pane => pane.classList.remove('active'));

        tabButton.classList.add('active');
        const activePane = container.querySelector(`.social-tab-pane[id$="-${tabId}"]`);
        if(activePane) activePane.classList.add('active');
    }
});


function openSettingsPanel() {
	if (!appState.profile) return;
	
	appState.isSettingsDirty = false;
	appState.tempBackgroundImagePath = null;
	const profile = appState.profile;
	document.getElementById('display-name-input').value = profile.display_name || '';
	document.getElementById('username-input').value = profile.username ? profile.username.substring(1) : '';
	document.getElementById('description-input').value = profile.description || '';
    DOMElements.featuredVideoUrlInput.value = profile.featured_video_url || '';
	
	setTimeout(() => autoResizeTextarea(DOMElements.descriptionInput), 50);

	document.getElementById('background-image-url-input').value = profile.background_image_url || '';
	document.getElementById('background-image-path-input').value = profile.background_image_path || '';
	
	const opacitySlider = document.getElementById('background-opacity-slider');
	const opacityControls = document.getElementById('background-controls');
	
	if (profile.background_image_url) {
		opacityControls.classList.remove('hidden');
		opacitySlider.value = profile.background_overlay_opacity ?? 0.4;
	} else {
		opacityControls.classList.add('hidden');
	}

	const currentTheme = profile.theme || 'negro';
	const themeOptionEl = document.querySelector(`.theme-option[data-theme="${currentTheme}"]`);
	if (themeOptionEl) {
		const tabContentEl = themeOptionEl.closest('.theme-tab-content');
		const tabId = tabContentEl.id.replace('tab-', '');
		switchThemeTab(tabId);
	}

	document.querySelectorAll('.theme-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.theme === currentTheme));
	document.querySelector(`input[name="buttonStyle"][value="${profile.button_style || 'filled'}"]`).checked = true;
	document.querySelector(`input[name="buttonShape"][value="${profile.button_shape_style || 'rounded-lg'}"]`).checked = true;
	
	const currentFont = profile.font_family || 'font-inter';
	DOMElements.fontFamilyValue.value = currentFont;
	DOMElements.fontSelectorLabel.textContent = fontMap[currentFont].name;
	DOMElements.fontSelectorLabel.className = currentFont;

    renderSocialTabs(document.getElementById('social-buttons-inputs-container'), 'buttons', profile.social_buttons);
    renderSocialTabs(document.getElementById('socials-inputs-container'), 'icons', profile.socials);

	const contact = profile.contact_info || {};
	document.querySelectorAll('#contact-inputs input').forEach(input => {
		if (input.dataset.contact === 'name') {
			input.value = contact.name || profile.display_name || '';
		} else {
			input.value = contact[input.dataset.contact] || '';
		}
	});
	
	document.getElementById('private-profile-toggle').checked = profile.is_public;

	DOMElements.settingsPanel.classList.add('open');
	DOMElements.settingsOverlay.classList.remove('hidden');
	
	if (window.innerWidth < 640) {
		document.body.classList.add('panel-is-open');
		const initialPanelHeight = DOMElements.settingsPanel.offsetHeight;
		if (DOMElements.profilePage) {
			DOMElements.profilePage.style.paddingBottom = `${initialPanelHeight}px`;
		}
	}

	DOMElements.settingsPanel.removeEventListener('input', markSettingsAsDirty);
	DOMElements.settingsPanel.addEventListener('input', markSettingsAsDirty);
}

async function forceCloseSettingsPanel() {
	if (appState.tempBackgroundImagePath) {
		await supabaseClient.storage.from('background-images').remove([appState.tempBackgroundImagePath]);
		appState.tempBackgroundImagePath = null;
	}
	DOMElements.settingsPanel.classList.remove('open');
	DOMElements.settingsOverlay.classList.add('hidden');
	
	document.body.classList.remove('panel-is-open');
	
	if (DOMElements.profilePage) {
		DOMElements.profilePage.style.paddingBottom = '0px';
	}
	DOMElements.settingsPanel.style.height = '';	
	
	setTimeout(() => {
		DOMElements.settingsAccordion.querySelectorAll('.accordion-item').forEach(item => {
			item.classList.remove('open');
		});
	}, 300);

	renderProfile(appState.myProfile, true);
}

function closeSettingsPanel() {
	if (appState.isSettingsDirty) {
		document.getElementById('unsaved-changes-confirm').classList.remove('hidden');
	} else {
		forceCloseSettingsPanel();
	}
}

document.getElementById('save-changes-btn').addEventListener('click', async () => {
	if (!appState.currentUser) return;

	const newSocials = {};
	document.querySelectorAll('#socials-inputs-container input[data-social]').forEach(input => {
		const key = input.dataset.social;
		const value = input.value.trim();
		if (value !== '') {
			newSocials[key] = extractUsername(value, key);
		}
	});

	let currentSocialsOrder = appState.myProfile.socials_order || [];
	Object.keys(newSocials).forEach(key => {
		if (!currentSocialsOrder.includes(key)) {
			currentSocialsOrder.push(key);
		}
	});
	
	const newSocialButtons = [];
	document.querySelectorAll('#social-buttons-inputs-container input[data-social-button]').forEach(input => {
		const value = input.value.trim();
		if (value) {
			const key = input.dataset.socialButton;
			const username = extractUsername(value, key);
			const url = `${socialBaseUrls[key]}${username}`;
			newSocialButtons.push({ url });
		}
	});

	const dataToSave = {
		display_name: document.getElementById('display-name-input').value,
		description: document.getElementById('description-input').value,
        featured_video_url: DOMElements.featuredVideoUrlInput.value,
		background_image_url: document.getElementById('background-image-url-input').value,
		background_image_path: document.getElementById('background-image-path-input').value,
		background_overlay_opacity: document.getElementById('background-opacity-slider').value,
		theme: document.querySelector('.theme-option.selected').dataset.theme,
		button_style: document.querySelector('input[name="buttonStyle"]:checked').value,
		button_shape_style: document.querySelector('input[name="buttonShape"]:checked').value,
		font_family: DOMElements.fontFamilyValue.value,
		socials: newSocials,
		socials_order: currentSocialsOrder,
		social_buttons: newSocialButtons,
		contact_info: {},
		is_public: document.getElementById('private-profile-toggle').checked,
	};
	
	const oldProfile = appState.myProfile;
	const newImagePath = dataToSave.background_image_path;
	const oldImagePath = oldProfile.background_image_path;

	if (oldImagePath && oldImagePath !== newImagePath) {
		try {
			await supabaseClient.storage.from('background-images').remove([oldImagePath]);
		} catch (error) {
			console.error("Error al eliminar la imagen de fondo antigua:", error);
		}
	}

	document.querySelectorAll('#contact-inputs input').forEach(input => {
		if(input.value.trim() !== '') dataToSave.contact_info[input.dataset.contact] = input.value.trim();
	});

	const { data: updatedProfile, error } = await supabaseClient.from('profiles').update(dataToSave).eq('id', appState.currentUser.id).select().single();
	if (error) {
		showAlert(`Error al guardar: ${error.message}`);
	} else {
		appState.profile = updatedProfile;
		appState.myProfile = updatedProfile;
		appState.socialButtons = updatedProfile.social_buttons || [];
		appState.isSettingsDirty = false;
		appState.tempBackgroundImagePath = null;
		showAlert("Perfil guardado con éxito.");
		forceCloseSettingsPanel();
	}
});

function updateLivePreview() {
	if (!appState.profile) return;
	
	const backgroundUrlInput = document.getElementById('background-image-url-input');
	const opacitySlider = document.getElementById('background-opacity-slider');
	const opacityControls = document.getElementById('background-controls');

	if (backgroundUrlInput.value) {
		opacityControls.classList.remove('hidden');
	} else {
		opacityControls.classList.add('hidden');
	}
	
	const newSocialButtons = [];
	document.querySelectorAll('#social-buttons-inputs-container input[data-social-button]').forEach(input => {
		const value = input.value.trim();
		if (value) {
			const key = input.dataset.socialButton;
			const username = extractUsername(value, key);
			const url = `${socialBaseUrls[key]}${username}`;
			newSocialButtons.push({ url });
		}
	});

    const newSocials = {};
    document.querySelectorAll('#socials-inputs-container input[data-social]').forEach(input => {
		if (input.value.trim() !== '') newSocials[input.dataset.social] = input.value.trim();
	});

	let newSocialsOrder = appState.profile.socials_order ? [...appState.profile.socials_order] : [];
	Object.keys(newSocials).forEach(key => {
		if (!newSocialsOrder.includes(key)) {
			newSocialsOrder.push(key);
		}
	});
	newSocialsOrder = newSocialsOrder.filter(key => newSocials[key]);


	const selectedFont = DOMElements.fontFamilyValue.value;
	loadFontIfNeeded(selectedFont);

	const previewData = {
		...appState.profile,
		display_name: document.getElementById('display-name-input').value,
		description: document.getElementById('description-input').value,
        featured_video_url: DOMElements.featuredVideoUrlInput.value,
		background_image_url: backgroundUrlInput.value,
		background_overlay_opacity: opacitySlider.value,
		theme: document.querySelector('.theme-option.selected')?.dataset.theme || 'negro',
		button_style: document.querySelector('input[name="buttonStyle"]:checked')?.value || 'filled',
		button_shape_style: document.querySelector('input[name="buttonShape"]:checked')?.value || 'rounded-lg',
		font_family: selectedFont,
		socials: newSocials,
		social_buttons: newSocialButtons,
		socials_order: newSocialsOrder,
		contact_info: {},
	};
	
	 document.querySelectorAll('#contact-inputs input').forEach(input => {
		if (input.value.trim() !== '') previewData.contact_info[input.dataset.contact] = input.value.trim();
	});
	
	renderProfile(previewData, true);
}

DOMElements.settingsPanel.addEventListener('input', updateLivePreview);
DOMElements.settingsPanel.addEventListener('change', updateLivePreview);

document.getElementById('theme-tab-contents').addEventListener('click', (e) => {
	if (e.target.classList.contains('theme-option')) {
		document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
		e.target.classList.add('selected');
		markSettingsAsDirty();
		updateLivePreview();
	}
});

function switchThemeTab(tabId) {
	document.querySelectorAll('.theme-tab-content').forEach(content => {
		content.classList.remove('active');
	});
	document.querySelectorAll('.theme-tab-btn').forEach(btn => {
		btn.classList.remove('active');
	});

	document.getElementById(`tab-${tabId}`).classList.add('active');
	document.querySelector(`.theme-tab-btn[data-tab="${tabId}"]`).classList.add('active');
}

DOMElements.themeTabsContainer.addEventListener('click', (e) => {
	if (e.target.matches('.theme-tab-btn')) {
		const tabId = e.target.dataset.tab;
		switchThemeTab(tabId);
	}
});


// --- 9. LÓGICA DE GESTIÓN DE ENLACES ---

const iconTags = [
	{ label: 'Ninguno', value: '' },
	{ label: 'Tienda', value: 'shopping-cart' },
	{ label: 'Portafolio', value: 'briefcase' },
	{ label: 'Música', value: 'music' },
	{ label: 'Video', value: 'video' },
	{ label: 'Artículo', value: 'file-text' },
	{ label: 'Contacto', value: 'mail' },
	{ label: 'Calendario', value: 'calendar' },
	{ label: 'Enlace', value: 'link' },
	{ label: 'Estrella', value: 'star' },
	{ label: 'Corazón', value: 'heart' },
	{ label: 'Descargar', value: 'download' },
	{ label: 'Libro', value: 'book' },
	{ label: 'Cámara', value: 'camera' },
	{ label: 'Mundo', value: 'globe' },
	{ label: 'Chat', value: 'message-circle' },
];

function populateIconGrid() {
	const gridContainer = document.getElementById('icon-grid-container');
	if (!gridContainer) return;

	gridContainer.innerHTML = ''; 

	iconTags.forEach(tag => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'icon-option-btn';
		button.dataset.iconValue = tag.value;
		button.title = tag.label;

		const icon = document.createElement('i');
		icon.dataset.lucide = tag.value || 'circle-slash';
		icon.className = 'w-5 h-5';
		
		button.appendChild(icon);
		gridContainer.appendChild(button);
	});

	lucide.createIcons();
}

document.getElementById('add-update-link-btn').addEventListener('click', async () => {
	if (!appState.currentUser) return;
	const title = document.getElementById('link-title-input').value;
	const url = document.getElementById('link-url-input').value.trim();
	const iconTag = document.getElementById('link-icon-value').value;
	const linkId = document.getElementById('editing-link-id').value;
	if (!title || !url) return showAlert("Completa el título y la URL del enlace.");

	if (!isValidUrl(url)) return showAlert("Por favor, introduce una URL válida (ej: misitio.com).");

	let finalUrl = url;
	if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = `https://${finalUrl}`;

	const linkData = { title, url: finalUrl, icon_tag: iconTag || null };

	if (linkId) {
		const { error } = await supabaseClient.from('links').update(linkData).eq('id', linkId);
		if (error) showAlert(`Error al actualizar enlace: ${error.message}`);
		else {
			exitEditMode();
			await refreshLinks();
		}
	} else {
		const newOrder = appState.links ? appState.links.length : 0;
		const { data: newLink, error } = await supabaseClient.from('links').insert({ ...linkData, user_id: appState.currentUser.id, order_index: newOrder }).select().single();

		if (error) {
			showAlert(`Error al crear enlace: ${error.message}`);
		} else {
			const defaultLayout = ["profile-image", "display-name", "username", "description", "featured-video", "gallery", "social-buttons", "socials"];
			const currentLayout = appState.myProfile.layout_order && appState.myProfile.layout_order.length > 0 ? [...appState.myProfile.layout_order] : [...defaultLayout];
			
			const lastLinkIndex = currentLayout.map((item, index) => ({ item, index })).filter(obj => obj.item.startsWith('link_')).pop()?.index ?? -1;

			if (lastLinkIndex !== -1) {
				currentLayout.splice(lastLinkIndex + 1, 0, `link_${newLink.id}`);
			} else {
				const socialsIndex = currentLayout.indexOf('socials');
				if (socialsIndex !== -1) {
					currentLayout.splice(socialsIndex, 0, `link_${newLink.id}`);
				} else {
					currentLayout.push(`link_${newLink.id}`);
				}
			}
			
			const { data: updatedProfile, error: profileUpdateError } = await supabaseClient
				.from('profiles')
				.update({ layout_order: currentLayout })
				.eq('id', appState.currentUser.id)
				.select()
				.single();

			if (profileUpdateError) {
				showAlert('Enlace creado, pero no se pudo actualizar el diseño.');
			} else {
				appState.myProfile = updatedProfile;
				appState.profile = updatedProfile;
			}
			exitEditMode();
			appState.links.push(newLink);
			renderLinksEditor(appState.links);
			updateLivePreview();
		}
	}
});

document.getElementById('cancel-edit-btn').addEventListener('click', exitEditMode);

document.getElementById('links-list-editor').addEventListener('click', (e) => {
	const deleteButton = e.target.closest('.delete-link-btn');
	const editTrigger = e.target.closest('.edit-link-trigger');
	if (deleteButton) {
		const linkId = deleteButton.dataset.id;
		showConfirm("¿Estás seguro de que quieres eliminar este enlace?", async (confirmed) => {
			if (confirmed) {
				const { error: deleteError } = await supabaseClient.from('links').delete().eq('id', linkId);
				if (deleteError) {
					showAlert(`Error al eliminar: ${deleteError.message}`);
				} else {
					const currentLayout = appState.myProfile.layout_order || [];
					const newLayout = currentLayout.filter(item => item !== `link_${linkId}`);
					const { error: profileUpdateError } = await supabaseClient.from('profiles').update({ layout_order: newLayout }).eq('id', appState.currentUser.id);
					if (profileUpdateError) showAlert('Enlace eliminado, pero no se pudo actualizar el diseño.');
					await refreshLinks();
				}
			}
		});
	} else if (editTrigger) {
		const { id, title, url, icon } = editTrigger.dataset;
		enterEditMode(id, title, url, icon);
	}
});

DOMElements.profilePage.addEventListener('click', (e) => {
	const linkButton = e.target.closest('.public-link-button, .social-button');
	if (linkButton) {
		if (appState.isDesignModeActive) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		let url = linkButton.dataset.url;
		if (url && !url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
		window.open(url, '_blank');
		
		const linkId = linkButton.dataset.linkId;
		if (linkId) {
			supabaseClient.rpc('increment_click_count', { link_id_to_increment: linkId }).then(({ error }) => {
				if (error) console.error('Failed to track click:', error);
			});
		}
	}

    const thumbnail = e.target.closest('.thumbnail');
    const mainImage = e.target.closest('.main-image');
    const profileImage = e.target.closest('#public-profile-img');

    if (thumbnail) {
        const index = parseInt(thumbnail.dataset.index, 10);
        displayGalleryImage(appState.galleryImages, index);
    } else if (mainImage) {
        const currentIndex = appState.galleryImages.findIndex(img => img.image_url === mainImage.src);
        if (currentIndex !== -1) {
            openImageZoomModal(appState.galleryImages, currentIndex);
        }
    } else if (profileImage && !e.target.closest('#edit-profile-img-btn')) {
        openImageZoomModal([{ image_url: profileImage.src }], 0);
    }
});


function enterEditMode(id, title, url, icon) {
	document.getElementById('editing-link-id').value = id;
	document.getElementById('link-title-input').value = title;
	document.getElementById('link-url-input').value = url;
	
	document.getElementById('link-icon-value').value = icon;
	document.querySelectorAll('#icon-grid-container .icon-option-btn').forEach(btn => btn.classList.remove('selected-icon'));
	const iconButtonToSelect = document.querySelector(`.icon-option-btn[data-icon-value="${icon}"]`);
	if (iconButtonToSelect) iconButtonToSelect.classList.add('selected-icon');

	document.getElementById('link-form-title').textContent = 'Actualizar Enlace';
	document.getElementById('add-update-link-btn').textContent = 'Actualizar Enlace';
	document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

function exitEditMode() {
	document.getElementById('editing-link-id').value = '';
	document.getElementById('link-title-input').value = '';
	document.getElementById('link-url-input').value = '';
	
	document.getElementById('link-icon-value').value = '';
	const selectedButton = document.querySelector('#icon-grid-container .selected-icon');
	if (selectedButton) selectedButton.classList.remove('selected-icon');

	document.getElementById('link-form-title').textContent = 'Añadir Nuevo Enlace';
	document.getElementById('add-update-link-btn').textContent = 'Añadir Enlace';
	document.getElementById('cancel-edit-btn').classList.add('hidden');
}

document.getElementById('icon-grid-container').addEventListener('click', (e) => {
	const iconButton = e.target.closest('.icon-option-btn');
	if (!iconButton) return;

	document.querySelectorAll('#icon-grid-container .icon-option-btn').forEach(btn => btn.classList.remove('selected-icon'));

	iconButton.classList.add('selected-icon');
	document.getElementById('link-icon-value').value = iconButton.dataset.iconValue;
	markSettingsAsDirty();
});


// --- 10. LÓGICA DE SUBIDA Y RECORTE DE IMAGEN ---

DOMElements.imageUploadInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (event) => {
		DOMElements.cropperImage.src = event.target.result;
		DOMElements.cropperModal.classList.remove('hidden');
		if(appState.cropper) appState.cropper.destroy();
		appState.cropper = new Cropper(DOMElements.cropperImage, {
			aspectRatio: 1, viewMode: 1, background: false,
		});
	};
	reader.readAsDataURL(file);
});

document.getElementById('cropper-cancel-btn').addEventListener('click', () => {
	DOMElements.cropperModal.classList.add('hidden');
	if(appState.cropper) appState.cropper.destroy();
	appState.cropper = null;
});

document.getElementById('cropper-save-btn').addEventListener('click', () => {
	if (!appState.cropper) return;

	const saveBtn = document.getElementById('cropper-save-btn');
	saveBtn.disabled = true;
	saveBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div><span>Procesando...</span>`;

	appState.cropper.getCroppedCanvas({ width: 1024, height: 1024 }).toBlob(async (blob) => {
		if (!appState.currentUser) return;
		
		try {
			const compressedBlob = await imageCompression(blob, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true });
			const oldImagePath = appState.profile.profile_image_path;
			const filePath = `${appState.currentUser.id}/${Date.now()}.webp`;

			const { error: uploadError } = await supabaseClient.storage.from('profile-pictures').upload(filePath, compressedBlob, { contentType: 'image/webp' });
			if (uploadError) throw uploadError;

			const { data: { publicUrl } } = supabaseClient.storage.from('profile-pictures').getPublicUrl(filePath);
			
			const { data: updatedProfile, error: updateError } = await supabaseClient.from('profiles').update({ profile_image_url: publicUrl, profile_image_path: filePath }).eq('id', appState.currentUser.id).select().single();
			if (updateError) throw updateError;
			
			showAlert("Imagen de perfil actualizada.");
			appState.profile = updatedProfile;
			appState.myProfile = updatedProfile;
			renderProfile(appState.profile, true);
			
			if (oldImagePath) await supabaseClient.storage.from('profile-pictures').remove([oldImagePath]);
		} catch (error) {
			showAlert(`Error al procesar la imagen: ${error.message}`);
		} finally {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Guardar Imagen';
			DOMElements.cropperModal.classList.add('hidden');
			if(appState.cropper) appState.cropper.destroy();
			appState.cropper = null;
		}
	}, 'image/png');
});

// --- 11. LÓGICA DE GENERACIÓN CON IA (GEMINI) ---

document.getElementById('open-gemini-btn').addEventListener('click', () => {
	DOMElements.geminiModal.classList.remove('hidden');
	lucide.createIcons();
});

document.getElementById('gemini-close-btn').addEventListener('click', () => {
	DOMElements.geminiModal.classList.add('hidden');
});

document.getElementById('gemini-use-text-btn').addEventListener('click', () => {
	const selectedOption = document.querySelector('input[name="gemini-option"]:checked');
	if (selectedOption) {
		document.getElementById('description-input').value = selectedOption.value;
		updateLivePreview();
		DOMElements.geminiModal.classList.add('hidden');
	} else {
		showAlert("Por favor, selecciona una opción primero.");
	}
});

DOMElements.geminiModal.querySelector('#gemini-results-container').addEventListener('click', (e) => {
	const label = e.target.closest('.gemini-option-label');
	if (label) {
		document.querySelectorAll('#gemini-results-container .gemini-option-label').forEach(l => l.classList.remove('selected'));
		label.classList.add('selected');
		label.previousElementSibling.checked = true;
	}
});

document.getElementById('gemini-generate-btn').addEventListener('click', async () => {
	const keywords = document.getElementById('gemini-keywords-input').value;
	if (!keywords) return showAlert("Por favor, ingresa algunas palabras clave.");

	const geminiGenerateBtn = document.getElementById('gemini-generate-btn');
	const geminiResultsContainer = document.getElementById('gemini-results-container');
	const geminiLoader = document.getElementById('gemini-loader');

	geminiGenerateBtn.disabled = true;
	geminiResultsContainer.classList.add('hidden');
	geminiResultsContainer.innerHTML = '';
	geminiLoader.classList.remove('hidden');

	const prompt = `Basado en estas palabras clave: "${keywords}", genera 3 descripciones de perfil cortas y profesionales (biografías). Cada una debe tener un tono ligeramente diferente (por ejemplo: una profesional, una casual, una creativa).`;
	
	try {
		const payload = {	
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: {
				responseMimeType: "application/json",
				responseSchema: { type: "OBJECT", properties: { "descriptions": { "type": "ARRAY", "items": { "type": "STRING" } } } }
			}
		};
		const apiKey = "";
		const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

		const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		if (!response.ok) throw new Error(`Error de la API: ${response.statusText}`);
		const result = await response.json();
		
		if (result.candidates && result.candidates.length > 0) {
			const text = result.candidates[0].content.parts[0].text;
			const parsedJson = JSON.parse(text);
			geminiResultsContainer.innerHTML = '';
			parsedJson.descriptions.forEach((desc, index) => {
				const uniqueId = `gemini-opt-${index}`;
				geminiResultsContainer.innerHTML += `<div><input type="radio" id="${uniqueId}" name="gemini-option" value="${desc.replace(/"/g, '&quot;')}" class="hidden"><label for="${uniqueId}" class="gemini-option-label"><span>${desc}</span></label></div>`;
			});
		} else {
			throw new Error("No se recibieron descripciones válidas de la IA.");
		}
	} catch (error) {
		geminiResultsContainer.innerHTML = `<p class="text-red-400 text-center">Ocurrió un error. Por favor, intenta de nuevo. ${error.message}</p>`;
	} finally {
		geminiLoader.classList.add('hidden');
		geminiResultsContainer.classList.remove('hidden');
		geminiGenerateBtn.disabled = false;
	}
});

// --- 12. PROYECTO PANORAMA: LÓGICA DEL MODO DISEÑO ---

function enterDesignMode() {
	appState.isDesignModeActive = true;
	DOMElements.profilePage.classList.add('design-mode');
	document.getElementById('user-actions').classList.add('hidden');
	document.getElementById('layout-actions').classList.remove('hidden');

	updateContainerVisibilityInDesignMode(appState.profile);

	const layoutContainer = document.getElementById('profile-layout-container');
	if (appState.sortable.layout) appState.sortable.layout.destroy();
	
	appState.sortable.layout = new Sortable(layoutContainer, {
		animation: 150,
		draggable: '.draggable-item',
		forceFallback: true,
		fallbackOnBody: true,
		
		onStart: (evt) => {
			const rect = evt.item.getBoundingClientRect();

			setTimeout(() => {
				DOMElements.profilePage.classList.add('panorama-active');
				const fallbackEl = document.querySelector('.sortable-fallback');
				
				if (fallbackEl) {
					const bodyClasses = document.body.className.split(' ');
					const profilePageClasses = DOMElements.profilePage.className.split(' ');
					const themeClass = bodyClasses.find(c => c.startsWith('theme-'));
					const fontClass = profilePageClasses.find(c => c.startsWith('font-'));
					if (themeClass) fallbackEl.classList.add(themeClass);
					if (fontClass) fallbackEl.classList.add(fontClass);
					
					fallbackEl.style.width = `${rect.width}px`;
					fallbackEl.style.height = `${rect.height}px`;
					fallbackEl.style.top = `${rect.top}px`;
					fallbackEl.style.left = `${rect.left}px`;
					
					fallbackEl.style.transform = 'scale(0.85)';
					fallbackEl.style.transformOrigin = 'top left';
				}
			}, 0);
		},
		onEnd: () => {
			DOMElements.profilePage.classList.remove('panorama-active');
		},
		onUpdate: (evt) => {
			const newOrder = Array.from(evt.from.children).map(el => el.dataset.section).filter(Boolean);
			appState.tempLayoutOrder = newOrder;
		},
	});
}

function exitDesignMode(shouldRevert = false) {
	appState.isDesignModeActive = false;
	appState.tempLayoutOrder = null;
	DOMElements.profilePage.classList.remove('design-mode', 'panorama-active');
	document.getElementById('user-actions').classList.remove('hidden');
	document.getElementById('layout-actions').classList.add('hidden');

	document.querySelectorAll('.draggable-item.is-empty').forEach(el => el.classList.remove('is-empty'));

	if (appState.sortable.layout) { appState.sortable.layout.destroy(); appState.sortable.layout = null; }
	
	if (shouldRevert) renderProfile(appState.myProfile, true);
}

async function saveDesignChanges() {
	if (!appState.currentUser) return;

	const newLayoutOrder = appState.tempLayoutOrder || Array.from(document.getElementById('profile-layout-container').children).map(el => el.dataset.section).filter(Boolean);
	
	try {
		const { data: updatedProfile, error } = await supabaseClient.from('profiles').update({ layout_order: newLayoutOrder }).eq('id', appState.currentUser.id).select().single();
		if (error) throw error;
		
		showAlert("Diseño guardado con éxito.");
		appState.myProfile = updatedProfile;
		appState.profile = updatedProfile;
		appState.tempLayoutOrder = null;
	} catch (error) {
		 showAlert(`Error al guardar el diseño: ${error.message}`);
	}
	exitDesignMode(false);
}

document.getElementById('arrange-btn').addEventListener('click', enterDesignMode);
document.getElementById('save-layout-btn').addEventListener('click', saveDesignChanges);
document.getElementById('cancel-layout-btn').addEventListener('click', () => exitDesignMode(true));


// --- 13. LÓGICA DE SUBIDA DE IMAGEN DE FONDO ---
DOMElements.uploadBackgroundBtn.addEventListener('click', () => DOMElements.backgroundUploadInput.click());

DOMElements.backgroundUploadInput.addEventListener('change', async (e) => {
	const file = e.target.files[0];
	if (!file || !appState.currentUser) return;

	const uploadBtn = DOMElements.uploadBackgroundBtn;
	uploadBtn.disabled = true;
	uploadBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div><span>Subiendo...</span>`;

	try {
		if (appState.tempBackgroundImagePath) await supabaseClient.storage.from('background-images').remove([appState.tempBackgroundImagePath]);

		const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true });
		const filePath = `${appState.currentUser.id}/background-${Date.now()}.${compressedFile.name.split('.').pop()}`;

		const { error: uploadError } = await supabaseClient.storage.from('background-images').upload(filePath, compressedFile);
		if (uploadError) throw uploadError;

		const { data: { publicUrl } } = supabaseClient.storage.from('background-images').getPublicUrl(filePath);
		
		appState.tempBackgroundImagePath = filePath;
		document.getElementById('background-image-url-input').value = publicUrl;
		document.getElementById('background-image-path-input').value = filePath;
		markSettingsAsDirty();
		updateLivePreview();
	} catch (error) {
		showAlert(error.message.toLowerCase().includes('size') ? 'El archivo es demasiado grande. Sube una imagen de menos de 2 MB.' : `Error: ${error.message}`);
	} finally {
		uploadBtn.disabled = false;
		uploadBtn.innerHTML = `<i data-lucide="upload-cloud" class="w-5 h-5"></i> Subir Fondo`;
		lucide.createIcons();
		DOMElements.backgroundUploadInput.value = '';
	}
});

DOMElements.removeBackgroundBtn.addEventListener('click', () => {
	document.getElementById('background-image-url-input').value = '';
	document.getElementById('background-image-path-input').value = '';
	markSettingsAsDirty();
	updateLivePreview();
});

// --- 14. LÓGICA DE LA BIBLIOTECA DE FONDOS ---
DOMElements.openLibraryBtn.addEventListener('click', () => {
	const grid = DOMElements.libraryGrid;
	grid.innerHTML = '';
	backgroundLibraryUrls.forEach(url => {
		grid.innerHTML += `<div class="aspect-video bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"><img src="${url}" class="w-full h-full object-cover" data-url="${url}"></div>`;
	});
	DOMElements.libraryModal.classList.remove('hidden');
	lucide.createIcons();
});

DOMElements.libraryCloseBtn.addEventListener('click', () => DOMElements.libraryModal.classList.add('hidden'));

DOMElements.libraryGrid.addEventListener('click', (e) => {
	if (e.target.tagName === 'IMG') {
		document.getElementById('background-image-url-input').value = e.target.dataset.url;
		document.getElementById('background-image-path-input').value = '';
		markSettingsAsDirty();
		updateLivePreview();
		DOMElements.libraryModal.classList.add('hidden');
	}
});

// --- 15. LÓGICA DEL ZOOM DE IMAGEN DE PERFIL Y GALERÍA ---
function openImageZoomModal(images, startIndex) {
    if (!images || images.length === 0) return;

    let currentIndex = startIndex;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="relative w-full h-full flex items-center justify-center" id="zoom-content-wrapper">
            <img src="" class="max-w-full max-h-full rounded-lg shadow-2xl transition-opacity duration-300" id="zoomed-image">
            <button class="zoom-nav-btn left-4" id="zoom-prev-btn"><i data-lucide="chevron-left" class="w-8 h-8"></i></button>
            <button class="zoom-nav-btn right-4" id="zoom-next-btn"><i data-lucide="chevron-right" class="w-8 h-8"></i></button>
            <button class="absolute top-4 right-4 text-white" id="zoom-close-btn"><i data-lucide="x" class="w-8 h-8"></i></button>
        </div>
    `;

    document.body.appendChild(modal);
    lucide.createIcons();

    const imgEl = modal.querySelector('#zoomed-image');
    const prevBtn = modal.querySelector('#zoom-prev-btn');
    const nextBtn = modal.querySelector('#zoom-next-btn');
    const closeBtn = modal.querySelector('#zoom-close-btn');
    const contentWrapper = modal.querySelector('#zoom-content-wrapper');

    function updateZoomedImage() {
        imgEl.style.opacity = 0;
        setTimeout(() => {
            imgEl.src = images[currentIndex].image_url;
            imgEl.style.opacity = 1;
        }, 150);

        const isMobile = window.innerWidth < 768;
        prevBtn.style.display = images.length > 1 && !isMobile ? 'flex' : 'none';
        nextBtn.style.display = images.length > 1 && !isMobile ? 'flex' : 'none';
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === images.length - 1;
    }

    function closeModal() {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
    }
    
    function nextImage() {
        if (currentIndex < images.length - 1) {
            currentIndex++;
            updateZoomedImage();
        }
    }
    
    function prevImage() {
        if (currentIndex > 0) {
            currentIndex--;
            updateZoomedImage();
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nextImage(); }
        else if (e.key === 'Escape') { closeModal(); }
    }

    let touchStartX = 0;
    let touchEndX = 0;

    contentWrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    contentWrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) nextImage();
        if (touchEndX > touchStartX + swipeThreshold) prevImage();
    }


    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', handleKeyDown);

    updateZoomedImage();
}


// --- 16. LÓGICA DEL MODAL DE CAMBIOS SIN GUARDAR ---
document.getElementById('unsaved-confirm-save').addEventListener('click', async () => {
	await document.getElementById('save-changes-btn').click();
	document.getElementById('unsaved-changes-confirm').classList.add('hidden');
});
document.getElementById('unsaved-confirm-discard').addEventListener('click', () => {
	appState.isSettingsDirty = false;
	document.getElementById('unsaved-changes-confirm').classList.add('hidden');
	forceCloseSettingsPanel();
});
document.getElementById('unsaved-confirm-cancel').addEventListener('click', () => {
	document.getElementById('unsaved-changes-confirm').classList.add('hidden');
});

// --- 17. LÓGICA DEL BUSCADOR DE PERFILES ---
function toggleSearch(forceClose = false) {
	const isExpanded = DOMElements.searchContainer.classList.contains('expanded');
	if (forceClose || isExpanded) {
		DOMElements.searchContainer.classList.remove('expanded');
		DOMElements.searchInput.value = '';
		DOMElements.searchResults.classList.add('hidden');
		DOMElements.searchResults.innerHTML = '';
	} else {
		DOMElements.searchContainer.classList.add('expanded');
		DOMElements.searchInput.focus();
	}
}

async function performSearch(query) {
	const resultsContainer = DOMElements.searchResults;
	if (query.length < 2) {
		resultsContainer.classList.add('hidden');
		resultsContainer.innerHTML = '';
		return;
	}
	try {
		const { data, error } = await supabaseClient.from('profiles').select('username, display_name, profile_image_url').eq('is_public', true).or(`username.ilike.%${query}%,display_name.ilike.%${query}%`).limit(5);
		if (error) throw error;
		renderSearchResults(data);
	} catch (error) {
		resultsContainer.innerHTML = '<p class="p-2 text-sm text-gray-400">Error al buscar.</p>';
		resultsContainer.classList.remove('hidden');
	}
}

function renderSearchResults(results) {
	const resultsContainer = DOMElements.searchResults;
	resultsContainer.innerHTML = '';
	if (results.length === 0) {
		resultsContainer.innerHTML = '<p class="p-3 text-sm text-gray-400 text-center">No se encontraron perfiles.</p>';
	} else {
		results.forEach(user => {
			const profileUrl = `${window.location.pathname}?user=${user.username.substring(1)}`;
			resultsContainer.innerHTML += `<a href="${profileUrl}" class="flex items-center p-2 hover:bg-gray-600 transition-colors"><img src="${user.profile_image_url || 'https://placehold.co/40x40/7f9cf5/1F2937?text=...'}" class="w-10 h-10 rounded-full mr-3 object-cover"><div><p class="font-bold text-white">${user.display_name}</p><p class="text-sm text-gray-400">${user.username}</p></div></a>`;
		});
	}
	resultsContainer.classList.remove('hidden');
}

DOMElements.searchIconBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSearch(); });
DOMElements.searchInput.addEventListener('input', debounce(() => performSearch(DOMElements.searchInput.value.trim()), 300));
document.addEventListener('click', (e) => { if (!DOMElements.searchContainer.contains(e.target)) toggleSearch(true); });

// --- 18. LÓGICA DEL ACORDEÓN DE CONFIGURACIÓN ---
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

// --- 19. LÓGICA DEL PANEL REDIMENSIONABLE (MÓVIL) ---
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

// --- 20. LÓGICA DEL TEXTAREA AUTO-AJUSTABLE ---
function autoResizeTextarea(element) {
	element.style.height = 'auto';
	element.style.height = (element.scrollHeight) + 'px';
}
DOMElements.descriptionInput.addEventListener('input', function() { autoResizeTextarea(this); });
DOMElements.settingsPanelContent.addEventListener('focusin', (e) => {
	if (window.innerWidth < 640 && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
		setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
	}
});

// --- 21. LÓGICA DE CAMBIO DE CONTRASEÑA ---
const passwordModal = { current: document.getElementById('current-password-input'), new: document.getElementById('new-password-input'), confirm: document.getElementById('confirm-password-input'), currentError: document.getElementById('current-password-error'), newError: document.getElementById('new-password-error'), confirmError: document.getElementById('confirm-password-error') };
function showPasswordError(field, message) {
	passwordModal[field].classList.add('!border-red-500', '!ring-red-500');
	passwordModal[field].classList.remove('border-gray-600', 'focus:ring-cyan-500');
	passwordModal[`${field}Error`].textContent = message;
}
function clearPasswordErrors() {
	for (const field in passwordModal) {
		if (passwordModal[field].tagName === 'INPUT') {
			passwordModal[field].classList.remove('!border-red-500', '!ring-red-500');
			passwordModal[field].classList.add('border-gray-600', 'focus:ring-cyan-500');
		} else if (passwordModal[field].tagName === 'P') {
			passwordModal[field].textContent = '';
		}
	}
}
document.getElementById('change-password-btn').addEventListener('click', () => {
	clearPasswordErrors();
	Object.values(passwordModal).forEach(el => { if(el.tagName === 'INPUT') el.value = ''; });
	document.getElementById('password-change-modal').classList.remove('hidden');
});
document.getElementById('password-change-cancel-btn').addEventListener('click', () => document.getElementById('password-change-modal').classList.add('hidden'));
document.getElementById('password-change-save-btn').addEventListener('click', async () => {
	clearPasswordErrors();
	let isValid = true;
	if (!passwordModal.current.value) { showPasswordError('current', 'Este campo es obligatorio.'); isValid = false; }
	if (!passwordModal.new.value) { showPasswordError('new', 'Este campo es obligatorio.'); isValid = false; }
	if (passwordModal.new.value.length < 6) { showPasswordError('new', 'Debe tener al menos 6 caracteres.'); isValid = false; }
	if (passwordModal.new.value !== passwordModal.confirm.value) { showPasswordError('confirm', 'Las contraseñas no coinciden.'); isValid = false; }
	if (!isValid) return;

	const { error: verificationError } = await supabaseClient.auth.signInWithPassword({ email: appState.currentUser?.email, password: passwordModal.current.value });
	if (verificationError) return showPasswordError('current', 'La contraseña actual es incorrecta.');

	const { error: updateError } = await supabaseClient.auth.updateUser({ password: passwordModal.new.value });
	if (updateError) showAlert(`Error al actualizar: ${updateError.message}`);
	else {
		showAlert('¡Contraseña actualizada con éxito!');
		document.getElementById('password-change-modal').classList.add('hidden');
	}
});

// --- 22. LÓGICA PARA MOSTRAR/OCULTAR CONTRASEÑA ---
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

// --- 23. LÓGICA DE RECUPERACIÓN DE CONTRASEÑA ---
document.getElementById('forgot-password-link').addEventListener('click', (e) => { e.preventDefault(); showPage('forgotPassword'); });
document.getElementById('back-to-login-link-from-forgot').addEventListener('click', (e) => { e.preventDefault(); appState.isRecoveringPassword = false; showPage('auth'); });
document.getElementById('send-recovery-btn').addEventListener('click', async () => {
	const email = document.getElementById('recovery-email-input').value;
	if (!email) return showAlert('Por favor, introduce tu correo electrónico.');
	const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
	if (error) showAlert(`Error: ${error.message}`);
	else showAlert('Se ha enviado un enlace de recuperación a tu correo.');
});
document.getElementById('update-password-btn').addEventListener('click', async () => {
	const newPassword = document.getElementById('update-password-input').value;
	if (newPassword.length < 6) return showAlert('La contraseña debe tener al menos 6 caracteres.');
	if (newPassword !== document.getElementById('update-confirm-password-input').value) return showAlert('Las contraseñas no coinciden.');

	const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
	if (error) showAlert(`Error al actualizar la contraseña: ${error.message}`);
	else {
		appState.isRecoveringPassword = false;
		showAlert('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.');
		await supabaseClient.auth.signOut();
		window.location.hash = '';
		showPage('auth');
	}
});

// --- 24. LÓGICA DEL SELECTOR DE FUENTE PERSONALIZADO ---
function populateFontSelector() {
	DOMElements.fontSelectorOptions.innerHTML = '';
	for (const fontClass in fontMap) {
		const fontData = fontMap[fontClass];
		const option = document.createElement('button');
		option.type = 'button';
		option.className = `font-option-item w-full text-left px-4 py-2 text-white hover:bg-gray-600 ${fontClass}`;
		option.textContent = fontData.name;
		option.dataset.value = fontClass;
		option.style.fontFamily = fontData.name.split('(')[0].trim();
		DOMElements.fontSelectorOptions.appendChild(option);
	}
}

function toggleFontSelector(forceClose = false) {
	if (forceClose || DOMElements.customFontSelector.classList.contains('open')) {
		DOMElements.customFontSelector.classList.remove('open');
		DOMElements.fontSelectorOptions.classList.add('hidden');
	} else {
		Object.keys(fontMap).forEach(loadFontIfNeeded);
		DOMElements.customFontSelector.classList.add('open');
		DOMElements.fontSelectorOptions.classList.remove('hidden');
	}
}

DOMElements.fontSelectorBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	toggleFontSelector();
});

DOMElements.fontSelectorOptions.addEventListener('click', (e) => {
	const option = e.target.closest('.font-option-item');
	if (option) {
		const selectedValue = option.dataset.value;
		const selectedName = fontMap[selectedValue].name;
		
		DOMElements.fontFamilyValue.value = selectedValue;
		DOMElements.fontSelectorLabel.textContent = selectedName;
		DOMElements.fontSelectorLabel.className = selectedValue;
		
		toggleFontSelector(true);
		markSettingsAsDirty();
		updateLivePreview();
	}
});

document.addEventListener('click', () => toggleFontSelector(true));

// --- 25. LÓGICA DE ELIMINACIÓN Y REACTIVACIÓN DE CUENTA ---
document.getElementById('delete-account-btn').addEventListener('click', () => {
	document.getElementById('delete-account-confirm-modal').classList.remove('hidden');
});

document.getElementById('delete-account-cancel-btn').addEventListener('click', () => {
	document.getElementById('delete-account-confirm-modal').classList.add('hidden');
	document.getElementById('delete-confirm-password-input').value = '';
	document.getElementById('delete-confirm-password-error').textContent = '';
});

document.getElementById('delete-account-confirm-btn').addEventListener('click', async () => {
	const password = document.getElementById('delete-confirm-password-input').value;
	const errorEl = document.getElementById('delete-confirm-password-error');
	if (!password) {
		errorEl.textContent = 'La contraseña es obligatoria.';
		return;
	}
	errorEl.textContent = '';

	const { error: verificationError } = await supabaseClient.auth.signInWithPassword({
		email: appState.currentUser.email,
		password: password,
	});

	if (verificationError) {
		errorEl.textContent = 'La contraseña es incorrecta.';
		return;
	}
	
	const { error: updateError } = await supabaseClient
		.from('profiles')
		.update({ 
			is_deactivated: true, 
			deletion_scheduled_at: new Date().toISOString() 
		})
		.eq('id', appState.currentUser.id);

	if (updateError) {
		showAlert(`Error al desactivar la cuenta: ${updateError.message}`);
	} else {
		showAlert('Tu cuenta ha sido desactivada y será eliminada en 30 días. Se cerrará la sesión.');
		await supabaseClient.auth.signOut();
		setTimeout(() => window.location.reload(), 2000);
	}
});

document.getElementById('reactivate-account-btn').addEventListener('click', async () => {
	const { error } = await supabaseClient
		.from('profiles')
		.update({ is_deactivated: false, deletion_scheduled_at: null })
		.eq('id', appState.currentUser.id);

	if (error) {
		showAlert(`Error al reactivar la cuenta: ${error.message}`);
	} else {
		showAlert('¡Tu cuenta ha sido reactivada con éxito!');
		window.location.reload();
	}
});

document.getElementById('logout-for-deletion-btn').addEventListener('click', async () => {
	await supabaseClient.auth.signOut();
});


// --- 26. LÓGICA COMPLETA DE LA GALERÍA ---

function renderImmersiveGallery(images) {
    const container = document.getElementById('gallery-container');
    if (!container || !images || images.length === 0) return;

    container.innerHTML = `
        <div class="immersive-gallery">
            <div class="main-image-container">
                <img src="${images[0].image_url}" class="main-image" id="gallery-main-image">
                <p class="caption" id="gallery-caption">${images[0].caption || ''}</p>
            </div>
            <div class="thumbnail-strip" id="gallery-thumbnail-strip"></div>
        </div>
    `;

    const thumbnailStrip = document.getElementById('gallery-thumbnail-strip');
    images.forEach((image, index) => {
        const thumb = document.createElement('img');
        thumb.src = image.thumbnail_url || image.image_url;
        thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumb.dataset.index = index;
        thumbnailStrip.appendChild(thumb);
    });
}

function displayGalleryImage(images, index) {
    const mainImage = document.getElementById('gallery-main-image');
    const caption = document.getElementById('gallery-caption');
    const thumbnails = document.querySelectorAll('#gallery-thumbnail-strip .thumbnail');

    if (!mainImage || !caption || !thumbnails) return;

    mainImage.style.opacity = 0;
    caption.style.opacity = 0;

    setTimeout(() => {
        mainImage.src = images[index].image_url;
        caption.textContent = images[index].caption || '';
        mainImage.style.opacity = 1;
        caption.style.opacity = 1;
    }, 300);

    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function renderGalleryEditor() {
    const listEl = DOMElements.galleryEditorList;
    if (!listEl) return;
    listEl.innerHTML = '';

    appState.galleryImages.forEach(image => {
        const item = document.createElement('div');
        item.className = 'gallery-editor-item relative group cursor-pointer';
        item.dataset.id = image.id;
        item.innerHTML = `
            <img src="${image.thumbnail_url || image.image_url}" class="w-full h-full object-cover rounded-lg pointer-events-none">
            <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <i data-lucide="edit" class="w-8 h-8 text-white"></i>
            </div>
        `;
        listEl.appendChild(item);
    });
    
    lucide.createIcons();
    updateAddImageButtonState();

    if (appState.sortable.gallery) appState.sortable.gallery.destroy();
    appState.sortable.gallery = new Sortable(listEl, {
        animation: 150,
        onEnd: async () => {
            const updatedOrder = Array.from(listEl.children).map((item, index) => ({
                id: item.dataset.id,
                order_index: index,
            }));

            const updatePromises = updatedOrder.map(item =>
                supabaseClient
                    .from('gallery_images')
                    .update({ order_index: item.order_index })
                    .eq('id', item.id)
            );
            
            const results = await Promise.all(updatePromises);
            const hasError = results.some(result => result.error);

            if (hasError) {
                showAlert("Error al reordenar la galería.");
                console.error("Error reordering gallery:", results.find(r => r.error).error);
            } else {
                updatedOrder.forEach(item => {
                    const img = appState.galleryImages.find(i => i.id === item.id);
                    if (img) img.order_index = item.order_index;
                });
                appState.galleryImages.sort((a, b) => a.order_index - b.order_index);
            }
        },
    });
}

function updateAddImageButtonState() {
    const canUpload = appState.galleryImages.length < 6;
    DOMElements.addGalleryImageBtn.disabled = !canUpload;
    DOMElements.addGalleryImageBtn.textContent = canUpload ? `Añadir Imágenes (${appState.galleryImages.length}/6)` : 'Galería Llena (6/6)';
}

function openGalleryEditModal(image) {
    appState.editingGalleryImageId = image.id;
    const modal = DOMElements.galleryEditModal;
    modal.querySelector('#gallery-edit-preview').src = image.image_url;
    modal.querySelector('#gallery-edit-caption').value = image.caption || '';
    modal.classList.remove('hidden');
    lucide.createIcons();
}

function closeGalleryEditModal() {
    DOMElements.galleryEditModal.classList.add('hidden');
    appState.editingGalleryImageId = null;
}

DOMElements.addGalleryImageBtn.addEventListener('click', () => {
    DOMElements.galleryImageUploadInput.click();
});

DOMElements.galleryImageUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const remainingSlots = 6 - appState.galleryImages.length;
    if (files.length > remainingSlots) {
        showAlert(`Puedes subir ${remainingSlots} imagen(es) más. Has seleccionado ${files.length}.`);
        DOMElements.galleryImageUploadInput.value = '';
        return;
    }
    
    DOMElements.addGalleryImageBtn.disabled = true;
    DOMElements.addGalleryImageBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>`;

    const uploadPromises = files.map(async (file, index) => {
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true });
            const filePath = `${appState.currentUser.id}/${Date.now()}-${compressedFile.name}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('gallery-images').upload(filePath, compressedFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(filePath);

            const newOrderIndex = appState.galleryImages.length + index;
            const { data: newImage, error: dbError } = await supabaseClient
                .from('gallery_images')
                .insert({
                    user_id: appState.currentUser.id,
                    image_url: publicUrl,
                    image_path: filePath,
                    order_index: newOrderIndex
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            return newImage;
        } catch (error) {
            console.error("Error uploading one image:", error);
            return null;
        }
    });

    const results = await Promise.all(uploadPromises);
    const newImages = results.filter(Boolean);
    appState.galleryImages.push(...newImages);

    renderGalleryEditor();
    updateLivePreview();
    
    DOMElements.galleryImageUploadInput.value = '';
});

DOMElements.galleryEditorList.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-editor-item');
    if (item) {
        const imageId = item.dataset.id;
        const image = appState.galleryImages.find(img => img.id === imageId);
        if (image) {
            openGalleryEditModal(image);
        }
    }
});

DOMElements.galleryEditModal.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('#gallery-edit-close-btn');
    const cropBtn = e.target.closest('#gallery-edit-crop-btn');
    const deleteBtn = e.target.closest('#gallery-edit-delete-btn');
    
    if (closeBtn) {
        closeGalleryEditModal();
    } else if (cropBtn) {
        const imageToCrop = appState.galleryImages.find(img => img.id === appState.editingGalleryImageId);
        if (imageToCrop) {
            DOMElements.thumbnailCropperImage.src = imageToCrop.image_url;
            DOMElements.thumbnailCropperModal.classList.remove('hidden');
            if (appState.thumbnailCropper) appState.thumbnailCropper.destroy();
            appState.thumbnailCropper = new Cropper(DOMElements.thumbnailCropperImage, {
                aspectRatio: 1 / 1,
                viewMode: 1,
                background: false,
            });
        }
    } else if (deleteBtn) {
        const imageToDelete = appState.galleryImages.find(img => img.id === appState.editingGalleryImageId);
        if (imageToDelete) {
             showConfirm("¿Estás seguro de que quieres eliminar esta imagen?", async (confirmed) => {
                if (confirmed) {
                    const { error: dbError } = await supabaseClient.from('gallery_images').delete().eq('id', imageToDelete.id);
                    if (dbError) return showAlert(`Error al eliminar: ${dbError.message}`);

                    const pathsToDelete = [imageToDelete.image_path];
                    if (imageToDelete.thumbnail_path) pathsToDelete.push(imageToDelete.thumbnail_path);
                    await supabaseClient.storage.from('gallery-images').remove(pathsToDelete);
                    
                    appState.galleryImages = appState.galleryImages.filter(img => img.id !== imageToDelete.id);
                    renderGalleryEditor();
                    updateLivePreview();
                    closeGalleryEditModal();
                }
            });
        }
    }
});

DOMElements.galleryEditModal.querySelector('#gallery-edit-caption').addEventListener('input', debounce(async (e) => {
    const newCaption = e.target.value;
    const { error } = await supabaseClient
        .from('gallery_images')
        .update({ caption: newCaption })
        .eq('id', appState.editingGalleryImageId);
    
    if (error) {
        showAlert("No se pudo guardar el pie de foto.");
        console.error("Error updating caption:", error);
    } else {
        const img = appState.galleryImages.find(i => i.id === appState.editingGalleryImageId);
        if (img) img.caption = newCaption;
        updateLivePreview();
    }
}, 500));


document.getElementById('thumbnail-cropper-cancel-btn').addEventListener('click', () => {
    DOMElements.thumbnailCropperModal.classList.add('hidden');
    if(appState.thumbnailCropper) appState.thumbnailCropper.destroy();
    appState.thumbnailCropper = null;
    appState.editingGalleryImageId = null;
});

document.getElementById('thumbnail-cropper-save-btn').addEventListener('click', () => {
    if (!appState.thumbnailCropper || !appState.editingGalleryImageId) return;

    const saveBtn = document.getElementById('thumbnail-cropper-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div><span>Procesando...</span>`;

    appState.thumbnailCropper.getCroppedCanvas({ width: 400, height: 400 }).toBlob(async (blob) => {
        try {
            const imageToUpdate = appState.galleryImages.find(img => img.id === appState.editingGalleryImageId);
            if (!imageToUpdate) throw new Error("Image not found");

            const compressedBlob = await imageCompression(blob, { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true });
            
            if (imageToUpdate.thumbnail_path) {
                await supabaseClient.storage.from('gallery-images').remove([imageToUpdate.thumbnail_path]);
            }

            const thumbnailPath = `${appState.currentUser.id}/thumb-${Date.now()}.webp`;
            const { error: uploadError } = await supabaseClient.storage.from('gallery-images').upload(thumbnailPath, compressedBlob, { contentType: 'image/webp' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage.from('gallery-images').getPublicUrl(thumbnailPath);

            const { data: updatedImage, error: dbError } = await supabaseClient
                .from('gallery_images')
                .update({ thumbnail_url: publicUrl, thumbnail_path: thumbnailPath })
                .eq('id', appState.editingGalleryImageId)
                .select()
                .single();
            if (dbError) throw dbError;
            
            const index = appState.galleryImages.findIndex(img => img.id === appState.editingGalleryImageId);
            if (index !== -1) appState.galleryImages[index] = updatedImage;

            renderGalleryEditor();
            updateLivePreview();

        } catch (error) {
            showAlert(`Error al guardar la miniatura: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Miniatura';
            DOMElements.thumbnailCropperModal.classList.add('hidden');
            if(appState.thumbnailCropper) appState.thumbnailCropper.destroy();
            appState.thumbnailCropper = null;
        }
    }, 'image/webp');
});


// --- INICIALIZACIÓN ---
initializeApp();
window.onload = () => { 
	lucide.createIcons(); 
	setupPasswordToggle('password-input', 'auth-password-toggle');
    setupPasswordToggle('register-password-input', 'register-password-toggle');
    setupPasswordToggle('register-confirm-password-input', 'register-confirm-password-toggle');
	setupPasswordToggle('current-password-input', 'current-password-toggle');
	setupPasswordToggle('new-password-input', 'new-password-toggle');
	setupPasswordToggle('confirm-password-input', 'confirm-password-toggle');
	setupPasswordToggle('update-password-input', 'update-password-toggle');
	setupPasswordToggle('update-confirm-password-input', 'update-confirm-password-toggle');
	setupPasswordToggle('delete-confirm-password-input', 'delete-confirm-password-toggle');
};

