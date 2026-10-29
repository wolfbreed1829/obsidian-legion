// Decorative motion only. Content, navigation, and applications work independently.
(() => {
  const body = document.body;
  const toggle = document.querySelector('#motion-toggle');
  const canvas = document.querySelector('#ambient-field');
  if (!toggle || !canvas) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const storageKey = 'obsidian-legion-motion';
  let userPaused = false;
  try { userPaused = localStorage.getItem(storageKey) === 'paused'; } catch { /* Optional preference storage. */ }
  let enabled = false;
  let frame = 0;
  let lastFrame = 0;
  let width = 0;
  let height = 0;
  let particles = [];
  const context = canvas.getContext('2d');
  const crest = document.querySelector('.emblem-frame');

  // Reveal once; keyboard focus also makes a pending element immediately visible.
  const revealItems = [...document.querySelectorAll('.page-heading,.manifesto-opening,.principle,.chapter-links > a,.craft-tabs,.page-callout,.blueprint,.build-workflow,.enlist-intro,.enlist-panel')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.06 });
    revealItems.forEach(element => {
      element.dataset.reveal = '';
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty('--reveal-delay', Math.min(index, 3) * 85 + 'ms');
      observer.observe(element);
    });
  }

  function resizeField() {
    if (!context) return;
    width = document.documentElement.clientWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 760 ? 20 : Math.min(65, Math.round(width / 22));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      speed: 5 + Math.random() * 12, drift: (Math.random() - .5) * 7,
      radius: .6 + Math.random() * 1.25, phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(now) {
    frame = 0;
    if (!enabled || document.hidden || !context) return;
    const elapsed = now - lastFrame;
    // Cap painting at 30fps; no work while the page is hidden or motion is paused.
    if (elapsed < 1000 / 30) { frame = requestAnimationFrame(draw); return; }
    const delta = Math.min(elapsed / 1000, .075);
    lastFrame = now;
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const point = particles[i];
      point.y -= point.speed * delta;
      point.x += point.drift * delta;
      if (point.y < -10) { point.y = height + 10; point.x = Math.random() * width; }
      if (point.x < -10) point.x = width + 10;
      if (point.x > width + 10) point.x = -10;
      const alpha = .22 + (Math.sin(now / 2300 + point.phase) + 1) * .18;
      context.fillStyle = 'rgba(205,159,100,' + alpha + ')';
      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fill();
      // Sparse connections suggest a living network without covering the text.
      if (width < 760) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance > 125) continue;
        context.strokeStyle = 'rgba(195,154,107,' + (.11 * (1 - distance / 125)) + ')';
        context.lineWidth = .5;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function resetCrest() {
    crest?.style.removeProperty('--tilt-x');
    crest?.style.removeProperty('--tilt-y');
  }

  function syncMotion() {
    enabled = !userPaused && !reducedMotion.matches;
    body.classList.toggle('motion-enabled', enabled);
    body.classList.toggle('motion-suspended', document.hidden);
    toggle.hidden = false;
    toggle.disabled = reducedMotion.matches;
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.setAttribute('aria-label', reducedMotion.matches ? 'Animations disabled by your reduced-motion preference' : enabled ? 'Pause animations' : 'Play animations');
    toggle.querySelector('.motion-label').textContent = reducedMotion.matches ? 'Motion reduced' : enabled ? 'Motion on' : 'Motion off';
    toggle.querySelector('.motion-symbol').textContent = enabled ? 'Ⅱ' : '▷';
    cancelAnimationFrame(frame);
    frame = 0;
    resetCrest();
    if (enabled && !document.hidden) {
      if (!width) resizeField();
      lastFrame = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem(storageKey, userPaused ? 'paused' : 'playing'); } catch { /* Still works for this document. */ }
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pageshow', syncMotion);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('resize', resizeField, { passive: true });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    userPaused = event.newValue === 'paused';
    syncMotion();
  });

  // Parallax is confined to the artwork, never text or form controls.
  if (crest) {
    let bounds;
    crest.addEventListener('pointerenter', () => { bounds = crest.getBoundingClientRect(); });
    crest.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches || !bounds) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      crest.style.setProperty('--tilt-x', -y * 7 + 'deg');
      crest.style.setProperty('--tilt-y', x * 9 + 'deg');
    }, { passive: true });
    crest.addEventListener('pointerleave', resetCrest);
  }
  for (const element of document.querySelectorAll('.chapter-links > a,.blueprint,.principle')) {
    element.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches) return;
      const bounds = element.getBoundingClientRect();
      element.style.setProperty('--light-x', event.clientX - bounds.left + 'px');
      element.style.setProperty('--light-y', event.clientY - bounds.top + 'px');
    }, { passive: true });
  }
  syncMotion();
})();
