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
let testimonialsCarouselAPI = null;

function initTestimonialsCarousel() {
  const viewport = document.querySelector(".carousel-viewport");
  const track = document.querySelector(".carousel-track");
  const progress = document.getElementById("carProgress");

  if (!viewport || !track) return;
  if (track.dataset.ready === "true") return;

  const SPEED = 120; // antes 80, ahora más fluido y visible

  const originals = Array.from(track.querySelectorAll(".tcard"));
  if (!originals.length) return;

  // duplicar cards una sola vez
  originals.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  track.dataset.ready = "true";

  let paused = false;
  let rafId = null;
  let lastTs = null;
  let loopWidth = 0;

  function calculateLoopWidth() {
    const gap = parseFloat(getComputedStyle(track).gap || "0");
    const firstBatch = Array.from(track.querySelectorAll(".tcard")).slice(0, originals.length);

    loopWidth =
      firstBatch.reduce((acc, el) => acc + el.offsetWidth, 0) +
      gap * (firstBatch.length - 1);
  }

  function updateProgress() {
    if (!progress || !loopWidth) return;
    const t = (viewport.scrollLeft % loopWidth) / loopWidth;
    progress.style.transform = `translateX(${t * 100}%)`;
  }

  function normalize() {
    if (!loopWidth) return;

    if (viewport.scrollLeft >= loopWidth) {
      viewport.scrollLeft -= loopWidth;
    }

    if (viewport.scrollLeft < 0) {
      viewport.scrollLeft += loopWidth;
    }
  }

  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    if (!paused) {
      viewport.scrollLeft += SPEED * dt;
      normalize();
      updateProgress();
    }

    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (rafId) return;
    lastTs = null;
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
  }

  viewport.addEventListener("mouseenter", pause);
  viewport.addEventListener("mouseleave", resume);
  viewport.addEventListener("focusin", pause);
  viewport.addEventListener("focusout", resume);

  viewport.addEventListener(
    "touchstart",
    () => pause(),
    { passive: true }
  );

  viewport.addEventListener(
    "touchend",
    () => {
      setTimeout(resume, 700);
    },
    { passive: true }
  );

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".car-btn");
    if (!btn) return;

    const firstCard = track.querySelector(".tcard");
    const step = firstCard ? firstCard.offsetWidth * 0.85 : 420;

    pause();

    if (btn.dataset.car === "next") viewport.scrollLeft += step;
    if (btn.dataset.car === "prev") viewport.scrollLeft -= step;

    normalize();
    updateProgress();

    setTimeout(resume, 900);
  });

  // recalcular SOLO cuando hace falta
  window.addEventListener("resize", () => {
    calculateLoopWidth();
    updateProgress();
  });

  // esperar a que carguen imágenes antes de calcular
  const images = Array.from(track.querySelectorAll("img"));
  let loaded = 0;

  function startWhenReady() {
    loaded += 1;
    if (loaded !== images.length) return;

    calculateLoopWidth();
    updateProgress();
    play();
  }

  if (!images.length) {
    calculateLoopWidth();
    updateProgress();
    play();
  } else {
    images.forEach((img) => {
      if (img.complete) {
        startWhenReady();
      } else {
        img.addEventListener("load", startWhenReady, { once: true });
        img.addEventListener("error", startWhenReady, { once: true });
      }
    });
  }

  testimonialsCarouselAPI = { pause, resume, viewport, track };
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
document.addEventListener("DOMContentLoaded", () => {
  const authorityGrid = document.querySelector(".authority-grid");
  if (authorityGrid && window.innerWidth <= 600) {
    authorityGrid.scrollLeft = 0;
  }
});
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
// ===== Mobile hamburger menu =====
(function initMobileNav(){
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");

  if (!toggle || !nav) {
    console.warn("navToggle o siteNav no encontrado");
    return;
  }

  function closeMenu(){
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu(){
    nav.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.contains("is-open");
    if (isOpen) closeMenu();
    else openMenu();
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) closeMenu();
  });
})();
// ===== Expandir / contraer testimonios =====
(function initExpandableTestimonials() {
  const cards = document.querySelectorAll(".tcard");

  cards.forEach((card) => {
    const btn = card.querySelector(".tmore");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isExpanded = card.classList.contains("is-expanded");

      // cerrar las demás
      cards.forEach((c) => {
        c.classList.remove("is-expanded");
        const b = c.querySelector(".tmore");
        if (b) b.textContent = "Leer completo";
      });

      // abrir la seleccionada
      if (!isExpanded) {
        card.classList.add("is-expanded");
        btn.textContent = "Cerrar";
      }
    });
  });

  // cerrar al tocar fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tcard")) {
      cards.forEach((card) => {
        card.classList.remove("is-expanded");
        const btn = card.querySelector(".tmore");
        if (btn) btn.textContent = "Leer completo";
      });
    }
  });
})();
window.addEventListener("load", () => {
  initTestimonialsCarousel();
});