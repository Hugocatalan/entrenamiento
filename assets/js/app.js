// ===== Theme toggle =====
(function themeInit(){
  const root = document.documentElement;
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

  function setTheme(t){
    root.dataset.theme = t;
    localStorage.setItem("theme", t);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = (t === "dark") ? "☀️" : "🌙";
  }

  setTheme(saved || (prefersDark ? "dark" : "light"));

  document.addEventListener("click", (e) => {
    const el = e.target?.closest?.("#themeToggle");
    if (!el) return;
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });
})();

// ===== WhatsApp helpers =====
function waLink(phoneE164, message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${phoneE164}?text=${text}`;
}
function bindWhatsAppCTAs() {
  const phone = document.body.dataset.waPhone;
  if (!phone) return;

  document.querySelectorAll("[data-wa]").forEach((btn) => {
    const kind = btn.getAttribute("data-wa"); // athlete | box | generic
    let msg = "Hola Hugo, quiero info.";
    if (kind === "athlete") msg = "Hola Hugo, quiero planificación a distancia. Mi nivel es __ y entreno en __. Objetivo: __.";
    if (kind === "box") msg = "Hola Hugo, quiero coordinar una capacitación para mi box/gimnasio. Estamos en __. Cantidad de alumnos/staff: __.";
    btn.setAttribute("href", waLink(phone, msg));
  });
}

// ===== Blog listing =====
async function loadPosts() {
const base = window.location.pathname.includes("/blog/") ? "../" : "";
const res = await fetch(`${base}data/posts.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar posts.json");
  const posts = await res.json();

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function renderPostCard(post) {
  const tags = (post.tags || []).slice(0, 3).map(t => `<span class="badge">${escapeHtml(t)}</span>`).join(" ");
  const typeBadge = post.type === "curation" ? "Curación" : "Original";
  const source = post.type === "curation" && post.sourceUrl
    ? `<a class="badge" href="${post.sourceUrl}" target="_blank" rel="noopener">Fuente</a>`
    : "";

  // Importante: agrego "reveal" para que anime
  return `
    <article class="card reveal">
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
        <span class="badge">${typeBadge}</span>
        <span class="badge">${formatDateAR(post.date)}</span>
        ${source}
      </div>
      <h3 style="margin:0 0 8px;"><a href="${post.url}">${escapeHtml(post.title)}</a></h3>
      <p style="margin:0 0 12px; color: var(--muted);">${escapeHtml(post.excerpt || "")}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">${tags}</div>
    </article>
  `;
}

function formatDateAR(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1, d);
  return dt.toLocaleDateString("es-AR", { year:"numeric", month:"short", day:"2-digit" });
}

function escapeHtml(s="") {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function initBlogList() {
  const el = document.getElementById("blogList");
  if (!el) return;

  const posts = await loadPosts();

  const perPage = Number(el.dataset.perPage || "6");
  const page = Number(new URLSearchParams(location.search).get("page") || "1");
  const totalPages = Math.max(1, Math.ceil(posts.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const slice = posts.slice((safePage - 1) * perPage, safePage * perPage);
  el.innerHTML = `<div class="grid2">${slice.map(renderPostCard).join("")}</div>`;

  const pager = document.getElementById("blogPager");
  if (pager) pager.innerHTML = renderPager(safePage, totalPages);
}

function renderPager(page, total) {
  const prev = page > 1 ? `<a class="btn" href="?page=${page-1}">← Anterior</a>` : "";
  const next = page < total ? `<a class="btn" href="?page=${page+1}">Siguiente →</a>` : "";
  return `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-top:16px;">
      <div>${prev}</div>
      <div class="badge">Página ${page} / ${total}</div>
      <div>${next}</div>
    </div>
  `;
}

// ===== Reveal observer =====
let revealObserver;

function initRevealObserver() {
  if (revealObserver) return; // no lo recrees

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      const strongs = entry.target.querySelectorAll("strong");
strongs.forEach(s => s.classList.add("pop"));
strongs.forEach((s,i)=> s.style.transitionDelay = `${i*90}ms`);
      revealObserver.unobserve(entry.target); // perf: una vez visible, listo
    });
  }, { threshold: 0.12 });
}

