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

    const closeNav = () => {
      header.classList.remove('is-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openNav = () => {
      header.classList.add('is-nav-open');
      toggle.setAttribute('aria-expanded', 'true');
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

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleMediaChange = (event) => {
      if (event.matches) {
        closeNav();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleMediaChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavToggle);
  } else {
    initNavToggle();
  }
})();
