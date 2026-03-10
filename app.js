// --- STATE ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

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
const cartIcon = document.getElementById('cart-icon');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const closeCart = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartCount = document.querySelector('.cart-count');
const cardPayBtn = document.getElementById('card-pay-btn');

// Checkout Selectors
const checkoutSection = document.getElementById('checkout');
const paymentForm = document.getElementById('payment-form');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal = document.getElementById('summary-total');
const successScreen = document.getElementById('success-screen');
const finishSuccess = document.getElementById('finish-success');
const payLoader = document.getElementById('pay-loader');

// Catalog Modal Selectors
const catCards = document.querySelectorAll('.cat-card');
const catalogModal = document.getElementById('catalog-modal');
const closeCatalog = document.getElementById('close-catalog');
const productItems = document.querySelectorAll('.product-item');
const catalogTitle = document.getElementById('catalog-title');

// --- FUNCTIONS: CART ---
function toggleCart() {
    cartDrawer.classList.toggle('active');
    cartOverlay.style.display = cartDrawer.classList.contains('active') ? 'block' : 'none';
}

function syncCatalogButtons() {
    // Sincroniza todos los contenedores de acción (botones del catálogo y cajas)
    document.querySelectorAll('.card-actions').forEach(container => {
        const id = container.dataset.id; // Soportar ID como string
        const cartItem = cart.find(item => String(item.id) === String(id));

        if (cartItem) {
            // Si está en el carrito, mostrar controles de cantidad
            container.innerHTML = `
                <div class="qty-controls-card">
                    <button class="qty-btn remove" onclick="changeQty('${id}', -1)">
                        -
                    </button>
                    <span>${cartItem.quantity}</span>
                    <button class="qty-btn" onclick="changeQty('${id}', 1)">+</button>
                </div>
            `;
        } else {
            const originalBtn = container.querySelector('.add-to-cart');
            if (!originalBtn) {
                const name = container.dataset.name;
                const price = container.dataset.price;
                const btnText = container.dataset.originalText || 'Añadir';

                container.innerHTML = `
                    <button class="btn btn-primary add-to-cart" 
                            data-id="${id}" 
                            data-name="${name}" 
                            data-price="${price}">${btnText}</button>
                `;
            }
        }
    });
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg">Tu carrito está vacío</p>';
        cartTotalPrice.textContent = '0,00€';
    } else {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            // Usamos comillas simples para los IDs para soportar IDs de texto (recetas)
            itemElement.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.price.toFixed(2)}€ x ${item.quantity}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">Eliminar</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
        cartTotalPrice.textContent = `${total.toFixed(2)}€`;

        if (checkoutSection && checkoutSection.style.display !== 'none') {
            summarySubtotal.textContent = `${total.toFixed(2)}€`;
            summaryTotal.textContent = `${total.toFixed(2)}€`;

            // Actualizar lista de productos en el checkout (id="checkout-items")
            const checkoutItemsList = document.getElementById('checkout-items');
            if (checkoutItemsList) {
                checkoutItemsList.innerHTML = '';
                cart.forEach(item => {
                    const line = document.createElement('div');
                    line.style.display = 'flex';
                    line.style.justifyContent = 'space-between';
                    line.style.marginBottom = '0.5rem';
                    line.style.fontSize = '0.9rem';
                    line.innerHTML = `
                        <span>${item.name} (x${item.quantity})</span>
                        <span>${(item.price * item.quantity).toFixed(2)}€</span>
                    `;
                    checkoutItemsList.appendChild(line);
                });
            }
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));

    // IMPORTANTE: Sincronizar los botones de las tarjetas cada vez que cambia el carrito
    syncCatalogButtons();
}

function addToCart(e) {
    const btn = e.target;
    if (!btn.classList.contains('add-to-cart')) return;

    const id = btn.dataset.id; // Soportar ID como string
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);

    const existingItem = cart.find(item => String(item.id) === String(id));
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
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

    catalogModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// --- CATALOG MINI NAV LOGIC ---
const miniFilterBtns = document.querySelectorAll('.mini-filter-btn');

miniFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Actualizar UI del mini nav
        miniFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Aplicar filtro
        filterCatalogItems(filter);

        // Actualizar título según filtro
        let titleText = 'Explorar <span class="text-gradient">Productos</span>';
        if (filter === 'fruta') titleText = 'Nuestras <span class="text-gradient">Frutas</span>';
        if (filter === 'verdura') titleText = 'Nuestras <span class="text-gradient">Verduras</span>';
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
const catalogSearch = document.getElementById('catalog-search');
const clearSearchBtn = document.getElementById('clear-catalog-search');

