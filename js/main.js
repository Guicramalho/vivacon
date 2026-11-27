/**
 * VIVACON — scripts do site.
 *
 * Cada funcionalidade fica numa função init* independente, executada
 * dentro de try/catch: se uma falhar, as outras continuam funcionando.
 */
(() => {
  'use strict';

  /* Configuração
     ======================================================================== */

  const CONFIG = {
    preloader: {
      maxWait: 3000,      // ms: some mesmo se a página ainda não terminou de carregar
      fadeDelay: 400,     // ms entre liberar a rolagem e esconder o preloader
    },
    header: {
      scrollThreshold: 60, // px de rolagem até o cabeçalho ganhar fundo
    },
    parallax: {
      factor: 0.35,
    },
    heroTitle: {
      baseDelay: 0.3,     // s: atraso da primeira linha do título
      step: 0.25,         // s: atraso extra a cada linha seguinte
    },
    reveal: {
      threshold: 0.15,
      stagger: 0.1,       // s entre elementos irmãos
    },
    counters: {
      duration: 1400,     // ms
      threshold: 0.4,
    },
    testimonials: {
      interval: 2000,     // ms entre slides no autoplay
      swipeThreshold: 50, // px mínimos para considerar um arraste
    },
    map: {
      // Token público do Mapbox. Restrinja-o ao domínio do site no painel do Mapbox.
      token: 'pk.eyJ1IjoiZ3VpY3JhbWFsaG8iLCJhIjoiY21zZHVib2RnMDJ2NTNhb2NsOXptY2QyeCJ9.WdVib0qPJAl2bVp2dEYCmg',
      version: 'v3.6.0',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-34.8707, -7.1956],
      zoom: 12,
      fitPadding: 80,
      fitMaxZoom: 14,
      popupOffset: 20,
      loadMargin: '800px 0px', // começa a carregar o Mapbox quando o mapa está a 800px da tela
    },
  };

  /* Utilitários
     ======================================================================== */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Nome do empreendimento a partir de qualquer elemento dentro do card. */
  const projectName = (el) => {
    const title = el.closest('.project-card')?.querySelector('h3');
    return title ? title.textContent.trim() : '';
  };

  /** Carrega um arquivo externo (CSS ou JS) e resolve quando terminar. */
  const loadAsset = (element) => new Promise((resolve, reject) => {
    element.addEventListener('load', resolve, { once: true });
    element.addEventListener('error', () => reject(new Error(`Falha ao carregar ${element.src || element.href}`)), { once: true });
  });

  /* Preloader
     ======================================================================== */

  function initPreloader() {
    const preloader = $('#preloader');
    if (!preloader) return;

    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      document.body.classList.remove('loading');
      setTimeout(() => preloader.classList.add('hide'), CONFIG.preloader.fadeDelay);
    };

    if (document.readyState === 'complete') {
      hide();
    } else {
      window.addEventListener('load', hide, { once: true });
    }
    setTimeout(hide, CONFIG.preloader.maxWait);
  }

  /* Título do hero: cada linha entra com um atraso maior que a anterior
     ======================================================================== */

  function initHeroTitle() {
    const { baseDelay, step } = CONFIG.heroTitle;
    $$('.hero h1 .reveal-line > span').forEach((span, i) => {
      span.style.animationDelay = `${baseDelay + i * step}s`;
    });
  }

  /* Cabeçalho: ganha fundo desfocado depois de rolar a página
     ======================================================================== */

  function initHeader() {
    const header = $('#header');
    if (!header) return;

    const update = () => {
      header.classList.toggle('scrolled', window.scrollY > CONFIG.header.scrollThreshold);
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* Menu mobile
     ======================================================================== */

  function initMobileMenu() {
    const button = $('#menuBtn');
    const menu = $('#mobileMenu');
    if (!button || !menu) return;

    const isOpen = () => menu.classList.contains('open');

    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      menu.inert = !open; // fechado, os links não recebem foco do teclado
      button.textContent = open ? '✕' : '☰';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    };

    button.addEventListener('click', () => setOpen(!isOpen()));
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    // Fecha com Esc ou com toque/clique fora do menu
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (isOpen() && !menu.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    });
  }

  /* Parallax do fundo do hero
     ======================================================================== */

  function initParallax() {
    const hero = $('.hero');
    const background = $('.hero-bg');
    if (!hero || !background || reducedMotion) return;

    // Atualiza no máximo uma vez por quadro, e só enquanto o hero está visível
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const y = window.scrollY;
      if (y > hero.offsetHeight) return;
      background.style.transform = `translateY(${y * CONFIG.parallax.factor}px)`;
    };

    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
  }

  /* Revelação de elementos ao entrar na tela ([data-reveal])
     ======================================================================== */

  function initReveal() {
    const { threshold, stagger } = CONFIG.reveal;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const siblings = $$('[data-reveal]', el.parentElement);
        el.style.transitionDelay = `${siblings.indexOf(el) * stagger}s`;
        el.classList.add('in');
        observer.unobserve(el);

        // Terminada a entrada, tira o atraso (senão ele valeria também para
        // o hover) e marca o elemento como revelado
        const finish = (event) => {
          if (event.target !== el || event.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', finish);
          el.removeEventListener('transitioncancel', finish);
          el.style.transitionDelay = '';
          el.classList.add('revealed');
        };
        // transitioncancel cobre o caso de o filtro esconder o card no meio da animação
        el.addEventListener('transitionend', finish);
        el.addEventListener('transitioncancel', finish);
      });
    }, { threshold });

    $$('[data-reveal]').forEach((el) => observer.observe(el));
  }

  /* Contadores animados ([data-target], com [data-prefix] e [data-suffix])
     O HTML já traz o valor final, para buscadores e para quem está sem JS;
     aqui ele é zerado e anima até o valor quando aparece na tela.
     ======================================================================== */

  function initCounters() {
    if (reducedMotion) return; // mantém o valor final do HTML

    const { duration, threshold } = CONFIG.counters;

    const animate = (el) => {
      const target = Number(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
        el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold });

    $$('[data-target]').forEach((el) => {
      el.textContent = '0';
      observer.observe(el);
    });
  }

  /* Filtro de empreendimentos
     ======================================================================== */

  function initProjectFilter() {
    const pills = $$('.filter-pill');
    const cards = $$('.project-card');
    if (!pills.length) return;

    const apply = (filter) => {
      pills.forEach((pill) => {
        const active = pill.dataset.filter === filter;
        pill.classList.toggle('active', active);
        pill.setAttribute('aria-pressed', String(active));
      });

      cards.forEach((card) => {
        const statuses = (card.dataset.status || '').split(/\s+/);
        const visible = filter === 'todos' || statuses.includes(filter);
        card.style.display = visible ? '' : 'none';
      });
    };

    pills.forEach((pill) => {
      pill.addEventListener('click', () => apply(pill.dataset.filter));
    });

    // Links do rodapé que aplicam um filtro antes de rolar até a seção
    $$('[data-filter-link]').forEach((link) => {
      link.addEventListener('click', () => apply(link.dataset.filterLink));
    });
  }

  /* Galeria de fotos (lightbox)
     ======================================================================== */

  function initGallery() {
    const lightbox = $('#lightbox');
    if (!lightbox) return;

    const image = $('#lightboxImg', lightbox);
    const counter = $('#lightboxCounter', lightbox);
    const closeButton = $('#lightboxClose', lightbox);
    const prevButton = $('#lightboxPrev', lightbox);
    const nextButton = $('#lightboxNext', lightbox);
    const focusable = [closeButton, prevButton, nextButton];

    let photos = [];
    let index = 0;
    let title = '';
    let trigger = null;

    const isOpen = () => lightbox.classList.contains('open');

    const render = () => {
      image.src = photos[index];
      image.alt = `${title} — foto ${index + 1} de ${photos.length}`;
      counter.textContent = `${index + 1} / ${photos.length}`;

      // Pré-carrega a próxima foto para a troca ser instantânea
      if (photos.length > 1) new Image().src = photos[(index + 1) % photos.length];
    };

    const go = (delta) => {
      index = (index + delta + photos.length) % photos.length;
      render();
    };

    const open = (visual) => {
      photos = visual.dataset.gallery.split(',').map((src) => src.trim()).filter(Boolean);
      if (!photos.length) return;

      title = projectName(visual);
      index = 0;
      trigger = visual;
      render();
      lightbox.classList.add('open');
      closeButton.focus();
    };

    const close = () => {
      lightbox.classList.remove('open');
      if (trigger) trigger.focus();
    };

    // O card inteiro tem cursor de clique, então o card inteiro abre a galeria
    $$('.project-card').forEach((card) => {
      const visual = $('.project-visual[data-gallery]', card);
      if (!visual) return;

      visual.setAttribute('aria-label', `Ver fotos: ${projectName(visual)}`);
      card.addEventListener('click', () => open(visual));
      visual.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(visual);
        }
      });
    });

    closeButton.addEventListener('click', close);
    prevButton.addEventListener('click', () => go(-1));
    nextButton.addEventListener('click', () => go(1));

    // Clique no fundo escuro (fora da foto e dos botões) fecha
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) close();
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;

      switch (event.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowLeft':
          go(-1);
          break;
        case 'ArrowRight':
          go(1);
          break;
        case 'Tab': {
          // Mantém o foco dentro da galeria enquanto ela está aberta
          event.preventDefault();
          const current = focusable.indexOf(document.activeElement);
          const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
          focusable[next].focus();
          break;
        }
        default:
          break;
      }
    });
  }

  /* Carrossel de depoimentos
     ======================================================================== */

  function initTestimonials() {
    const track = $('#testiTrack');
    const dotsWrap = $('#testiDots');
    if (!track || !dotsWrap) return;

    const carousel = track.parentElement;
    const slides = $$('.testi-slide', track);
    if (!slides.length) return;

    const { interval, swipeThreshold } = CONFIG.testimonials;
    let current = 0;
    let timer = null;

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'testi-dot';
      dot.setAttribute('aria-label', `Depoimento ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    const updateDots = () => {
      dots.forEach((dot, i) => {
        const active = i === current;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-current', String(active));
      });
    };

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      updateDots();
    }

    $('#testiPrev').addEventListener('click', () => goTo(current - 1));
    $('#testiNext').addEventListener('click', () => goTo(current + 1));

    /* Autoplay: pausa enquanto o mouse está em cima, enquanto o carrossel
       tem foco de teclado, durante um toque e com a aba em segundo plano.
       Desligado para quem pediu ao sistema para reduzir movimento. */
    const pause = { hover: false, focus: false, touch: false };

    const syncAutoplay = () => {
      clearInterval(timer);
      timer = null;
      const paused = reducedMotion || document.hidden || pause.hover || pause.focus || pause.touch;
      if (!paused) timer = setInterval(() => goTo(current + 1), interval);
    };

    const setPause = (reason, value) => {
      if (pause[reason] === value) return;
      pause[reason] = value;
      syncAutoplay();
    };

    carousel.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') setPause('hover', true);
    });
    carousel.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') setPause('hover', false);
    });
    carousel.addEventListener('focusin', (event) => {
      setPause('focus', event.target.matches(':focus-visible'));
    });
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) setPause('focus', false);
    });
    document.addEventListener('visibilitychange', syncAutoplay);

    // Arrastar para os lados no celular
    let touchStartX = 0;
    track.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0].clientX;
      setPause('touch', true);
    }, { passive: true });
    track.addEventListener('touchend', (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (distance > swipeThreshold) goTo(current - 1);
      if (distance < -swipeThreshold) goTo(current + 1);
      setPause('touch', false);
    }, { passive: true });
    track.addEventListener('touchcancel', () => setPause('touch', false), { passive: true });

    updateDots();
    syncAutoplay();
  }

  /* Mapa dos empreendimentos
     Os pontos vêm dos próprios cards (data-lat / data-lng), então cada
     empreendimento é cadastrado num lugar só: no HTML do card.
     O Mapbox (~500 KB) só é baixado quando o mapa se aproxima da tela.
     ======================================================================== */

  function loadMapbox() {
    if (window.mapboxgl) return Promise.resolve(window.mapboxgl);

    const base = `https://api.mapbox.com/mapbox-gl-js/${CONFIG.map.version}/mapbox-gl`;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${base}.css`;

    const script = document.createElement('script');
    script.src = `${base}.js`;

    // O CSS do Mapbox entra antes do nosso, para os nossos ajustes continuarem valendo
    const siteCss = $('link[href$="css/style.css"]');
    document.head.insertBefore(css, siteCss);
    document.head.appendChild(script);

    return Promise.all([loadAsset(css), loadAsset(script)]).then(() => window.mapboxgl);
  }

  function buildMap(mapboxgl, container) {
    const cfg = CONFIG.map;

    const projects = $$('.project-card[data-lat][data-lng]').map((card) => ({
      name: projectName(card),
      status: $('.status-tag', card)?.textContent.trim() ?? '',
      lngLat: [Number(card.dataset.lng), Number(card.dataset.lat)],
    }));

    mapboxgl.accessToken = cfg.token;

    const map = new mapboxgl.Map({
      container,
      style: cfg.style,
      center: cfg.center,
      zoom: cfg.zoom,
    });

    // O zoom pela rolagem só liga depois de um clique, para não prender a página
    map.scrollZoom.disable();
    map.on('click', () => map.scrollZoom.enable());
    map.on('mouseleave', () => map.scrollZoom.disable());

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');

    const buildPopup = (name, status) => {
      const content = document.createElement('div');

      const titleEl = document.createElement('div');
      titleEl.className = 'map-popup-title';
      titleEl.textContent = name;

      const statusEl = document.createElement('div');
      statusEl.className = 'map-popup-status';
      statusEl.textContent = status;

      content.append(titleEl, statusEl);
      return content;
    };

    // Só um balão aberto por vez
    let openPopup = null;
    const show = (popup) => {
      if (openPopup && openPopup !== popup) openPopup.remove();
      popup.addTo(map);
      openPopup = popup;
    };
    const hide = (popup) => {
      popup.remove();
      if (openPopup === popup) openPopup = null;
    };

    const bounds = new mapboxgl.LngLatBounds();

    projects.forEach(({ name, status, lngLat }) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'map-marker';
      markerEl.setAttribute('role', 'img');
      markerEl.setAttribute('aria-label', `${name}: ${status}`);

      const popup = new mapboxgl.Popup({
        offset: cfg.popupOffset,
        closeButton: false,
        closeOnClick: false,
      })
        .setLngLat(lngLat)
        .setDOMContent(buildPopup(name, status));

      new mapboxgl.Marker(markerEl).setLngLat(lngLat).addTo(map);

      // Mouse: o balão aparece ao passar por cima
      markerEl.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') show(popup);
      });
      markerEl.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse') hide(popup);
      });

      // Toque (celular): o balão abre e fecha com um toque no pino.
      // Usa pointerup em vez de click porque o Mapbox cancela o click
      // quando dois toques são rápidos (ele interpreta como zoom duplo).
      let touchStart = null;
      markerEl.addEventListener('pointerdown', (event) => {
        touchStart = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
      });
      markerEl.addEventListener('pointerup', (event) => {
        if (!touchStart) return;
        const moved = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y);
        touchStart = null;
        if (moved > 10) return; // foi arraste, não toque
        if (popup.isOpen()) hide(popup);
        else show(popup);
      });

      bounds.extend(lngLat);
    });

    // Toque em qualquer outro ponto do mapa fecha o balão aberto
    map.on('click', (event) => {
      const target = event.originalEvent?.target;
      if (openPopup && !(target instanceof Element && target.closest('.mapboxgl-marker'))) {
        hide(openPopup);
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: cfg.fitPadding, maxZoom: cfg.fitMaxZoom });
    }
  }

  function initMap() {
    const container = $('#map');
    if (!container) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();

      loadMapbox()
        .then((mapboxgl) => buildMap(mapboxgl, container))
        .catch((error) => console.warn('[vivacon] O mapa não pôde ser exibido:', error));
    }, { rootMargin: CONFIG.map.loadMargin });

    observer.observe(container);
  }

  /* Inicialização
     ======================================================================== */

  [
    initPreloader, // primeiro, para o preloader nunca ficar preso
    initHeroTitle,
    initHeader,
    initMobileMenu,
    initParallax,
    initReveal,
    initCounters,
    initProjectFilter,
    initGallery,
    initTestimonials,
    initMap,
  ].forEach((init) => {
    try {
      init();
    } catch (error) {
      console.error(`[vivacon] Falha em ${init.name}:`, error);
    }
  });
})();
