(function () {
  const productList = Array.isArray(window.SHOP_PRODUCTS)
    ? window.SHOP_PRODUCTS
    : Object.values(window.SHOP_PRODUCTS || {});

  const PRODUCTS = Object.fromEntries(productList.map((product) => [product.id, product]));
  const productsBySlug = new Map(productList.map((product) => [product.slug, product]));

  const storageKey = 'explorideShopCart';
  const currency = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

  const INVENTORY_ENDPOINT = window.SHOP_INVENTORY_ENDPOINT || 'https://script.google.com/macros/s/AKfycbz4Rm1C4vFTRam9ESDoKe2w-RbyTTXGFQq-Go8MQQ6VCPJYz4kQF-Ti6HfFEAErgabu/exec';
  const DEFAULT_MAX_QUANTITY = 20;
  const inventoryKeySeparator = '::';
  const inventoryState = {
    items: new Map(),
    promise: null,
    loaded: false,
    error: null,
  };

  const normalizeInventoryKeyPart = (value) => String(value || '').trim();

  const buildInventoryKey = (productName, size) => [
    normalizeInventoryKeyPart(productName),
    normalizeInventoryKeyPart(size),
  ].join(inventoryKeySeparator);

  const loadInventory = async () => {
    if (inventoryState.loaded) return inventoryState.items;
    if (inventoryState.promise) return inventoryState.promise;

    inventoryState.promise = fetch(INVENTORY_ENDPOINT, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Nie udało się pobrać stanów magazynowych.');
        }
        return response.json();
      })
      .then((data) => {
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.rows)
              ? data.rows
              : Array.isArray(data?.data)
                ? data.data
                : [];
        inventoryState.items.clear();
        rows.forEach((row) => {
          const productName = normalizeInventoryKeyPart(row?.produkt);
          if (!productName) return;

          const stockRaw = row?.stan;
          const stockText = typeof stockRaw === 'string' ? stockRaw.trim() : String(stockRaw ?? '').trim();
          const stock = stockText === '' ? Number.NaN : Number(stockText);
          const normalizedStock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : null;

          inventoryState.items.set(buildInventoryKey(productName, row?.rozmiar), normalizedStock);
        });
        inventoryState.loaded = true;
        inventoryState.error = null;
        return inventoryState.items;
      })
      .catch((error) => {
        inventoryState.error = error;
        throw error;
      })
      .finally(() => {
        inventoryState.promise = null;
      });

    return inventoryState.promise;
  };

  const getInventoryStock = (product, size) => {
    if (!product || !inventoryState.items.size) return null;
    const key = buildInventoryKey(product.name, size);
    if (!inventoryState.items.has(key)) return null;
    const stock = inventoryState.items.get(key);
    return Number.isFinite(stock) ? stock : null;
  };

  const getMaxQuantity = (product, size) => {
    const stock = getInventoryStock(product, size);
    return stock === null ? DEFAULT_MAX_QUANTITY : stock;
  };

  const formatStockMessage = (stock) => {
    if (stock === null) return 'Dostępna ilość: nieznana';
    return stock > 0 ? `Dostępna ilość: ${stock}` : 'Brak w magazynie. Poproś o zamówienie';
  };

  const clampQuantity = (value, max = DEFAULT_MAX_QUANTITY) => {
    const parsed = Number(value) || 1;
    if (max <= 0) return 0;
    return Math.max(1, Math.min(max, parsed));
  };

  const ensureStockMessage = (form) => {
    let message = form.querySelector('[data-stock-message]');
    if (message) return message;

    message = document.createElement('p');
    message.className = 'stock-message';
    message.dataset.stockMessage = '';
    message.setAttribute('aria-live', 'polite');

    const sizeField = form.querySelector('[data-size-field]') || form.querySelector('[name="size"]')?.closest('.product-field');
    if (sizeField) {
      sizeField.insertAdjacentElement('afterend', message);
    } else {
      form.prepend(message);
    }

    return message;
  };

  const updateStockUI = async (form, { showLoading = false } = {}) => {
    const product = PRODUCTS[form.dataset.productId];
    const sizeSelect = form.querySelector('[name="size"]');
    if (!product) return;

    const quantityInput = form.querySelector('[name="quantity"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const message = ensureStockMessage(form);

    if (showLoading && !inventoryState.loaded) {
      message.textContent = 'Sprawdzanie dostępności…';
      message.classList.remove('stock-message--empty', 'stock-message--warning');
      if (submitButton) submitButton.disabled = true;
    }

    try {
      await loadInventory();
      syncCartToInventory();
      const stock = getInventoryStock(product, sizeSelect?.value);

      if (stock === null) {
        message.textContent = formatStockMessage(stock);
        message.classList.toggle('stock-message--warning', true);
        message.classList.remove('stock-message--empty');
        if (quantityInput) {
          quantityInput.max = String(DEFAULT_MAX_QUANTITY);
          quantityInput.disabled = false;
          quantityInput.value = clampQuantity(quantityInput.value, DEFAULT_MAX_QUANTITY);
        }
        if (submitButton) submitButton.disabled = false;
        return;
      }

      message.textContent = formatStockMessage(stock);
      message.classList.toggle('stock-message--empty', stock === 0);
      message.classList.remove('stock-message--warning');

      if (quantityInput) {
        quantityInput.max = String(stock);
        quantityInput.disabled = stock === 0;
        quantityInput.value = clampQuantity(quantityInput.value, stock);
      }
      if (submitButton) submitButton.disabled = stock === 0;
    } catch (error) {
      message.textContent = formatStockMessage(null);
      message.classList.add('stock-message--warning');
      message.classList.remove('stock-message--empty');
      if (quantityInput) {
        quantityInput.max = String(DEFAULT_MAX_QUANTITY);
        quantityInput.disabled = false;
        quantityInput.value = clampQuantity(quantityInput.value, DEFAULT_MAX_QUANTITY);
      }
      if (submitButton) submitButton.disabled = false;
    }
  };

  const setupInventoryForm = (form) => {
    const product = PRODUCTS[form.dataset.productId];
    if (!product) return;

    const sizeSelect = form.querySelector('[name="size"]');
    ensureStockMessage(form);
    updateStockUI(form, { showLoading: true });
    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => updateStockUI(form, { showLoading: true }));
    }
  };

  const formatPrice = (value) => {
    if (typeof value === 'string' && Number.isNaN(Number(value))) {
      return value;
    }
    return currency.format(Number(value) || 0);
  };

  const normalizeImages = (product) => {
    const images = Array.isArray(product.images) ? product.images : [];
    const normalized = images
      .map((entry) =>
        typeof entry === 'string'
          ? { src: entry, alt: product.imageAlt || product.name }
          : { src: entry?.src, alt: entry?.alt || product.imageAlt || product.name }
      )
      .filter((entry) => entry.src);

    if (!normalized.length && product.image) {
      normalized.push({ src: product.image, alt: product.imageAlt || product.name });
    }

    return normalized;
  };

  const getPrimaryImage = (product) => {
    const [first] = normalizeImages(product);
    return first ? first.src : null;
  };

  const loadCart = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && PRODUCTS[item.id]);
    } catch (error) {
      console.error('Nie udało się odczytać koszyka', error);
      return [];
    }
  };

  const saveCart = (cart) => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  };

  let cart = loadCart();

  const syncCartToInventory = () => {
    if (!inventoryState.items.size || !cart.length) return;

    let changed = false;
    cart = cart.filter((item) => {
      const product = PRODUCTS[item.id];
      if (!product) {
        changed = true;
        return false;
      }

      const maxQuantity = getMaxQuantity(product, item.size);
      if (maxQuantity <= 0) {
        changed = true;
        return false;
      }

      const quantity = clampQuantity(item.quantity, maxQuantity);
      if (quantity !== item.quantity) {
        item.quantity = quantity;
        changed = true;
      }

      return true;
    });

    if (changed) {
      saveCart(cart);
      updateSummaryUI();
    }
  };

  const getCartSummary = () => {
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalPrice = cart.reduce((sum, item) => {
      const product = PRODUCTS[item.id];
      return sum + (product ? Number(product.price || 0) * item.quantity : 0);
    }, 0);

    return { totalItems, totalPrice };
  };


  const ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz4Rm1C4vFTRam9ESDoKe2w-RbyTTXGFQq-Go8MQQ6VCPJYz4kQF-Ti6HfFEAErgabu/exec';

  const EMAILJS_SERVICE_ID = 'service_6dk8z4r';
  const EMAILJS_TEMPLATE_ID = 'template_otilnkr';
  const EMAILJS_PUBLIC_KEY = 'Gh7cVLez3Tc3TZfZb';
  const EMAILJS_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

  let emailJsReadyPromise;

  const loadEmailJs = () => {
    if (window.emailjs && typeof window.emailjs.send === 'function') {
      return Promise.resolve(window.emailjs);
    }

    if (emailJsReadyPromise) return emailJsReadyPromise;

    emailJsReadyPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${EMAILJS_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.emailjs));
        existing.addEventListener('error', () => reject(new Error('Nie udało się załadować EmailJS.')));
        return;
      }

      const script = document.createElement('script');
      script.src = EMAILJS_SCRIPT_SRC;
      script.async = true;
      script.addEventListener('load', () => resolve(window.emailjs));
      script.addEventListener('error', () => reject(new Error('Nie udało się załadować EmailJS.')));
      document.head.appendChild(script);
    });

    return emailJsReadyPromise;
  };

  const buildOrderItems = () => cart.map((item) => {
    const product = PRODUCTS[item.id];
    if (!product) return null;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = product.price;
    return {
      name: product.name,
      variant: item.size || '',
      quantity,
      price,
      sum: Number((price * quantity).toFixed(2))
    };
  }).filter(Boolean);

  const formatOrderItemsForEmail = (items) => items.map((item) => {
    const variant = item.variant ? `, ${item.variant}` : ', brak wariantu';
    return `${item.name}${variant}, ilość: ${item.quantity}, cena: ${formatPrice(item.price)}`;
  }).join('\n');

  const submitOrderRequest = async (payload) => {
    await fetch(ORDER_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    return true;
  };

  const sendOrderEmail = async ({ customerName, customerEmail, customerPhone, deliveryAddress, items, total, message }) => {
    const emailjs = await loadEmailJs();
    if (!emailjs || typeof emailjs.send !== 'function') {
      throw new Error('EmailJS nie jest dostępny.');
    }

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        items,
        total,
        message
      },
      {
        publicKey: EMAILJS_PUBLIC_KEY
      }
    );

    return true;
  };

  const parseDisplayedCurrencyValue = (value) => {
    const normalized = String(value || '')
      .replace(/\s/g, '')
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const updateSummaryUI = () => {
    const { totalItems, totalPrice } = getCartSummary();
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = totalItems;
    });

    document.querySelectorAll('[data-cart-total]').forEach((node) => {
      node.textContent = currency.format(totalPrice);
    });

    document.querySelectorAll('[data-cart-empty-note]').forEach((node) => {
      node.classList.toggle('is-visible', totalItems === 0);
    });
  };

  const renderCartList = () => {
    const container = document.querySelector('[data-cart-items]');
    const footerTotal = document.querySelector('[data-cart-total-footer]');
    const confirmButton = document.querySelector('[data-cart-confirm]');

    if (!container) return;

    container.innerHTML = '';

    if (!cart.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = 'Koszyk jest pusty. Dodaj produkty, aby kontynuować.';
      container.appendChild(empty);
      if (confirmButton) {
        confirmButton.disabled = true;
      }
      if (footerTotal) {
        footerTotal.textContent = currency.format(0);
      }
      updateSummaryUI();
      return;
    }

    const list = document.createElement('div');
    list.className = 'cart-lines';

    cart.forEach((item, index) => {
      const product = PRODUCTS[item.id];
      if (!product) return;

      const line = document.createElement('article');
      line.className = 'cart-line';

      const details = document.createElement('div');
      details.className = 'cart-line__details';
      const title = document.createElement('div');
      title.className = 'cart-line__title';
      title.textContent = product.name;

      const meta = document.createElement('div');
      meta.className = 'cart-line__meta';
      const metaParts = [currency.format(product.price)];
      if (item.size) {
        metaParts.push(`Rozmiar: ${item.size}`);
      }
      meta.textContent = metaParts.join(' • ');

      details.appendChild(title);
      details.appendChild(meta);

      const controls = document.createElement('div');
      controls.className = 'cart-line__controls';

      const quantityLabel = document.createElement('label');
      quantityLabel.className = 'cart-line__quantity';
      quantityLabel.innerHTML = '<span>Ilość</span>';
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = String(getMaxQuantity(product, item.size));
      quantityInput.value = item.quantity;
      quantityInput.addEventListener('change', (event) => {
        const value = clampQuantity(event.target.value, getMaxQuantity(product, cart[index].size));
        quantityInput.value = value;
        cart[index].quantity = value;
        saveCart(cart);
        renderCartList();
        updateSummaryUI();
      });
      quantityLabel.appendChild(quantityInput);

      if (product.sizes && product.sizes.length) {
        const sizeLabel = document.createElement('label');
        sizeLabel.className = 'cart-line__size';
        sizeLabel.innerHTML = '<span>Rozmiar</span>';
        const sizeSelect = document.createElement('select');
        product.sizes.forEach((size) => {
          const option = document.createElement('option');
          option.value = size;
          option.textContent = size;
          if (size === item.size) {
            option.selected = true;
          }
          sizeSelect.appendChild(option);
        });
        sizeSelect.addEventListener('change', async (event) => {
          const cartItem = cart[index];
          if (!cartItem) return;

          cartItem.size = event.target.value;
          sizeSelect.disabled = true;
          quantityInput.disabled = true;

          try {
            await loadInventory();
            syncCartToInventory();
            saveCart(cart);
          } catch (error) {
            cartItem.quantity = clampQuantity(cartItem.quantity, getMaxQuantity(product, cartItem.size));
            saveCart(cart);
            updateSummaryUI();
          } finally {
            renderCartList();
            updateSummaryUI();
          }
        });
        sizeLabel.appendChild(sizeSelect);
        controls.appendChild(sizeLabel);
      }

      controls.appendChild(quantityLabel);

      const total = document.createElement('div');
      total.className = 'cart-line__total';
      total.textContent = currency.format(product.price * item.quantity);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'cart-line__remove';
      removeBtn.textContent = 'Usuń';
      removeBtn.addEventListener('click', () => {
        cart.splice(index, 1);
        saveCart(cart);
        renderCartList();
        updateSummaryUI();
      });

      controls.appendChild(total);
      controls.appendChild(removeBtn);

      line.appendChild(details);
      line.appendChild(controls);
      list.appendChild(line);
    });

    container.appendChild(list);

    const { totalPrice } = getCartSummary();
    if (footerTotal) {
      footerTotal.textContent = currency.format(totalPrice);
    }
    if (confirmButton) {
      confirmButton.disabled = false;
    }

    updateSummaryUI();
  };

  const openCartStep = (step = 'cart') => {
    const modal = document.querySelector('[data-cart-modal]');
    if (!modal) return;
    modal.dataset.step = step;
    modal.removeAttribute('hidden');
    modal.classList.add('is-visible');
    document.body.classList.add('is-modal-open');
    renderCartList();
    updateStepUI();
  };

  const closeCart = () => {
    const modal = document.querySelector('[data-cart-modal]');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('hidden', '');
    document.body.classList.remove('is-modal-open');
  };

  const openSuccessModal = () => {
    const modal = document.querySelector('[data-success-modal]');
    if (!modal) return;
    modal.removeAttribute('hidden');
    modal.classList.add('is-visible');
    document.body.classList.add('is-modal-open');
  };

  const closeSuccessModal = () => {
    const modal = document.querySelector('[data-success-modal]');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('hidden', '');
    document.body.classList.remove('is-modal-open');
  };

  const updateStepUI = () => {
    const modal = document.querySelector('[data-cart-modal]');
    if (!modal) return;
    const step = modal.dataset.step || 'cart';
    modal.querySelectorAll('[data-cart-step-panel]').forEach((panel) => {
      panel.toggleAttribute('hidden', panel.dataset.cartStepPanel !== step);
    });
    modal.querySelectorAll('[data-step-indicator]').forEach((indicator) => {
      indicator.classList.toggle('is-active', indicator.dataset.stepIndicator === step);
    });
  };

  const addToCart = ({ id, quantity = 1, size }) => {
    const product = PRODUCTS[id];
    if (!product) return;

    const maxQuantity = getMaxQuantity(product, size);
    if (maxQuantity <= 0) return;

    const existingIndex = cart.findIndex((item) => item.id === id && (item.size || '') === (size || ''));
    if (existingIndex > -1) {
      cart[existingIndex].quantity = clampQuantity(cart[existingIndex].quantity + quantity, maxQuantity);
    } else {
      cart.push({ id, quantity: clampQuantity(quantity, maxQuantity), size });
    }

    saveCart(cart);
    updateSummaryUI();
  };

  const setupForms = () => {
    document.querySelectorAll('[data-add-to-cart]').forEach((form) => {
      setupInventoryForm(form);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const productId = form.dataset.productId;
        const product = PRODUCTS[productId];
        if (!product) return;
        const quantityInput = form.querySelector('[name="quantity"]');
        const sizeSelect = form.querySelector('[name="size"]');
        const size = sizeSelect ? sizeSelect.value : undefined;
        const maxQuantity = getMaxQuantity(product, size);
        if (maxQuantity <= 0) {
          updateStockUI(form);
          return;
        }
        const quantity = clampQuantity(quantityInput?.value, maxQuantity);
        if (quantityInput) {
          quantityInput.value = quantity;
          quantityInput.max = String(maxQuantity);
        }
        addToCart({ id: productId, quantity, size });
        if (form.hasAttribute('data-quick-add')) {
          const feedback = form.querySelector('[data-add-feedback]');
          if (feedback) {
            feedback.hidden = false;
            feedback.classList.add('is-visible');
            window.setTimeout(() => {
              feedback.classList.remove('is-visible');
              feedback.hidden = true;
            }, 1800);
          }
          return;
        }
        openCartStep('cart');
      });
    });
  };

  const setupTriggers = () => {
    document.querySelectorAll('[data-open-cart]').forEach((button) => {
      button.addEventListener('click', () => openCartStep('cart'));
    });

    const modal = document.querySelector('[data-cart-modal]');
    if (!modal) return;

    modal.querySelectorAll('[data-close-cart]').forEach((btn) => {
      btn.addEventListener('click', closeCart);
    });

    const overlay = modal.querySelector('.shop-modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', closeCart);
    }

    const confirm = modal.querySelector('[data-cart-confirm]');
    if (confirm) {
      confirm.addEventListener('click', () => {
        if (!cart.length) return;
        modal.dataset.step = 'details';
        updateStepUI();
      });
    }

    const continueBtn = modal.querySelector('[data-cart-to-payment]');
    if (continueBtn) {
      continueBtn.addEventListener('click', async () => {
        const form = modal.querySelector('[data-cart-details-form]');
        const status = modal.querySelector('[data-cart-form-status]');
        if (!form) return;

        const gdprConsentField = form.elements.gdprConsent;
        if (gdprConsentField && !gdprConsentField.dataset.validationBound) {
          gdprConsentField.addEventListener('change', () => {
            gdprConsentField.setCustomValidity(gdprConsentField.checked ? '' : 'Musisz zaakceptować zgodę RODO.');
          });
          gdprConsentField.dataset.validationBound = 'true';
        }

        const customerPhoneField = form.elements.customerPhone;
        if (customerPhoneField && !customerPhoneField.dataset.validationBound) {
          customerPhoneField.addEventListener('input', () => {
            customerPhoneField.setCustomValidity(customerPhoneField.value.trim() ? '' : 'Uzupełnij wymagane pole: Telefon.');
          });
          customerPhoneField.dataset.validationBound = 'true';
        }

        if (!cart.length) {
          if (status) status.textContent = 'Koszyk jest pusty.';
          return;
        }

        const gdprConsentForSubmit = form.elements.gdprConsent;
        if (gdprConsentForSubmit && 'setCustomValidity' in gdprConsentForSubmit) {
          gdprConsentForSubmit.setCustomValidity(gdprConsentForSubmit.checked ? '' : 'Musisz zaakceptować zgodę RODO.');
        }

        const customerPhoneForSubmit = form.elements.customerPhone;
        if (customerPhoneForSubmit && 'setCustomValidity' in customerPhoneForSubmit) {
          customerPhoneForSubmit.setCustomValidity(
            customerPhoneForSubmit.value.trim() ? '' : 'Uzupełnij wymagane pole: Telefon.'
          );
        }

        if (!form.reportValidity()) return;

        const items = buildOrderItems();
        if (!items.length) {
          if (status) status.textContent = 'Koszyk jest pusty.';
          return;
        }

        const { totalPrice } = getCartSummary();
        const totalFromState = Number(totalPrice.toFixed(2));
        const footerTotalNode = modal.querySelector('[data-cart-total-footer]');
        const headerTotalNode = modal.querySelector('[data-cart-total]');
        const totalFromUI = Number(
          parseDisplayedCurrencyValue(footerTotalNode?.textContent || headerTotalNode?.textContent).toFixed(2)
        );

        const formData = new FormData(form);
        const payload = {
          customerName: String(formData.get('customerName') || '').trim(),
          customerEmail: String(formData.get('customerEmail') || '').trim(),
          customerPhone: String(formData.get('customerPhone') || '').trim(),
          delivery_address: String(formData.get('delivery_address') || '').trim(),
          message: String(formData.get('message') || '').trim(),
          items,
          total: totalFromState > 0 ? totalFromState : totalFromUI
        };

        continueBtn.disabled = true;
        if (status) status.textContent = 'Wysyłanie zapytania…';

        try {
          const itemsSummary = formatOrderItemsForEmail(items);
          const totalSummary = formatPrice(payload.total);

          const [orderSaved, emailSent] = await Promise.all([
            submitOrderRequest(payload),
            sendOrderEmail({
              customerName: payload.customerName,
              customerEmail: payload.customerEmail,
              customerPhone: payload.customerPhone,
              deliveryAddress: payload.delivery_address,
              items: itemsSummary,
              total: totalSummary,
              message: payload.message
            })
          ]);

          if (!orderSaved || !emailSent) throw new Error('Nie udało się wysłać zapytania.');
          if (status) status.textContent = '';
          cart = [];
          saveCart(cart);
          renderCartList();
          updateSummaryUI();
          form.reset();
          closeCart();
          openSuccessModal();
        } catch (error) {
          if (status) status.textContent = 'Nie udało się wysłać zapytania. Spróbuj ponownie za chwilę.';
        } finally {
          continueBtn.disabled = false;
        }
      });
    }

    const backButtons = modal.querySelectorAll('[data-step-back]');
    backButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.stepBack || 'cart';
        modal.dataset.step = target;
        updateStepUI();
      });
    });

    document.querySelectorAll('[data-close-success-modal]').forEach((btn) => {
      btn.addEventListener('click', closeSuccessModal);
    });
    const successModal = document.querySelector('[data-success-modal]');
    const successOverlay = successModal?.querySelector('.shop-modal__overlay');
    if (successOverlay) {
      successOverlay.addEventListener('click', closeSuccessModal);
    }
  };

  const buildProductUrl = (product) => `./${product.slug}.html`;

  const renderProductList = () => {
    const container = document.querySelector('[data-product-list]');
    if (!container) return;

    const emptyTemplate = container.querySelector('[data-empty-catalog]');
    const emptyNode = emptyTemplate ? emptyTemplate.cloneNode(true) : null;
    container.innerHTML = '';

    if (!productList.length) {
      if (emptyNode) {
        container.appendChild(emptyNode);
      }
      return;
    }

    productList.forEach((product) => {
      const item = document.createElement('article');
      item.className = 'shop-item';

      const imageLink = document.createElement('a');
      imageLink.className = 'shop-item__image-link';
      imageLink.href = buildProductUrl(product);
      imageLink.setAttribute('aria-label', `Przejdź do produktu: ${product.name}`);

      const image = document.createElement('div');
      image.className = 'shop-item__image';
      const primaryImage = getPrimaryImage(product);
      if (primaryImage) {
        const img = document.createElement('img');
        img.src = primaryImage;
        img.alt = product.imageAlt || product.name;
        img.loading = 'lazy';
        image.appendChild(img);
      } else {
        image.textContent = product.imagePlaceholder || 'Zdjęcie produktu';
      }
      imageLink.appendChild(image);

      const body = document.createElement('div');
      body.className = 'shop-item__body';

      const content = document.createElement('div');
      content.className = 'shop-item__content';

      const title = document.createElement('a');
      title.className = 'shop-item__title';
      title.href = buildProductUrl(product);
      title.textContent = product.name;

      const meta = document.createElement('p');
      meta.className = 'shop-item__meta';
      meta.textContent = product.summary || product.description || '';

      const price = document.createElement('p');
      price.className = 'shop-item__price';
      price.textContent = formatPrice(product.price);

      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(price);
      const quickForm = document.createElement('form');
      quickForm.className = 'product-form product-form--compact';
      quickForm.dataset.addToCart = '';
      quickForm.dataset.quickAdd = '';
      quickForm.dataset.productId = product.id;

      if (product.sizes && product.sizes.length) {
        const sizeField = document.createElement('label');
        sizeField.className = 'product-field';
        sizeField.innerHTML = '<span>Rozmiar</span>';
        const sizeSelect = document.createElement('select');
        sizeSelect.name = 'size';
        product.sizes.forEach((size) => {
          const option = document.createElement('option');
          option.value = size;
          option.textContent = size;
          sizeSelect.appendChild(option);
        });
        sizeField.appendChild(sizeSelect);
        quickForm.appendChild(sizeField);

      }

      const stockMessage = document.createElement('p');
      stockMessage.className = 'stock-message';
      stockMessage.dataset.stockMessage = '';
      stockMessage.setAttribute('aria-live', 'polite');
      quickForm.appendChild(stockMessage);

      const quantityField = document.createElement('label');
      quantityField.className = 'product-field';
      quantityField.innerHTML = '<span>Ilość</span>';
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.name = 'quantity';
      quantityInput.min = '1';
      quantityInput.max = String(DEFAULT_MAX_QUANTITY);
      quantityInput.value = '1';
      quantityField.appendChild(quantityInput);
      quickForm.appendChild(quantityField);

      const addButton = document.createElement('button');
      addButton.type = 'submit';
      addButton.className = 'button button--primary';
      addButton.textContent = 'Dodaj do koszyka';
      quickForm.appendChild(addButton);

      const feedback = document.createElement('p');
      feedback.className = 'quick-add-feedback';
      feedback.dataset.addFeedback = '';
      feedback.hidden = true;
      feedback.textContent = 'Dodano do koszyka';
      quickForm.appendChild(feedback);
      body.appendChild(content);
      body.appendChild(quickForm);

      item.appendChild(imageLink);
      item.appendChild(body);
      container.appendChild(item);
    });
  };

  const hydrateProductPage = () => {
    const pageSlug = document.body?.dataset.productSlug;
    const slugFromPath = (window.location.pathname.split('/').pop() || '').replace(/\.html?$/, '');
    const slug = pageSlug || slugFromPath;
    const product = productsBySlug.get(slug);
    if (!product) return;

    document.title = product.name;

    const title = document.querySelector('[data-product-title]');
    if (title) title.textContent = product.name;

    const summary = document.querySelector('[data-product-summary]');
    if (summary) summary.textContent = product.summary || product.description || '';

    document.querySelectorAll('[data-product-price]').forEach((node) => {
      node.textContent = formatPrice(product.price);
    });

    const description = document.querySelector('[data-product-description]');
    if (description) description.textContent = product.description || '';

    const longDescription = document.querySelector('[data-product-long-description]');
    if (longDescription) {
      longDescription.innerHTML = '';

      if (Array.isArray(product.longDescription) && product.longDescription.length) {
        const list = document.createElement('ul');
        list.className = 'product-long-description__list';

        product.longDescription.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line;
          list.appendChild(item);
        });

        longDescription.appendChild(list);
      } else {
        const paragraph = document.createElement('p');
        paragraph.textContent = product.description || 'Szczegółowy opis produktu pojawi się wkrótce.';
        longDescription.appendChild(paragraph);
      }
    }

    const note = document.querySelector('[data-product-note]');
    if (note && product.note) note.textContent = product.note;

    const galleryContainer = document.querySelector('[data-product-gallery]');
    const image = document.querySelector('[data-product-image]');
    const caption = document.querySelector('[data-product-image-caption]');
    const track = galleryContainer?.querySelector('[data-gallery-track]');
    const viewport = galleryContainer?.querySelector('[data-gallery-viewport]');
    const prevBtn = galleryContainer?.querySelector('[data-gallery-prev]');
    const nextBtn = galleryContainer?.querySelector('[data-gallery-next]');
    const images = normalizeImages(product);
    const placeholder = product.imagePlaceholder || 'Zdjęcie produktu';
    let activeIndex = 0;

    const renderMainImage = (entry) => {
      if (!image) return;
      image.innerHTML = '';

      if (entry) {
        const img = document.createElement('img');
        img.src = entry.src;
        img.alt = entry.alt || product.name;
        img.loading = 'lazy';
        image.appendChild(img);
      } else {
        image.textContent = placeholder;
      }
    };

    const updateActiveThumb = () => {
      if (!track) return;
      Array.from(track.children).forEach((button, index) => {
        button.classList.toggle('is-active', index === activeIndex);
      });
    };

    const ensureActiveVisible = () => {
      if (!viewport || !track) return;
      const thumb = track.children[activeIndex];
      if (!thumb) return;
      const thumbLeft = thumb.offsetLeft;
      const thumbRight = thumbLeft + thumb.offsetWidth;
      const viewLeft = viewport.scrollLeft;
      const viewRight = viewLeft + viewport.clientWidth;

      if (thumbLeft < viewLeft) {
        viewport.scrollTo({ left: thumbLeft, behavior: 'smooth' });
      } else if (thumbRight > viewRight) {
        viewport.scrollTo({ left: thumbRight - viewport.clientWidth, behavior: 'smooth' });
      }
    };

    const setActiveImage = (index) => {
      activeIndex = index;
      renderMainImage(images[index]);
      updateActiveThumb();
      ensureActiveVisible();
    };

    const renderThumbnails = () => {
      if (!track) return;
      track.innerHTML = '';

      images.forEach((entry, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-thumbnail';
        button.dataset.galleryIndex = String(index);

        const img = document.createElement('img');
        img.src = entry.src;
        img.alt = entry.alt || product.name;
        img.loading = 'lazy';

        button.appendChild(img);
        button.addEventListener('click', () => setActiveImage(index));
        track.appendChild(button);
      });
    };

    const updateNavigation = () => {
      if (!prevBtn || !nextBtn) return;
      const shouldShowNav = images.length > 4;
      prevBtn.hidden = !shouldShowNav;
      nextBtn.hidden = !shouldShowNav;
    };

    if (prevBtn && viewport) {
      prevBtn.addEventListener('click', () => {
        viewport.scrollBy({ left: -viewport.clientWidth * 0.8, behavior: 'smooth' });
      });
    }

    if (nextBtn && viewport) {
      nextBtn.addEventListener('click', () => {
        viewport.scrollBy({ left: viewport.clientWidth * 0.8, behavior: 'smooth' });
      });
    }

    if (caption && product.imageCaption) {
      caption.textContent = product.imageCaption;
    }

    if (images.length) {
      renderMainImage(images[0]);
      if (galleryContainer) {
        galleryContainer.hidden = false;
        renderThumbnails();
        updateNavigation();
        setActiveImage(0);
      }
    } else {
      renderMainImage(null);
      if (galleryContainer) {
        galleryContainer.hidden = true;
      }
    }

    document.querySelectorAll('[data-add-to-cart]').forEach((form) => {
      form.dataset.productId = product.id;
      const sizeField = form.querySelector('[data-size-field]');
      const select = sizeField?.querySelector('select');

      if (product.sizes && product.sizes.length) {
        if (select) {
          select.innerHTML = '';
          product.sizes.forEach((size) => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            select.appendChild(option);
          });
        }
      } else if (sizeField) {
        sizeField.remove();
      }
    });
  };

  const init = () => {
    updateSummaryUI();
    renderProductList();
    hydrateProductPage();
    setupForms();
    setupTriggers();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