if (catalogSearch && clearSearchBtn) {
    catalogSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // Mostrar/Ocultar botón X
        clearSearchBtn.style.display = term.length > 0 ? 'flex' : 'none';

        productItems.forEach(item => {
            const productName = item.querySelector('h4').textContent.toLowerCase();
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

    checkoutSection.style.display = 'block';

    // Resetear a paso 1
    document.getElementById('step-shipping').style.display = 'block';
    document.getElementById('step-payment').style.display = 'none';

    let total = 0;
    cart.forEach(item => total += item.price * item.quantity);
    summarySubtotal.textContent = `${total.toFixed(2)}€`;
    summaryTotal.textContent = `${total.toFixed(2)}€`;

    if (catalogModal.classList.contains('active')) closeCatalogModal();
    if (cartDrawer.classList.contains('active')) toggleCart();

    checkoutSection.scrollIntoView({ behavior: 'smooth' });
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
    document.getElementById('step-shipping').style.display = 'none';
    document.getElementById('step-payment').style.display = 'block';

    // Montar Stripe ahora que el contenedor es visible
    setTimeout(mountStripe, 100);

    checkoutSection.scrollIntoView({ behavior: 'smooth' });
}

function backToShipping() {
    document.getElementById('step-payment').style.display = 'none';
    document.getElementById('step-shipping').style.display = 'block';
    checkoutSection.scrollIntoView({ behavior: 'smooth' });
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
        const response = await fetch('/.netlify/functions/create-payment', {
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
                    successScreen.style.display = 'flex';
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
    successScreen.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- EVENT LISTENERS ---
cartIcon.addEventListener('click', toggleCart);
closeCart.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);

// Inicialización: Envolver botones en contenedores de acción
function initProductButtons() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-actions';
        wrapper.dataset.id = btn.dataset.id;
        wrapper.dataset.name = btn.dataset.name;
        wrapper.dataset.price = btn.dataset.price;
        wrapper.dataset.originalText = btn.textContent;

        btn.parentNode.insertBefore(wrapper, btn);
        wrapper.appendChild(btn);
    });
}

// Delegación global para botones "Añadir"
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
        addToCart(e);
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

// --- INIT ---
initProductButtons(); // Envolver botones primero
updateCartUI();      // Sincronizar estado inicial

window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

// --- MOBILE MENU LOGIC ---
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinksContainer.classList.toggle('active');
    });
}

// Close menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
        if (navLinksContainer) navLinksContainer.classList.remove('active');
    });
});
// --- TOAST NOTIFICATION HELPERS ---
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-icon"></div>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('active'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- NEXUS CHAT LOGIC ---
const chatTrigger = document.getElementById('chat-trigger');
const chatBox = document.getElementById('chat-box');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatClose = document.getElementById('chat-close');
const ctaChatTrigger = document.getElementById('cta-chat-trigger');

if (chatTrigger) {
    chatTrigger.addEventListener('click', () => {
        if (chatBox) {
            chatBox.classList.toggle('active');
            if (chatBox.classList.contains('active')) {
                chatInput.focus();
            }
        }
    });
}

if (chatClose) {
    chatClose.addEventListener('click', () => {
        chatBox.classList.remove('active');
    });
}

if (ctaChatTrigger) {
    ctaChatTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        chatBox.classList.add('active');
        chatInput.focus();
    });
}

if (chatSend) {
    chatSend.addEventListener('click', askGemini);
}

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

    // Webhook de Make
    const WEBHOOK_URL = 'https://hook.eu1.make.com/ybe3wo4nuz4h23gqxwl3z28k5jwiuzfd';

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pregunta: msg })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // Obtenemos el texto primero para poder depurar si no es JSON válido
        const text = await response.text();
        console.log("Respuesta raw de Make:", text);

        let botReply;
        try {
            const json = JSON.parse(text);
            // Soporte para {respuesta: "..."} o {detail: "..."} o simplemente el JSON entero si es string
            botReply = json.respuesta || json.message || json.detail || JSON.stringify(json);
        } catch (e) {
            // Si no es JSON, asumimos que Make devolvió texto plano
            botReply = text;
        }

        if (botReply) {
            appendMessage(botReply, 'bot');
        } else {
            appendMessage("Recibí una respuesta vacía del servidor.", 'bot');
        }

    } catch (error) {
        console.error("Error en chat:", error);
        appendMessage(`Lo siento, hubo un error de conexión (${error.message}).`, 'bot');
    }
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
}
