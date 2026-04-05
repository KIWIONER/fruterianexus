// --- STATE ---
let cart = [];
try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        console.log("Carrito cargado desde localStorage:", cart.length, "ítems.");
    }
} catch (e) {
    console.error("Error cargando carrito:", e);
    cart = [];
}

const sessionId = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
console.log("ID de Sesión iniciado:", sessionId);

// --- STRIPE CONFIG ---
const STRIPE_PUBLISHABLE_KEY = 'tu_clave_publica_aqui';
let stripe, elements, cardElement;

if (typeof Stripe !== 'undefined') {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    elements = stripe.elements();
    const style = {
        base: {
            color: '#1A1A1A',
            fontFamily: '"Outfit", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': { color: '#64748B' }
        },
        invalid: { color: '#ef4444', iconColor: '#ef4444' }
    };
    cardElement = elements.create('card', { style });
}

// --- SELECTORS ---
let navbar, cartIcon, cartDrawer, closeCart, cartItemsContainer, cartTotalPrice, cartSubtotal, cartCount, cardPayBtn;
let checkoutSection, paymentForm, summarySubtotal, summaryTotal, cartMainContent, cartSuccessContent, btnSuccessClose, payLoader;
let catalogModal, closeCatalog, productItems, catalogTitle, catalogSearch, clearSearchBtn, catCards;
let miniFilterBtns, recipeModal, recipeModalTitle, recipeModalImg, recipeModalInstructions, closeRecipe, revealElements, revealObserver;
let chatTrigger, chatBox, chatLog, chatInput, chatSend, chatClose, ctaChatTrigger, aiSearchBtn, aiSearchInput, chefSuggestionBtn, recipeCards;
let mobileMenuBtn, navLinksContainer;

function initSelectors() {
    navbar = document.querySelector('nav'); // Corregido: En el HTML no tiene la clase .navbar
    cartIcon = document.getElementById('cart-icon');
    cartDrawer = document.getElementById('shopping-list-section');
    closeCart = document.getElementById('close-cart-nav');
    cartItemsContainer = document.getElementById('cart-items');
    cartTotalPrice = document.getElementById('cart-total-price');
    cartSubtotal = document.getElementById('cart-subtotal');
    cartCount = document.querySelector('.cart-count');
    cardPayBtn = document.getElementById('card-pay-btn-nav');

    cartMainContent = document.getElementById('cart-main-content');
    cartSuccessContent = document.getElementById('cart-success-content');
    btnSuccessClose = document.getElementById('btn-success-close');
    payLoader = document.getElementById('pay-loader');

    catalogModal = document.getElementById('catalog-modal');
    closeCatalog = document.getElementById('close-catalog');
    productItems = document.querySelectorAll('.product-item');
    catalogTitle = document.getElementById('catalog-title');
    catalogSearch = document.getElementById('catalog-search');
    clearSearchBtn = document.getElementById('clear-catalog-search');
    catCards = document.querySelectorAll('.cat-card');
    miniFilterBtns = document.querySelectorAll('.mini-filter-btn');

    chatTrigger = document.getElementById('chat-trigger');
    chatBox = document.getElementById('chat-box');
    chatLog = document.getElementById('chat-log');
    chatInput = document.getElementById('chat-input');
    chatSend = document.getElementById('chat-send');
    chatClose = document.getElementById('chat-close');
    ctaChatTrigger = document.getElementById('cta-chat-trigger');
    aiSearchBtn = document.getElementById('ai-search-btn');
    aiSearchInput = document.getElementById('ai-search-input');
    chefSuggestionBtn = document.getElementById('chef-suggestion-btn');
    recipeCards = document.querySelectorAll('.recipe-card');

    mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    navLinksContainer = document.querySelector('.nav-links');

    recipeModal = document.getElementById('recipe-modal');
    recipeModalTitle = document.getElementById('recipe-modal-title');
    recipeModalImg = document.getElementById('recipe-modal-img');
    recipeModalInstructions = document.getElementById('recipe-modal-instructions');
    closeRecipe = document.getElementById('close-recipe');

    revealElements = document.querySelectorAll('.reveal');
}

