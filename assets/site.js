/* ============================================================
   CONSID · Shared chrome JS — reveal-on-scroll, nav-stuck state,
   the rail/filter/grid factory (initRail), the CTA card's noise
   hover shader, and the lead-gen form handler. Loaded by every
   page under /viden/. index.html keeps its own copy of the reveal/
   nav/CTA-noise logic inline (predates this split) — the rail code
   there has been pointed at this same initRail factory so the
   Ydelser and Viden rails share one implementation.
   ============================================================ */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* widget.css/widget.js are NOT loaded up front (they blocked first
   paint on every page for a feature most visits never use) — fetched
   lazily on first click instead; the real href on [data-calendly] is
   the fallback if that load ever fails. */
const CALENDLY_URL = 'https://calendly.com/consid-dad?background_color=fdfcfb&text_color=141416&primary_color=90263b';
let calendlyLoad = null;
function loadCalendly() {
  if (!calendlyLoad) {
    calendlyLoad = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  return calendlyLoad;
}
document.querySelectorAll('[data-calendly]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    loadCalendly()
      .then(() => Calendly.initPopupWidget({ url: CALENDLY_URL }))
      .catch(() => { window.location.href = a.href; });
  });
});

/* Reveal-on-scroll — deferred to DOMContentLoaded rather than run
   inline: this script loads before some pages' own trailing inline
   <script> populates cards (initRail) with their own .reveal elements,
   and a one-time querySelectorAll here would run too early to see
   them. DOMContentLoaded fires only once every synchronous script on
   the page — including that later one — has finished. */
