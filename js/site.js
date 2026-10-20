// Entre Corpos — landing v0
// Tudo aqui é melhoria: sem JavaScript a página continua inteira e legível.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Pausa a troca lenta de mídia quando a aba está escondida
const syncHidden = () => document.documentElement.classList.toggle('is-hidden', document.hidden);
document.addEventListener('visibilitychange', syncHidden);
syncHidden();

// 1a. Pausa a troca de mídia do hero quando ele sai da tela (menos trabalho para a GPU durante o resto da rolagem)
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => document.documentElement.classList.toggle('hero-off', !e.isIntersecting)).observe(hero);
})();

// 1b. A marca "Entre Corpos": o movimento é todo em CSS (sticky + animação ligada ao scroll, ver css/site.css).
//     Aqui só se mede a escala final: tamanho dos links do topo / tamanho do título.
(() => {
  const title = document.querySelector(".hero__title");
  const nav = document.querySelector(".top__nav");
  if (!title || !nav) return;
  const set = () => {
    const big = parseFloat(getComputedStyle(title).fontSize);
    const small = parseFloat(getComputedStyle(nav).fontSize);
    if (big > 0 && small > 0) document.documentElement.style.setProperty("--brand-scale", (small / big).toFixed(4));
  };
  set();
  addEventListener("resize", set);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
})();

// 1d. Cor do topo (marca e links): vem da seção que está embaixo da linha do topo.
//     Cada seção marca a tinta que o topo deve usar em data-ink. Calculado pela geometria a cada rolagem (rAF), sem observador:
//     assim um salto grande de scroll (link do menu, tecla End) também acerta, e a ordem em que as seções chegam não importa.
(() => {
  const capitulos = [...document.querySelectorAll('[data-ink]')];
  if (!capitulos.length) return;
  const LINHA = 24;                         // y da tela onde se olha qual seção está passando (dentro da faixa do topo)
  let atual = null, pedido = false;
  const medir = () => {
    pedido = false;
    let tinta = null;
    for (const el of capitulos) {
      const r = el.getBoundingClientRect();
      if (r.top <= LINHA && r.bottom > LINHA) { tinta = el.dataset.ink; break; }
    }
    if (tinta && tinta !== atual) { atual = tinta; document.documentElement.style.setProperty('--header-ink', tinta); }
  };
  const agendar = () => { if (!pedido) { pedido = true; requestAnimationFrame(medir); } };
  addEventListener('scroll', agendar, { passive: true });
  addEventListener('resize', agendar);
  medir();
})();

// 1c. Links do topo ficam claros enquanto a imagem das perguntas passa embaixo deles.
//     A imagem fica só do lado direito (onde estão os links); a marca, à esquerda, segue sobre o ciano e continua escura.
//     Por isso é uma variável própria (--nav-ink) e não a --header-ink, que vale para a marca e para a seção.
(() => {
  const art = document.querySelector('.faq__tall');
  const nav = document.querySelector('.top__nav');
  if (!art || !nav || !('IntersectionObserver' in window)) return;
  let io;
  const observe = () => {
    if (io) io.disconnect();
    const faixa = Math.ceil(nav.getBoundingClientRect().bottom) + 2;           // da borda de cima até o fim dos links
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) document.documentElement.style.setProperty('--nav-ink', '#eef1ff');
        else document.documentElement.style.removeProperty('--nav-ink');
      }
    }, { rootMargin: `0px 0px ${-(innerHeight - faixa)}px 0px`, threshold: 0 });
    io.observe(art);
  };
  observe();
  addEventListener('resize', observe);
})();

// 2. Fila de momentos: botões + barra de progresso (transform apenas)
(() => {
  const track = document.querySelector('[data-track]');
  const fill = document.querySelector('[data-fill]');
  if (!track || !fill) return;
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  const step = () => {
    const first = track.querySelector('.moment');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };
  const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const seen = track.clientWidth / track.scrollWidth;
    const p = max > 0 ? track.scrollLeft / max : 1;
    fill.style.setProperty('--p', (seen + p * (1 - seen)).toFixed(4));
  };
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

// 3. A coisa viva: "Mova o corpo".
//    Seis pontos de rastreio (cabeça, mãos, quadril, pés). O avatar repete o movimento
//    em outras proporções e com um pequeno atraso: o mesmo gesto, outro corpo.
(() => {
  const svg = document.querySelector('.live__svg');
  if (!svg) return;
  const q = (s) => svg.querySelector(s);
  const dots = {};
  svg.querySelectorAll('[data-pt]').forEach((el) => { dots[el.dataset.pt] = el; });
  const keys = Object.keys(dots);
  const boPath = q('[data-bopath]'), avPath = q('[data-avpath]');
  const boHead = q('[data-bohead]'), avHead = q('[data-avhead]');

  const P = {};   // corpo (o que o visitante move)
  keys.forEach((k) => { P[k] = { x: +dots[k].getAttribute('cx'), y: +dots[k].getAttribute('cy') }; });
  const A = JSON.parse(JSON.stringify(P));   // avatar (posição atual, perseguindo o alvo)
  const home = JSON.parse(JSON.stringify(P));

  const AX = 660, SX = 1.16, SY = 0.94;   // o avatar: mais largo, um pouco mais baixo
  const target = (k) => ({ x: AX + (P[k].x - 220) * SX, y: 250 + (P[k].y - 250) * SY });
  const neck = (o) => ({ x: o.head.x + (o.hip.x - o.head.x) * 0.278, y: o.head.y + (o.hip.y - o.head.y) * 0.278 });
  const seg = (a, b) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  const limbs = (o) => { const n = neck(o); return [seg(n, o.hip), seg(n, o.handL), seg(n, o.handR), seg(o.hip, o.footL), seg(o.hip, o.footR)].join(' '); };

  const drawBody = () => {
    keys.forEach((k) => { dots[k].setAttribute('cx', P[k].x); dots[k].setAttribute('cy', P[k].y); });
    boPath.setAttribute('d', limbs(P));
    boHead.setAttribute('cx', P.head.x); boHead.setAttribute('cy', P.head.y);
  };
  const drawAvatar = () => {
    avPath.setAttribute('d', limbs(A));
    avHead.setAttribute('cx', A.head.x); avHead.setAttribute('cy', A.head.y);
  };

  let raf = 0;
  const chase = () => {
    let moving = false;
    for (const k of keys) {
      const t = target(k);
      const f = reduce ? 1 : 0.13;
      const dx = t.x - A[k].x, dy = t.y - A[k].y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) moving = true;
      A[k].x += dx * f; A[k].y += dy * f;
    }
    drawAvatar();
    raf = moving ? requestAnimationFrame(chase) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(chase); };

  const toSvg = (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const place = (k, x, y) => { P[k].x = clamp(x, 40, 400); P[k].y = clamp(y, 30, 424); drawBody(); kick(); };

  keys.forEach((k) => {
    const el = dots[k];
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const s = toSvg(e); place(k, s.x, s.y);
    });
    el.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] }[e.key];
      if (!d) return;
      e.preventDefault(); place(k, P[k].x + d[0], P[k].y + d[1]);
    });
  });

  // estado inicial coerente com o desenho estático do HTML
  keys.forEach((k) => { const t = target(k); A[k].x = t.x; A[k].y = t.y; });
  drawBody(); drawAvatar();
})();
