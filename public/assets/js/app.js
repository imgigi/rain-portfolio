// Rain Shen — 艺术 + 传媒双栏目作品集
// 路由：
//   #/              首页 (intro + hero + Art/Media 引导)
//   #/art           美术总览（系列分组）
//   #/art/:idx      单个美术系列锚点
//   #/media         传媒总览（内部 tab：文章/视频/音频）
//   #/article/:idx  文章详情
//   #/about         关于我 / 联系方式

const app = document.getElementById("app");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const IMG_BASE = "https://img.ggjj.app";
function resolveImg(url) {
  if (!url) return "";
  if (url.startsWith("/api/image/")) return IMG_BASE + "/" + url.slice("/api/image/".length);
  return url;
}
function rimg(url, w) {
  const u = resolveImg(url);
  if (!u || !u.startsWith("http")) return u;
  return `/cdn-cgi/image/width=${w},format=auto,quality=85,fit=scale-down/${u}`;
}
function srcsetFor(url, widths) {
  return widths.map(w => `${rimg(url, w)} ${w}w`).join(", ");
}

const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
const SVG_PREV  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="14 5 7 12 14 19"/></svg>`;
const SVG_NEXT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="10 5 17 12 10 19"/></svg>`;
const SVG_DL    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 3v13"/><polyline points="7 11 12 16 17 11"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`;

let DATA = null;

async function boot() {
  const d = await fetch("/api/data", { cache: "no-store" }).then(r => r.json()).catch(() => ({}));
  DATA = d || {};
  const title = (DATA.header && DATA.header.siteName) || "Chenyu (Rain) Shen";
  document.title = title;
  window.addEventListener("hashchange", renderRoute);
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
  const c = raw.match(/^art\/(\d+)$/);
  if (c) return { name: "art", catIdx: Number(c[1]) };
  return { name: "home" };
}

