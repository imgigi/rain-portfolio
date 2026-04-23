// Rain Shen — 艺术 + 传媒双栏目作品集（对齐线上风格）
// 路由：
//   #/              首页：hero + about + 美术/传媒 入口 + contact
//   #/art           美术：exh-container 垂直流，3 种 layout
//   #/media         传媒：文章 / 视频 / 音频 tab
//   #/article/:idx  文章详情
//   #/about         可选：单独的 about 页

const app = document.getElementById("app");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const IMG_BASE = "https://img.ggjj.app";
// 本地 dev 下 wrangler 不实现 /cdn-cgi/image，直接用原 URL
const IS_LOCAL = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(location.host);

function resolveImg(url) {
  if (!url) return "";
  if (url.startsWith("/api/image/")) return IMG_BASE + "/" + url.slice("/api/image/".length);
  return url;
}
function rimg(url, w) {
  const u = resolveImg(url);
  if (!u || !u.startsWith("http")) return u;
  if (IS_LOCAL) return u;
  return `/cdn-cgi/image/width=${w},format=auto,quality=85,fit=scale-down/${u}`;
}
function srcsetFor(url, widths) {
  return widths.map(w => `${rimg(url, w)} ${w}w`).join(", ");
}

const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
const SVG_PREV  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="14 5 7 12 14 19"/></svg>`;
const SVG_NEXT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="10 5 17 12 10 19"/></svg>`;
const SVG_DL    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 3v13"/><polyline points="7 11 12 16 17 11"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`;

let DATA = null;

async function boot() {
  const d = await fetch("/api/data", { cache: "no-store" }).then(r => r.json()).catch(() => ({}));
  DATA = d || {};
  const title = (DATA.header && DATA.header.siteName) || "Chenyu (Rain) Shen";
  document.title = title;
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("scroll", handleHeaderScroll, { passive: true });
  renderRoute();
}

/* ---------- Route ---------- */

