// Treinamento CIS — navegação e auto-escala de slides
(function () {
  const stage = document.querySelector('.stage');
  const deck = document.querySelector('.deck');
  if (!stage || !deck) return;

  const slides = Array.from(deck.querySelectorAll('.slide'));

  // Cascata granular: define --i para cada filho dos grupos staggered
  const STAGGER_SELECTORS = [
    '.grid > *', '.seq > *', '.aida > *', '.funnel > *',
    '.split > *', '.cols-aside > *',
    '.matrix > .quad', '.matrix > .axis-y', '.matrix > .axis-x',
    'ul.dot-list > li', 'ul.tick-list > li', 'ul.x-list > li',
    '.cis-table tbody > tr'
  ];
  slides.forEach(slide => {
    STAGGER_SELECTORS.forEach(sel => {
      slide.querySelectorAll(sel).forEach((el, i) => el.style.setProperty('--i', i));
    });
    // Métricas dentro de um grid herdam o --i do card pai
    slide.querySelectorAll('.metric').forEach((m) => {
      const card = m.closest('.card');
      if (card && card.style.getPropertyValue('--i')) {
        m.style.setProperty('--i-card', card.style.getPropertyValue('--i'));
      }
    });
  });
  const counterEl = document.querySelector('[data-counter]');
  const progressEl = document.querySelector('.progress > span');
  let idx = 0;

  function fitDeck() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const sw = deck.clientWidth;
    const sh = deck.clientHeight;
    const scale = Math.min(W / sw, H / sh) * 0.96;
    deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
    deck.style.position = 'absolute';
    deck.style.top = '50%';
    deck.style.left = '50%';
  }

  function render(prevIdx) {
    const dir = prevIdx == null ? 'next' : (idx >= prevIdx ? 'next' : 'prev');
    slides.forEach((s, i) => {
      s.classList.remove('dir-prev', 'dir-next');
      if (i === idx) {
        s.classList.add('is-active');
        if (dir === 'prev') s.classList.add('dir-prev');
        s.classList.remove('is-leaving');
      } else if (i === prevIdx) {
        s.classList.remove('is-active');
        s.classList.add('is-leaving');
        if (dir === 'prev') s.classList.add('dir-prev');
        // Remove a classe is-leaving após a animação completar
        const onEnd = () => { s.classList.remove('is-leaving', 'dir-prev'); s.removeEventListener('animationend', onEnd); };
        s.addEventListener('animationend', onEnd);
      } else {
        s.classList.remove('is-active', 'is-leaving');
      }
    });
    if (counterEl) counterEl.innerHTML = `<b>${idx + 1}</b> / ${slides.length}`;
    if (progressEl) progressEl.style.width = `${((idx + 1) / slides.length) * 100}%`;
    const url = new URL(window.location.href);
    url.hash = `slide-${idx + 1}`;
    history.replaceState(null, '', url);
  }

  function go(n) {
    const prevIdx = idx;
    idx = Math.max(0, Math.min(slides.length - 1, n));
    render(prevIdx === idx ? undefined : prevIdx);
  }
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // Inicial pelo hash
  const m = location.hash.match(/slide-(\d+)/);
  if (m) idx = Math.max(0, Math.min(slides.length - 1, parseInt(m[1], 10) - 1));

  // Teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });

  // Botões
  document.querySelectorAll('[data-nav="prev"]').forEach(b => b.addEventListener('click', prev));
  document.querySelectorAll('[data-nav="next"]').forEach(b => b.addEventListener('click', next));

  // Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
  function syncFsButtons() {
    const on = !!document.fullscreenElement;
    document.querySelectorAll('[data-nav="fullscreen"]').forEach(b => {
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const lbl = b.querySelector('.fs-label');
      if (lbl) lbl.textContent = on ? 'Sair' : 'Tela cheia';
    });
  }
  document.querySelectorAll('[data-nav="fullscreen"]').forEach(b => b.addEventListener('click', toggleFullscreen));
  document.addEventListener('fullscreenchange', syncFsButtons);

  // Em iframe? Interceptar navegação para preservar fullscreen do shell.
  const inIframe = window.parent !== window;
  if (inIframe) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.endsWith('index.html')) {
        e.preventDefault();
        parent.postMessage({ type: 'cis-nav', target: 'menu' }, '*');
      } else {
        const m = href.match(/modulo-(\d+)\.html/);
        if (m) {
          e.preventDefault();
          parent.postMessage({ type: 'cis-nav', target: 'module', n: parseInt(m[1], 10) }, '*');
        }
      }
    });
    // Esconde controles que viraram redundantes (o shell já oferece): botão Menu fixo
    // do canto superior esquerdo e o botão fullscreen na HUD.
    document.documentElement.classList.add('in-shell');
    document.querySelectorAll('[data-nav="fullscreen"]').forEach(b => b.style.display = 'none');
    document.querySelectorAll('a.home-button').forEach(a => {
      // O link "Avançar ao Módulo X" / "Voltar ao Menu" no final dos slides permanece visível —
      // só escondemos o botão fixo do canto superior (que tem position:fixed via .home-button).
      const isFixed = getComputedStyle(a).position === 'fixed';
      if (isFixed) a.style.display = 'none';
    });
  }

  // Swipe touch
  let tx = 0;
  stage.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
  });

  window.addEventListener('resize', fitDeck);
  fitDeck();
  render();
})();
