// --- STATE ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const sessionId = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
console.log("ID de Sesión iniciado:", sessionId);
// No lo guardamos en localStorage para forzar uno nuevo cada vez que se refresque la página

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
const navbar = document.querySelector('.navbar');
const cartIcon = document.getElementById('cart-icon');
const cartDrawer = document.getElementById('shopping-list-section');
const closeCart = document.getElementById('close-cart-nav');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartCount = document.querySelector('.cart-count');
const cardPayBtn = document.getElementById('card-pay-btn-nav');

// Checkout Selectors
const checkoutSection = document.getElementById('checkout');
const paymentForm = document.getElementById('payment-form');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal = document.getElementById('summary-total');
const cartMainContent = document.getElementById('cart-main-content');
const cartSuccessContent = document.getElementById('cart-success-content');
const btnSuccessClose = document.getElementById('btn-success-close');
const payLoader = document.getElementById('pay-loader');

// Catalog Modal Selectors
const catalogModal = document.getElementById('catalog-modal');
const closeCatalog = document.getElementById('close-catalog');
const productItems = document.querySelectorAll('.product-item');
const catalogTitle = document.getElementById('catalog-title');
const catalogSearch = document.getElementById('catalog-search');
const clearSearchBtn = document.getElementById('clear-catalog-search');
const catCards = document.querySelectorAll('.cat-card');

// Chat / AI Selectors
const chatTrigger = document.getElementById('chat-trigger');
const chatBox = document.getElementById('chat-box');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatClose = document.getElementById('chat-close');
const ctaChatTrigger = document.getElementById('cta-chat-trigger');
const aiSearchBtn = document.getElementById('ai-search-btn');
const aiSearchInput = document.getElementById('ai-search-input');
const chefSuggestionBtn = document.getElementById('chef-suggestion-btn');
const recipeCards = document.querySelectorAll('.recipe-card');

// Mobile Selectors
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');

