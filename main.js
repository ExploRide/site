(function () {
  function initNavToggle() {
    const header = document.querySelector('header');
    if (!header) {
      return;
    }

    const toggle = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.top-nav');
    if (!toggle || !nav) {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const isDesktop = () => mediaQuery.matches;

    const updateNavHeight = () => {
      if (isDesktop()) {
        nav.style.removeProperty('--top-nav-expanded-height');
        return;
      }

      const navHeight = nav.scrollHeight;
      nav.style.setProperty('--top-nav-expanded-height', `${navHeight}px`);
    };

    const setNavAriaHidden = (hidden) => {
      if (isDesktop()) {
        nav.removeAttribute('aria-hidden');
        return;
      }

      nav.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    };

    const closeNav = () => {
      updateNavHeight();
      header.classList.remove('is-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      setNavAriaHidden(true);
    };

    const openNav = () => {
      updateNavHeight();
      header.classList.add('is-nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      setNavAriaHidden(false);
    };

    const toggleNav = () => {
      if (header.classList.contains('is-nav-open')) {
        closeNav();
      } else {
        openNav();
      }
    };

    toggle.addEventListener('click', toggleNav);

    nav.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest('a, button')) {
        closeNav();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('is-nav-open')) {
        closeNav();
        toggle.focus();
      }
    });

    const handleMediaChange = (event) => {
      updateNavHeight();

      if (event.matches) {
        closeNav();
      } else if (!header.classList.contains('is-nav-open')) {
        setNavAriaHidden(true);
      }
    };

    const handleResize = () => {
      if (!isDesktop()) {
        updateNavHeight();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleMediaChange);
    }
    window.addEventListener('resize', handleResize);

    updateNavHeight();
    if (!isDesktop()) {
      setNavAriaHidden(header.classList.contains('is-nav-open') ? false : true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavToggle);
  } else {
    initNavToggle();
  }
})();
