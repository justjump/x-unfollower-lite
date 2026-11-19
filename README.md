# X Unfollower Lite — Followback Checker

A small Chrome extension that shows **who you follow that doesn't follow you back**, right on X's own **Following** list — no scraping, no API keys, no data leaving your browser.

X already renders a small “Follows you” / “关注了你” label under people who follow you. This extension just reads that label:

- **Only non-followbacks** — hides every row that follows you back, so the remaining list is exactly the people who don't.
- **Unfollow in bulk** — one click, up to 40 at a time, 1.6s apart, with progress and a stop button.
- **Auto-confirm the dialog** — X asks “Unfollow @someone?” on every single click; this clicks the confirm button for you (toggleable).
- **CSV export** — dump the current list's non-followbacks to a spreadsheet.
- **Followers & Verified Followers** — the same panel works there, flipped around: it shows who follows *you* but you haven't followed back. (Bulk unfollow is disabled there — there's nothing to unfollow.)
- **Bilingual** — English and 简体中文, picked automatically from your browser language.
- **Draggable panel** — it remembers where you put it.

## Install (unpacked)

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick this folder.

Then open `x.com/<your-name>/following`.

## Usage

Open your Following list. A small panel appears at the bottom-left:

| Control | What it does |
| --- | --- |
| **Only non-followbacks** | Hide everyone who follows you back |
| **Unfollow selected** | Click twice to confirm, then it unfollows up to 40 accounts one by one |
| **Stop** | Halts a running batch immediately |
| **Auto-click “Unfollow”** | Confirm the dialog automatically (on by default) |
| **Export CSV** | Save the current list's non-followbacks |

Scrolling loads more rows and the counter updates live. Drag the panel anywhere; the position is saved.

## How it works

`panel.js` adds a Shadow-DOM panel to the page, marks each `[data-testid="UserCell"]` as *follows you* / *not*, and hides or keeps rows with `display: none`. Bulk unfollow clicks the account's own “Following” button and then the `confirmationSheetConfirm` button inside X's `confirmationSheetDialog` sheet.

Nothing is scraped into a server, there is no network request, no analytics, and no remote code. All state (panel position, auto-confirm toggle) stays in `chrome.storage.local`.

## Limitations

- X changes its DOM regularly. The selectors here (`data-testid="UserCell"`, `data-testid$="-unfollow"`, `confirmationSheetConfirm`) are current as of November 2026 and may need updating.
- It only sees rows X has rendered. Scroll to load more; the count follows.
- Unfollowing in bulk can hit X's rate limits. The built-in pause is deliberately conservative; if you see failures, use the Stop button and slow down.
- Not published on the Chrome Web Store — load it unpacked.

## Files

```
manifest.json      MV3 manifest
i18n.js            UI strings (en / zh-CN)
panel.js           the on-page panel: filter, bulk unfollow, auto-confirm, CSV
popup.html/js      toolbar popup: live counts + open the panel
icons/             16 / 48 / 128 px icons
_locales/          extension name & description per language
```

## 中文说明

在「正在关注」列表页原地筛出**没有回关你**的人：一键只看未回关、批量取消关注（每次最多 40 个、间隔 1.6 秒、可随时停）、自动点掉确认弹窗、导出 CSV。粉丝列表和认证关注者页也能用，方向相反（筛出你还没回关的人，只能手动去关注）。

安装：`chrome://extensions` → 打开开发者模式 → 加载已解压的扩展程序 → 选这个目录。

## License

MIT — see [LICENSE](LICENSE).