function initEventListeners() {
    // --- CATALOG MINI NAV ---
    miniFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            miniFilterBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
            });
            btn.classList.add('bg-primary', 'text-white');
            btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');
            filterCatalogItems(filter);
            let titleText = '';
            if (filter === 'fruta') titleText = 'Nuestras <span class="text-primary italic">Frutas</span>';
            if (filter === 'verdura') titleText = 'Nuestras <span class="text-primary italic">Verduras</span>';
            if (filter === 'exotico') titleText = 'Nuestros <span class="text-primary italic">Exóticos</span>';
            if (filter === 'all') titleText = 'Cosecha <span class="text-primary italic">de Hoy</span>';
            if (catalogTitle) catalogTitle.innerHTML = titleText;
        });
    });

    // --- SEARCH LOGIC ---
    if (catalogSearch && clearSearchBtn) {
        catalogSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            clearSearchBtn.style.display = term.length > 0 ? 'flex' : 'none';
            productItems.forEach(item => {
                const titleEl = item.querySelector('h3') || item.querySelector('h4');
                const productName = titleEl ? titleEl.textContent.toLowerCase() : '';
                item.style.display = productName.includes(term) ? 'block' : 'none';
            });
        });
        clearSearchBtn.addEventListener('click', () => {
            catalogSearch.value = '';
            clearSearchBtn.style.display = 'none';
            const activeFilterBtn = document.querySelector('.mini-filter-btn.active');
            const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
            filterCatalogItems(filter);
            catalogSearch.focus();
        });
    }

    // --- CATALOG MODAL EVENTS ---
    catCards.forEach(card => {
        card.addEventListener('click', () => openCatalog(card.dataset.filter));
    });
    if (closeCatalog) closeCatalog.addEventListener('click', closeCatalogModal);
    if (catalogModal) {
        catalogModal.addEventListener('click', (e) => {
            if (e.target === catalogModal) closeCatalogModal();
        });
    }

    // --- RECIPE MODAL EVENTS ---
    document.querySelectorAll('.tutorial-trigger').forEach(trigger => {
        trigger.addEventListener('click', openRecipeModal);
    });
    if (closeRecipe) closeRecipe.addEventListener('click', closeRecipeModal);
    if (recipeModal) recipeModal.addEventListener('click', closeRecipeModal);

    // --- CHECKOUT / PAYMENT ---
    if (cardPayBtn) cardPayBtn.addEventListener('click', initCheckout);
    if (btnSuccessClose) btnSuccessClose.addEventListener('click', closeSuccess);

    // Nav-based checkout internal flow
    document.getElementById('nav-cancel-checkout')?.addEventListener('click', () => {
        document.getElementById('cart-summary-panel')?.classList.remove('hidden');
        document.getElementById('checkout-section-nav')?.classList.add('hidden');
    });

    document.getElementById('nav-btn-to-payment')?.addEventListener('click', () => {
        const name = document.getElementById('nav-cust-name')?.value;
        const street = document.getElementById('nav-cust-street')?.value;
        const number = document.getElementById('nav-cust-number')?.value;
        const zip = document.getElementById('nav-cust-zip')?.value;
        const city = document.getElementById('nav-cust-city')?.value;

        if (!name || !street || !number || !zip || !city) {
            showToast("⚠️ Por favor, rellena todos los campos requeridos.");
            return;
        }

        window.shippingData = { name, street, number, zip, city, deliveryDate: document.getElementById('nav-delivery-date-inline')?.value || 'No especificada' };
        document.getElementById('checkout-step-shipping')?.classList.add('hidden');
        document.getElementById('checkout-step-payment')?.classList.remove('hidden');
    });

    document.getElementById('nav-btn-back-to-shipping')?.addEventListener('click', () => {
        document.getElementById('checkout-step-payment')?.classList.add('hidden');
        document.getElementById('checkout-step-shipping')?.classList.remove('hidden');
    });

    document.getElementById('nav-pay-btn')?.addEventListener('click', () => {
        const deliveryDate = document.getElementById('nav-delivery-date-inline')?.value;
        if (!deliveryDate) {
            showToast("⚠️ Por favor, selecciona cuándo quieres recibir tu pedido.");
            return;
        }
        if (window.shippingData) window.shippingData.deliveryDate = deliveryDate;
        document.getElementById('checkout-step-payment')?.classList.add('hidden');
        document.getElementById('checkout-step-card')?.classList.remove('hidden');
    });

    document.getElementById('nav-btn-back-to-payment')?.addEventListener('click', () => {
        document.getElementById('checkout-step-card')?.classList.add('hidden');
        document.getElementById('checkout-step-payment')?.classList.remove('hidden');
    });

    document.getElementById('nav-confirm-pay-btn')?.addEventListener('click', () => {
        const cardNumber = document.getElementById('nav-card-number')?.value.replace(/\s/g, '');
        const cardName = document.getElementById('nav-card-name')?.value;
        const cardExpiry = document.getElementById('nav-card-expiry')?.value;
        const cardCvv = document.getElementById('nav-card-cvv')?.value;

        if (!cardNumber || cardNumber.length < 16 || !cardName || !cardExpiry || !cardCvv || cardCvv.length < 3) {
            showToast("⚠️ Por favor, rellena todos los datos de la tarjeta.");
            return;
        }

        // Simular éxito (ya que el checkout es inline y local)
        if (window.shippingData) {
            const { street, number, floor, zip, city, deliveryDate } = window.shippingData;
            const addressEl = document.getElementById('success-address');
            if (addressEl) {
                addressEl.innerHTML = `${street}, ${number}<br/>${floor ? `Piso ${floor}<br/>` : ''}${zip}, ${city}, España`;
            }
        }

        const successScreen = document.getElementById('cart-success-content');
        if (cartMainContent) cartMainContent.style.display = 'none';
        document.getElementById('checkout-section-nav')?.classList.add('hidden');
        if (successScreen) {
            successScreen.classList.remove('hidden');
            successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
            cart = [];
            localStorage.removeItem('cart');
            updateCartUI();
        }
    });

    // --- UI EFFECTS ---
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => revealObserver.observe(el));

    window.addEventListener('scroll', () => {
        if (!navbar) return;
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    // --- CART DRAWER ---
    if (cartIcon) cartIcon.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', toggleCart);
    window.toggleCart = toggleCart; // Exponer para posibles onclick remanentes

    // --- MOBILE MENU ---
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinksContainer?.classList.toggle('active');
        });
    }
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn?.classList.remove('active');
            navLinksContainer?.classList.remove('active');
        });
    });

    // --- AI SEARCH & CHEF ---
    if (aiSearchBtn) {
        aiSearchBtn.addEventListener('click', () => {
            const query = aiSearchInput?.value.trim();
            if (!query) {
                // Si está vacío, actúa como un interruptor (Toggle)
                const isChatActive = chatBox && chatBox.classList.contains('active');
                toggleChatUI(!isChatActive);
            } else { 
                handleSearchOrAI(query); 
                if (aiSearchInput) aiSearchInput.value = ''; 
            }
        });
    }
    if (aiSearchInput) {
        aiSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = aiSearchInput.value.trim();
                handleSearchOrAI(query);
                aiSearchInput.value = '';
            }
        });
    }
    if (chefSuggestionBtn) {
        chefSuggestionBtn.addEventListener('click', () => {
            if (recipeCards && recipeCards.length > 0) {
                const randomIdx = Math.floor(Math.random() * recipeCards.length);
                const targetCard = recipeCards[randomIdx];
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add('ring-4', 'ring-emerald-500', 'scale-105', 'shadow-2xl', 'z-10');
                setTimeout(() => targetCard.classList.remove('ring-4', 'ring-emerald-500', 'scale-105', 'shadow-2xl', 'z-10'), 2000);
                showToast('¡El chef te recomienda probar esta delicia!', 'info');
            }
        });
    }

    // --- CHAT IA TRIGGERS ---
    if (chatTrigger) chatTrigger.addEventListener('click', () => toggleChatUI(true));
    if (chatClose) chatClose.addEventListener('click', () => toggleChatUI(false));
    if (ctaChatTrigger) ctaChatTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggleChatUI(true);
    });
    if (chatSend) chatSend.addEventListener('click', askGemini);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askGemini();
        });
    }

    // --- PRODUCT CLICKS (GLOBAL DELEGATION) ---
    document.addEventListener('click', (e) => {
        const addToCartBtn = e.target.closest('.add-to-cart');
        if (addToCartBtn) {
            addToCart(addToCartBtn);
            return; 
        }

        if (e.target.classList.contains('add-recipe-btn')) {
            const itemsToken = e.target.dataset.items;
            if (!itemsToken) return;
            const items = JSON.parse(itemsToken);
            const recipeContent = e.target.closest('.recipe-content');
            const recipeName = recipeContent ? recipeContent.querySelector('h3').textContent : "Pack Personalizado";
            const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);
            const recipeId = "pack_" + recipeName.replace(/\s+/g, '_').toLowerCase();

            const existingItem = cart.find(item => item.id === recipeId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: recipeId,
                    name: "Pack: " + recipeName,
                    price: totalPrice,
                    quantity: 1,
                    isRecipe: true
                });
            }
            updateCartUI();
        }
    });
}


