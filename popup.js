// Popup：只负责把页面面板叫出来 + 显示当前列表的统计
const $ = (id) => document.getElementById(id);
const T = (key, ...args) => window.__noxinT(key, ...args);
const subEl = $('sub');
const totalEl = $('total');
const backEl = $('back');
const targetsEl = $('targets');
const openBtn = $('open');
const onlyBtn = $('only');

$('title').textContent = T('popupTitle');
$('lblTotal').textContent = T('statTotal');
$('lblBack').textContent = T('statBack');
$('lblTargets').textContent = T('statTargets');
openBtn.textContent = T('openPanel');
onlyBtn.textContent = T('onlyNon');
$('hint').textContent = T('popupHint');

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isX(url = '') {
  return /^https:\/\/(x|twitter)\.com\//.test(url);
}

// 页面里没有面板（刚重载扩展、或页面是重载前打开的）就补注入一次
async function ensurePanel(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { action: 'panel:stats' });
    if (res && res.ok) return res;
  } catch (e) {
    /* 没有接收者 */
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['panel.js'] });
  await new Promise((r) => setTimeout(r, 700));
  try {
    return await chrome.tabs.sendMessage(tabId, { action: 'panel:stats' });
  } catch (e) {
    return null;
  }
}

function render(stats) {
  if (!stats) {
    subEl.textContent = T('popupNoConn');
    return;
  }
  if (!stats.onListPage) {
    subEl.textContent = T('popupNotList');
    totalEl.textContent = backEl.textContent = targetsEl.textContent = '–';
    onlyBtn.disabled = true;
    return;
  }
  subEl.textContent = stats.targets
    ? T(stats.kind === 'followers' ? 'popupDescFollowers' : 'popupDescFollowing', stats.targets)
    : T('popupEmpty');
  totalEl.textContent = stats.total;
  backEl.textContent = stats.back;
  targetsEl.textContent = stats.targets;
}

async function refresh() {
  const tab = await activeTab();
  if (!tab || !isX(tab.url)) {
    subEl.textContent = T('popupNotList');
    return;
  }
  render(await ensurePanel(tab.id));
}

openBtn.addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab || !isX(tab.url)) return;
  await ensurePanel(tab.id);
  await chrome.tabs.sendMessage(tab.id, { action: 'panel:toggle' }).catch(() => {});
  window.close();
});

onlyBtn.addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab || !isX(tab.url)) return;
  await ensurePanel(tab.id);
  await chrome.tabs.sendMessage(tab.id, { action: 'panel:filter' }).catch(() => {});
  window.close();
});

refresh();
