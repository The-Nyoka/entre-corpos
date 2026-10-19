// tasteskill / base.js — the small amount of script the motion helpers in base.css need.
// Put this line in <head> so the hidden states only apply when scripting works:
//   <script>document.documentElement.classList.add('js')</script>
// Then load this file at the end of <body> (or with defer).

// Reveal once when an element enters the viewport. Never replays, never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
  targets.forEach((el) => io.observe(el));
  // safety net: if anything is still hidden a few seconds after load (observer never fired), show it
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// (Removido: o observador de capítulos do Taste. A cor do topo agora é calculada por geometria em js/site.js, bloco 1d,
//  porque o observador dependia da ordem em que as seções chegavam e errava depois de um salto grande de scroll.)
