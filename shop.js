(function () {
  const productList = Array.isArray(window.SHOP_PRODUCTS)
    ? window.SHOP_PRODUCTS
    : Object.values(window.SHOP_PRODUCTS || {});

  const PRODUCTS = Object.fromEntries(productList.map((product) => [product.id, product]));
  const productsBySlug = new Map(productList.map((product) => [product.slug, product]));

  const storageKey = 'explorideShopCart';
  const currency = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

  const formatPrice = (value) => currency.format(Number(value) || 0);

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

  const getCartSummary = () => {
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalPrice = cart.reduce((sum, item) => {
      const product = PRODUCTS[item.id];
      return sum + (product ? Number(product.price || 0) * item.quantity : 0);
    }, 0);

    return { totalItems, totalPrice };
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
      quantityInput.max = '20';
      quantityInput.value = item.quantity;
      quantityInput.addEventListener('change', (event) => {
        const value = Math.max(1, Math.min(20, Number(event.target.value) || 1));
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
        sizeSelect.addEventListener('change', (event) => {
          cart[index].size = event.target.value;
          saveCart(cart);
          renderCartList();
          updateSummaryUI();
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

    const existingIndex = cart.findIndex((item) => item.id === id && (item.size || '') === (size || ''));
    if (existingIndex > -1) {
      cart[existingIndex].quantity = Math.min(20, cart[existingIndex].quantity + quantity);
    } else {
      cart.push({ id, quantity: Math.min(20, quantity), size });
    }

    saveCart(cart);
    updateSummaryUI();
  };

  const setupForms = () => {
    document.querySelectorAll('[data-add-to-cart]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const productId = form.dataset.productId;
        const product = PRODUCTS[productId];
        if (!product) return;
        const quantityInput = form.querySelector('[name="quantity"]');
        const sizeSelect = form.querySelector('[name="size"]');
        const quantity = Math.max(1, Math.min(20, Number(quantityInput?.value) || 1));
        if (quantityInput) {
          quantityInput.value = quantity;
        }
        const size = sizeSelect ? sizeSelect.value : undefined;
        addToCart({ id: productId, quantity, size });
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
      continueBtn.addEventListener('click', () => {
        modal.dataset.step = 'payment';
        updateStepUI();
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

      const image = document.createElement('div');
      image.className = 'shop-item__image';
      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.imageAlt || product.name;
        img.loading = 'lazy';
        image.appendChild(img);
      } else {
        image.textContent = product.imagePlaceholder || 'Zdjęcie produktu';
      }

      const body = document.createElement('div');
      body.className = 'shop-item__body';

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

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(price);

      item.appendChild(image);
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

    const note = document.querySelector('[data-product-note]');
    if (note && product.note) note.textContent = product.note;

    const image = document.querySelector('[data-product-image]');
    if (image) {
      image.innerHTML = '';
      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.imageAlt || product.name;
        img.loading = 'lazy';
        image.appendChild(img);
      } else {
        image.textContent = product.imagePlaceholder || 'Zdjęcie produktu';
      }
    }

    const caption = document.querySelector('[data-product-image-caption]');
    if (caption && product.imageCaption) {
      caption.textContent = product.imageCaption;
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
