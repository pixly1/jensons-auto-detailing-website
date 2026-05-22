/* Xavier's Mobile Detailing — Scroll Animation Engine */

gsap.registerPlugin(ScrollTrigger);

// ─── Constants ────────────────────────────────────────────────
const FRAME_COUNT  = 240;
const FRAME_SPEED  = 2.0;   // animation completes at 50% scroll
const IMAGE_SCALE  = 0.85;  // padded cover — no clipping into header

// ─── DOM ──────────────────────────────────────────────────────
const loader       = document.getElementById('loader');
const loaderBar    = document.getElementById('loader-bar');
const loaderPct    = document.getElementById('loader-percent');
const hero         = document.getElementById('hero');
const canvasWrap   = document.getElementById('canvas-wrap');
const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');
const darkOverlay  = document.getElementById('dark-overlay');
const whiteOverlay = document.getElementById('white-overlay');
const scrollCont   = document.getElementById('scroll-container');
const marquee1     = document.getElementById('marquee-1');
const marquee2     = document.getElementById('marquee-2');
const sections     = Array.from(document.querySelectorAll('.scroll-section'));
const resultsGrid  = document.querySelector('.results-grid');
const galleryWrap  = document.querySelector('.gallery-scroll-wrap');

// ─── State ────────────────────────────────────────────────────
const frames      = new Array(FRAME_COUNT).fill(null);
let framesLoaded  = 0;
let currentFrame  = 0;
let bgColor       = '#0a0a0a';

// ─── Lenis Smooth Scroll ──────────────────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ─── Canvas ───────────────────────────────────────────────────
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w   = window.innerWidth;
  const h   = window.innerHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function sampleBg(img) {
  try {
    const tc = document.createElement('canvas');
    tc.width = tc.height = 4;
    const tx = tc.getContext('2d');
    tx.drawImage(img, 0, 0, 4, 4);
    const d = tx.getImageData(0, 0, 1, 1).data;
    bgColor = `rgb(${d[0]},${d[1]},${d[2]})`;
  } catch(e) {}
}

function drawFrame(idx) {
  const img = frames[idx];
  if (!img) return;
  const dpr = window.devicePixelRatio || 1;
  const cw  = canvas.width  / dpr;
  const ch  = canvas.height / dpr;
  const iw  = img.naturalWidth;
  const ih  = img.naturalHeight;
  const sc  = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw  = iw * sc;
  const dh  = ih * sc;
  const dx  = cw * 0.65 - dw / 2;
  const dy  = (ch - dh) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
}

// ─── Frame Preloader ──────────────────────────────────────────
function loadFrame(i) {
  return new Promise(resolve => {
    const img = new Image();
    const n   = String(i + 1).padStart(4, '0');
    img.src   = `frames/frame_${n}.jpg`;
    img.onload = () => {
      frames[i] = img;
      framesLoaded++;
      const pct = Math.round(framesLoaded / FRAME_COUNT * 100);
      loaderBar.style.width    = pct + '%';
      loaderPct.textContent    = pct + '%';
      if (i % 24 === 0) sampleBg(img);
      resolve();
    };
    img.onerror = () => { framesLoaded++; resolve(); };
  });
}

async function preload() {
  // Phase 1: first 10 frames → unblock UI
  await Promise.all(Array.from({ length: 10 }, (_, i) => loadFrame(i)));
  drawFrame(0);
  animateHeroIn();

  // Phase 2: rest in background
  for (let i = 10; i < FRAME_COUNT; i++) loadFrame(i);

  // Wait until fully loaded to hide loader
  await new Promise(resolve => {
    const poll = setInterval(() => {
      if (framesLoaded >= FRAME_COUNT) { clearInterval(poll); resolve(); }
    }, 200);
  });

  gsap.to(loader, {
    opacity: 0, duration: 0.6,
    onComplete: () => { loader.style.display = 'none'; }
  });
}

// ─── Hero Entrance ────────────────────────────────────────────
function animateHeroIn() {
  const words = hero.querySelectorAll('.hero-word');
  gsap.to(hero.querySelector('.hero-label'), {
    opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1
  });
  gsap.to(words, {
    opacity: 1, y: 0, stagger: 0.18, duration: 0.9, ease: 'power3.out', delay: 0.25
  });
  gsap.to(hero.querySelector('.hero-sub'), {
    opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.9
  });
  gsap.to(hero.querySelector('.scroll-hint'), {
    opacity: 1, duration: 0.8, delay: 1.6
  });
}

// ─── Hero fade-out on scroll ──────────────────────────────────
gsap.to(hero, {
  opacity: 0,
  scrollTrigger: {
    trigger: hero,
    start: 'center top',
    end: 'bottom top',
    scrub: true,
  }
});

// ─── Section State ────────────────────────────────────────────
sections.forEach(s => {
  s._enter  = parseFloat(s.dataset.enter) / 100;
  s._leave  = parseFloat(s.dataset.leave) / 100;
  s._anim   = s.dataset.animation;
  s._persist = s.dataset.persist === 'true';
  s._active = false;
  gsap.set(s, { opacity: 0 });
});