function currentRoute() {
  const raw = (location.hash || "").replace(/^#\/?/, "");
  if (!raw) return { name: "home" };
  if (raw === "art") return { name: "art" };
  if (raw === "media") return { name: "media" };
  if (raw === "about") return { name: "about" };
  const a = raw.match(/^article\/(\d+)$/);
  if (a) return { name: "article", idx: Number(a[1]) };
  return { name: "home" };
}

function renderRoute() {
  const r = currentRoute();
  let main = "";
  if (r.name === "home")        main = viewHome();
  else if (r.name === "art")    main = viewArt();
  else if (r.name === "media")  main = viewMedia();
  else if (r.name === "article") main = viewArticle(r.idx);
  else if (r.name === "about")  main = viewAbout();

  const headerHtml = renderHeader(r);
  const footerHtml = renderFooter();

  app.innerHTML = `${headerHtml}<main>${main}</main>${footerHtml}`;

  initMediaTabs();
  initLightboxTargets();
  initContrastDrag();
  handleHeaderScroll();
  window.scrollTo(0, 0);
}

/* ---------- Header ---------- */

function renderHeader(r) {
  const brand = (DATA.header && DATA.header.siteName) || "Chenyu (Rain) Shen";
  const navItem = (href, label, active) =>
    `<li><a href="${href}"${active ? ' class="is-active"' : ""}>${esc(label)}</a></li>`;

  return `
    <header class="site-header${r.name === "home" ? " is-over-hero" : ""}">
      <a class="logo" href="#/">${esc(brand)}</a>
      <nav class="site-nav">
        <ul>
          ${navItem("#/", "Home", r.name === "home")}
          ${navItem("#/art", "Art", r.name === "art")}
          ${navItem("#/media", "Media", r.name === "media" || r.name === "article")}
          ${navItem("#/about", "About", r.name === "about")}
        </ul>
      </nav>
    </header>`;
}

function handleHeaderScroll() {
  const hdr = document.querySelector("header.site-header");
  if (!hdr) return;
  const scrolled = window.scrollY > 20;
  hdr.classList.toggle("is-scrolled", scrolled);
  // home 页 hero 之下不再 over-hero
  if (hdr.classList.contains("is-over-hero") && scrolled) {
    hdr.classList.remove("is-over-hero");
  } else if (currentRoute().name === "home" && !scrolled) {
    hdr.classList.add("is-over-hero");
  }
}

/* ---------- Footer ---------- */

function renderFooter() {
  const copy = (DATA.header && DATA.header.copyright) || "© Chenyu Shen";
  const ab = DATA.about || {};
  return `
    <footer class="site-footer">
      <div class="site-footer__left">${esc(copy)}<span>·</span>All rights reserved</div>
      <div class="site-footer__right">
        ${ab.location ? esc(ab.location) : ""}
      </div>
    </footer>`;
}

/* ---------- Data accessors ---------- */

function artCategories() {
  return Array.isArray(DATA.art && DATA.art.categories) ? DATA.art.categories : [];
}
function mediaArticles() {
  return Array.isArray(DATA.media && DATA.media.articles) ? DATA.media.articles : [];
}
function mediaVideos() {
  return Array.isArray(DATA.media && DATA.media.videos) ? DATA.media.videos : [];
}
function mediaAudios() {
  return Array.isArray(DATA.media && DATA.media.audios) ? DATA.media.audios : [];
}

const CAT_LABEL = {
  news_story: "News Story",
  research_highlight: "Research Highlight",
  misinformation_analysis: "Misinformation Analysis",
  interview: "Interview Transcript",
  essay: "Essay",
};

const STATUS_LABEL = { past: "Past", upcoming: "Upcoming", ongoing: "Ongoing" };

/* ---------- Views · Home ---------- */

function viewHome() {
  const intro = DATA.intro || {};
  const ab = DATA.about || {};
  const brand = (DATA.header && DATA.header.siteName) || "Chenyu Rain Shen";
  const tagline = (DATA.header && DATA.header.tagline) || "Communicator & Artist";

  // Hero title 拆两行：先去括号，再按第一个空格切（对 "Chenyu (Rain) Shen" → "Chenyu" / "Rain Shen"）
  const cleanBrand = brand.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  const parts = cleanBrand.split(" ");
  const titleLine1 = parts[0] || brand;
  const titleLine2 = parts.slice(1).join(" ");

  const heroes = Array.isArray(intro.heroImages) ? intro.heroImages.filter(x => x && x.url) : [];
  const collageHtml = heroes.slice(0, 5).map((it, i) => `
    <img class="collage-img c-img-${i + 1}" src="${esc(rimg(it.url, 600))}" srcset="${esc(srcsetFor(it.url, [400, 600, 900]))}" sizes="22vw" alt="${esc(it.caption || "")}" data-idx="${i}" data-lbx="hero" loading="eager">
  `).join("");

  const paragraphs = String(intro.aboutParagraphs || "")
    .split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  // Home 页 about-text 只显示前 2 段（完整内容在 /#/about）
  const homeAboutParas = paragraphs.slice(0, 2).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const hasMore = paragraphs.length > 2;

  const photo = ab.photo && ab.photo.url ? ab.photo.url : "";
  const artCount = artCategories().reduce((n, c) => n + ((c.items || []).filter(x => x && x.url).length), 0);
  const artSeries = artCategories().length;
  const mediaCount = mediaArticles().length + mediaVideos().length + mediaAudios().length;

  return `
    <section class="hero-section">
      <div class="hero-text">
        <h1 class="hero-title">${esc(titleLine1)}<br>${esc(titleLine2)}</h1>
      </div>
      <div class="hero-collage">${collageHtml}</div>
      <div class="hero-subtitle">${esc(tagline)} <em>/</em> Science Communication &amp; Visual Practice</div>
    </section>

    <section class="about-section container">
      <div class="about-profile">
        ${photo ? `<div class="about-photo-wrapper"><img class="about-photo" src="${esc(rimg(photo, 900))}" srcset="${esc(srcsetFor(photo, [600, 900, 1200]))}" sizes="(max-width: 1024px) 90vw, 40vw" alt="${esc(ab.photo.alt || brand)}"></div>` : ""}
        <div class="about-info-name">${esc(brand)}</div>
        <div class="about-info-details">
          ${ab.email ? `<p><a href="mailto:${esc(ab.email)}">${esc(ab.email)}</a></p>` : ""}
          ${ab.phone ? `<p>${esc(ab.phone)}</p>` : ""}
          ${ab.location ? `<p>${esc(ab.location)}</p>` : ""}
        </div>
      </div>
      <h2 class="about-title">${esc(tagline)}</h2>
      <div class="about-text">
        ${homeAboutParas}
        ${hasMore ? `<p><a class="about-more" href="#/about">Read full bio →</a></p>` : ""}
      </div>
    </section>

    <section class="home-nav container">
      <h2 class="section-title">Explore</h2>
      <div class="home-nav-grid">
        <a class="home-nav-card" href="#/art">
          <span class="home-nav-num">01</span>
          <span class="home-nav-title">Art<small>${artCount} Works · ${artSeries} Series</small></span>
          <span class="home-nav-desc">Drawing, photography, and mixed media built around contrast, tension, pairing, transformation, and peace.</span>
          <span class="home-nav-arrow">→</span>
        </a>
        <a class="home-nav-card" href="#/media">
          <span class="home-nav-num">02</span>
          <span class="home-nav-title">Media<small>${mediaCount} Pieces · Article · Video · Audio</small></span>
          <span class="home-nav-desc">Science communication on AI-generated media, misinformation, deepfakes, and public trust.</span>
          <span class="home-nav-arrow">→</span>
        </a>
      </div>
    </section>

    <section class="contact-section container">
      <h2 class="section-title">Contact</h2>
      <div class="contact-block">
        Interested in conversation or collaboration — feel free to reach out.
        ${ab.email ? `<a class="contact-email" href="mailto:${esc(ab.email)}">${esc(ab.email)}</a>` : ""}
        <div class="contact-meta">
          ${ab.phone ? esc(ab.phone) : ""}${ab.phone && ab.location ? " · " : ""}${ab.location ? esc(ab.location) : ""}
        </div>
      </div>
    </section>`;
}

/* ---------- Views · Art ---------- */

function viewArt() {
  const cats = artCategories();
  const intro = (DATA.art && DATA.art.intro) || "";

  if (!cats.length) {
    return `<div class="container art-page"><h2 class="section-title">Art</h2><p>暂无作品。请到 <a href="/admin">/admin</a> 添加。</p></div>`;
  }

  let globalImgIdx = 0;
  const groups = cats.map((cat) => {
    const items = (cat.items || []).filter(x => x && x.url);
    if (!items.length) return "";
    const status = STATUS_LABEL[cat.status] || "";
    const layout = cat.layout || "stack";

    let gallery = "";
    if (layout === "slider") {
      const cells = items.map(it => {
        const i = globalImgIdx++;
        return `<div class="contrast-gallery-item" data-idx="${i}" data-lbx="art"><img src="${esc(rimg(it.url, 1000))}" alt="${esc(it.caption || "")}" loading="lazy"></div>`;
      }).join("");
      gallery = `
        <div class="contrast-gallery">
          <div class="contrast-gallery-container">${cells}</div>
        </div>
        <div class="exh-info">
          <div class="exh-title">${esc(cat.name)}</div>
          <div class="exh-meta"><span class="exh-num">${items.length} pieces</span></div>
        </div>`;
    } else if (layout === "columns") {
      // 三列分栏，stagger（第 2 / 5 列下移）
      const cols = items.map((it, i) => {
        const idx = globalImgIdx++;
        const staggerCls = i % 3 === 1 ? " stagger" : i % 3 === 2 ? " stagger-2" : "";
        return `
          <div class="photo-col${staggerCls}">
            <div class="photo-header"><span class="photo-num">${String(i + 1).padStart(2, "0")}</span></div>
            <div class="photo-img-box" data-idx="${idx}" data-lbx="art"><img src="${esc(rimg(it.url, 900))}" alt="${esc(it.caption || "")}" loading="lazy"></div>
            ${it.caption ? `<div class="photo-caption">${esc(it.caption)}</div>` : ""}
          </div>`;
      }).join("");
      gallery = `
        <div class="exh-info">
          <div class="exh-title">${esc(cat.name)}</div>
          <div class="exh-meta"><span class="exh-num">${items.length} pieces</span></div>
        </div>
        <div class="photo-showcase">${cols}</div>`;
    } else {
      // stack 默认：每张图独占一行，下方 info
      const stacks = items.map((it, i) => {
        const idx = globalImgIdx++;
        return `
          <div class="exh-item">
            <div class="exh-img-wrap" data-idx="${idx}" data-lbx="art">
              <img src="${esc(rimg(it.url, 1200))}" srcset="${esc(srcsetFor(it.url, [600, 900, 1200, 1800]))}" sizes="(max-width: 1024px) 60vw, 38vw" alt="${esc(it.caption || "")}" loading="lazy">
            </div>
            <div class="exh-info">
              <div class="exh-title">${esc(cat.name)} / ${String(i + 1).padStart(2, "0")}</div>
              <div class="exh-meta"><span class="exh-num">${esc(it.caption || "")}</span></div>
            </div>
          </div>`;
      }).join("");
      gallery = stacks;
    }

    return `
      <div class="exh-group">
        ${status ? `<div class="exh-label">${esc(status)}</div>` : ""}
        <div class="exh-item">
          <h3 class="exh-series-title">${esc(cat.name || "")}</h3>
          ${cat.description ? `<p class="exh-series-desc">${esc(cat.description)}</p>` : ""}
        </div>
        ${gallery}
      </div>`;
  }).filter(Boolean).join("");

  return `
    <div class="container art-page">
      <h2 class="section-title">Art</h2>
      ${intro ? `<p class="page-intro">${esc(intro)}</p>` : ""}
      <div class="exh-container">${groups}</div>
    </div>`;
}

/* ---------- Views · Media ---------- */

function viewMedia() {
  const intro = (DATA.media && DATA.media.intro) || "";
  const articles = mediaArticles();
  const videos = mediaVideos();
  const audios = mediaAudios();

  const articlesHtml = articles.length ? `<div class="m-list--articles">${articles.map((a, i) => {
    const catLabel = CAT_LABEL[a.category] || "";
    const excerpt = a.excerpt || "";
    return `
      <a class="m-art-item" href="#/article/${i}">
        <div class="m-art-item__meta">
          ${catLabel ? `<span class="m-art-item__kicker">${esc(catLabel)}</span>` : ""}
          ${a.date ? `<span class="m-art-item__date">${esc(a.date)}</span>` : ""}
        </div>
        <div class="m-art-item__divider"></div>
        <div class="m-art-item__body">
          <h3 class="m-art-item__title">${esc(a.title || "Untitled")}</h3>
          ${a.subtitle ? `<div class="m-art-item__sub">${esc(a.subtitle)}</div>` : ""}
          ${excerpt ? `<p class="m-art-item__excerpt">${esc(excerpt)}</p>` : ""}
          <span class="m-art-item__more">Read →</span>
        </div>
      </a>`;
  }).join("")}</div>` : `<p class="page-intro">暂无文章。</p>`;

  const videosHtml = videos.length ? `<div class="m-list--videos">${videos.map(v => {
    const cover = v.cover && v.cover.url;
    const embedSrc = resolveVideoSrc(v.videoEmbed || "");
    const fileUrl = v.videoFile && v.videoFile.url;
    const player = embedSrc
      ? `<div class="m-media-card__player"><iframe src="${esc(embedSrc)}" allowfullscreen frameborder="0" scrolling="no"></iframe></div>`
      : fileUrl
        ? `<div class="m-media-card__player"><video src="${esc(resolveImg(fileUrl))}" ${cover ? `poster="${esc(cover)}"` : ""} controls playsinline preload="metadata"></video></div>`
        : cover
          ? `<div class="m-media-card__player"><img src="${esc(rimg(cover, 1200))}" alt=""></div>`
          : `<div class="m-media-card__player m-media-card__player--empty">▶</div>`;
    return `
      <article class="m-media-card">
        ${player}
        <div class="m-media-card__info">
          <div>
            <h3 class="m-media-card__title">${esc(v.title || "Untitled")}</h3>
            ${v.description ? `<p class="m-media-card__desc">${esc(v.description)}</p>` : ""}
          </div>
          ${v.date ? `<span class="m-media-card__date">${esc(v.date)}</span>` : ""}
        </div>
      </article>`;
  }).join("")}</div>` : `<p class="page-intro">暂无视频。</p>`;

  const audiosHtml = audios.length ? `<div class="m-list--audios">${audios.map(a => {
    const cover = a.cover && a.cover.url;
    const fileUrl = a.audioFile && a.audioFile.url;
    return `
      <article class="m-media-card">
        <div class="m-media-card__player m-media-card__player--audio">
          <div class="cover">${cover ? `<img src="${esc(rimg(cover, 400))}" alt="">` : "♪"}</div>
          ${fileUrl
            ? `<audio controls preload="metadata" src="${esc(resolveImg(fileUrl))}"></audio>`
            : `<div style="color:#666;font-size:14px;">(未上传音频文件)</div>`}
        </div>
        <div class="m-media-card__info">
          <div>
            <h3 class="m-media-card__title">${esc(a.title || "Untitled")}</h3>
            ${a.description ? `<p class="m-media-card__desc">${esc(a.description)}</p>` : ""}
          </div>
          ${a.date ? `<span class="m-media-card__date">${esc(a.date)}</span>` : ""}
        </div>
      </article>`;
  }).join("")}</div>` : `<p class="page-intro">暂无音频。</p>`;

  return `
    <div class="container media-page">
      <h2 class="section-title">Media</h2>
      ${intro ? `<p class="page-intro">${esc(intro)}</p>` : ""}
      <div class="m-tabs" role="tablist">
        <button class="m-tab is-active" data-tab="articles">Articles<span class="m-tab__n">${articles.length}</span></button>
        <button class="m-tab" data-tab="videos">Videos<span class="m-tab__n">${videos.length}</span></button>
        <button class="m-tab" data-tab="audios">Audios<span class="m-tab__n">${audios.length}</span></button>
      </div>
      <div class="m-pane is-active" data-pane="articles">${articlesHtml}</div>
      <div class="m-pane" data-pane="videos">${videosHtml}</div>
      <div class="m-pane" data-pane="audios">${audiosHtml}</div>
    </div>`;
}

/* ---------- Views · Article detail ---------- */

function viewArticle(idx) {
  const list = mediaArticles();
  const a = list[idx];
  if (!a) {
    return `<div class="container article-page"><a class="article-back" href="#/media">← Media</a><p>文章不存在。</p></div>`;
  }
  const catLabel = CAT_LABEL[a.category] || "";
  const cover = a.cover && a.cover.url;
  const body = mdToHtml(a.body || "");
  const att = a.attachment;

  return `
    <article class="article-page">
      <a class="article-back" href="#/media">← Media / back</a>
      ${cover ? `<div class="article-cover"><img src="${esc(rimg(cover, 1600))}" srcset="${esc(srcsetFor(cover, [800, 1200, 1800]))}" sizes="(max-width: 760px) 100vw, 760px" alt=""></div>` : ""}
      ${catLabel ? `<div class="article-kicker">${esc(catLabel)}</div>` : ""}
      <h1 class="article-title">${esc(a.title || "Untitled")}</h1>
      ${a.subtitle ? `<div class="article-sub">${esc(a.subtitle)}</div>` : ""}
      ${a.date ? `<time class="article-date">${esc(a.date)}</time>` : ""}
      <div class="article-body">${body || `<p>(正文暂缺)</p>`}</div>
      ${att && att.url ? `
        <a class="article-attach" href="${esc(resolveImg(att.url))}" target="_blank" rel="noopener">
          ${SVG_DL}
          <span>Download — ${esc(att.name || "")}</span>
        </a>` : ""}
    </article>`;
}

/* ---------- Views · About (独立页，复用 home 的 about section) ---------- */

function viewAbout() {
  const intro = DATA.intro || {};
  const ab = DATA.about || {};
  const tagline = (DATA.header && DATA.header.tagline) || "Communicator & Artist";
  const brand = (DATA.header && DATA.header.siteName) || "Chenyu (Rain) Shen";

  const paragraphs = String(intro.aboutParagraphs || "")
    .split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const aboutParas = paragraphs.map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

  const photo = ab.photo && ab.photo.url ? ab.photo.url : "";

  return `
    <section class="about-section container" style="margin-top: 140px;">
      <div class="about-profile">
        ${photo ? `<div class="about-photo-wrapper"><img class="about-photo" src="${esc(rimg(photo, 900))}" srcset="${esc(srcsetFor(photo, [600, 900, 1200]))}" sizes="(max-width: 1024px) 90vw, 40vw" alt=""></div>` : ""}
        <div class="about-info-name">${esc(brand)}</div>
        <div class="about-info-details">
          ${ab.email ? `<p><a href="mailto:${esc(ab.email)}">${esc(ab.email)}</a></p>` : ""}
          ${ab.phone ? `<p>${esc(ab.phone)}</p>` : ""}
          ${ab.location ? `<p>${esc(ab.location)}</p>` : ""}
        </div>
      </div>
      <h2 class="about-title">${esc(tagline)}</h2>
      <div class="about-text">${aboutParas}</div>
    </section>`;
}

/* ---------- Markdown (mini) ---------- */

function mdToHtml(src) {
  if (!src) return "";
  const lines = String(src).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const lv = Math.min(4, h[1].length);
      out.push(`<h${lv + 1}>${inlineMd(h[2])}</h${lv + 1}>`);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${buf.map(inlineMd).join("<br>")}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map(t => `<li>${inlineMd(t)}</li>`).join("")}</ul>`);
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>\s?|[-*]\s)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${para.map(inlineMd).join("<br>")}</p>`);
  }
  return out.join("\n");
}
function inlineMd(s) {
  let x = esc(s);
  x = x.replace(/`([^`]+)`/g, "<code>$1</code>");
  x = x.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const safe = /^(https?:|mailto:|\/)/.test(url) ? url : "#";
    return `<a href="${safe}" target="_blank" rel="noopener">${txt}</a>`;
  });
  x = x.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  x = x.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return x;
}

/* ---------- Video embed resolver ---------- */

function resolveVideoSrc(input) {
  if (!input) return "";
  const s = String(input).trim();
  const ifMatch = s.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (ifMatch) return ifMatch[1];
  const yt = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const bv = s.match(/BV[A-Za-z0-9]{10}/);
  if (bv) {
    if (/aid=\d+/.test(s) && /cid=\d+/.test(s)) {
      const aid = s.match(/aid=(\d+)/)[1];
      const cid = s.match(/cid=(\d+)/)[1];
      return `https://player.bilibili.com/player.html?isOutside=true&aid=${aid}&bvid=${bv[0]}&cid=${cid}&p=1`;
    }
    return `https://player.bilibili.com/player.html?isOutside=true&bvid=${bv[0]}&high_quality=1&autoplay=0`;
  }
  if (/^https?:\/\//.test(s) || s.startsWith("//")) return s;
  return "";
}