// --- FUNCTIONS: CART ---
function toggleCart() {
    if (!cartDrawer) return;
    
    const isOpening = cartDrawer.classList.contains('hidden');
    const cartLight = document.getElementById('cart-status-light');

    if (isOpening) {
        cartDrawer.classList.remove('hidden');
        document.body.classList.add('cart-open');
        if (cartLight) cartLight.classList.add('active');
    } else {
        cartDrawer.classList.add('hidden');
        document.body.classList.remove('cart-open');
        if (cartLight) cartLight.classList.remove('active');
        // Ocultar sección de checkout al cerrar carrito
        const checkoutNav = document.getElementById('checkout-section-nav');
        if (checkoutNav) checkoutNav.classList.add('hidden');
    }
}

function syncCatalogButtons() {
    // Sincroniza todos los contenedores de acción (botones del catálogo y cajas)
    document.querySelectorAll('.card-actions').forEach(container => {
        const id = container.dataset.id;
        const cartItem = cart.find(item => String(item.id) === String(id));

        if (cartItem) {
            container.innerHTML = `
                <div class="flex items-center gap-3 bg-surface-container-high rounded-2xl p-1 shadow-inner border border-outline-variant/20">
                    <button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-all text-on-surface hover:text-primary active:scale-90" onclick="changeQty('${id}', -1)">
                        <span class="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <span class="w-6 text-center font-headline font-extrabold text-on-surface">${cartItem.quantity}</span>
                    <button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-all text-on-surface hover:text-primary active:scale-90" onclick="changeQty('${id}', 1)">
                        <span class="material-symbols-outlined text-lg">add</span>
                    </button>
                </div>
            `;
        } else {
            const originalBtn = container.querySelector('.add-to-cart');
            if (!originalBtn) {
                const name = container.dataset.name;
                const price = container.dataset.price;
                const btnText = container.dataset.originalText || 'Añadir';

                // Usamos el diseño premium para el botón restaurado
                container.innerHTML = `
                    <button class="bg-primary hover:bg-on-primary-fixed-variant text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 add-to-cart" 
                            data-id="${id}" 
                            data-name="${name}" 
                            data-price="${price}"
                            data-image="${cartItem ? cartItem.image : (container.dataset.image || '')}">
                        <span class="material-symbols-outlined pointer-events-none">add_shopping_cart</span>
                    </button>
                `;
            }
        }
    });
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg text-zinc-400 font-medium">Tu selección está vacía. Explora el catálogo para añadir frescura.</p>';
        if (cartTotalPrice) cartTotalPrice.textContent = '0,00€';
        if (cartSubtotal) cartSubtotal.textContent = '0,00€';
    } else {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            total += (item.price || 0) * (item.quantity || 1);
            const itemElement = document.createElement('div');
            itemElement.className = 'flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md group';
            itemElement.innerHTML = `
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 shadow-sm">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80'">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-on-surface text-sm uppercase tracking-tight">${item.name}</h4>
                    <p class="text-[11px] text-zinc-500 font-medium mt-0.5">${(item.price || 0).toFixed(2)}€ x ${item.quantity}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-zinc-400 hover:text-emerald-600 active:scale-90" onclick="changeQty('${item.id}', -1)">
                            <span class="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span class="w-4 text-center text-xs font-black text-on-surface">${item.quantity}</span>
                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-zinc-400 hover:text-emerald-600 active:scale-90" onclick="changeQty('${item.id}', 1)">
                            <span class="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    <button class="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" onclick="removeFromCart('${item.id}')">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
        
        if (cartTotalPrice) cartTotalPrice.textContent = `${total.toFixed(2)}€`;
        if (cartSubtotal) cartSubtotal.textContent = `${total.toFixed(2)}€`;

        // Update Checkout if section is visible (Legacy support if still used)
        if (typeof checkoutSection !== 'undefined' && checkoutSection && checkoutSection.style.display !== 'none') {
            if (summarySubtotal) summarySubtotal.textContent = `${total.toFixed(2)}€`;
            if (summaryTotal) summaryTotal.textContent = `${total.toFixed(2)}€`;
            
            const checkoutItemsList = document.getElementById('checkout-items');
            if (checkoutItemsList) {
                checkoutItemsList.innerHTML = '';
                cart.forEach(item => {
                    const line = document.createElement('div');
                    line.className = "flex justify-between items-center py-2 text-sm";
                    line.innerHTML = `
                        <span class="text-zinc-600">${item.name} (x${item.quantity})</span>
                        <span class="font-bold">${(item.price * item.quantity).toFixed(2)}€</span>
                    `;
                    checkoutItemsList.appendChild(line);
                });
            }
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    syncCatalogButtons();
}

function getValidImageUrl(imgRaw) {
    if (!imgRaw) return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80';
    if (!imgRaw.startsWith('http') && !imgRaw.startsWith('imagenes/')) {
        return 'imagenes/' + imgRaw;
    }
    return imgRaw;
}

function addToCart(btnOrData) {
    let id, name, price, imageRaw;
    
    // Si viene de un evento/botón del DOM
    if (btnOrData instanceof HTMLElement) {
        id = btnOrData.dataset.id;
        name = btnOrData.dataset.name;
        price = parseFloat(btnOrData.dataset.price);
        imageRaw = btnOrData.dataset.image;
    } else {
        // Si viene como objeto directo (ej: desde el chat)
        id = btnOrData.id || btnOrData.product_id || btnOrData.producto_id;
        name = btnOrData.name || btnOrData.product_name || btnOrData.producto || btnOrData.title || "Producto AI";
        
        let pRaw = btnOrData.price ?? btnOrData.precio ?? btnOrData.price_per_kg ?? btnOrData.amount ?? 0;
        price = parseFloat(String(pRaw).replace(',', '.'));
        imageRaw = btnOrData.image || btnOrData.imagen || btnOrData.image_url || btnOrData.url;
        
        // Autogenerar un ID basado en el nombre si el agente se olvidó mandarlo
        if (!id) id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    let image = getValidImageUrl(imageRaw);

    if (!name || isNaN(price)) {
        console.warn("addToCart falló validación:", {id, name, price, btnOrData});
        return;
    }

    // Asegurarnos de que el quantity viene correctamente (o usar 1)
    let qtyToAdd = 1;
    if (btnOrData && btnOrData.quantity !== undefined) {
        qtyToAdd = parseInt(btnOrData.quantity) || 1;
    } else if (btnOrData && btnOrData.cantidad !== undefined) {
        qtyToAdd = parseInt(btnOrData.cantidad) || 1;
    }

    const itemIndex = cart.findIndex(item => String(item.id) === String(id));
    if (itemIndex > -1) {
        cart[itemIndex].quantity += qtyToAdd;
        showToast(`${qtyToAdd}x ${name} añadido a la lista de la compra`, 'success');
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: qtyToAdd, image });
        showToast(`${qtyToAdd}x ${name} añadido a la lista de la compra`, 'success');
    }
    updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(item => String(item.id) === String(id));
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            updateCartUI();
        }
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => String(item.id) !== String(id));
    updateCartUI();
}
// --- FUNCTIONS: CATALOG MODAL ---
function openCatalog(filter) {
    // Resetear buscador al abrir
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) searchInput.value = '';

    // Actualizar botones de navegación del modal
    miniFilterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Cambiar título
    let titleText = 'Explorar <span class="text-gradient">Productos</span>';
    if (filter === 'fruta') titleText = 'Nuestras <span class="text-gradient">Frutas</span>';
    if (filter === 'verdura') titleText = 'Nuestras <span class="text-gradient">Verduras</span>';
    catalogTitle.innerHTML = titleText;

    // Filtrar items
    filterCatalogItems(filter);

    // Sincronizar estados de botones antes de mostrar
    syncCatalogButtons();

    catalogModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Reducido: Lógica movida a initEventListeners


function filterCatalogItems(filter) {
    productItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Lógica movida a initEventListeners


function closeCatalogModal() {
    catalogModal.classList.remove('active');
    document.body.style.overflow = '';
}

// --- FUNCTIONS: CHECKOUT & STRIPE ---
function mountStripe() {
    if (cardElement && document.getElementById('payment-element')) {
        cardElement.mount('#payment-element');
        const placeholder = document.querySelector('#payment-element p');
        if (placeholder) placeholder.style.display = 'none';
    }
}

function initCheckout() {
    if (cart.length === 0) {
        showToast("⚠️ Añade algún producto antes de finalizar el pedido.");
        return;
    }

    // Swap: hide the summary panel, show the checkout form in its place
    const summaryPanel = document.getElementById('cart-summary-panel');
    const checkoutNav = document.getElementById('checkout-section-nav');
    if (summaryPanel) summaryPanel.classList.add('hidden');
    if (checkoutNav) checkoutNav.classList.remove('hidden');

    // Reset to step 1 (shipping)
    const stepShipping = document.getElementById('checkout-step-shipping');
    const stepPayment = document.getElementById('checkout-step-payment');
    if (stepShipping) stepShipping.classList.remove('hidden');
    if (stepPayment) stepPayment.classList.add('hidden');

    // Update summary total
    let total = 0;
    cart.forEach(item => total += item.price * item.quantity);
    const navTotal = document.getElementById('nav-summary-total');
    if (navTotal) navTotal.textContent = `${total.toFixed(2)}€`;

    // Populate items list for step 2
    const navItems = document.getElementById('nav-summary-items');
    if (navItems) {
        navItems.innerHTML = cart.map(item =>
            `<div class="flex justify-between"><span>${item.name} x${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)}€</span></div>`
        ).join('');
    }
}

function closeSuccess() {
    if (cartSuccessContent) cartSuccessContent.classList.add('hidden');
    if (cartMainContent) cartMainContent.style.display = '';
    
    document.getElementById('cart-summary-panel')?.classList.remove('hidden');
    document.getElementById('checkout-section-nav')?.classList.add('hidden');
    document.getElementById('checkout-step-shipping')?.classList.remove('hidden');
    document.getElementById('checkout-step-payment')?.classList.add('hidden');
    document.getElementById('checkout-step-card')?.classList.add('hidden');
    
    cart = [];
    localStorage.removeItem('cart');
    updateCartUI();
    
    if (typeof toggleCart === 'function') toggleCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}





// --- EVENT LISTENERS ---
// --- UI & CHAT FUNCTIONS ---

// Función inteligente para distinguir entre Búsqueda y Consulta IA
function handleSearchOrAI(query) {
    if (!query) return;
    
    const queryLower = query.toLowerCase();
    // Heurística: Si es corto (< 4 palabras) y no parece una pregunta compleja
    const words = query.split(/\s+/).filter(w => w.length > 0);
    const complexKeywords = ['cómo', 'como', 'por qué', 'porque', 'qué', 'que', 'ayuda', 'necesito', 'explicación', 'diferencia', 'cuál', 'donde', 'dónde'];
    const isQuestion = queryLower.includes('?') || complexKeywords.some(kw => queryLower.startsWith(kw));

    if (words.length < 4 && !isQuestion) {
        // ES UNA BÚSQUEDA DE PRODUCTO
        openCatalog('all');
        const catalogSearchInput = document.getElementById('catalog-search');
        if (catalogSearchInput) {
            catalogSearchInput.value = query;
            // Disparar evento input para filtrar
            catalogSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        showToast(`🔍 Buscando "${query}" en el catálogo...`);
    } else {
        // ES UNA CONSULTA PARA LA IA
        if (chatBox) {
            if (!chatBox.classList.contains('active')) {
                toggleChatUI(true);
            }
            if (chatInput) {
                chatInput.value = query;
                askGemini(); // Lanzar la consulta directamente
            }
        }
    }
}

function toggleChatUI(show) {
    const chatLight = document.getElementById('chat-status-light');
    if (show) {
        chatBox.classList.add('active');
        if (chatLight) chatLight.classList.add('active');
        if (chatInput) chatInput.focus();
    } else {
        chatBox.classList.remove('active');
        if (chatLight) chatLight.classList.remove('active');
    }
}


function openRecipeModal(e) {
    const trigger = e.target.closest('.tutorial-trigger');
    if (!trigger) return;

    const title = trigger.dataset.title;
    const img = trigger.dataset.img;
    const steps = JSON.parse(trigger.dataset.steps);

    recipeModalTitle.textContent = title;
    recipeModalImg.src = img;

    recipeModalInstructions.innerHTML = steps.map((step, index) => `
        <div class="recipe-step">
            <div class="step-number">${index + 1}</div>
            <div class="step-text">${step}</div>
        </div>
    `).join('');

    recipeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRecipeModal() {
    recipeModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function askGemini() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    // Append user message
    appendMessage(msg, 'user');
    chatInput.value = '';

    // Webhook de n8n
    const N8N_WEBHOOK_URL = 'https://cerebro.agencialquimia.com/webhook/fruteriaweb'; 

    try {
        const payload = { 
            chatInput: msg,
            sessionId: sessionId
        };

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                body: payload // Compatibility with nodes looking for $json.body
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        console.log("Respuesta raw de n8n:", text);

        let botReply;
        let json = null;
        try {
            const parsed = JSON.parse(text);
            // n8n puede devolver un array de un objeto o el objeto directamente
            json = Array.isArray(parsed) ? parsed[0] : parsed;
            
            // Si viene envuelto en 'body' (común en respuestas de Webhook de n8n)
            if (json && json.body && !json.respuesta) {
                json = json.body;
            }

            console.log("JSON procesado:", json);
            
            // Buscamos el contenido en las claves habituales
            const content = json.respuesta || json.output || json.message || json.text;
            
            if (content !== undefined && content !== null && content !== '') {
                botReply = content;
            } else if (typeof json === 'string') {
                botReply = json;
            } else {
                console.warn("Respuesta sin texto explícito, comprobando tipos...");
            }
        } catch (e) {
            console.error("Error parseando JSON:", e);
            botReply = text || "Hubo un problema al procesar la respuesta.";
        }

        if (botReply) {
            appendMessage(botReply, 'bot');
        }

        // --- GESTIÓN DE TARJETAS DE PRODUCTO ---
        // Buscamos product_cards o simplemente una lista si el tipo es products
        const cards = json?.product_cards || json?.products || (json?.type === 'products' ? json : null);
        
        if (json?.type === 'products' || Array.isArray(cards)) {
            const finalCards = Array.isArray(cards) ? cards : (Array.isArray(json?.product_cards) ? json.product_cards : []);
            if (finalCards.length > 0) {
                renderChatProducts(finalCards);
            }
        }

        // --- MANEJO DE ACTUALIZACIÓN DEL CARRITO POR EL AGENTE (n8n) ---
        // Despachamos evento custom para re-validación externa si es necesario
        window.dispatchEvent(new CustomEvent('ai_cart_updated', { detail: { json } }));

        // Si el webhook indica que el carrito se modificó desde el backend (Supabase)
        if (json?.cart_updated || json?.action === 'refresh_cart' || json?.cart || json?.force_refresh || json?.items || json?.added_item || json?.item || json?.product || (json?.name && json?.price)) {
            console.log("El Agente IA actualizó el carrito en BD. Refrescando UI...");
            
            const fixImages = (arr) => arr.map(i => ({...i, image: getValidImageUrl(i.image)}));

            if (Array.isArray(json.cart)) {
                cart = fixImages(json.cart);
                updateCartUI();
                showToast("Carrito sincronizado por la IA.", "success");
            } else if (Array.isArray(json.items)) {
                cart = fixImages(json.items);
                updateCartUI();
                showToast("Carrito sincronizado por la IA.", "success");
            } else if (json.added_item) {
                addToCart(json.added_item);
            } else if (json.item) {
                addToCart(json.item);
            } else if (json.product) {
                addToCart(json.product);
            } else {
                console.warn("Aviso: El agente solicitó actualizar el carrito pero no envió datos relevantes (cart, items, item, product o added_item).");
                updateCartUI();
            }
        }

        if (!botReply && (!json || (!json.product_cards && !json.products))) {
            appendMessage("Recibí una respuesta vacía del servidor.", 'bot');
        }

    } catch (error) {
        console.error("Error en chat:", error);
        appendMessage(`Lo siento, hubo un error de conexión (${error.message}).`, 'bot');
    }
}

function appendMessage(text, sender, isHTML = false) {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    if (isHTML) {
        div.innerHTML = text;
    } else {
        div.textContent = text;
    }
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
}

function renderChatProducts(products) {
    if (!products || !Array.isArray(products)) return;
    
    const container = document.createElement('div');
    container.className = 'chat-products-container';
    
    products.forEach(p => {
        const name = p.name || p.product_name || "Producto";
        const price = p.price || p.price_per_kg || "0.00";
        
        // Magia añadida: Buscar la imagen en nuestro catálogo web si Astro no la envía
        let catalogImage = '';
        const allCatalogItems = document.querySelectorAll('.add-to-cart, .card-actions');
        for (let i = 0; i < allCatalogItems.length; i++) {
            const btnName = allCatalogItems[i].dataset.name;
            if (btnName && btnName.toLowerCase() === name.toLowerCase()) {
                catalogImage = allCatalogItems[i].dataset.image || '';
                if (catalogImage) break;
            }
        }

        let rawImage = p.image || p.image_url || catalogImage;
        let finalImage = rawImage;
        
        // Si el webhook devuelve un archivo local (ej. "aguacate-hass.jpg") sin la ruta, arreglarlo
        if (rawImage && !rawImage.startsWith('http') && !rawImage.startsWith('imagenes/')) {
            finalImage = 'imagenes/' + rawImage;
        } else if (!rawImage) {
            finalImage = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80';
        }

        const id = p.id || Math.random().toString(36).substring(7);

        const card = document.createElement('div');
        card.className = 'chat-product-card';
        
        card.innerHTML = `
            <div class="chat-product-img-wrapper">
                <img src="${finalImage}" alt="${name}" class="chat-product-img" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80'">
            </div>
            <div class="chat-product-info">
                <span class="chat-product-name">${name}</span>
                <span class="chat-product-price">${price}€</span>
            </div>
        `;

        const btn = document.createElement('button');
        btn.className = 'chat-add-btn';
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">add_shopping_cart</span> Añadir`;
        btn.onclick = () => {
            addToCart({
                id: String(id),
                name: String(name),
                price: parseFloat(String(price).replace(',', '.')),
                image: String(finalImage)
            });
        };
        
        card.appendChild(btn);
        container.appendChild(card);
    });
    
    chatLog.appendChild(container);
    
    // Forzamos el scroll doble para asegurar visibilidad tanto en el log como en la tarjeta
    setTimeout(() => {
        chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
        container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 150);
}
// --- KEYBOARD ACCESSIBILITY ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = [
            { el: catalogModal, close: closeCatalogModal },
            { el: recipeModal, close: closeRecipeModal },
            { el: cartDrawer, close: toggleCart, isNav: true }
        ];

        modals.forEach(m => {
            if (m.isNav) {
                if (m.el && !m.el.classList.contains('hidden')) m.close();
            } else {
                if (m.el && m.el.classList.contains('active')) m.close();
            }
        });

        if (chatBox && chatBox.classList.contains('active')) {
            chatBox.classList.remove('active');
        }
    }
});

