/**
 * FootFlix – Netflix for Football Matches
 * app.js – Dynamic UI rendering and interactions
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let matchData = null;
let currentMatch = null;

// ─── DOM Helpers ─────────────────────────────────────────────────────────────

/** @param {string} sel @param {Element} [ctx] */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
/** @param {string} sel @param {Element} [ctx] */
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMatches();
  initNavbar();
  initModal();
  initSearch();
});

// ─── Load Data ────────────────────────────────────────────────────────────────
async function loadMatches() {
  try {
    const res = await fetch('matches.json');
    if (!res.ok) throw new Error('Failed to load match data');
    matchData = await res.json();
    renderAll();
  } catch (err) {
    console.error('Error loading match data:', err);
    showError();
  }
}

function renderAll() {
  renderHero(matchData.featured);
  renderCategories(matchData.categories);
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function renderHero(match) {
  const hero = $('#hero');
  if (!hero || !match) return;

  const tagHtml = (match.tags || [])
    .map(t => `<span class="tag ${t === 'Live' ? 'tag--highlight' : ''}">${t}</span>`)
    .join('');

  const statusIcon = match.status === 'live' ? '🔴' : '📅';
  const statusLabel = match.status === 'live'
    ? `<span class="pulse"></span> LIVE NOW`
    : `UPCOMING · ${formatDate(match.date)} ${match.time}`;

  hero.innerHTML = `
    <div class="hero__bg">
      <img src="${match.thumbnail}" alt="${match.title}" loading="eager">
    </div>
    <div class="hero__content">
      <div class="hero__badge">${statusLabel}</div>
      <h1 class="hero__title">${match.title}</h1>
      ${match.teams ? `<p class="hero__teams">${match.teams}</p>` : ''}
      <div class="hero__meta">
        <span>⚽ ${match.league}</span>
        <span>📅 ${formatDate(match.date)}</span>
        <span>🕐 ${match.time}</span>
      </div>
      <p class="hero__desc">${match.description || ''}</p>
      <div class="hero__buttons">
        <button class="btn btn--primary" onclick="openMatch('${match.id}', 'featured')">
          ▶ Watch Now
        </button>
        <button class="btn btn--secondary" onclick="openMatch('${match.id}', 'featured')">
          ℹ More Info
        </button>
      </div>
    </div>
  `;
}

// ─── Categories / Rows ───────────────────────────────────────────────────────
function renderCategories(categories) {
  const container = $('#categories-container');
  if (!container) return;

  container.innerHTML = categories.map(cat => renderRow(cat)).join('');

  // Attach arrow listeners after render
  $$('.row__arrow').forEach(btn => {
    btn.addEventListener('click', onArrowClick);
  });
}

function renderRow(category) {
  const cardsHtml = category.matches.map(match => renderCard(match)).join('');
  return `
    <section class="row" data-category="${category.title}">
      <h2 class="row__title">${category.title}</h2>
      <div class="row__slider">
        <button class="row__arrow row__arrow--prev" aria-label="Scroll left">&#8249;</button>
        <div class="row__track">${cardsHtml}</div>
        <button class="row__arrow row__arrow--next" aria-label="Scroll right">&#8250;</button>
      </div>
    </section>
  `;
}

function renderCard(match) {
  const statusClass = `card__status--${match.status}`;
  const statusLabel = match.status === 'live'
    ? 'Live'
    : match.status === 'replay'
    ? 'Replay'
    : 'Upcoming';

  const scoreHtml = match.score
    ? `<div class="card__score">${match.score}</div>`
    : '';
  const minuteHtml = match.minute
    ? `<div class="card__minute">${match.minute}</div>`
    : '';

  const tagsHtml = (match.tags || [])
    .map(t => `<span class="tag ${t === 'Live' ? 'tag--highlight' : ''}">${t}</span>`)
    .join('');

  const cardTitle = match.teams || match.title;

  return `
    <article class="card" role="button" tabindex="0"
      aria-label="${cardTitle}"
      onclick="openMatch('${match.id}', '${match.status}')"
      onkeydown="if(event.key==='Enter') openMatch('${match.id}','${match.status}')">
      <div class="card__thumb">
        <img src="${match.thumbnail}" alt="${cardTitle}" loading="lazy">
        <div class="card__thumb-overlay"></div>
        <span class="card__status ${statusClass}">${statusLabel}</span>
        ${scoreHtml}
        ${minuteHtml}
      </div>
      <div class="card__info">
        <div class="card__title">${cardTitle}</div>
        <div class="card__meta">
          <span>${match.league}</span>
          <span class="card__meta-dot"></span>
          <span>${formatDate(match.date)}</span>
        </div>
      </div>
      <div class="card__expand">
        <div class="card__expand-actions">
          <button class="icon-btn icon-btn--play" title="Watch" onclick="event.stopPropagation(); openMatch('${match.id}','${match.status}')">▶</button>
          <button class="icon-btn" title="Add to My List" onclick="event.stopPropagation(); toggleMyList('${match.id}', this)">＋</button>
          <button class="icon-btn" title="Like" onclick="event.stopPropagation();">👍</button>
        </div>
        <div class="card__expand-tags">${tagsHtml}</div>
      </div>
    </article>
  `;
}

// ─── Arrow Scroll ─────────────────────────────────────────────────────────────
function onArrowClick(e) {
  const btn = e.currentTarget;
  const track = btn.closest('.row__slider').querySelector('.row__track');
  const scrollAmt = track.clientWidth * 0.75;
  if (btn.classList.contains('row__arrow--next')) {
    track.scrollLeft += scrollAmt;
  } else {
    track.scrollLeft -= scrollAmt;
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function initModal() {
  const overlay = $('#modal-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function openMatch(id, category) {
  if (!matchData) return;

  // Find match in data
  let match = null;
  if (matchData.featured.id === id) {
    match = matchData.featured;
  } else {
    for (const cat of matchData.categories) {
      match = cat.matches.find(m => m.id === id);
      if (match) break;
    }
  }

  if (!match) return;
  currentMatch = match;
  renderModal(match);

  const overlay = $('#modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = $('#modal-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  currentMatch = null;
}

function renderModal(match) {
  const modal = $('#modal');
  if (!modal) return;

  const statusLabel = match.status === 'live'
    ? `<span style="color:var(--red)">🔴 LIVE · ${match.minute || ''}</span>`
    : match.status === 'replay'
    ? '🎬 Replay Available'
    : `📅 Upcoming · ${formatDate(match.date)} ${match.time}`;

  const scoreSection = match.score
    ? `<div class="modal__score">${match.score}</div>`
    : '';

  const cardTitle = match.teams || match.title;

  const primaryBtnLabel = match.status === 'upcoming'
    ? '🔔 Set Reminder'
    : '▶ Watch Now';

  modal.innerHTML = `
    <div class="modal__hero">
      <img src="${match.thumbnail}" alt="${cardTitle}">
      <div class="modal__hero-overlay"></div>
      <button class="modal__close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <div class="modal__body">
      <p class="modal__teams">${statusLabel}</p>
      <h2 class="modal__title">${cardTitle}</h2>
      ${scoreSection}
      <div class="modal__meta">
        <span>⚽ ${match.league}</span>
        <span>📅 ${formatDate(match.date)}</span>
        <span>🕐 ${match.time}</span>
      </div>
      <p class="modal__desc">${match.description || 'Full match coverage with live commentary, stats, and highlights.'}</p>
      <div class="modal__actions">
        <button class="btn btn--primary" onclick="handleWatch()">
          ${primaryBtnLabel}
        </button>
        <button class="btn btn--secondary" onclick="toggleMyList('${match.id}', this)">
          ＋ My List
        </button>
        <button class="btn btn--outline" onclick="closeModal()">
          ✕ Close
        </button>
      </div>
    </div>
  `;
}

function handleWatch() {
  if (!currentMatch) return;
  const msg = currentMatch.status === 'upcoming'
    ? `🔔 Reminder set for ${currentMatch.teams || currentMatch.title}!`
    : `▶ Launching stream for ${currentMatch.teams || currentMatch.title}...`;
  showToast(msg);
  closeModal();
}

// ─── My List ─────────────────────────────────────────────────────────────────
const myList = new Set(JSON.parse(localStorage.getItem('footflix_mylist') || '[]'));

function toggleMyList(id, btn) {
  if (myList.has(id)) {
    myList.delete(id);
    showToast('Removed from My List');
    if (btn) btn.textContent = '＋';
  } else {
    myList.add(id);
    showToast('Added to My List ✓');
    if (btn) btn.textContent = '✓';
  }
  localStorage.setItem('footflix_mylist', JSON.stringify([...myList]));
}

// ─── Search ───────────────────────────────────────────────────────────────────
function initSearch() {
  const input = $('#search-input');
  if (!input) return;

  input.addEventListener('input', debounce(onSearch, 250));
}

function onSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  if (!matchData) return;

  const container = $('#categories-container');

  if (!query) {
    renderCategories(matchData.categories);
    return;
  }

  // Filter matches across all categories
  const results = [];
  for (const cat of matchData.categories) {
    for (const match of cat.matches) {
      const title = (match.teams || match.title || '').toLowerCase();
      const league = (match.league || '').toLowerCase();
      if (title.includes(query) || league.includes(query)) {
        results.push(match);
      }
    }
  }

  if (results.length === 0) {
    container.innerHTML = `
      <div style="padding: 3rem 4%; color: var(--text-muted); text-align: center; font-size: 1.1rem;">
        No matches found for "<strong style="color:#fff">${escapeHtml(query)}</strong>"
      </div>`;
    return;
  }

  renderCategories([{ title: `🔍 Search results for "${escapeHtml(query)}"`, matches: results }]);
}

// ─── Navbar scroll effect ────────────────────────────────────────────────────
function initNavbar() {
  const nav = $('.navbar');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message) {
  let toast = $('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
      background:#fff; color:#000; padding:0.65rem 1.4rem;
      border-radius:4px; font-weight:600; font-size:0.9rem;
      z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.4);
      transition:opacity 0.3s ease; opacity:0; white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ─── Error state ──────────────────────────────────────────────────────────────
function showError() {
  const container = $('#categories-container');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:4rem; text-align:center; color:var(--text-muted);">
      <div style="font-size:3rem; margin-bottom:1rem;">⚽</div>
      <h2 style="color:#fff; margin-bottom:0.5rem;">Unable to load matches</h2>
      <p>Please try refreshing the page.</p>
      <button class="btn btn--primary" style="margin-top:1.5rem" onclick="location.reload()">Retry</button>
    </div>
  `;
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Accept YYYY-MM-DD or any parseable date string
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr + 'T00:00:00'
    : dateStr;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