/* ---------- Media tabs ---------- */

function initMediaTabs() {
  const tabs = app.querySelectorAll(".m-tab");
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const k = tab.dataset.tab;
      app.querySelectorAll(".m-tab").forEach(t => t.classList.toggle("is-active", t === tab));
      app.querySelectorAll(".m-pane").forEach(p => p.classList.toggle("is-active", p.dataset.pane === k));
    });
  });
}

/* ---------- Contrast gallery drag-to-scroll ---------- */

function initContrastDrag() {
  app.querySelectorAll(".contrast-gallery").forEach(el => {
    let down = false, startX = 0, startScroll = 0;
    el.addEventListener("mousedown", e => {
      down = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.style.cursor = "grabbing";
    });
    el.addEventListener("mouseup", () => { down = false; el.style.cursor = "grab"; });
    el.addEventListener("mouseleave", () => { down = false; el.style.cursor = "grab"; });
    el.addEventListener("mousemove", e => {
      if (!down) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    });
  });
}

/* ---------- Lightbox ---------- */

function initLightboxTargets() {
  // 所有带 data-lbx 的元素点击触发 lightbox
  // data-lbx="art" → 整个 Art 页展开所有图
  // data-lbx="hero" → home 页 hero collage 5 张
  app.querySelectorAll("[data-lbx]").forEach(el => {
    el.addEventListener("click", (e) => {
      // 防止 contrast-gallery 拖拽触发（拖动时 mouseup 可能被当 click，但实际 drag 不会 fire click）
      const kind = el.dataset.lbx;
      const idx = Number(el.dataset.idx);
      const items = collectLightboxItems(kind);
      if (items.length) openLightbox(items, idx);
    });
  });
}