// Sync catalog search results empty state
function checkSearchResults() {
    const visibleItems = Array.from(productItems).filter(item => item.style.display !== 'none');
    const noResults = document.getElementById('no-results-msg');
    if (!noResults && visibleItems.length === 0) {
        const msg = document.createElement('div');
        msg.id = 'no-results-msg';
        msg.className = 'col-span-full py-20 text-center space-y-4 reveal active';
        msg.innerHTML = `
            <span class="material-symbols-outlined text-6xl text-outline/30">search_off</span>
            <p class="text-xl font-headline font-bold text-on-surface-variant">No hemos encontrado lo que buscas</p>
            <p class="text-on-surface-variant/60">Prueba con otros términos o explora las categorías</p>
        `;
        document.getElementById('catalog-grid').appendChild(msg);
    } else if (noResults && visibleItems.length > 0) {
        noResults.remove();
    }
}

// --- TOAST NOTIFICATION HELPERS ---
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-icon"></div>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- INITIALIZATION ---
function initApp() {
    initSelectors();
    
    // Verificamos si hay que recuperar el carrito
    try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            console.log("Carrito sincronizado desde localStorage:", cart.length, "productos.");
        }
    } catch (e) {
        console.error("Error en la carga inicial del carrito:", e);
    }
    
    // Funciones globales para los onclick del HTML
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;

    updateCartUI(); 
    syncCatalogButtons();
    initEventListeners();
    console.log("Orchard Nexus inicializado y sincronizado correctamente.");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // If DOM is already ready, run it now
    initApp();
}