function buildTl(section) {
  const children = Array.from(section.querySelectorAll(
    '.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat, .result-pair'
  ));
  const tl = gsap.timeline({ paused: true });

  switch (section._anim) {
    case 'slide-left':
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-right':
      tl.from(children, { x:  80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'scale-up':
      tl.from(children, { scale: 0.87, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
      break;
    case 'stagger-up':
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.85, ease: 'power3.out' });
      break;
    case 'clip-reveal':
      tl.from(children, {
        clipPath: 'inset(100% 0 0 0)', opacity: 0,
        stagger: 0.15, duration: 1.2, ease: 'power4.inOut'
      });
      break;
    default:
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
  }
  return tl;
}

sections.forEach(s => { s._tl = buildTl(s); });

// ─── Counter Animations ───────────────────────────────────────
const statNumbers = Array.from(document.querySelectorAll('.stat-number'));
let countersRun = false;

function runCounters() {
  if (countersRun) return;
  countersRun = true;
  statNumbers.forEach(el => {
    const target = parseFloat(el.dataset.value);
    const proxy  = { val: 0 };
    gsap.to(proxy, {
      val: target,
      duration: 2,
      ease: 'power1.out',
      onUpdate() { el.textContent = Math.round(proxy.val); }
    });
  });
}

// ─── Marquee Scroll Animations ────────────────────────────────
function initMarquees() {
  [marquee1, marquee2].forEach(m => {
    if (!m) return;
    gsap.to(m.querySelector('.marquee-text'), {
      xPercent: -35,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollCont,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      }
    });
  });
}
initMarquees();

// ─── Main Scroll Engine ───────────────────────────────────────
ScrollTrigger.create({
  trigger: scrollCont,
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  onUpdate(self) {
    const p = self.progress;

    // — Frame playback (FRAME_SPEED accelerated) —
    const acc = Math.min(p * FRAME_SPEED, 1);
    const idx = Math.min(Math.floor(acc * FRAME_COUNT), FRAME_COUNT - 1);
    if (idx !== currentFrame) {
      currentFrame = idx;
      requestAnimationFrame(() => drawFrame(currentFrame));
    }

    // — Sections in/out —
    sections.forEach(s => {
      const wasActive = s._active;
      const isActive  = p >= s._enter && (s._persist || p < s._leave);
      s._active = isActive;

      if (isActive && !wasActive) {
        gsap.set(s, { opacity: 1 });
        s._tl.restart();
        if (s._persist) s.style.pointerEvents = 'auto';
        // Counters trigger with stats section
        if (s.classList.contains('section-stats')) runCounters();
      } else if (!isActive && wasActive && !s._persist) {
        gsap.to(s, { opacity: 0, duration: 0.45 });
      }
    });

    // — Dark overlay (enters just before stats, leaves after) —
    (() => {
      const enter = 0.53, leave = 0.71, fade = 0.04;
      let op = 0;
      if      (p >= enter - fade && p < enter) op = (p - (enter - fade)) / fade;
      else if (p >= enter && p <= leave)        op = 0.88;
      else if (p > leave && p <= leave + fade)  op = 0.88 * (1 - (p - leave) / fade);
      darkOverlay.style.opacity = op;
    })();

    // — Marquee 1 visibility (progress 0.15 → 0.50) —
    (() => {
      const s1 = 0.15, s2 = 0.20, e1 = 0.45, e2 = 0.50;
      let op = 0;
      if      (p >= s1 && p < s2) op = (p - s1) / (s2 - s1);
      else if (p >= s2 && p <= e1) op = 1;
      else if (p > e1 && p <= e2)  op = 1 - (p - e1) / (e2 - e1);
      marquee1.style.opacity = op;
    })();

    // — White overlay wipe (covers car, enters light-mode) —
    (() => {
      const enter = 0.73, full = 0.78;
      let op = 0;
      if      (p >= enter && p < full) op = (p - enter) / (full - enter);
      else if (p >= full)              op = 1;
      whiteOverlay.style.opacity = op;
    })();

    // — Marquee 2 visibility (progress 0.60 → 0.72, exits before white wipe) —
    (() => {
      const s1 = 0.60, s2 = 0.65, e1 = 0.68, e2 = 0.72;
      let op = 0;
      if      (p >= s1 && p < s2) op = (p - s1) / (s2 - s1);
      else if (p >= s2 && p <= e1) op = 1;
      else if (p > e1 && p <= e2)  op = 1 - (p - e1) / (e2 - e1);
      marquee2.style.opacity = op;
    })();

    // — Gallery horizontal pan (progress 0.79 → 0.91) —
    (() => {
      if (!resultsGrid || !galleryWrap) return;
      const gEnter = 0.79, gLeave = 0.91;
      if (p < gEnter || p > gLeave) return;
      const local   = (p - gEnter) / (gLeave - gEnter);
      const maxX    = Math.max(0, resultsGrid.offsetWidth - galleryWrap.offsetWidth);
      resultsGrid.style.transform = `translateX(-${local * maxX}px)`;
    })();
  }
});

// ─── Boot ─────────────────────────────────────────────────────
preload();
