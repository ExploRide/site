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

    let navBackdrop = header.querySelector('.nav-backdrop');
    if (!navBackdrop) {
      navBackdrop = document.createElement('div');
      navBackdrop.className = 'nav-backdrop';
      header.appendChild(navBackdrop);
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const isDesktop = () => mediaQuery.matches;

    const updateNavHeight = () => {
      if (isDesktop()) {
        nav.style.removeProperty('--top-nav-expanded-height');
        return;
      }

      const wasOpen = header.classList.contains('is-nav-open');
      const previousStyles = {
        maxHeight: nav.style.maxHeight,
        transition: nav.style.transition,
        visibility: nav.style.visibility,
        opacity: nav.style.opacity,
        pointerEvents: nav.style.pointerEvents,
        position: nav.style.position,
        transform: nav.style.transform,
        width: nav.style.width,
      };

      nav.style.transition = 'none';
      nav.style.maxHeight = 'none';

      if (!wasOpen) {
        nav.style.visibility = 'hidden';
        nav.style.opacity = '0';
        nav.style.pointerEvents = 'none';
        nav.style.position = 'absolute';
        nav.style.transform = 'none';
        nav.style.width = '100%';
      }

      const navHeight = nav.scrollHeight;

      nav.style.maxHeight = previousStyles.maxHeight;
      nav.style.transition = previousStyles.transition;
      nav.style.visibility = previousStyles.visibility;
      nav.style.opacity = previousStyles.opacity;
      nav.style.pointerEvents = previousStyles.pointerEvents;
      nav.style.position = previousStyles.position;
      nav.style.transform = previousStyles.transform;
      nav.style.width = previousStyles.width;

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
      document.body.classList.remove('has-open-nav');
    };

    const openNav = () => {
      updateNavHeight();
      header.classList.add('is-nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      setNavAriaHidden(false);
      document.body.classList.add('has-open-nav');
    };

    const toggleNav = () => {
      if (header.classList.contains('is-nav-open')) {
        closeNav();
      } else {
        openNav();
      }
    };

    toggle.addEventListener('click', toggleNav);

    navBackdrop.addEventListener('click', () => {
      if (!isDesktop()) {
        closeNav();
      }
    });

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

    document.addEventListener('click', (event) => {
      if (isDesktop() || !header.classList.contains('is-nav-open')) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('header')) {
        closeNav();
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

  function initComingSoonTooltip() {
    const header = document.querySelector('header');
    if (!header) {
      return;
    }

    const buttons = header.querySelectorAll('.nav-link--disabled');
    const targets = Array.from(buttons).filter((button) => {
      const label = button.textContent.trim().toLowerCase();
      return label === 'blog' || label === 'sklep';
    });

    if (!targets.length) {
      return;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'cursor-tooltip';
    tooltip.setAttribute('role', 'status');
    tooltip.textContent = 'Coming soon...';
    document.body.appendChild(tooltip);

    let isVisible = false;

    const showTooltip = () => {
      if (!isVisible) {
        tooltip.classList.add('is-visible');
        isVisible = true;
      }
    };

    const hideTooltip = () => {
      if (!isVisible) {
        return;
      }

      tooltip.classList.remove('is-visible');
      tooltip.style.removeProperty('--tooltip-x');
      tooltip.style.removeProperty('--tooltip-y');
      isVisible = false;
    };

    const updateTooltipPosition = (event) => {
      tooltip.style.setProperty('--tooltip-x', `${Math.round(event.clientX + 16)}px`);
      tooltip.style.setProperty('--tooltip-y', `${Math.round(event.clientY + 16)}px`);
    };

    targets.forEach((button) => {
      button.addEventListener('mouseenter', (event) => {
        showTooltip();
        updateTooltipPosition(event);
      });

      button.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      button.addEventListener('mousemove', (event) => {
        if (isVisible) {
          updateTooltipPosition(event);
        }
      });
    });
  }

  function init() {
    initNavToggle();
    initComingSoonTooltip();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