function observeReveals(root = document) {
  initRevealObserver();
  root.querySelectorAll(".reveal").forEach((el) => {
    // evita re-observar lo que ya está visible
    if (!el.classList.contains("visible")) {
      revealObserver.observe(el);
    }
  });
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", async () => {
  bindWhatsAppCTAs();

// Accordion: solo un step abierto a la vez
document.querySelectorAll(".distance-steps").forEach((wrap) => {
  wrap.addEventListener("toggle", (e) => {
    const opened = e.target;
    if (!(opened instanceof HTMLDetailsElement)) return;
    if (!opened.open) return;

    wrap.querySelectorAll("details.step-acc").forEach((d) => {
      if (d !== opened) d.open = false;
    });
  }, true);
});
  // Observa reveals que ya existen en el HTML
  observeReveals(document);

  // Renderiza blog (si existe) y luego observa los reveals recién creados
  try {
    await initBlogList();
    observeReveals(document);
  } catch (e) {
    console.error(e);
  }
});
(function initTestimonialsCarousel(){
  const viewport = document.querySelector(".carousel-viewport");
  const track = document.querySelector(".carousel-track");
  const progress = document.getElementById("carProgress");
  if (!viewport || !track) return;

  // Config
  const SPEED_PX_PER_SEC = 45;      // autoplay speed
  const STEP_MULTIPLIER = 0.85;     // button step per card width

  let isPaused = false;
  let rafId = null;
  let lastTs = null;

  function halfWidth(){
    // Track contiene 2 sets (A + B). La mitad es un loop.
    return track.scrollWidth / 2;
  }

  function normalize(){
    const half = halfWidth();
    if (!half) return;
    if (viewport.scrollLeft >= half) viewport.scrollLeft -= half;
    if (viewport.scrollLeft < 0) viewport.scrollLeft += half;
  }

  function setProgress(){
    const half = halfWidth();
    if (!half || !progress) return;
    const t = (viewport.scrollLeft % half) / half; // 0..1
    progress.style.transform = `translateX(${t * 100}%)`;
  }

  function tick(ts){
    if (lastTs == null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    if (!isPaused){
      viewport.scrollLeft += SPEED_PX_PER_SEC * dt;
      normalize();
    }

    setProgress();
    rafId = requestAnimationFrame(tick);
  }

  function play(){
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  }

  function pause(){ isPaused = true; }
  function resume(){ isPaused = false; }

  // Pause on hover
  viewport.addEventListener("mouseenter", pause);
  viewport.addEventListener("mouseleave", resume);

  // Pause on focus/tap (mobile)
  viewport.addEventListener("focusin", pause);
  viewport.addEventListener("focusout", resume);

  // Buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".car-btn");
    if (!btn) return;

    const card = track.querySelector(".tcard");
    const step = card ? card.getBoundingClientRect().width * STEP_MULTIPLIER : 420;

    pause();
    if (btn.dataset.car === "next") viewport.scrollLeft += step;
    if (btn.dataset.car === "prev") viewport.scrollLeft -= step;

    normalize();
    setProgress();
    setTimeout(resume, 900);
  });

  // Reduced motion => no autoplay
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) {
    isPaused = true;
    setProgress();
  } else {
    play();
  }
})();
(function parallaxCards(){
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;

  document.querySelectorAll(".tcard").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;  // -0.5..0.5
      const y = (e.clientY - r.top) / r.height - 0.5;  // -0.5..0.5

      // Ajustá intensidad acá:
      const tx = (x * 8).toFixed(2) + "px";
      const ty = (y * 6).toFixed(2) + "px";

      card.style.setProperty("--tx", tx);
      card.style.setProperty("--ty", ty);
    });

    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--tx", "0px");
      card.style.setProperty("--ty", "0px");
    });
  });
})();
// ===== Count-up for authority numbers =====
function animateCount(el, target, duration = 2500) {
  const start = 0;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(start + (target - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target; // asegura el final exacto
  }

  requestAnimationFrame(update);
}

function initAuthorityCounters() {
  const section = document.querySelector(".authority");
  if (!section) return;

  const nums = section.querySelectorAll(".authority-num[data-target]");

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nums.forEach(el => {
          const target = parseInt(el.dataset.target, 10);
          if (!el.dataset.animated) {
            animateCount(el, target);
            el.dataset.animated = "true";
          }
        });
        obs.unobserve(section); // corre solo una vez
      }
    });
  }, { threshold: 0.4 });

  observer.observe(section);
}

document.addEventListener("DOMContentLoaded", initAuthorityCounters);