document.addEventListener('DOMContentLoaded', () => {
  if (!REDUCED) {
    const io = new IntersectionObserver(es => {
      es.forEach((en, i) => { if (en.isIntersecting) { setTimeout(() => en.target.classList.add('is-in'), i * 80); io.unobserve(en.target) } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .1 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
  }
});

/* Nav sticky state — plain pages flip to the blurred/dark-label look
   as soon as you scroll at all (scrollY > 12). The onDark variant
   (nav overlaid transparent on a plum header, e.g. Ydelse pages) needs
   to stay transparent for as long as the plum band is still behind it,
   not just past a fixed scroll distance — otherwise it flips to
   dark-on-dark the moment you nudge the page, before the plum has
   actually scrolled away. So for that variant, every scroll tick
   compares the header's own live rect against the nav's height: once
   the header's bottom edge has scrolled above where the nav ends,
   the plum is fully gone from behind it and the same data-stuck
   attribute flips. */
const navEl = document.getElementById('nav');
if (navEl) {
  const darkHead = navEl.classList.contains('nav--onDark') && document.querySelector('.ydelse__head');
  if (darkHead) {
    const onScroll = () => {
      const navHeight = navEl.getBoundingClientRect().height;
      navEl.dataset.stuck = String(darkHead.getBoundingClientRect().bottom <= navHeight);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
  } else {
    const onScroll = () => navEl.dataset.stuck = String(scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }
}

/* Rail / grid / filter factory — shared by the Ydelser rail, the
   homepage Viden rail, and the standalone Viden grid overview page.
   Passing prevBtn/nextBtn:null skips the arrow-scroll wiring entirely
   (the grid overview page has no rail to scroll). renderCard/matchFilter
   are passed in rather than hardcoded here, since OFFERINGS' lv:[...]
   multi-niveau membership and VIDEN's single lv-or-null field need
   different matching logic against the same filter chips. */
function initRail({ items, container, filtersEl, prevBtn, nextBtn, renderCard, matchFilter }) {
  container.innerHTML = items.map(renderCard).join('') + '<div class="rail__spacer" aria-hidden="true"></div>';

  // FLIP (First, Last, Invert, Play): hiding/showing a grid card is an
  // instant reflow — every other card that stays visible jumps straight
  // to its new position with no transition of its own, which is the
  // "glitchy" part. Record where the staying cards are BEFORE `mutate`
  // runs, then after the resulting layout has settled, invert that jump
  // with a transform and transition it back to zero — so the jump itself
  // becomes a smooth slide instead of a teleport.
  function withFlip(cards, mutate) {
    if (REDUCED) { mutate(); return; }
    const staying = cards.filter(c => !c.hidden);
    const first = new Map(staying.map(c => [c, c.getBoundingClientRect()]));
    mutate();
    requestAnimationFrame(() => {
      staying.forEach(c => {
        if (c.hidden) return; // just hidden by this mutation — its own leave animation covers it
        const f = first.get(c), l = c.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (!dx && !dy) return;
        c.style.transition = 'none';
        c.style.transform = `translate(${dx}px,${dy}px)`;
        requestAnimationFrame(() => {
          c.style.transition = 'transform var(--d-base) var(--ease-out)';
          c.style.transform = '';
          c.addEventListener('transitionend', () => { c.style.transition = ''; }, { once: true });
        });
      });
    });
  }

  // filtersEl/matchFilter are optional — a page can render a plain,
  // unfiltered rail/grid by omitting them.
  function applyFilter(f) {
    if (!filtersEl) return;
    filtersEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === f)));
    const cards = [...container.querySelectorAll('.ocard')];
    const leaving = [];
    // Cards that change visibility fade+scale rather than teleporting via
    // the bare [hidden] toggle — REDUCED skips straight to the end state.
    withFlip(cards, () => {
      cards.forEach((c, i) => {
        const show = matchFilter(items[i], f);
        if (show === !c.hidden) return;
        if (REDUCED) { c.hidden = !show; return; }
        if (show) {
          c.hidden = false;
          c.classList.add('is-entering');
          requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('is-entering')));
        } else {
          c.classList.add('is-leaving');
          leaving.push(c);
        }
      });
    });
    // The leaving cards' own hide happens 260ms later (their fade needs
    // to finish first) — that's a second reflow moment, so it gets its
    // own FLIP pass rather than reusing the one above.
    if (leaving.length && !REDUCED) {
      setTimeout(() => {
        withFlip(cards, () => leaving.forEach(c => { c.hidden = true; c.classList.remove('is-leaving'); }));
      }, 260);
    }
    if (prevBtn && nextBtn) container.scrollTo({ left: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  }
  if (filtersEl) filtersEl.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));

  if (prevBtn && nextBtn) {
    // Move by real, measured card positions — see index.html's own
    // copy of this comment for why a fixed step doesn't work.
    const visibleCards = () => [...container.querySelectorAll('.ocard')].filter(c => !c.hidden);
    const currentCardIndex = () => {
      const cards = visibleCards();
      const railLeft = container.getBoundingClientRect().left + parseFloat(getComputedStyle(container).paddingLeft);
      let idx = 0;
      cards.forEach((c, i) => { if (c.getBoundingClientRect().left < railLeft - 4) idx = i + 1 });
      return Math.min(idx, cards.length - 1);
    };
    const scrollToCardIndex = i => {
      const cards = visibleCards();
      const target = Math.max(0, Math.min(cards.length - 1, i));
      const card = cards[target];
      if (!card) return;
      const railRect = container.getBoundingClientRect();
      const delta = card.getBoundingClientRect().left - railRect.left - parseFloat(getComputedStyle(container).paddingLeft);
      container.scrollTo({ left: container.scrollLeft + delta, behavior: REDUCED ? 'auto' : 'smooth' });
    };
    nextBtn.addEventListener('click', () => scrollToCardIndex(currentCardIndex() + 1));
    prevBtn.addEventListener('click', () => scrollToCardIndex(currentCardIndex() - 1));
  }

  return { applyFilter };
}

/* CTA card noise reveal — ported from mohAmineBrs/codrops-noise-transition
   (a react-three-fiber shader material) to a plain WebGL2 fullscreen
   quad. Progress ramps in on hover and back out on leave; the render
   loop itself stops once fully faded, not just the visual. Verbatim
   copy of index.html's own version — it's a self-contained IIFE that
   queries `.ctacard`/`.ctacard__noise` directly, so it works unchanged
   against any page with exactly one CTA card. */
(function () {
  const card = document.querySelector('.ctacard');
  const canvas = document.querySelector('.ctacard__noise');
  if (!card || !canvas || REDUCED) return;
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) return;

  const css = getComputedStyle(document.documentElement);
  const tok = n => css.getPropertyValue(n).trim();
  const hexToRgb01 = h => { h = (h || '#ffffff').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255] };
  const NOISE_COLOR = hexToRgb01(tok('--coral') || '#F49E88');

  const VERT_SRC = `#version 300 es
  layout(location=0) in vec2 aPos;
  out vec2 vUv;
  void main(){ vUv=aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0); }`;

  const NOISE_GLSL = `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  vec4 fadeQ(vec4 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
  float cnoise(vec4 P){
    vec4 Pi0=floor(P); vec4 Pi1=Pi0+1.0;
    Pi0=mod(Pi0,289.0); Pi1=mod(Pi1,289.0);
    vec4 Pf0=fract(P); vec4 Pf1=Pf0-1.0;
    vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
    vec4 iy=vec4(Pi0.yy,Pi1.yy);
    vec4 iz0=vec4(Pi0.zzzz); vec4 iz1=vec4(Pi1.zzzz);
    vec4 iw0=vec4(Pi0.wwww); vec4 iw1=vec4(Pi1.wwww);
    vec4 ixy=permute(permute(ix)+iy);
    vec4 ixy0=permute(ixy+iz0); vec4 ixy1=permute(ixy+iz1);
    vec4 ixy00=permute(ixy0+iw0); vec4 ixy01=permute(ixy0+iw1);
    vec4 ixy10=permute(ixy1+iw0); vec4 ixy11=permute(ixy1+iw1);
    vec4 gx00=ixy00/7.0; vec4 gy00=floor(gx00)/7.0; vec4 gz00=floor(gy00)/6.0;
    gx00=fract(gx00)-0.5; gy00=fract(gy00)-0.5; gz00=fract(gz00)-0.5;
    vec4 gw00=vec4(0.75)-abs(gx00)-abs(gy00)-abs(gz00);
    vec4 sw00=step(gw00,vec4(0.0)); gx00-=sw00*(step(0.0,gx00)-0.5); gy00-=sw00*(step(0.0,gy00)-0.5);
    vec4 gx01=ixy01/7.0; vec4 gy01=floor(gx01)/7.0; vec4 gz01=floor(gy01)/6.0;
    gx01=fract(gx01)-0.5; gy01=fract(gy01)-0.5; gz01=fract(gz01)-0.5;
    vec4 gw01=vec4(0.75)-abs(gx01)-abs(gy01)-abs(gz01);
    vec4 sw01=step(gw01,vec4(0.0)); gx01-=sw01*(step(0.0,gx01)-0.5); gy01-=sw01*(step(0.0,gy01)-0.5);
    vec4 gx10=ixy10/7.0; vec4 gy10=floor(gx10)/7.0; vec4 gz10=floor(gy10)/6.0;
    gx10=fract(gx10)-0.5; gy10=fract(gy10)-0.5; gz10=fract(gz10)-0.5;
    vec4 gw10=vec4(0.75)-abs(gx10)-abs(gy10)-abs(gz10);
    vec4 sw10=step(gw10,vec4(0.0)); gx10-=sw10*(step(0.0,gx10)-0.5); gy10-=sw10*(step(0.0,gy10)-0.5);
    vec4 gx11=ixy11/7.0; vec4 gy11=floor(gx11)/7.0; vec4 gz11=floor(gy11)/6.0;
    gx11=fract(gx11)-0.5; gy11=fract(gy11)-0.5; gz11=fract(gz11)-0.5;
    vec4 gw11=vec4(0.75)-abs(gx11)-abs(gy11)-abs(gz11);
    vec4 sw11=step(gw11,vec4(0.0)); gx11-=sw11*(step(0.0,gx11)-0.5); gy11-=sw11*(step(0.0,gy11)-0.5);
    vec4 g0000=vec4(gx00.x,gy00.x,gz00.x,gw00.x); vec4 g1000=vec4(gx00.y,gy00.y,gz00.y,gw00.y);
    vec4 g0100=vec4(gx00.z,gy00.z,gz00.z,gw00.z); vec4 g1100=vec4(gx00.w,gy00.w,gz00.w,gw00.w);
    vec4 g0010=vec4(gx10.x,gy10.x,gz10.x,gw10.x); vec4 g1010=vec4(gx10.y,gy10.y,gz10.y,gw10.y);
    vec4 g0110=vec4(gx10.z,gy10.z,gz10.z,gw10.z); vec4 g1110=vec4(gx10.w,gy10.w,gz10.w,gw10.w);
    vec4 g0001=vec4(gx01.x,gy01.x,gz01.x,gw01.x); vec4 g1001=vec4(gx01.y,gy01.y,gz01.y,gw01.y);
    vec4 g0101=vec4(gx01.z,gy01.z,gz01.z,gw01.z); vec4 g1101=vec4(gx01.w,gy01.w,gz01.w,gw01.w);
    vec4 g0011=vec4(gx11.x,gy11.x,gz11.x,gw11.x); vec4 g1011=vec4(gx11.y,gy11.y,gz11.y,gw11.y);
    vec4 g0111=vec4(gx11.z,gy11.z,gz11.z,gw11.z); vec4 g1111=vec4(gx11.w,gy11.w,gz11.w,gw11.w);
    vec4 norm00=taylorInvSqrt(vec4(dot(g0000,g0000),dot(g0100,g0100),dot(g1000,g1000),dot(g1100,g1100)));
    g0000*=norm00.x; g0100*=norm00.y; g1000*=norm00.z; g1100*=norm00.w;
    vec4 norm01=taylorInvSqrt(vec4(dot(g0001,g0001),dot(g0101,g0101),dot(g1001,g1001),dot(g1101,g1101)));
    g0001*=norm01.x; g0101*=norm01.y; g1001*=norm01.z; g1101*=norm01.w;
    vec4 norm10=taylorInvSqrt(vec4(dot(g0010,g0010),dot(g0110,g0110),dot(g1010,g1010),dot(g1110,g1110)));
    g0010*=norm10.x; g0110*=norm10.y; g1010*=norm10.z; g1110*=norm10.w;
    vec4 norm11=taylorInvSqrt(vec4(dot(g0011,g0011),dot(g0111,g0111),dot(g1011,g1011),dot(g1111,g1111)));
    g0011*=norm11.x; g0111*=norm11.y; g1011*=norm11.z; g1111*=norm11.w;
    float n0000=dot(g0000,Pf0); float n1000=dot(g1000,vec4(Pf1.x,Pf0.yzw));
    float n0100=dot(g0100,vec4(Pf0.x,Pf1.y,Pf0.zw)); float n1100=dot(g1100,vec4(Pf1.xy,Pf0.zw));
    float n0010=dot(g0010,vec4(Pf0.xy,Pf1.z,Pf0.w)); float n1010=dot(g1010,vec4(Pf1.x,Pf0.y,Pf1.z,Pf0.w));
    float n0110=dot(g0110,vec4(Pf0.x,Pf1.yz,Pf0.w)); float n1110=dot(g1110,vec4(Pf1.xyz,Pf0.w));
    float n0001=dot(g0001,vec4(Pf0.xyz,Pf1.w)); float n1001=dot(g1001,vec4(Pf1.x,Pf0.yz,Pf1.w));
    float n0101=dot(g0101,vec4(Pf0.x,Pf1.y,Pf0.z,Pf1.w)); float n1101=dot(g1101,vec4(Pf1.xy,Pf0.z,Pf1.w));
    float n0011=dot(g0011,vec4(Pf0.xy,Pf1.zw)); float n1011=dot(g1011,vec4(Pf1.x,Pf0.y,Pf1.zw));
    float n0111=dot(g0111,vec4(Pf0.x,Pf1.yzw)); float n1111=dot(g1111,Pf1);
    vec4 fadeXYZW=fadeQ(Pf0);
    vec4 n_0w=mix(vec4(n0000,n1000,n0100,n1100),vec4(n0001,n1001,n0101,n1101),fadeXYZW.w);
    vec4 n_1w=mix(vec4(n0010,n1010,n0110,n1110),vec4(n0011,n1011,n0111,n1111),fadeXYZW.w);
    vec4 n_zw=mix(n_0w,n_1w,fadeXYZW.z);
    vec2 n_yzw=mix(n_zw.xy,n_zw.zw,fadeXYZW.y);
    float n_xyzw=mix(n_yzw.x,n_yzw.y,fadeXYZW.x);
    return 2.2*n_xyzw;
  }`;

  const DITHER_GRID = 2;
  const BAYER_GLSL = `
  bool ditherOn(float brightness,vec2 cell){
    if(brightness>16.0/17.0)return false;
    if(brightness<1.0/17.0)return true;
    vec2 p=mod(cell,4.0);
    int x=int(p.x); int y=int(p.y);
    if(x==0){
      if(y==0)return brightness<16.0/17.0;
      if(y==1)return brightness<5.0/17.0;
      if(y==2)return brightness<13.0/17.0;
      return brightness<1.0/17.0;
    }else if(x==1){
      if(y==0)return brightness<8.0/17.0;
      if(y==1)return brightness<12.0/17.0;
      if(y==2)return brightness<4.0/17.0;
      return brightness<9.0/17.0;
    }else if(x==2){
      if(y==0)return brightness<14.0/17.0;
      if(y==1)return brightness<2.0/17.0;
      if(y==2)return brightness<15.0/17.0;
      return brightness<3.0/17.0;
    }else{
      if(y==0)return brightness<6.0/17.0;
      if(y==1)return brightness<10.0/17.0;
      if(y==2)return brightness<7.0/17.0;
      return brightness<11.0/17.0;
    }
  }`;

  const FRAG_SRC = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform float u_time,u_progress,u_aspect,u_gridSize;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  out vec4 fragColor;
  ${NOISE_GLSL}
  ${BAYER_GLSL}
  void main(){
    vec2 newUv=(vUv-vec2(0.5))*vec2(u_aspect,1.0);
    float dist=length(newUv);
    float density=1.8-dist;
    float n=cnoise(vec4(newUv*40.0*density,u_time,1.0));
    float grain=fract(sin(dot(vUv,vec2(12.9898,78.233)*2000.0))*43758.5453);
    float facets=n*2.0;
    float dots=smoothstep(0.1,0.15,n);
    float m=step(0.2,facets)*dots;
    m=1.0-m;
    float radius=u_aspect*0.55;
    float outerProgress=clamp(1.1*u_progress,0.0,1.0);
    float innerProgress=clamp(1.1*u_progress-0.05,0.0,1.0);
    float innerCircle=1.0-smoothstep((innerProgress-0.4)*radius,innerProgress*radius,dist);
    float outerCircle=1.0-smoothstep((outerProgress-0.1)*radius,innerProgress*radius,dist);
    float displacement=clamp(outerCircle-innerCircle,0.0,1.0);
    float grainStrength=0.3;
    float shade=clamp(displacement-(m+n)-grain*grainStrength,0.0,1.0);
    float intensity=clamp(shade*displacement*u_progress*1.35,0.0,1.0);
    vec2 cell=floor((vUv*u_resolution)/u_gridSize);
    fragColor=ditherOn(1.0-intensity,cell)?vec4(u_color,1.0):vec4(0.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT_SRC), fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return }

  const quad = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const U = {};
  ['u_time', 'u_progress', 'u_aspect', 'u_color', 'u_gridSize', 'u_resolution'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let w = 0, h = 0, dpr = 1;
  function resize() {
    const r = card.getBoundingClientRect();
    w = r.width; h = r.height; dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  let progress = 0, target = 0, running = false, raf = null, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    progress += (target - progress) * 0.08;
    if (target === 0 && progress < 0.002) {
      progress = 0; running = false;
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform1f(U.u_time, t);
    gl.uniform1f(U.u_progress, progress);
    gl.uniform1f(U.u_aspect, w / Math.max(1, h));
    gl.uniform3fv(U.u_color, NOISE_COLOR);
    gl.uniform1f(U.u_gridSize, DITHER_GRID * dpr);
    gl.uniform2f(U.u_resolution, canvas.width, canvas.height);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame) }

  resize();
  new ResizeObserver(resize).observe(card);
  card.addEventListener('mouseenter', () => { target = 1; start() });
  card.addEventListener('mouseleave', () => { target = 0; start() });
})();

/* Lead-gen form — Formspree AJAX submit. No-ops on pages without a
   #leadform. */
const leadform = document.getElementById('leadform');
if (leadform) {
  const status = document.getElementById('lf-status');
  // Fades the status message in regardless of outcome; on success the
  // form fades out first and only then swaps — the one true conversion
  // moment on the site deserves more than a hard cut.
  const showStatus = text => {
    status.textContent = text;
    status.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => status.classList.add('is-in')));
  };
  leadform.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = leadform.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch(leadform.action, {
        method: 'POST',
        body: new FormData(leadform),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const finish = () => { leadform.hidden = true; showStatus('Tak! Vi sender playbooket, så snart det er klar.'); };
        if (REDUCED) { finish(); } else { leadform.classList.add('is-leaving'); setTimeout(finish, 260); }
      } else {
        showStatus('Noget gik galt — prøv igen, eller skriv til os direkte.');
        submitBtn.disabled = false;
      }
    } catch {
      showStatus('Noget gik galt — prøv igen, eller skriv til os direkte.');
      submitBtn.disabled = false;
    }
  });
}
