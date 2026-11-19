// X followback checker panel.
// X already labels people who follow you with "Follows you" in list pages, so there is no
// need to scrape the Following list and the Followers list and diff them: mark or hide the
// rows right where they are, which is instant and needs no paging. The panel is bilingual
// and only appears on Following / Followers / Verified Followers pages.
(function () {
  'use strict';

  if (window.__noxinUnfollowerPanel) return;
  window.__noxinUnfollowerPanel = true;

  const CELL = '[data-testid="UserCell"]';
  const BACK_RE = /关注了你|Follows you/;
  const FOLLOWING_RE = /^(正在关注|Following)$/;
  const CONFIRM_TESTID = 'confirmationSheetConfirm';

  const state = {
    filterOn: false,
    autoConfirm: true,
    running: false,
    stop: false,
  };

  const T = (key, ...args) => window.__noxinT(key, ...args);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function cells() {
    return Array.from(document.querySelectorAll(CELL));
  }

  function handleOf(cell) {
    const link = Array.from(cell.querySelectorAll('a[href]')).find((a) =>
      /^\/[A-Za-z0-9_]{1,15}$/.test(a.getAttribute('href') || '')
    );
    return link ? link.getAttribute('href').slice(1) : '';
  }

  function followsBack(cell) {
    return BACK_RE.test(cell.innerText || '');
  }

  function followButton(cell) {
    // X's button testid looks like "1977191608195203072-unfollow" - far more stable than text
    const byTestId = cell.querySelector('[data-testid$="-unfollow"]');
    if (byTestId) return byTestId;
    return Array.from(cell.querySelectorAll('[role="button"]')).find((b) =>
      FOLLOWING_RE.test((b.innerText || '').trim())
    );
  }

  // ---------- Panel UI (Shadow DOM so X's CSS can't touch it) ----------
  const host = document.createElement('div');
  host.id = 'noxin-unfollower-host';
  host.style.cssText = 'position:fixed;left:88px;bottom:96px;z-index:99999;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .wrap {
        font: 13px/1.5 -apple-system, "SF Pro Text", "PingFang SC", sans-serif;
        color: #e8e5e0;
        width: 268px;
        background: #1b1917;
        border: 1px solid #35302a;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.3);
        overflow: hidden;
      }
      .pill {
        display: flex; align-items: center; gap: 8px;
        padding: 9px 12px; cursor: pointer; background: none; border: 0;
        color: inherit; font: inherit; width: 100%; text-align: left;
      }
      .pill:hover { background: #262220; }
      .pill:focus-visible, button:focus-visible { outline: 2px solid #e0a458; outline-offset: 2px; }
      .dot { width: 7px; height: 7px; border-radius: 99px; background: #e0a458; flex: none; }
      .pill b { font-weight: 650; font-variant-numeric: tabular-nums; }
      .panel { padding: 4px 12px 12px; }
      .panel[hidden] { display: none; }
      .head { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0 10px; }
      .head h2 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: .01em; }
      .head span { font-size: 11.5px; color: #a89e90; font-variant-numeric: tabular-nums; }
      .row { display: flex; gap: 8px; }
      .row + .row { margin-top: 8px; }
      button.act {
        flex: 1; padding: 8px 10px; border-radius: 9px; border: 1px solid #3a342d;
        background: #262220; color: inherit; font: inherit; font-weight: 600; cursor: pointer;
        transition: background .14s ease, border-color .14s ease;
      }
      button.act:hover:not(:disabled) { background: #302b26; }
      button.act:disabled { opacity: .45; cursor: default; }
      button.act[aria-pressed="true"] { background: #3a2f22; border-color: #6b5232; color: #f0c690; }
      button.act.danger[aria-pressed="true"], button.act.confirming {
        background: #3d2320; border-color: #7a3c33; color: #f0b3a8;
      }
      .switch {
        display: flex; align-items: center; justify-content: space-between;
        padding: 9px 0 2px; font-size: 12.5px; color: #cfc6b8;
      }
      .track {
        width: 34px; height: 19px; border-radius: 99px; background: #3a342d; position: relative;
        border: 0; cursor: pointer; flex: none; transition: background .16s ease;
      }
      .track::after {
        content: ''; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px;
        border-radius: 99px; background: #b7ada0; transition: transform .16s ease, background .16s ease;
      }
      .track[aria-pressed="true"] { background: #5c4326; }
      .track[aria-pressed="true"]::after { transform: translateX(15px); background: #e0a458; }
      .meta { margin-top: 9px; font-size: 11.5px; color: #a89e90; min-height: 17px; }
      .bar { height: 3px; border-radius: 99px; background: #332e29; margin-top: 7px; overflow: hidden; }
      .bar i { display: block; height: 100%; width: 0; background: #e0a458; transition: width .25s ease; }
      .hint { margin: 9px 0 0; font-size: 11px; color: #8c8377; line-height: 1.45; }
      .close { border: 0; background: none; color: #8c8377; cursor: pointer; font-size: 15px; padding: 0 2px; }
      .close:hover { color: #e8e5e0; }
    </style>
    <div class="wrap">
      <button class="pill" id="pill" type="button" aria-expanded="false">
        <span class="dot"></span>
        <span>${T('pill')} <b id="pillCount">–</b></span>
      </button>
      <div class="panel" id="panel" hidden>
        <div class="head">
          <h2 id="title">${T('titleFollowing')}</h2>
          <span id="count">— / —</span>
        </div>
        <div class="row">
          <button class="act" id="filter" type="button" aria-pressed="false">${T('filterOnly')}</button>
          <button class="act" id="export" type="button">${T('exportCsv')}</button>
        </div>
        <div class="row">
          <button class="act danger" id="batch" type="button">${T('batch')}</button>
          <button class="act" id="stop" type="button" disabled>${T('stop')}</button>
        </div>
        <div class="switch">
          <span>${T('autoConfirm')}</span>
          <button class="track" id="auto" type="button" aria-pressed="true"></button>
        </div>
        <div class="meta" id="meta">${T('metaCounting')}</div>
        <div class="bar"><i id="barFill"></i></div>
        <p class="hint">${T('hintFollowing')}</p>
      </div>
    </div>
  `;
  document.documentElement.appendChild(host);

  const $ = (id) => root.getElementById(id);

  // Default spot: bottom-left but higher up, to stay clear of other floating buttons.
  function place(x, y) {
    const width = host.offsetWidth || 268;
    const height = host.offsetHeight || 44;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    host.style.left = `${Math.min(Math.max(8, x), maxX)}px`;
    host.style.top = `${Math.min(Math.max(8, y), maxY)}px`;
    host.style.bottom = 'auto';
  }

  function savePos() {
    const rect = host.getBoundingClientRect();
    chrome.storage.local
      .set({ noxinPanelPos: { x: Math.round(rect.left), y: Math.round(rect.top), v: 2 } })
      .catch(() => {});
  }

  const pill = $('pill');
  const panel = $('panel');
  const titleEl = $('title');
  const countEl = $('count');
  const pillCountEl = $('pillCount');
  const metaEl = $('meta');
  const barFill = $('barFill');
  const filterBtn = $('filter');
  const exportBtn = $('export');
  const batchBtn = $('batch');
  const stopBtn = $('stop');
  const autoBtn = $('auto');

  function setMeta(text) {
    metaEl.textContent = text;
  }

  // The two list kinds point in opposite directions:
  //   /following                       -> who I follow that doesn't follow me back (unfollowable)
  //   /followers, /verified_followers  -> who follows me that I don't follow back (follow only)
  function pageKind() {
    const m = location.pathname.match(/^\/[A-Za-z0-9_]+\/(following|followers|verified_followers)\/?$/);
    if (!m) return null;
    return m[1] === 'following' ? 'following' : 'followers';
  }

  // ---------- Stats + filtering ----------
  function analyze() {
    const list = cells();
    let back = 0;
    let targets = 0;
    for (const cell of list) {
      const isBack = followsBack(cell);
      const btn = followButton(cell);
      const kind = pageKind();
      const actionable = kind === 'following' ? !!btn : true;
      if (isBack) back += 1;
      else if (actionable) targets += 1;
      cell.dataset.noxinBack = isBack ? '1' : '0';
      cell.dataset.noxinTarget = !isBack && actionable ? '1' : '0';
    }
    return { total: list.length, back, targets };
  }

  function applyFilter() {
    for (const cell of cells()) {
      // Keep only rows that can actually be acted on; skip mutual follows and rows that
      // still render a "Follow" button (recommendations / still loading).
      const hide = state.filterOn && cell.dataset.noxinTarget !== '1';
      cell.style.display = hide ? 'none' : '';
      cell.style.opacity = '';
    }
  }

  function refresh() {
    const kind = pageKind();
    host.style.display = kind ? '' : 'none';
    if (kind) {
      const followers = kind === 'followers';
      titleEl.textContent = T(followers ? 'titleFollowers' : 'titleFollowing');
      batchBtn.style.display = followers ? 'none' : '';
      stopBtn.style.display = followers ? 'none' : '';
      root.querySelector('.hint').textContent = T(followers ? 'hintFollowers' : 'hintFollowing');
    }
    if (!kind) {
      countEl.textContent = '— / —';
      pillCountEl.textContent = '–';
      setMeta(T('metaNotList'));
      return { total: 0, back: 0, targets: 0 };
    }
    const stat = analyze();
    countEl.textContent = `${stat.targets} / ${stat.total}`;
    pillCountEl.textContent = String(stat.targets);
    applyFilter();
    if (!state.running) {
      setMeta(
        T(
          kind === 'followers' ? 'metaStatFollowers' : 'metaStatFollowing',
          stat.total,
          stat.back,
          stat.targets
        )
      );
    }
    return stat;
  }

  let refreshTimer = 0;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 200);
  };

  new MutationObserver(scheduleRefresh).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      state.filterOn = false;
      filterBtn.setAttribute('aria-pressed', 'false');
      applyFilter();
      scheduleRefresh();
    }
  }, 800);

  // ---------- Auto-confirm the dialog ----------
  function confirmDialog() {
    // Note: the confirm sheet is NOT [role="dialog"], it's data-testid="confirmationSheetDialog"
    const sheet = document.querySelector('[data-testid="confirmationSheetDialog"]');
    if (sheet) return sheet;
    for (const dialog of document.querySelectorAll('[role="dialog"]')) {
      if (/取消关注|Unfollow/.test(dialog.innerText || '')) return dialog;
    }
    return null;
  }

  function confirmButton(dialog) {
    const byTestId = dialog.querySelector(`[data-testid="${CONFIRM_TESTID}"]`);
    if (byTestId) return byTestId;
    return Array.from(dialog.querySelectorAll('[role="button"], button')).find((b) =>
      /^(取消关注|Unfollow)$/.test((b.innerText || '').trim())
    );
  }

  function maybeAutoConfirm() {
    if (!state.autoConfirm) return;
    const dialog = confirmDialog();
    if (!dialog || dialog.dataset.noxinDone) return;
    dialog.dataset.noxinDone = '1';
    setTimeout(() => {
      if (!dialog.isConnected) return;
      const btn = confirmButton(dialog);
      if (btn) btn.click();
    }, 240);
  }

  new MutationObserver(maybeAutoConfirm).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ---------- Bulk unfollow ----------
  async function waitForDialog(timeout = 4000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const dialog = confirmDialog();
      if (dialog) return dialog;
      await sleep(100);
    }
    return null;
  }

  async function waitUntil(fn, timeout = 6000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (fn()) return true;
      await sleep(120);
    }
    return false;
  }

  async function unfollowOne(cell) {
    const handle = handleOf(cell);
    const btn = followButton(cell);
    if (!btn) return { ok: false, handle, reason: T('reasonNoButton') };

    btn.click();
    const dialog = await waitForDialog(4000);
    if (!dialog) return { ok: false, handle, reason: T('reasonNoDialog') };

    if (state.autoConfirm) {
      // give the auto-confirm observer a moment, then click it ourselves if it's still open
      await sleep(320);
    }
    if (dialog.isConnected) {
      const confirm = confirmButton(dialog);
      if (!confirm) return { ok: false, handle, reason: T('reasonNoConfirm') };
      confirm.click();
    }

    const closed = await waitUntil(() => !dialog.isConnected, 6000);
    await sleep(260);
    const gone = !cell.isConnected || !followButton(cell);
    return { ok: closed || gone, handle, reason: closed || gone ? '' : T('reasonDialogStuck') };
  }

  async function runBatch() {
    if (state.running) return;
    state.running = true;
    state.stop = false;
    batchBtn.disabled = true;
    stopBtn.disabled = false;
    filterBtn.disabled = true;

    const queue = cells().filter((cell) => cell.dataset.noxinBack === '0' && followButton(cell));
    const limit = Math.min(queue.length, 40);
    let done = 0;
    let failed = 0;

    for (let index = 0; index < limit; index += 1) {
      if (state.stop) break;
      const cell = queue[index];
      if (!cell.isConnected) continue;
      const handle = handleOf(cell);
      setMeta(T('metaRunning', handle, index + 1, limit));
      barFill.style.width = `${((index + 1) / limit) * 100}%`;
      const result = await unfollowOne(cell);
      if (result.ok) done += 1;
      else {
        failed += 1;
        setMeta(T('metaFailed', handle, result.reason));
        await sleep(900);
      }
      await sleep(1200 + Math.random() * 600);
      refresh();
    }

    state.running = false;
    batchBtn.disabled = false;
    stopBtn.disabled = true;
    filterBtn.disabled = false;
    barFill.style.width = '0%';
    const stat = refresh();
    const head = state.stop ? T('stopped') : T('batchDone');
    setMeta(
      failed
        ? T('metaSummaryFail', head, done, failed, stat.targets)
        : T('metaSummary', head, done, stat.targets)
    );
    batchBtn.textContent = T('batch');
  }

  // ---------- CSV export ----------
  function exportCsv() {
    const rows = [['handle', 'name', 'url']];
    for (const cell of cells()) {
      if (cell.dataset.noxinBack !== '0') continue;
      const handle = handleOf(cell);
      const name = (cell.innerText || '').split('\n')[0].trim();
      rows.push([handle, name, `https://x.com/${handle}`]);
    }
    if (rows.length === 1) {
      setMeta(T('metaExportEmpty'));
      return;
    }
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${T('csvPrefix')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMeta(T('metaExported', rows.length - 1));
  }

  // ---------- Events ----------
  let dragState = null;
  let suppressClick = false;

  pill.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = host.getBoundingClientRect();
    dragState = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!dragState) return;
      const x = event.clientX - dragState.dx;
      const y = event.clientY - dragState.dy;
      if (
        Math.abs(event.clientX - dragState.startX) + Math.abs(event.clientY - dragState.startY) > 4
      ) {
        dragState.moved = true;
      }
      place(x, y);
    },
    true
  );

  window.addEventListener(
    'pointerup',
    () => {
      if (!dragState) return;
      if (dragState.moved) {
        suppressClick = true;
        savePos();
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      dragState = null;
    },
    true
  );

  pill.addEventListener('click', () => {
    if (suppressClick) return;
    const open = panel.hasAttribute('hidden');
    panel.toggleAttribute('hidden', !open);
    pill.setAttribute('aria-expanded', String(open));
    if (open) refresh();
  });

  filterBtn.addEventListener('click', () => {
    state.filterOn = !state.filterOn;
    filterBtn.setAttribute('aria-pressed', String(state.filterOn));
    filterBtn.textContent = T(state.filterOn ? 'filterAll' : 'filterOnly');
    applyFilter();
    const stat = refresh();
    setMeta(
      state.filterOn
        ? T('metaHidden', stat.total - stat.targets, stat.targets)
        : T('metaStatFollowing', stat.total, stat.back, stat.targets)
    );
  });

  autoBtn.addEventListener('click', () => {
    state.autoConfirm = !state.autoConfirm;
    autoBtn.setAttribute('aria-pressed', String(state.autoConfirm));
    chrome.storage.local.set({ noxinAutoConfirm: state.autoConfirm }).catch(() => {});
    setMeta(T(state.autoConfirm ? 'metaAutoOn' : 'metaAutoOff'));
  });

  exportBtn.addEventListener('click', exportCsv);

  batchBtn.addEventListener('click', () => {
    if (state.running) return;
    if (!batchBtn.classList.contains('confirming')) {
      const stat = refresh();
      if (!stat.targets) {
        setMeta(T('metaNoTargets'));
        return;
      }
      batchBtn.classList.add('confirming');
      batchBtn.textContent = T('batchConfirm', Math.min(stat.targets, 40));
      setTimeout(() => {
        if (state.running) return;
        batchBtn.classList.remove('confirming');
        batchBtn.textContent = T('batch');
      }, 4000);
      return;
    }
    batchBtn.classList.remove('confirming');
    batchBtn.textContent = T('batch');
    runBatch();
  });

  stopBtn.addEventListener('click', () => {
    state.stop = true;
    setMeta(T('metaStopping'));
  });

  // ---------- Popup bridge ----------
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.action) return false;
    if (message.action === 'panel:toggle') {
      const open = panel.hasAttribute('hidden');
      panel.toggleAttribute('hidden', !open);
      pill.setAttribute('aria-expanded', String(open));
      refresh();
      sendResponse({ ok: true, open });
      return true;
    }
    if (message.action === 'panel:filter') {
      if (!state.filterOn) filterBtn.click();
      sendResponse({ ok: true });
      return true;
    }
    if (message.action === 'panel:stats') {
      const stat = refresh();
      const kind = pageKind();
      sendResponse({ ok: true, ...stat, kind, onFollowingPage: kind === 'following', onListPage: !!kind });
      return true;
    }
    return false;
  });

  chrome.storage.local
    .get({ noxinAutoConfirm: true, noxinPanelPos: null })
    .then((data) => {
      state.autoConfirm = data.noxinAutoConfirm !== false;
      autoBtn.setAttribute('aria-pressed', String(state.autoConfirm));
      // only trust positions saved by v2+; older ones are the old default that got covered
      if (data.noxinPanelPos && data.noxinPanelPos.v === 2 && Number.isFinite(data.noxinPanelPos.x)) {
        place(data.noxinPanelPos.x, data.noxinPanelPos.y);
      }
    })
    .catch(() => {});

  refresh();
})();
