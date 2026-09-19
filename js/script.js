(function () {
  const CART_KEY = 'flezible_eggs_cart_v1';
  const WHATSAPP_NUMBER = '2348060856036';
  const pagePath = window.location.pathname.split('/').pop() || 'index.html';

  const moneyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  });

  function formatMoney(value) {
    return moneyFormatter.format(Number(value || 0));
  }

  function safeText(value) {
    return String(value ?? '').replace(/[<>]/g, '');
  }

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const wantedQty = Number(quantity) || 0;
    if (!productId || wantedQty <= 0) return;

    const existing = cart.find((item) => item.product_id === productId);
    if (existing) {
      existing.quantity += wantedQty;
    } else {
      cart.push({ product_id: productId, quantity: wantedQty });
    }

    saveCart(cart);
    renderCartDrawer();
    updateCartBadge();
  }

  function updateCartItem(productId, quantity) {
    const cart = getCart();
    const nextQty = Number(quantity) || 0;
    const nextCart = cart
      .map((item) => item.product_id === productId ? { ...item, quantity: nextQty } : item)
      .filter((item) => item.quantity > 0);
    saveCart(nextCart);
    renderCartDrawer();
    updateCartBadge();
  }

  function removeCartItem(productId) {
    const next = getCart().filter((item) => item.product_id !== productId);
    saveCart(next);
    renderCartDrawer();
    updateCartBadge();
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    renderCartDrawer();
  }

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  }

  async function fetchProductsForCart(items) {
    if (!items.length) return [];
    const ids = [...new Set(items.map((item) => item.product_id))];
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .in('id', ids)
      .eq('is_active', true);

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  }

  async function renderCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!drawer || !list || !totalEl) return;

    const items = getCart();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
      totalEl.textContent = formatMoney(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    const products = await fetchProductsForCart(items);
    const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

    let subtotal = 0;
    list.innerHTML = items
      .map((item) => {
        const product = productMap[item.product_id];
        if (!product) return null;
        const lineTotal = Number(product.price) * Number(item.quantity || 0);
        subtotal += lineTotal;
        return `
          <div class="cart-row">
            <div>
              <div class="font-semibold text-ink">${safeText(product.name)}</div>
              <div class="text-xs text-muted">${safeText(product.egg_count)} eggs · ${formatMoney(product.price)}</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="quantity-stepper compact">
                <button type="button" data-cart-action="decrease" data-product-id="${product.id}" aria-label="Decrease quantity">-</button>
                <input type="number" min="0" value="${item.quantity}" data-cart-quantity="${product.id}" aria-label="Quantity for ${safeText(product.name)}">
                <button type="button" data-cart-action="increase" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="text-sm text-clay font-bold" data-remove-item="${product.id}">Remove</button>
            </div>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');

    totalEl.textContent = formatMoney(subtotal);
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  function setupMobileNavigation() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.add('open');
    overlay.classList.remove('hidden');
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (!drawer || !overlay) return;
    drawer.classList.remove('open');
    overlay.classList.add('hidden');
  }

  function createWhatsAppMessage(orderItems, deliveryAddress, preparation, note, customerName, orderId) {
    const lines = [
      'Hello Flezible Eggs! 🥚',
      '',
      '*New Order*' + (orderId ? ` (Ref: #${orderId.slice(0, 8)})` : ''),
      ...(customerName ? ['Customer: ' + customerName] : []),
      'Delivery address: ' + deliveryAddress,
      'Preparation: ' + preparation,
      '',
      'Order items:'
    ];

    for (const item of orderItems) {
      lines.push(`• ${item.name} x${item.quantity} (${formatMoney(item.price)})`);
    }

    const total = orderItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 0)), 0);
    lines.push('');
    lines.push('Total: ' + formatMoney(total));

    if (note) {
      lines.push('Note: ' + note);
    }

    return encodeURIComponent(lines.join('\n'));
  }

  async function homePageInit() {
    const productGrid = document.getElementById('productsGrid');
    const cartToggle = document.getElementById('cartToggle');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartCloseBtn = document.getElementById('cartCloseBtn');
    const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');

    if (cartToggle) {
      cartToggle.addEventListener('click', openCartDrawer);
    }
    if (cartOverlay) {
      cartOverlay.addEventListener('click', closeCartDrawer);
    }
    if (cartCloseBtn) {
      cartCloseBtn.addEventListener('click', closeCartDrawer);
    }
    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener('click', async () => {
        closeCartDrawer();
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (!session) {
            window.location.href = './login.html?redirect=checkout.html';
            return;
          }
          window.location.href = './checkout.html';
        } catch (err) {
          console.error('Auth session error:', err);
          window.location.href = './login.html?redirect=checkout.html';
        }
      });
    }

    document.body.addEventListener('click', async (event) => {
      const addButton = event.target.closest('.add-to-cart-btn');
      if (addButton) {
        const productId = addButton.dataset.productId;
        const input = document.querySelector(`[data-quantity-input="${productId}"]`);
        let qty = Number(input ? input.value : 0) || 0;
        if (qty <= 0) {
          qty = 1;
        }
        addToCart(productId, qty);
        if (input) input.value = 1;
      }

      const cartAction = event.target.closest('[data-cart-action]');
      if (cartAction) {
        const productId = cartAction.dataset.productId;
        const current = getCart().find((item) => item.product_id === productId);
        const quantity = current ? current.quantity : 0;
        const change = cartAction.dataset.cartAction === 'increase' ? 1 : -1;
        const next = quantity + change;
        if (next <= 0) {
          removeCartItem(productId);
        } else {
          updateCartItem(productId, next);
        }
        return;
      }

      const removeBtn = event.target.closest('[data-remove-item]');
      if (removeBtn) {
        removeCartItem(removeBtn.dataset.removeItem);
      }
    });

    document.body.addEventListener('input', (event) => {
      const input = event.target.closest('[data-quantity-input]');
      if (input) {
        const value = Number(input.value || 0);
        input.value = Math.max(0, value);
      }

      const cartInput = event.target.closest('[data-cart-quantity]');
      if (cartInput) {
        const productId = cartInput.dataset.cartQuantity;
        const qty = Number(cartInput.value || 0);
        if (!isNaN(qty) && qty >= 0) {
          updateCartItem(productId, qty);
        }
      }
    });

    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      productGrid.innerHTML = '<div class="empty-state">Products could not be loaded right now.</div>';
      console.error(error);
      return;
    }

    const products = data || [];
    productGrid.innerHTML = products.map((product) => {
      const imageMarkup = product.image_url
        ? `<div class="product-image-box">
             <img src="${product.image_url}" alt="${safeText(product.name)}" class="product-photo" onerror="this.parentElement.innerHTML='<div class=\'product-illustration\'>🥚</div>'" />
           </div>`
        : `<div class="product-illustration">🥚</div>`;

      return `
        <article class="product-card">
          ${imageMarkup}
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-display text-2xl text-ink leading-none">${safeText(product.name)}</h3>
              <p class="text-sm text-muted mt-2">${product.egg_count} eggs</p>
            </div>
            <span class="pill pill-soft">Fresh</span>
          </div>

          <div class="mt-5 flex items-end justify-between">
            <div>
              <div class="font-display text-3xl text-clay">${formatMoney(product.price)}</div>
              <div class="text-[11px] uppercase tracking-[0.18em] text-muted">per pack</div>
            </div>
            <div class="quantity-stepper">
              <button type="button" data-stepper="decrease" data-product-id="${product.id}" aria-label="Decrease quantity">−</button>
              <input type="number" min="1" value="1" data-quantity-input="${product.id}" aria-label="Quantity for ${safeText(product.name)}">
              <button type="button" data-stepper="increase" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <button type="button" class="button-primary w-full mt-4 add-to-cart-btn" data-product-id="${product.id}">Add to cart</button>
        </article>
      `;
    }).join('');

    document.body.addEventListener('click', (event) => {
      const stepperButton = event.target.closest('[data-stepper]');
      if (!stepperButton) return;
      const productId = stepperButton.dataset.productId;
      const input = document.querySelector(`[data-quantity-input="${productId}"]`);
      if (!input) return;
      const currentVal = Number(input.value || 0);
      const nextVal = stepperButton.dataset.stepper === 'increase' ? currentVal + 1 : currentVal - 1;
      input.value = Math.max(0, nextVal);
    });

    updateCartBadge();
    renderCartDrawer();
  }

  async function checkoutPageInit() {
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutSubtotal = document.getElementById('checkoutSubtotal');
    const checkoutTotal = document.getElementById('checkoutTotal');
    const checkoutItemCount = document.getElementById('checkoutItemCount');
    const whatsappCheckoutBtn = document.getElementById('whatsappCheckoutBtn');
    const websiteCheckoutBtn = document.getElementById('websiteCheckoutBtn');
    const addressField = document.getElementById('deliveryAddress');
    const preparationField = document.getElementById('preparation');
    const noteField = document.getElementById('note');

    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = './login.html?redirect=checkout.html';
      return;
    }

    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profileError && profileData) {
      addressField.value = profileData.delivery_address || '';
    }

    const cart = getCart();
    if (!cart.length) {
      checkoutItems.innerHTML = '<div class="empty-state">Your cart is empty. Add items before checkout.</div>';
      checkoutSubtotal.textContent = formatMoney(0);
      checkoutTotal.textContent = formatMoney(0);
      checkoutItemCount.textContent = '0 items';
      whatsappCheckoutBtn.disabled = true;
      websiteCheckoutBtn.disabled = true;
      return;
    }

    const products = await fetchProductsForCart(cart);
    const map = Object.fromEntries(products.map((product) => [product.id, product]));
    let subtotal = 0;
    checkoutItems.innerHTML = cart
      .map((item) => {
        const product = map[item.product_id];
        if (!product) return null;
        const lineTotal = Number(product.price) * Number(item.quantity || 0);
        subtotal += lineTotal;
        return `
          <div class="product-checkout-row">
            <div>
              <div class="font-semibold text-ink">${safeText(product.name)}</div>
              <div class="text-xs text-muted">${product.egg_count} eggs</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-ink">${formatMoney(lineTotal)}</div>
              <div class="text-xs text-muted">Qty: ${item.quantity}</div>
            </div>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');

    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    checkoutItemCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
    checkoutSubtotal.textContent = formatMoney(subtotal);
    checkoutTotal.textContent = formatMoney(subtotal);

    const handleCheckout = async (paymentMethod) => {
      const trimmedAddress = addressField.value.trim();
      const preparation = preparationField.value;
      const note = noteField.value.trim();

      if (!trimmedAddress) {
        alert('Please add a delivery address before continuing.');
        addressField.focus();
        return;
      }

      if (!cart.length) {
        alert('Your cart is empty.');
        return;
      }

      const payloadItems = cart.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity || 0)
      }));

      let response;
      try {
        response = await supabaseClient.rpc('create_order', {
          p_items: payloadItems,
          p_delivery_address: trimmedAddress,
          p_preparation: preparation,
          p_note: note,
          p_payment_method: paymentMethod,
          p_payment_type: paymentMethod === 'whatsapp' ? null : null
        });
      } catch (error) {
        console.error(error);
        alert('Unable to place the order right now. Please try again.');
        return;
      }

      if (response.error) {
        console.error(response.error);
        alert(response.error.message || 'Unable to place the order right now.');
        return;
      }

      const orderId = response.data;

      if (paymentMethod === 'whatsapp') {
        const productRows = cart
          .map((item) => {
            const product = map[item.product_id];
            return product ? { name: product.name, quantity: item.quantity, price: product.price } : null;
          })
          .filter(Boolean);

        const message = createWhatsAppMessage(productRows, trimmedAddress, preparation, note, session.user.id);
        const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
        clearCart();
        window.location.href = waUrl;
        return;
      }

      clearCart();
      window.location.href = `./payment.html?order_id=${encodeURIComponent(orderId)}`;
    };

    whatsappCheckoutBtn.addEventListener('click', () => handleCheckout('whatsapp'));
    websiteCheckoutBtn.addEventListener('click', () => handleCheckout('website'));
  }

  async function paymentPageInit() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const orderIdText = document.getElementById('orderIdText');
    const orderTotalText = document.getElementById('orderTotalText');
    const payNowPanel = document.getElementById('payNowPanel');
    const bankNameEl = document.getElementById('bankName');
    const bankAccountNumberEl = document.getElementById('bankAccountNumber');
    const bankAccountNameEl = document.getElementById('bankAccountName');
    const paymentDescriptionEl = document.getElementById('paymentDescription');
    const uploadMessage = document.getElementById('uploadMessage');
    const payOnDeliveryBtn = document.getElementById('payOnDeliveryBtn');
    const payNowBtn = document.getElementById('payNowBtn');
    const receiptInput = document.getElementById('receiptInput');
    const uploadReceiptBtn = document.getElementById('uploadReceiptBtn');

    if (!orderId) {
      orderTotalText.textContent = 'Missing order reference.';
      return;
    }

    orderIdText.textContent = orderId;

    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error(orderError);
      orderTotalText.textContent = 'Unable to load your order.';
      return;
    }

    if (orderData) {
      orderTotalText.textContent = formatMoney(orderData.total_price || 0);
    }

    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('settings')
      .select('key, value');

    if (!settingsError && settingsData) {
      const byKey = Object.fromEntries((settingsData || []).map((entry) => [entry.key, entry.value]));
      bankNameEl.textContent = byKey.bank_name || 'Bank details unavailable';
      bankAccountNumberEl.textContent = byKey.bank_account_number || '—';
      bankAccountNameEl.textContent = byKey.bank_account_name || '—';
      paymentDescriptionEl.textContent = `Flezible Eggs Order ${orderId}`;
    }

    payOnDeliveryBtn.addEventListener('click', async () => {
      const { error } = await supabaseClient
        .from('orders')
        .update({
          payment_type: 'pay_on_delivery',
          payment_status: 'n/a',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error(error);
        alert('Unable to confirm this option. Please try again.');
        return;
      }

      const statusBox = document.getElementById('paymentStatusBox');
      statusBox.classList.remove('hidden');
      statusBox.innerHTML = '<strong>Order confirmed.</strong> Your payment will be made on delivery.';
      payOnDeliveryBtn.disabled = true;
      payNowBtn.disabled = true;
    });

    payNowBtn.addEventListener('click', () => {
      payNowPanel.classList.remove('hidden');
      payNowBtn.disabled = true;
    });

    uploadReceiptBtn.addEventListener('click', async () => {
      const file = receiptInput.files[0];
      if (!file) {
        uploadMessage.textContent = 'Please choose a receipt image first.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        uploadMessage.textContent = 'Only PNG, JPG, or WEBP files are allowed.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        uploadMessage.textContent = 'File must be 5MB or smaller.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      const { data: authData, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !authData?.user) {
        uploadMessage.textContent = 'You need to be logged in to upload a receipt.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const storagePath = `${authData.user.id}/${orderId}/receipt.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('payment-receipts')
        .upload(storagePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error(uploadError);
        uploadMessage.textContent = 'Receipt upload failed. Please try again.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      const { error: insertError } = await supabaseClient.from('payment_receipts').insert({
        order_id: orderId,
        user_id: authData.user.id,
        storage_path: storagePath,
        uploaded_at: new Date().toISOString()
      });

      if (insertError) {
        console.error(insertError);
        uploadMessage.textContent = 'Payment record could not be saved.';
        uploadMessage.className = 'mt-3 text-sm min-h-5 text-danger';
        return;
      }

      const { error: orderUpdateError } = await supabaseClient
        .from('orders')
        .update({
          payment_type: 'pay_now',
          payment_status: 'pending_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error(orderUpdateError);
      }

      uploadMessage.textContent = 'Receipt uploaded successfully. Your payment is now pending review.';
      uploadMessage.className = 'mt-3 text-sm min-h-5 text-success';
      uploadReceiptBtn.disabled = true;
      payOnDeliveryBtn.disabled = true;
      payNowBtn.disabled = true;
    });
  }

  async function dashboardPageInit() {
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');
    const logoutButton = document.getElementById('logoutBtn');
    const profileForm = document.getElementById('profileForm');
    const orderList = document.getElementById('orderList');
    const trackingModal = document.getElementById('trackingModal');
    const trackingContent = document.getElementById('trackingContent');
    const tabs = document.querySelectorAll('[data-tab]');
    const tabPanels = document.querySelectorAll('[data-tab-panel]');

    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = './login.html?redirect=dashboard.html';
      return;
    }

    const user = session.user;
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      document.getElementById('fullName').value = profile.full_name || '';
      document.getElementById('phone').value = profile.phone || '';
      document.getElementById('deliveryAddress').value = profile.delivery_address || '';
      document.getElementById('notificationsEnabled').checked = Boolean(profile.notifications_enabled);
    }

    const profileUpdateNotice = document.getElementById('profileUpdateNotice');
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const payload = {
        id: user.id,
        full_name: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        delivery_address: document.getElementById('deliveryAddress').value.trim(),
        notifications_enabled: document.getElementById('notificationsEnabled').checked,
        is_admin: false
      };

      let query = supabaseClient.from('profiles');
      const existingProfile = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const { data, error } = existingProfile?.data
        ? await query.update(payload).eq('id', user.id)
        : await query.insert(payload);

      if (error) {
        console.error(error);
        profileUpdateNotice.textContent = 'Unable to save your profile right now.';
        profileUpdateNotice.className = 'mt-3 text-sm text-danger';
        return;
      }

      profileUpdateNotice.textContent = 'Profile updated successfully.';
      profileUpdateNotice.className = 'mt-3 text-sm text-success';
    });

    const renderOrders = async () => {
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        orderList.innerHTML = '<div class="empty-state">Unable to load your orders right now.</div>';
        return;
      }

      orderList.innerHTML = (orders || []).map((order) => {
        const total = Number(order.total_price || 0);
        const badgeClass = {
          submitted: 'bg-amber-100 text-amber-800',
          approved: 'bg-sky-100 text-sky-800',
          in_delivery: 'bg-purple-100 text-purple-800',
          delivered: 'bg-indigo-100 text-indigo-800',
          completed: 'bg-emerald-100 text-emerald-800',
          rejected: 'bg-red-100 text-red-800'
        }[order.status] || 'bg-stone-100 text-stone-800';

        return `
          <button type="button" class="order-list-card" data-order-id="${order.id}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-ink">${new Date(order.created_at).toLocaleDateString('en-NG')}</div>
                <div class="text-xs text-muted">${order.payment_method || 'Website'} · ${order.id.slice(0, 8)}</div>
              </div>
              <span class="pill ${badgeClass}">${safeText(order.status || 'submitted')}</span>
            </div>
            <div class="mt-4 flex items-center justify-between">
              <span class="text-sm text-muted">Total</span>
              <strong class="text-lg text-ink">${formatMoney(total)}</strong>
            </div>
          </button>
        `;
      }).join('') || '<div class="empty-state">No orders yet.</div>';

      document.querySelectorAll('[data-order-id]').forEach((el) => {
        el.addEventListener('click', async () => {
          const orderId = el.dataset.orderId;
          const { data: fullOrder } = await supabaseClient
            .from('orders')
            .select('*, order_items(*, products(*))')
            .eq('id', orderId)
            .maybeSingle();

          if (!fullOrder) return;
          renderTrackingModal(fullOrder);
          trackingModal.classList.remove('hidden');
          trackingModal.classList.add('flex');
        });
      });
    };

    const renderTrackingModal = (order) => {
      const statusOrder = ['submitted', 'approved', 'in_delivery', 'delivered', 'completed'];
      const currentIndex = statusOrder.indexOf(order.status) >= 0 ? statusOrder.indexOf(order.status) : -1;
      const items = order.order_items || [];

      const itemHtml = items.map((item) => `
        <div class="flex justify-between text-sm text-muted">
          <span>${safeText(item.products?.name || 'Product')}</span>
          <span>${item.quantity} × ${formatMoney(item.unit_price || 0)}</span>
        </div>
      `).join('');

      const statusHtml = statusOrder.map((status, index) => {
        const isDone = currentIndex >= index;
        const statusTitle = status.replace('_', ' ');
        return `
          <div class="stepper-item ${isDone ? 'done' : ''}">
            <div class="step-indicator">${index + 1}</div>
            <div>
              <div class="font-semibold text-ink">${statusTitle}</div>
              <div class="text-xs text-muted">${index === currentIndex ? 'Current status' : 'Awaiting step'}</div>
            </div>
          </div>
        `;
      }).join('');

      trackingContent.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-clay font-bold">Order tracking</p>
            <h3 class="font-display text-3xl mb-1">${new Date(order.created_at).toLocaleDateString('en-NG')}</h3>
          </div>
          <button type="button" class="close-modal-btn" data-close-tracking>×</button>
        </div>

        <div class="mb-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Status</span>
            <span class="pill ${order.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">${safeText(order.status || 'submitted')}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Total</span>
            <strong>${formatMoney(order.total_price || 0)}</strong>
          </div>
        </div>

        ${order.status === 'rejected' && order.admin_response ? `
          <div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong>Admin response:</strong> ${safeText(order.admin_response)}
          </div>
        ` : ''}

        <div class="stepper-list">${statusHtml}</div>

        <div class="mt-6 border-t border-line pt-4">
          <h4 class="font-semibold text-ink mb-2">Items</h4>
          ${itemHtml || '<div class="text-sm text-muted">No items found.</div>'}
        </div>

        ${order.status === 'delivered' ? `
          <button type="button" id="markReceivedBtn" class="button-primary w-full mt-6">Received</button>
        ` : ''}
      `;

      const receivedBtn = document.getElementById('markReceivedBtn');
      if (receivedBtn) {
        receivedBtn.addEventListener('click', async () => {
          const { error } = await supabaseClient
            .from('orders')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', order.id);

          if (!error) {
            renderOrders();
            renderTrackingModal({ ...order, status: 'completed' });
          }
        });
      }

      document.querySelector('[data-close-tracking]')?.addEventListener('click', () => {
        trackingModal.classList.add('hidden');
        trackingModal.classList.remove('flex');
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach((item) => item.classList.toggle('active', item.dataset.tab === target));
        tabPanels.forEach((panel) => {
          panel.classList.toggle('hidden', panel.dataset.tabPanel !== target);
        });
      });
    });

    logoutButton.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = './login.html';
    });

    loading.classList.add('hidden');
    app.classList.remove('hidden');
    renderOrders();
  }

  async function adminPageInit() {
    const orderListEl = document.getElementById('adminOrderList');
    const filterSelect = document.getElementById('statusFilter');
    const detailEl = document.getElementById('adminOrderDetail');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = '../login.html';
      return;
    }

    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError || !profileData || !profileData.is_admin) {
      window.location.href = '../dashboard.html';
      return;
    }

    let allOrders = [];
    const loadOrders = async () => {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });

      if (error) {
        orderListEl.innerHTML = '<div class="empty-state">Orders could not be loaded.</div>';
        return [];
      }

      allOrders = data || [];
      applyFilter();
      return allOrders;
    };

    const applyFilter = () => {
      const filter = filterSelect.value;
      const filtered = filter === 'all' ? allOrders : allOrders.filter((order) => order.status === filter);
      orderListEl.innerHTML = filtered.map((order) => {
        const statusClass = {
          submitted: 'bg-amber-100 text-amber-800',
          approved: 'bg-sky-100 text-sky-800',
          in_delivery: 'bg-purple-100 text-purple-800',
          delivered: 'bg-indigo-100 text-indigo-800',
          completed: 'bg-emerald-100 text-emerald-800',
          rejected: 'bg-red-100 text-red-800'
        }[order.status] || 'bg-stone-100 text-stone-800';

        return `
          <button type="button" class="order-list-card admin-order-card" data-admin-order-id="${order.id}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold text-ink">${new Date(order.created_at).toLocaleDateString('en-NG')}</div>
                <div class="text-xs text-muted">${order.payment_method || 'Website'} · ${order.id.slice(0, 8)}</div>
              </div>
              <span class="pill ${statusClass}">${safeText(order.status)}</span>
            </div>
            <div class="mt-3 flex justify-between text-sm">
              <span class="text-muted">Total</span>
              <strong>${formatMoney(order.total_price || 0)}</strong>
            </div>
          </button>
        `;
      }).join('') || '<div class="empty-state">No orders match this filter.</div>';

      document.querySelectorAll('[data-admin-order-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          const selectedId = button.dataset.adminOrderId;
          const { data, error } = await supabaseClient
            .from('orders')
            .select('*, order_items(*, products(*))')
            .eq('id', selectedId)
            .maybeSingle();

          if (error || !data) return;
          renderAdminDetail(data);
        });
      });
    };

    const renderAdminDetail = async (order) => {
      const { data: receiptRows } = await supabaseClient
        .from('payment_receipts')
        .select('*')
        .eq('order_id', order.id)
        .order('uploaded_at', { ascending: false });

      let receiptLink = '';
      if (receiptRows && receiptRows.length) {
        const { data: signedUrlData } = await supabaseClient.storage
          .from('payment-receipts')
          .createSignedUrl(receiptRows[0].storage_path, 3600);

        if (signedUrlData?.signedUrl) {
          receiptLink = `<a href="${signedUrlData.signedUrl}" target="_blank" rel="noreferrer" class="text-clay font-semibold">View receipt</a>`;
        }
      }

      const itemRows = order.order_items || [];
      const itemHtml = itemRows.map((row) => `
        <div class="flex justify-between text-sm text-muted">
          <span>${safeText(row.products?.name || 'Item')}</span>
          <span>${row.quantity} × ${formatMoney(row.unit_price || 0)}</span>
        </div>
      `).join('') || '<div class="text-sm text-muted">No items recorded.</div>';

      detailEl.innerHTML = `
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-clay font-bold mb-1">Order details</p>
            <h2 class="font-display text-3xl">${new Date(order.created_at).toLocaleDateString('en-NG')}</h2>
          </div>
          <span class="pill ${order.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">${safeText(order.status)}</span>
        </div>

        <div class="grid md:grid-cols-2 gap-5 text-sm text-muted">
          <div class="rounded-2xl border border-line bg-egg p-4">
            <h3 class="font-semibold text-ink mb-3">Delivery</h3>
            <p><strong class="text-ink">Address:</strong> ${safeText(order.delivery_address || 'Not provided')}</p>
            <p><strong class="text-ink">Preparation:</strong> ${safeText(order.preparation || 'raw')}</p>
            <p><strong class="text-ink">Note:</strong> ${safeText(order.note || 'No note')}</p>
          </div>
          <div class="rounded-2xl border border-line bg-egg p-4">
            <h3 class="font-semibold text-ink mb-3">Payment</h3>
            <p><strong class="text-ink">Method:</strong> ${safeText(order.payment_method || 'website')}</p>
            <p><strong class="text-ink">Type:</strong> ${safeText(order.payment_type || 'not set')}</p>
            <p><strong class="text-ink">Status:</strong> ${safeText(order.payment_status || 'n/a')}</p>
            ${receiptLink ? `<div class="mt-2">${receiptLink}</div>` : ''}
          </div>
        </div>

        <div class="mt-6 border-t border-line pt-4">
          <h3 class="font-semibold text-ink mb-3">Items</h3>
          ${itemHtml}
        </div>

        <div class="mt-6 border-t border-line pt-4 space-y-3">
          <button type="button" class="button-primary w-full" data-admin-action="approve">Approve</button>
          <div class="flex gap-2">
            <textarea id="rejectReason" rows="2" class="field !mb-0" placeholder="Rejection reason (required)"></textarea>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <button type="button" class="button-secondary w-full" data-admin-action="reject">Reject</button>
            <button type="button" class="button-secondary w-full" data-admin-action="in_delivery">In delivery</button>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <button type="button" class="button-secondary w-full" data-admin-action="delivered">Delivered</button>
            <button type="button" class="button-secondary w-full" data-admin-action="payment_paid">Mark paid</button>
          </div>
          <button type="button" class="button-secondary w-full" data-admin-action="payment_rejected">Mark payment rejected</button>
        </div>
      `;

      document.querySelectorAll('[data-admin-action]').forEach((button) => {
        button.addEventListener('click', async () => {
          const action = button.dataset.adminAction;
          const updates = {};

          if (action === 'approve') {
            updates.status = 'approved';
          }
          if (action === 'reject') {
            const reason = document.getElementById('rejectReason').value.trim();
            if (!reason) {
              alert('A rejection note is required before rejecting the order.');
              return;
            }
            updates.status = 'rejected';
            updates.admin_response = reason;
          }
          if (action === 'in_delivery') {
            updates.status = 'in_delivery';
          }
          if (action === 'delivered') {
            updates.status = 'delivered';
          }
          if (action === 'payment_paid') {
            updates.payment_status = 'paid';
          }
          if (action === 'payment_rejected') {
            updates.payment_status = 'rejected';
          }

          if (Object.keys(updates).length === 0) return;

          const { error } = await supabaseClient
            .from('orders')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', order.id);

          if (error) {
            console.error(error);
            alert('Update failed. Please try again.');
            return;
          }

          const refreshed = await supabaseClient
            .from('orders')
            .select('*, order_items(*, products(*))')
            .eq('id', order.id)
            .maybeSingle();

          if (refreshed.data) {
            renderAdminDetail(refreshed.data);
          }
          loadOrders();
        });
      });
    };

    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../login.html';
    });

    filterSelect.addEventListener('change', applyFilter);
    await loadOrders();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    setupMobileNavigation();

    if (typeof supabaseClient === 'undefined') return;

    const path = window.location.pathname;
    if (path.endsWith('/index.html') || path === '/' || path.endsWith('/')) {
      homePageInit();
    }

    if (path.endsWith('/checkout.html')) {
      checkoutPageInit();
    }

    if (path.endsWith('/payment.html')) {
      paymentPageInit();
    }

    if (path.endsWith('/dashboard.html')) {
      dashboardPageInit();
    }

    if (path.includes('/admin/')) {
      adminPageInit();
    }
  });
})();