function collectLightboxItems(kind) {
  if (kind === "art") {
    const out = [];
    for (const cat of artCategories()) {
      for (const it of (cat.items || [])) {
        if (it && it.url) out.push(it);
      }
    }
    return out;
  }
  if (kind === "hero") {
    const intro = DATA.intro || {};
    return (intro.heroImages || []).filter(x => x && x.url);
  }
  return [];
}

let activeLightbox = null;

function openLightbox(items, startIdx) {
  closeLightbox();
  items = (items || []).filter(x => x && x.url);
  if (!items.length) return;

  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `
    <button class="lightbox__close" aria-label="close">${SVG_CLOSE}</button>
    <div class="lightbox__main">
      <button class="lightbox__nav lightbox__nav--prev" aria-label="prev">${SVG_PREV}</button>
      <img class="lightbox__img" src="${esc(rimg(items[startIdx].url, 2400))}" alt="">
      <button class="lightbox__nav lightbox__nav--next" aria-label="next">${SVG_NEXT}</button>
    </div>
    <div class="lightbox__footer">
      <div class="lightbox__cap"></div>
      <div class="lightbox__count"></div>
    </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = "hidden";

  let idx = Math.max(0, Math.min(startIdx, items.length - 1));
  const imgEl = el.querySelector(".lightbox__img");
  const capEl = el.querySelector(".lightbox__cap");
  const countEl = el.querySelector(".lightbox__count");
  const prevBtn = el.querySelector(".lightbox__nav--prev");
  const nextBtn = el.querySelector(".lightbox__nav--next");

  const show = i => {
    idx = (i + items.length) % items.length;
    imgEl.classList.add("is-fading");
    setTimeout(() => {
      imgEl.src = rimg(items[idx].url, 2400);
      imgEl.classList.remove("is-fading");
    }, 120);
    capEl.textContent = items[idx].caption || "";
    countEl.textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : "";
    const single = items.length <= 1;
    prevBtn.toggleAttribute("disabled", single);
    nextBtn.toggleAttribute("disabled", single);
  };

  capEl.textContent = items[idx].caption || "";
  countEl.textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : "";
  const single = items.length <= 1;
  prevBtn.toggleAttribute("disabled", single);
  nextBtn.toggleAttribute("disabled", single);

  prevBtn.addEventListener("click", e => { e.stopPropagation(); show(idx - 1); });
  nextBtn.addEventListener("click", e => { e.stopPropagation(); show(idx + 1); });
  el.querySelector(".lightbox__close").addEventListener("click", closeLightbox);
  el.addEventListener("click", e => {
    if (e.target === el || e.target.classList.contains("lightbox__main")) closeLightbox();
  });

  const onKey = e => {
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
  };
  window.addEventListener("keydown", onKey);

  activeLightbox = { el, onKey };
}

function closeLightbox() {
  if (!activeLightbox) return;
  const { el, onKey } = activeLightbox;
  window.removeEventListener("keydown", onKey);
  el.remove();
  document.body.style.overflow = "";
  activeLightbox = null;
}

boot();