function renderRoute() {
  const r = currentRoute();
  const sidebar = renderSidebar(r);
  let main = "";
  if (r.name === "home")      main = viewHome();
  else if (r.name === "art")  main = viewArt();
  else if (r.name === "media") main = viewMedia();
  else if (r.name === "article") main = viewArticle(r.idx);
  else if (r.name === "about") main = viewAbout();

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">${sidebar}</aside>
      <section class="content">${main}</section>
    </div>
    ${renderFooter()}
  `;

  // 入场动画 stagger
  const items = app.querySelectorAll(".jg__item, .about__block, .m-card, .home__block");
  items.forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i, 20) * 40}ms`;
  });

  initJustifiedGalleries();
  initLightboxTargets();
  initMediaTabs();

  if (r.name === "art" && typeof r.catIdx === "number") {
    const el = document.getElementById(`cat-${r.catIdx}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return;
    }
  }
  window.scrollTo(0, 0);
}

/* ---------- Sidebar ---------- */

function renderSidebar(r) {
  const brand = (DATA.header && DATA.header.siteName) || "Chenyu (Rain) Shen";
  const tagline = (DATA.header && DATA.header.tagline) || "";

  const cats = artCategories();
  const artSub = cats.map((c, i) => {
    const active = r.name === "art" && r.catIdx === i;
    const name = c.name || `Series ${i + 1}`;
    return `<a class="nav__sub${active ? " is-active" : ""}" href="#/art/${i}">
      <span class="nav__mark">—</span><span class="nav__text">${esc(name)}</span>
    </a>`;
  }).join("");

  const navItem = (href, label, active) => `
    <a class="nav__item${active ? " is-active" : ""}" href="${href}">
      <span class="nav__mark">—</span><span class="nav__text">${esc(label)}</span>
    </a>`;

  return `
    <a class="brand" href="#/">
      <span class="brand__name">${esc(brand)}</span>
      ${tagline ? `<span class="brand__tag">${esc(tagline)}</span>` : ""}
    </a>
    <nav class="nav">
      ${navItem("#/", "首页 · Home", r.name === "home")}
      <div class="nav__group">
        <a class="nav__item${r.name === "art" ? " is-active" : ""}" href="#/art">
          <span class="nav__mark">—</span><span class="nav__text">美术 · Art</span>
        </a>
        <div class="nav__sublist">${artSub || `<span class="nav__empty">（暂无系列）</span>`}</div>
      </div>
      ${navItem("#/media", "传媒 · Media", r.name === "media" || r.name === "article")}
      ${navItem("#/about", "关于 · About", r.name === "about")}
    </nav>
  `;
}

/* ---------- Footer ---------- */

function renderFooter() {
  const txt = (DATA.header && DATA.header.copyright) || "";
  if (!txt) return "";
  return `<footer class="site-footer">${esc(txt)}</footer>`;
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

/* ---------- Gallery (justified) ---------- */

function galleryBlockHtml(items, columns, startIdx) {
  const c = Math.max(1, Math.min(4, Number(columns) || 3));
  const good = (items || []).filter(x => x && x.url);
  if (!good.length) return "";
  let i = startIdx;
  const cells = good.map(it => {
    const idx = i++;
    const src = rimg(it.url, 1400);
    const srcset = srcsetFor(it.url, [600, 900, 1200, 1800]);
    const sizes = `(max-width: 640px) 100vw, (max-width: 900px) 50vw, ${Math.round(100 / c)}vw`;
    return `
      <figure class="jg__item" data-idx="${idx}" style="--aspect:1">
        <img src="${esc(src)}" srcset="${esc(srcset)}" sizes="${esc(sizes)}" alt="${esc(it.caption || "")}" loading="lazy" />
      </figure>`;
  }).join("");
  return `<div class="jg" data-cols="${c}">${cells}</div>`;
}

function effectiveCols(configured) {
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 900) return Math.min(configured, 2);
  return configured;
}

function initJustifiedGalleries() {
  app.querySelectorAll(".jg").forEach(container => {
    const configured = Math.max(1, Math.min(4, Number(container.dataset.cols) || 3));

    const imgs = Array.from(container.querySelectorAll("img"));
    imgs.forEach(img => {
      const setAspect = () => {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const fig = img.closest(".jg__item");
        if (fig) fig.style.setProperty("--aspect", (w / h).toFixed(4));
        layout();
      };
      if (img.complete && img.naturalWidth) setAspect();
      else img.addEventListener("load", setAspect, { once: true });
    });

    function layout() {
      const cols = effectiveCols(configured);
      container.dataset.effCols = cols;
      container.querySelectorAll(".jg__break").forEach(el => el.remove());
      const figs = Array.from(container.querySelectorAll(".jg__item"));
      figs.forEach(f => f.classList.remove("is-lastrow-short"));

      const total = figs.length;
      figs.forEach((fig, i) => {
        if ((i + 1) % cols === 0 && i + 1 !== total) {
          const br = document.createElement("div");
          br.className = "jg__break";
          fig.after(br);
        }
      });

      const lastRowCount = total % cols;
      const fullRows = Math.floor(total / cols);
      if (lastRowCount > 0 && fullRows > 0) {
        const firstRowH = figs[0].getBoundingClientRect().height;
        if (firstRowH > 0) {
          container.style.setProperty("--row-h", firstRowH + "px");
          for (let i = total - lastRowCount; i < total; i++) {
            figs[i].classList.add("is-lastrow-short");
          }
        }
      }
    }

    layout();
    let rafId = null;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(layout);
    };
    window.addEventListener("resize", onResize);
    container._jgCleanup = () => {
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  });
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

/* ---------- Views ---------- */

function viewHome() {
  const intro = DATA.intro || {};
  const heroItems = Array.isArray(intro.heroImages) ? intro.heroImages.filter(x => x && x.url) : [];
  const hero = heroItems.length
    ? `<div class="home__hero home__block">${heroItems.map((it, i) => `
        <figure class="home__hero-item" data-idx="${i}">
          <img src="${esc(rimg(it.url, 1200))}" srcset="${esc(srcsetFor(it.url, [600, 900, 1200, 1600]))}" sizes="(max-width: 720px) 100vw, 40vw" alt="${esc(it.caption || "")}" loading="lazy">
          ${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}
        </figure>`).join("")}</div>`
    : "";

  const paragraphs = String(intro.aboutParagraphs || "")
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  const aboutHtml = paragraphs.length
    ? `<div class="home__about home__block">${paragraphs.map(p =>
        `<p>${esc(p).replace(/\n/g, "<br>")}</p>`
      ).join("")}</div>`
    : "";

  const artCount = artCategories().reduce((n, c) => n + ((c.items || []).filter(x => x && x.url).length), 0);
  const mediaCount = mediaArticles().length + mediaVideos().length + mediaAudios().length;

  const nav = `
    <div class="home__nav home__block">
      <a class="home__tab" href="#/art">
        <div class="home__tab-head">
          <span class="home__tab-kicker">01</span>
          <span class="home__tab-title">美术 · Art</span>
        </div>
        <div class="home__tab-meta">${artCount} works · ${artCategories().length} series</div>
        <div class="home__tab-desc">Drawing · Photography · Mixed Media</div>
        <div class="home__tab-arrow">→</div>
      </a>
      <a class="home__tab" href="#/media">
        <div class="home__tab-head">
          <span class="home__tab-kicker">02</span>
          <span class="home__tab-title">传媒 · Media</span>
        </div>
        <div class="home__tab-meta">${mediaCount} pieces · Article · Video · Audio</div>
        <div class="home__tab-desc">Science Communication · AI, Misinformation, Trust</div>
        <div class="home__tab-arrow">→</div>
      </a>
    </div>`;

  return `
    <div class="page page--home">
      ${hero}
      ${aboutHtml}
      ${nav}
    </div>`;
}

function viewArt() {
  const cats = artCategories();
  const intro = (DATA.art && DATA.art.intro) || "";
  if (!cats.length) {
    return `<div class="page"><div class="empty">暂无作品，请到 <a href="/admin">/admin</a> 添加</div></div>`;
  }
  const introHtml = intro.trim() ? `<p class="page__lede">${esc(intro)}</p>` : "";

  let globalIdx = 0;
  const blocks = cats.map((cat, ci) => {
    const items = (cat.items || []).filter(x => x && x.url);
    if (!items.length) return "";
    const block = galleryBlockHtml(items, cat.columns || "3", globalIdx);
    globalIdx += items.length;
    const statusLabel = { past: "Past", upcoming: "Upcoming", ongoing: "Ongoing" }[cat.status] || "";
    return `
      <section class="art-cat" id="cat-${ci}" data-cat-idx="${ci}">
        <header class="art-cat__head">
          <div class="art-cat__titleline">
            ${statusLabel ? `<span class="art-cat__kicker">${esc(statusLabel)}</span>` : ""}
            <h2 class="art-cat__title">${esc(cat.name || `Series ${ci + 1}`)}</h2>
            <span class="art-cat__count">${items.length}</span>
          </div>
          ${cat.description ? `<p class="art-cat__desc">${esc(cat.description)}</p>` : ""}
        </header>
        ${block}
      </section>`;
  }).filter(Boolean).join("");

  return `
    <div class="page page--art">
      <h1 class="page__title">Art</h1>
      ${introHtml}
      ${blocks}
    </div>`;
}

const CAT_LABEL = {
  news_story: "News Story",
  research_highlight: "Research Highlight",
  misinformation_analysis: "Misinformation Analysis",
  interview: "Interview",
  essay: "Essay",
};

function viewMedia() {
  const intro = (DATA.media && DATA.media.intro) || "";
  const articles = mediaArticles();
  const videos = mediaVideos();
  const audios = mediaAudios();
  const introHtml = intro.trim() ? `<p class="page__lede">${esc(intro)}</p>` : "";

  const tabHead = `
    <div class="m-tabs" role="tablist">
      <button class="m-tab is-active" data-tab="articles" role="tab">文章 <span class="m-tab__n">${articles.length}</span></button>
      <button class="m-tab" data-tab="videos" role="tab">视频 <span class="m-tab__n">${videos.length}</span></button>
      <button class="m-tab" data-tab="audios" role="tab">音频 <span class="m-tab__n">${audios.length}</span></button>
    </div>`;

  const articlesPane = `
    <div class="m-pane is-active" data-pane="articles">
      ${articles.length ? articleCardsHtml(articles) : `<div class="empty">暂无文章</div>`}
    </div>`;
  const videosPane = `
    <div class="m-pane" data-pane="videos">
      ${videos.length ? videoCardsHtml(videos) : `<div class="empty">暂无视频</div>`}
    </div>`;
  const audiosPane = `
    <div class="m-pane" data-pane="audios">
      ${audios.length ? audioCardsHtml(audios) : `<div class="empty">暂无音频</div>`}
    </div>`;

  return `
    <div class="page page--media">
      <h1 class="page__title">Media</h1>
      ${introHtml}
      ${tabHead}
      ${articlesPane}${videosPane}${audiosPane}
    </div>`;
}

function articleCardsHtml(list) {
  return `<div class="m-list m-list--articles">${list.map((a, i) => {
    const cover = a.cover && a.cover.url;
    const catLabel = CAT_LABEL[a.category] || "";
    return `
      <a class="m-card m-card--article" href="#/article/${i}">
        ${cover ? `<div class="m-card__cover"><img src="${esc(rimg(cover, 800))}" alt="" loading="lazy"></div>` : `<div class="m-card__cover m-card__cover--empty">📰</div>`}
        <div class="m-card__body">
          ${catLabel ? `<div class="m-card__kicker">${esc(catLabel)}</div>` : ""}
          <h3 class="m-card__title">${esc(a.title || "Untitled")}</h3>
          ${a.subtitle ? `<div class="m-card__sub">${esc(a.subtitle)}</div>` : ""}
          ${a.excerpt ? `<p class="m-card__excerpt">${esc(a.excerpt)}</p>` : ""}
          <div class="m-card__meta">
            ${a.date ? `<time>${esc(a.date)}</time>` : `<time></time>`}
            <span class="m-card__more">阅读全文 →</span>
          </div>
        </div>
      </a>`;
  }).join("")}</div>`;
}

function videoCardsHtml(list) {
  return `<div class="m-list m-list--videos">${list.map(v => {
    const cover = v.cover && v.cover.url;
    const src = resolveVideoSrc(v.videoEmbed || "");
    const hasEmbed = !!src;
    const hasFile = v.videoFile && v.videoFile.url;
    const player = hasEmbed
      ? `<div class="m-card__video"><iframe src="${esc(src)}" allowfullscreen frameborder="0" scrolling="no"></iframe></div>`
      : hasFile
        ? `<div class="m-card__video"><video src="${esc(v.videoFile.url)}" ${cover ? `poster="${esc(cover)}"` : ""} controls playsinline preload="metadata"></video></div>`
        : cover
          ? `<div class="m-card__video"><img src="${esc(rimg(cover, 900))}" alt=""></div>`
          : `<div class="m-card__video m-card__video--empty">▶</div>`;
    return `
      <article class="m-card m-card--video">
        ${player}
        <div class="m-card__body">
          <h3 class="m-card__title">${esc(v.title || "Untitled")}</h3>
          ${v.description ? `<p class="m-card__excerpt">${esc(v.description)}</p>` : ""}
          ${v.date ? `<div class="m-card__meta"><time>${esc(v.date)}</time></div>` : ""}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function audioCardsHtml(list) {
  return `<div class="m-list m-list--audios">${list.map(a => {
    const cover = a.cover && a.cover.url;
    const hasFile = a.audioFile && a.audioFile.url;
    return `
      <article class="m-card m-card--audio">
        ${cover ? `<div class="m-card__cover"><img src="${esc(rimg(cover, 600))}" alt="" loading="lazy"></div>` : `<div class="m-card__cover m-card__cover--empty">♪</div>`}
        <div class="m-card__body">
          <h3 class="m-card__title">${esc(a.title || "Untitled")}</h3>
          ${a.description ? `<p class="m-card__excerpt">${esc(a.description)}</p>` : ""}
          ${hasFile ? `<audio controls preload="metadata" src="${esc(a.audioFile.url)}"></audio>` : `<div class="m-card__placeholder">（未上传音频文件）</div>`}
          ${a.date ? `<div class="m-card__meta"><time>${esc(a.date)}</time></div>` : ""}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function viewArticle(idx) {
  const list = mediaArticles();
  const a = list[idx];
  if (!a) {
    return `<div class="page"><div class="empty">文章不存在 · <a href="#/media">返回传媒</a></div></div>`;
  }
  const catLabel = CAT_LABEL[a.category] || "";
  const cover = a.cover && a.cover.url;
  const body = mdToHtml(a.body || "");
  const att = a.attachment;

  return `
    <div class="page page--article">
      <a class="article__back" href="#/media">← Media</a>
      ${cover ? `<div class="article__cover"><img src="${esc(rimg(cover, 1400))}" srcset="${esc(srcsetFor(cover, [800, 1200, 1800]))}" sizes="(max-width: 720px) 100vw, 900px" alt=""></div>` : ""}
      <header class="article__head">
        ${catLabel ? `<div class="article__kicker">${esc(catLabel)}</div>` : ""}
        <h1 class="article__title">${esc(a.title || "Untitled")}</h1>
        ${a.subtitle ? `<div class="article__sub">${esc(a.subtitle)}</div>` : ""}
        ${a.date ? `<time class="article__date">${esc(a.date)}</time>` : ""}
      </header>
      <div class="article__body">${body || `<p class="empty">（正文暂缺）</p>`}</div>
      ${att && att.url ? `
        <a class="article__attach" href="${esc(att.url)}" target="_blank" rel="noopener">
          ${SVG_DL}
          <span>下载原稿 <small>${esc(att.name || "")}</small></span>
        </a>` : ""}
    </div>`;
}

function viewAbout() {
  const ab = DATA.about || {};
  const photo = ab.photo && ab.photo.url ? ab.photo.url : "";
  const intro = DATA.intro || {};
  const paragraphs = String(intro.aboutParagraphs || "")
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  const bioHtml = paragraphs.length
    ? paragraphs.map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")
    : "";
  return `
    <div class="page page--about">
      ${photo ? `<div class="about__photo about__block"><img src="${esc(rimg(photo, 900))}" srcset="${esc(srcsetFor(photo, [600, 900, 1200]))}" sizes="(max-width: 768px) 100vw, 40vw" alt=""></div>` : ""}
      <div class="about__text">
        ${bioHtml ? `<div class="about__bio about__block">${bioHtml}</div>` : ""}
        <div class="about__contact about__block">
          ${ab.email ? `<div><strong>Email</strong> <a href="mailto:${esc(ab.email)}">${esc(ab.email)}</a></div>` : ""}
          ${ab.phone ? `<div><strong>Phone</strong> ${esc(ab.phone)}</div>` : ""}
          ${ab.location ? `<div><strong>Based in</strong> ${esc(ab.location)}</div>` : ""}
        </div>
        ${ab.footer ? `<div class="about__footer about__block">${esc(ab.footer)}</div>` : ""}
      </div>
    </div>`;
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

/* ---------- Lightbox ---------- */

function artItemsForLightbox() {
  const out = [];
  for (const cat of artCategories()) {
    for (const it of (cat.items || [])) {
      if (it && it.url) out.push(it);
    }
  }
  return out;
}

function initLightboxTargets() {
  const r = currentRoute();
  if (r.name === "art") {
    const items = artItemsForLightbox();
    app.querySelectorAll(".art-cat .jg__item").forEach(el => {
      el.addEventListener("click", () => openLightbox(items, Number(el.dataset.idx)));
    });
  } else if (r.name === "home") {
    const intro = DATA.intro || {};
    const heroes = (intro.heroImages || []).filter(x => x && x.url);
    app.querySelectorAll(".home__hero-item").forEach(el => {
      el.addEventListener("click", () => openLightbox(heroes, Number(el.dataset.idx)));
    });
  }
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
