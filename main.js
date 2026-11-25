/* Metta Coffee case study — interactions & scroll animation */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Split text for word / letter animations ---------- */
  const headline = $('[data-scrub-words]');
  if (headline) {
    headline.innerHTML = headline.textContent.trim().split(/\s+/)
      .map(w => `<span class="w">${w}</span>`).join(' ');
  }
  const thanks = $('.thanks__word');
  if (thanks) {
    let n = 0;
    thanks.innerHTML = [...thanks.textContent].map(c =>
      c === ' ' ? ' ' : `<span class="ch" style="--n:${n++}">${c}</span>`).join('');
  }
  $$('.hero__word span').forEach((s, i) => (s.style.animationDelay = `${1.0 + i * 0.06}s`));

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = $$('.reveal, .reveal-clip, .title, .quote, .audience, .sitemap, .thanks');
  // clip-path hides an element from IntersectionObserver, so clipped items are
  // watched through a stand-in: their parent element.
  const proxyOf = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      (proxyOf.get(e.target) || [e.target]).forEach(el => {
        el.classList.add('in');
        if (el.matches('.sitemap')) drawSitemap();
      });
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealTargets.forEach(el => {
    if (el.matches('.reveal-clip')) {
      const host = el.parentElement;
      proxyOf.set(host, [...(proxyOf.get(host) || []), el]);
      io.observe(host);
    } else io.observe(el);
  });

  /* ---------- Section dots, progress, chapter pill ---------- */
  const sections = $$('[data-title]');
  const dots = $('.dots');
  sections.forEach(sec => {
    const a = document.createElement('a');
    a.href = `#${sec.id}`;
    a.setAttribute('aria-label', sec.dataset.title);
    a.innerHTML = `<span>${sec.dataset.title}</span>`;
    dots.appendChild(a);
  });
  const dotLinks = $$('a', dots);
  const bar = $('.progress span');
  const pill = $('.chapter-pill');
  const pillLabel = $('.chapter-pill__label');
  const keys = $('.keys');
  let current = -1;

  function currentIndex() {
    const line = innerHeight * 0.4;
    let idx = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) idx = i; });
    return idx;
  }

  function toneAt(y) {
    const el = document.elementFromPoint(innerWidth - 20, y);
    const band = el && el.closest('.band, .hero');
    return band && band.classList.contains('band--light') ? 'dark' : 'light';
  }

  function onScrollUI() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

    const idx = currentIndex();
    if (idx !== current) {
      current = idx;
      dotLinks.forEach((d, i) => d.classList.toggle('on', i === idx));
      const chapter = sections[idx].dataset.chapter;
      if (pillLabel.textContent !== chapter) {
        pillLabel.classList.add('swap');
        setTimeout(() => { pillLabel.textContent = chapter; pillLabel.classList.remove('swap'); }, 200);
      }
    }
    pill.classList.toggle('show', scrollY > innerHeight * 0.6);
    keys.classList.toggle('show', scrollY < innerHeight * 0.6);
    dots.dataset.tone = toneAt(innerHeight / 2);
  }

  /* ---------- Keyboard: ← → / PageUp PageDown jump between sections ---------- */
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if ($('.lightbox').open) return;
    let dir = 0;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') dir = 1;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') dir = -1;
    if (!dir) return;
    e.preventDefault();
    const idx = currentIndex();
    // if we're mid-way through a long section, "next" first goes to the next one; "prev" snaps to this one's top
    const top = sections[idx].getBoundingClientRect().top;
    let target = idx + dir;
    if (dir < 0 && top < -40) target = idx;
    target = clamp(target, 0, sections.length - 1);
    sections[target].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- Persona headline: words light up as you scroll ---------- */
  const words = headline ? $$('.w', headline) : [];
  function scrubWords() {
    if (!words.length) return;
    const r = headline.getBoundingClientRect();
    const start = innerHeight * 0.9, end = innerHeight * 0.35;
    const p = clamp((start - r.top) / (start - end), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < lit));
  }

  /* ---------- Sticky scroll-scrub: pages scroll inside device frames ---------- */
  const scrubs = $$('[data-scrub]').map(el => ({ el, imgs: $$('[data-scrub-img]', el) }));
  function scrubFrames() {
    scrubs.forEach(({ el, imgs }) => {
      const r = el.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = clamp(-r.top / total, 0, 1);
      // ease in/out a bit so it rests at top and bottom
      const eased = p < 0.08 ? 0 : p > 0.92 ? 1 : (p - 0.08) / 0.84;
      imgs.forEach(img => {
        const view = img.parentElement;
        const travel = Math.max(0, img.offsetHeight - view.clientHeight);
        img.style.transform = `translate3d(0, ${-travel * eased}px, 0)`;
      });
    });
  }

  /* ---------- Parallax ---------- */
  const parallax = $$('[data-parallax]');
  function doParallax() {
    parallax.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translate3d(0, ${p * -7}%, 0)`;
    });
    const hero = $('.hero__media');
    if (hero && scrollY < innerHeight) hero.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0)`;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScrollUI();
      scrubWords();
      if (!reduce) { scrubFrames(); doParallax(); } else { scrubFrames(); }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { onScroll(); drawSitemap(); });
  addEventListener('load', onScroll);
  onScroll();

  /* ---------- Persona card tilt ---------- */
  $$('[data-tilt]').forEach(card => {
    if (reduce) return;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transition = 'transform .1s';
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      $('img', card).style.transform = `translate(${x * -14}px, ${y * -10}px) scale(1.04)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1)';
      card.style.transform = '';
      $('img', card).style.transform = '';
    });
  });

  /* ---------- Current Site: click-to-play screen recordings ---------- */
  $$('[data-video]').forEach(box => {
    const video = $('video', box);
    const msg = $('.screen-video__msg', box);
    const showMissing = () => { msg.hidden = false; box.classList.remove('playing', 'paused'); };
    $$('source', video).pop().addEventListener('error', showMissing); // fires only once every format has failed
    video.addEventListener('error', showMissing);
    const toggle = () => {
      if (!msg.hidden) return;
      if (video.paused) {
        // pause any other recording that's playing
        $$('[data-video] video').forEach(v => { if (v !== video) v.pause(); });
        video.play().catch(showMissing);
      } else video.pause();
    };
    box.addEventListener('click', toggle);
    video.addEventListener('play', () => box.classList.add('playing'));
    video.addEventListener('pause', () => box.classList.add('paused'));
    video.addEventListener('playing', () => box.classList.remove('paused'));
    video.addEventListener('ended', () => { box.classList.remove('playing', 'paused'); video.currentTime = 0; video.load(); });
  });

  /* ---------- Competitor carousel ---------- */
  $$('[data-carousel]').forEach(car => {
    const track = $('.comp-track', car);
    const slides = $$('.comp-slide', car);
    const dotsEls = $$('.comp-dots button', car);
    const captions = $$('.comp-caption__item', car);
    const cards = $$('.insight[data-goto]');
    let index = 0;
    const go = i => {
      index = (i + slides.length) % slides.length;
      $$('video', car).forEach(v => v.pause());
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((s, n) => s.setAttribute('aria-hidden', n !== index));
      dotsEls.forEach((d, n) => d.setAttribute('aria-selected', n === index));
      captions.forEach((c, n) => c.classList.toggle('is-active', n === index));
      cards.forEach((c, n) => c.classList.toggle('is-active', n === index));
    };
    $('[data-prev]', car).addEventListener('click', () => go(index - 1));
    $('[data-next]', car).addEventListener('click', () => go(index + 1));
    dotsEls.forEach((d, n) => d.addEventListener('click', () => go(n)));
    cards.forEach(c => c.addEventListener('click', () => go(+c.dataset.goto)));
    // swipe on touch screens / trackpads
    let x0 = null, swiped = false;
    const stage = $('.comp-stage', car);
    stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
    stage.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { swiped = true; go(index + (dx < 0 ? 1 : -1)); }
    });
    // a swipe shouldn't also count as a click on the video
    stage.addEventListener('click', e => { if (swiped) { e.stopPropagation(); swiped = false; } }, true);
    go(0);
  });

  /* ---------- Moodboard lightbox ---------- */
  const lb = $('.lightbox');
  const lbImg = $('img', lb);
  $$('.mood__tile').forEach(t => t.addEventListener('click', () => {
    const img = $('img', t);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lb.showModal();
  }));
  $('.lightbox__close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* ---------- Typography: weight switcher + live preview ---------- */
  $$('.type-card').forEach(card => {
    const aa = $('.type-card__aa', card);
    const btns = $$('.type-card__weights button', card);
    const apply = b => {
      btns.forEach(x => x.classList.toggle('on', x === b));
      aa.style.fontWeight = b.dataset.w;
      aa.classList.remove('w-300', 'w-400', 'w-500', 'w-700');
      aa.classList.add(`w-${b.dataset.w}`);
      aa.classList.remove('bump'); void aa.offsetWidth; aa.classList.add('bump');
    };
    btns.forEach(b => b.addEventListener('click', () => apply(b)));
    const on = btns.find(b => b.classList.contains('on'));
    if (on) { aa.style.fontWeight = on.dataset.w; aa.classList.add(`w-${on.dataset.w}`); }
  });
  const tryInput = $('.type-try input');
  const samples = $$('.scale .s');
  tryInput && tryInput.addEventListener('input', () => {
    const v = tryInput.value.trim() || 'Coffee';
    samples.forEach(s => (s.textContent = v));
  });

  /* ---------- Color swatches: click to copy ---------- */
  const toast = $('.toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  }
  $$('.swatch').forEach(s => s.addEventListener('click', async () => {
    const hex = s.dataset.hex;
    try { await navigator.clipboard.writeText(hex); showToast(`Copied ${hex}`); }
    catch { showToast(hex); }
    s.classList.add('copied'); setTimeout(() => s.classList.remove('copied'), 1400);
  }));

  /* ---------- Site map connectors (SVG, drawn on reveal) ---------- */
  const map = $('[data-sitemap]');
  const svg = map && $('.sitemap__lines', map);
  const links = [
    ['home', 'nav'], ['home', 'makers'], ['home', 'cafe'],
    ['nav', 'beans'], ['nav', 'events'], ['nav', 'story'], ['nav', 'contact'],
  ];
  function drawSitemap() {
    if (!map) return;
    const box = { width: map.offsetWidth, height: map.offsetHeight };
    // Use layout positions (offsetLeft/Top), not getBoundingClientRect: the boxes are
    // mid pop-in animation (shifted + scaled) when this runs, which threw the lines off.
    const node = k => {
      const el = $(`[data-node="${k}"]`, map);
      let x = 0, y = 0, n = el;
      while (n && n !== map) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      const w = el.offsetWidth, h = el.offsetHeight;
      return { l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    };
    const home = node('home');
    const midY = Math.round(home.b + (node('nav').t - home.b) / 2);
    const o = 1; // overlap into each box's border so no background shows between line and box
    let html = '';
    links.forEach(([from, to], i) => {
      const a = node(from), b = node(to);
      let d;
      if (from === 'home') d = `M${a.cx},${a.b - o} V${midY} H${b.cx} V${b.t + o}`;
      else d = `M${a.cx},${a.b - o} V${b.cy} H${b.l + o}`;
      html += `<path d="${d}" data-from="${from}" data-to="${to}" style="--d:${(i < 3 ? 0.25 : 0.65) + i * 0.08}s"/>`;
    });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = html;
    $$('path', svg).forEach(p => p.style.setProperty('--len', p.getTotalLength()));
  }
  if (map) {
    drawSitemap();
    $$('.node', map).forEach(n => {
      const key = n.dataset.node;
      const chain = k => { // walk up to home
        const up = links.find(l => l[1] === k);
        return up ? [k, ...chain(up[0])] : [k];
      };
      n.addEventListener('pointerenter', () => {
        const path = chain(key);
        $$('path', svg).forEach(p => p.classList.toggle('hl', path.includes(p.dataset.to) && path.includes(p.dataset.from)));
        $$('.node', map).forEach(x => x.classList.toggle('hl', path.includes(x.dataset.node)));
      });
      n.addEventListener('pointerleave', () => {
        $$('path', svg).forEach(p => p.classList.remove('hl'));
        $$('.node', map).forEach(x => x.classList.remove('hl'));
      });
    });
  }
})();