// --- FUNCTIONS: CART ---
function toggleCart() {
    if (!cartDrawer) return;
    
    const isOpening = cartDrawer.classList.contains('hidden');
    const cartLight = document.getElementById('cart-status-light');

    if (isOpening) {
        cartDrawer.classList.remove('hidden');
        document.body.classList.add('cart-open');
        if (cartLight) cartLight.classList.add('active');
        // Si abrimos la lista, cerramos el chat IA si está abierto
        if (typeof toggleChatUI === 'function') {
            toggleChatUI(false); 
        } else if (chatBox && chatBox.classList.contains('active')) {
            chatBox.classList.remove('active');
        }
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
    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg text-zinc-400 font-medium">Tu selección está vacía. Explora el catálogo para añadir frescura.</p>';
        if (cartTotalPrice) cartTotalPrice.textContent = '0,00€';
        if (cartSubtotal) cartSubtotal.textContent = '0,00€';
    } else {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md group';
            itemElement.innerHTML = `
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 shadow-sm">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80'">
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-on-surface text-sm uppercase tracking-tight">${item.name}</h4>
                    <p class="text-[11px] text-zinc-500 font-medium mt-0.5">${item.price.toFixed(2)}€ x ${item.quantity}</p>
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
        if (checkoutSection && checkoutSection.style.display !== 'none') {
            summarySubtotal.textContent = `${total.toFixed(2)}€`;
            summaryTotal.textContent = `${total.toFixed(2)}€`;
            
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

function addToCart(btnOrData) {
    let id, name, price, image;
    
    // Si viene de un evento/botón del DOM
    if (btnOrData instanceof HTMLElement) {
        id = btnOrData.dataset.id;
        name = btnOrData.dataset.name;
        price = parseFloat(btnOrData.dataset.price);
        image = btnOrData.dataset.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80';
    } else {
        // Si viene como objeto directo (ej: desde el chat)
        id = btnOrData.id;
        name = btnOrData.name;
        price = parseFloat(btnOrData.price);
        image = btnOrData.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80';
    }

    if (!id || !name || isNaN(price)) return;

    const itemIndex = cart.findIndex(item => String(item.id) === String(id));
    if (itemIndex > -1) {
        cart[itemIndex].quantity++;
        showToast(`${name} añadido a la lista de la compra`, 'success');
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: 1, image });
        showToast(`${name} añadido a la lista de la compra`, 'success');
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

// --- CATALOG MINI NAV LOGIC ---
const miniFilterBtns = document.querySelectorAll('.mini-filter-btn');

miniFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Actualizar UI del mini nav
        miniFilterBtns.forEach(b => {
            b.classList.remove('bg-primary', 'text-white');
            b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary', 'text-white');
        btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');

        // Aplicar filtro
        filterCatalogItems(filter);

        let titleText = '';
        if (filter === 'fruta') titleText = 'Nuestras <span class="text-primary italic">Frutas</span>';
        if (filter === 'verdura') titleText = 'Nuestras <span class="text-primary italic">Verduras</span>';
        if (filter === 'exotico') titleText = 'Nuestros <span class="text-primary italic">Exóticos</span>';
        if (filter === 'all') titleText = 'Cosecha <span class="text-primary italic">de Hoy</span>';
        catalogTitle.innerHTML = titleText;
    });
});

function filterCatalogItems(filter) {
    productItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Lógica del buscador en tiempo real
if (catalogSearch && clearSearchBtn) {
    catalogSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // Mostrar/Ocultar botón X
        clearSearchBtn.style.display = term.length > 0 ? 'flex' : 'none';

        productItems.forEach(item => {
            const titleEl = item.querySelector('h3') || item.querySelector('h4');
            const productName = titleEl ? titleEl.textContent.toLowerCase() : '';
            const matchesSearch = productName.includes(term);
            if (matchesSearch) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    clearSearchBtn.addEventListener('click', () => {
        catalogSearch.value = '';
        clearSearchBtn.style.display = 'none';
        
        // Restaurar todos los items (o el filtro activo)
        const activeFilterBtn = document.querySelector('.mini-filter-btn.active');
        const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
        filterCatalogItems(filter);
        
        catalogSearch.focus();
    });
}

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

    const checkoutNav = document.getElementById('checkout-section-nav');
    if (checkoutNav) {
        checkoutNav.classList.remove('hidden');
        checkoutNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Resetear a paso 1
    const stepShipping = document.getElementById('step-shipping');
    const stepPayment = document.getElementById('step-payment');
    if (stepShipping) stepShipping.classList.remove('hidden');
    if (stepPayment) stepPayment.classList.add('hidden');

    let total = 0;
    cart.forEach(item => total += item.price * item.quantity);
    summarySubtotal.textContent = `${total.toFixed(2)}€`;
    summaryTotal.textContent = `${total.toFixed(2)}€`;
}

function goToPayment() {
    // Validar campos del paso 1
    const name = document.getElementById('cust-name').value;
    const street = document.getElementById('cust-street').value;
    const number = document.getElementById('cust-number').value;
    const zip = document.getElementById('cust-zip').value;
    const city = document.getElementById('cust-city').value;

    if (!name || !street || !number || !zip || !city) {
        showToast("⚠️ Por favor, rellena todos los campos de envío requeridos.");
        return;
    }

    // Transición visual
    document.getElementById('step-shipping').classList.add('hidden');
    document.getElementById('step-payment').classList.remove('hidden');

    // Montar Stripe ahora que el contenedor es visible (si existe la función)
    if (typeof mountStripe === 'function') {
        setTimeout(mountStripe, 100);
    }
}

function backToShipping() {
    document.getElementById('step-payment').classList.add('hidden');
    document.getElementById('step-shipping').classList.remove('hidden');
}

async function handlePayment(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-pay');
    const btnText = submitBtn.querySelector('.btn-text');
    const displayError = document.getElementById('card-errors');

    btnText.style.display = 'none';
    payLoader.style.display = 'inline-block';
    submitBtn.disabled = true;

    if (!stripe) {
        alert("Stripe no está configurado correctamente.");
        return;
    }

    const customerData = {
        name: document.getElementById('cust-name').value,
        address_line1: document.getElementById('cust-street').value + ' ' + document.getElementById('cust-number').value,
        address_line2: document.getElementById('cust-floor').value,
        address_city: document.getElementById('cust-city').value,
        address_zip: document.getElementById('cust-zip').value
    };

    try {
        // 1. Crear intention de pago en el backend
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                customer: customerData
            })
        });

        if (!response.ok) {
            throw new Error('Error al iniciar el pago en el servidor');
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const clientSecret = data.clientSecret;

        // 2. Confirmar pago con Stripe directamente
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: customerData.name,
                    address: {
                        city: customerData.address_city,
                        postal_code: customerData.address_zip,
                        line1: customerData.address_line1
                    }
                }
            }
        });

        if (result.error) {
            // Error en la tarjeta (fondos insuficientes, etc)
            displayError.textContent = result.error.message;
            btnText.style.display = 'inline-block';
            payLoader.style.display = 'none';
            submitBtn.disabled = false;
        } else {
            if (result.paymentIntent.status === 'succeeded') {
                // Éxito total
                setTimeout(() => {
                    payLoader.style.display = 'none';
                    
                    // Llenar datos de éxito
                    const orderId = '#NX-' + result.paymentIntent.id.substring(result.paymentIntent.id.length - 6).toUpperCase();
                    document.getElementById('success-order-id').textContent = orderId;
                    document.getElementById('success-total').textContent = summaryTotal.textContent;
                    
                    const cardBrand = result.paymentIntent.payment_method?.card?.brand || 'Tarjeta';
                    const cardLast4 = result.paymentIntent.payment_method?.card?.last4 || '****';
                    document.getElementById('success-method').textContent = `${cardBrand} •••• ${cardLast4}`;
                    
                    document.getElementById('success-address').innerHTML = `
                        ${customerData.address_line1}<br/>
                        ${customerData.address_line2 ? customerData.address_line2 + '<br/>' : ''}
                        ${customerData.address_zip}, ${customerData.address_city}, España
                    `;

                    // Mostrar pantalla de éxito y ocultar contenido principal del carrito
                    if (cartMainContent) cartMainContent.classList.add('hidden');
                    if (cartSuccessContent) cartSuccessContent.classList.remove('hidden');
                    
                    cart = [];
                    updateCartUI();

                    // Resetear formulario
                    btnText.style.display = 'inline-block';
                    submitBtn.disabled = false;
                }, 1000);
            }
        }

    } catch (error) {
        console.error("Error de pago:", error);
        displayError.textContent = "Hubo un error técnico. Inténtalo de nuevo.";
        btnText.style.display = 'inline-block';
        payLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function closeSuccess() {
    if (cartSuccessContent) cartSuccessContent.classList.add('hidden');
    if (cartMainContent) cartMainContent.classList.remove('hidden');
    
    // Resetear checkout back to step 1
    const stepShipping = document.getElementById('step-shipping');
    const stepPayment = document.getElementById('step-payment');
    if (stepShipping) stepShipping.classList.remove('hidden');
    if (stepPayment) stepPayment.classList.add('hidden');
    
    // Ocultar nav de checkout
    const checkoutNav = document.getElementById('checkout-section-nav');
    if (checkoutNav) checkoutNav.classList.add('hidden');
    
    toggleCart(); // Cerrar el carrito
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (btnSuccessClose) {
    btnSuccessClose.addEventListener('click', closeSuccess);
}

// --- EVENT LISTENERS ---
document.addEventListener('scroll', () => {
    if (navbar && window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else if (navbar) {
        navbar.classList.remove('scrolled');
    }
});

if (cartIcon) cartIcon.addEventListener('click', toggleCart);
if (closeCart) closeCart.addEventListener('click', toggleCart);

if (chefSuggestionBtn) {
    chefSuggestionBtn.addEventListener('click', () => {
        if (recipeCards.length > 0) {
            const randomIdx = Math.floor(Math.random() * recipeCards.length);
            const targetCard = recipeCards[randomIdx];
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.classList.add('ring-4', 'ring-emerald-500', 'scale-105', 'shadow-2xl', 'z-10');
            setTimeout(() => {
                targetCard.classList.remove('ring-4', 'ring-emerald-500', 'scale-105', 'shadow-2xl', 'z-10');
            }, 2000);
            showToast('¡El chef te recomienda probar esta delicia!', 'info');
        }
    });
}

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinksContainer.classList.toggle('active');
    });
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
        if (navLinksContainer) navLinksContainer.classList.remove('active');
    });
});

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

if (aiSearchBtn) {
    aiSearchBtn.addEventListener('click', () => {
        const query = aiSearchInput.value.trim();
        handleSearchOrAI(query);
        aiSearchInput.value = '';
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

if (chatTrigger) {
    chatTrigger.addEventListener('click', () => {
        if (chatBox) {
            const isOpening = !chatBox.classList.contains('active');
            toggleChatUI(isOpening);
        }
    });
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

if (chatClose) {
    chatClose.addEventListener('click', () => toggleChatUI(false));
}

if (ctaChatTrigger) {
    ctaChatTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (chatBox) {
            chatBox.classList.add('active');
            if (chatInput) chatInput.focus();
        }
    });
}

if (chatSend) chatSend.addEventListener('click', askGemini);
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askGemini();
    });
}

// Global click delegation for "Add" buttons
document.addEventListener('click', (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart');
    if (addToCartBtn) {
        addToCart(addToCartBtn);
    }
});



// Delegación global para botones "Añadir"
document.addEventListener('click', (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart');
    if (addToCartBtn) {
        addToCart(addToCartBtn);
    }

    if (e.target.classList.contains('add-recipe-btn')) {
        const items = JSON.parse(e.target.dataset.items);
        const recipeName = e.target.closest('.recipe-content').querySelector('h3').textContent;
        // Calculamos el precio total del pack de receta
        const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

        // Creamos un ID único para el pack de receta
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

        // Feedback visual
        const originalText = e.target.textContent;
        e.target.textContent = "¡Receta añadida!";
        e.target.style.background = "#059669";
        setTimeout(() => {
            e.target.textContent = originalText;
            e.target.style.background = "";
        }, 2000);
    }
});

catCards.forEach(card => {
    card.addEventListener('click', () => {
        openCatalog(card.dataset.filter);
    });
});

closeCatalog.addEventListener('click', closeCatalogModal);
catalogModal.addEventListener('click', (e) => {
    if (e.target === catalogModal) closeCatalogModal();
});

// --- RECIPE MODAL LOGIC ---
const recipeModal = document.getElementById('recipe-modal');
const recipeModalTitle = document.getElementById('recipe-modal-title');
const recipeModalImg = document.getElementById('recipe-modal-img');
const recipeModalInstructions = document.getElementById('recipe-modal-instructions');
const closeRecipe = document.getElementById('close-recipe');

function openRecipeModal(e) {
    const trigger = e.target.closest('.tutorial-trigger');
    if (!trigger) return;

    const title = trigger.dataset.title;
    const img = trigger.dataset.img;
    const steps = JSON.parse(trigger.dataset.steps);

    recipeModalTitle.textContent = title;
    recipeModalImg.src = img;

    // Generar pasos
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

document.querySelectorAll('.tutorial-trigger').forEach(trigger => {
    trigger.addEventListener('click', openRecipeModal);
});

closeRecipe.addEventListener('click', closeRecipeModal);
recipeModal.addEventListener('click', closeRecipeModal);

cardPayBtn.addEventListener('click', initCheckout);
document.getElementById('btn-to-payment').addEventListener('click', goToPayment);
document.getElementById('btn-back-to-shipping').addEventListener('click', backToShipping);
paymentForm.addEventListener('submit', handlePayment);
finishSuccess.addEventListener('click', closeSuccess);



// --- REVEAL ANIMATION LOGIC ---
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, {
    threshold: 0.1
});

revealElements.forEach(el => revealObserver.observe(el));

// --- NAVBAR SCROLL EFFECT ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- INITIALIZATION ---
updateCartUI();
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askGemini();
    });
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
        const image = p.image || p.image_url || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80';
        const id = p.id || Math.random().toString(36).substring(7);

        const card = document.createElement('div');
        card.className = 'chat-product-card';
        
        card.innerHTML = `
            <div class="chat-product-img-wrapper">
                <img src="${image}" alt="${name}" class="chat-product-img" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80'">
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
                image: String(image)
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

catalogSearch?.addEventListener('input', checkSearchResults);
clearSearchBtn?.addEventListener('click', checkSearchResults);
miniFilterBtns.forEach(btn => btn.addEventListener('click', checkSearchResults));
