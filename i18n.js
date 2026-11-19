// UI 文案：跟随浏览器界面语言（zh* 用中文，其余英文）
(function () {
  'use strict';

  const en = {
    pill: 'Not back',
    titleFollowing: 'Who doesn’t follow you back',
    titleFollowers: 'Who you don’t follow back',
    count: '{0} / {1}',
    filterOnly: 'Only non-followbacks',
    filterAll: 'Show all',
    exportCsv: 'Export CSV',
    batch: 'Unfollow selected',
    batchConfirm: 'Unfollow {0} accounts?',
    stop: 'Stop',
    autoConfirm: 'Auto-click “Unfollow” in the dialog',
    hintFollowing: 'Works on your Following list. Bulk mode unfollows up to 40 at a time, 1.6s apart, and can be stopped.',
    hintFollowers: 'This is a followers list: these people follow you but you don’t follow them back yet. Follow them manually with the button.',
    metaCounting: 'Counting…',
    metaNotList: 'Open a Following, Followers or Verified Followers list',
    metaStatFollowing: '{0} accounts · {1} follow you back · {2} don’t',
    metaStatFollowers: '{0} accounts · you follow {1} back · {2} you don’t',
    metaHidden: 'Hid {0} accounts · {1} still shown',
    metaRunning: 'Unfollowing @{0} ({1}/{2})',
    metaFailed: '@{0} failed: {1}',
    stopped: 'Stopped',
    batchDone: 'Done',
    metaSummary: '{0}: {1} unfollowed · {2} left',
    metaSummaryFail: '{0}: {1} unfollowed, {2} failed · {3} left',
    metaNoTargets: 'Nothing to unfollow on this page',
    metaExportEmpty: 'Nothing to export on this page',
    metaExported: 'Exported {0} accounts',
    metaAutoOn: 'The dialog will be confirmed automatically',
    metaAutoOff: 'You’ll confirm each dialog yourself',
    metaStopping: 'Stopping…',
    reasonNoButton: 'no Following button',
    reasonNoDialog: 'confirmation dialog never appeared',
    reasonNoConfirm: 'confirm button not found',
    reasonDialogStuck: 'dialog did not close',
    csvPrefix: 'non-followbacks',
    popupTitle: 'Followback checker',
    statTotal: 'in list',
    statBack: 'follow you',
    statTargets: 'not back',
    openPanel: 'Open the on-page panel',
    onlyNon: 'Only non-followbacks',
    popupHint: 'Bulk unfollow, CSV export and auto-confirm live in the on-page panel. Works on Following and Followers lists.',
    popupNotList: 'Open a Following or Followers list first',
    popupNoConn: 'Could not reach the page — reload this tab',
    popupDescFollowing: '{0} accounts here don’t follow you back',
    popupDescFollowers: '{0} accounts here follow you, you don’t follow back',
    popupEmpty: 'Nobody to show in this list',
  };

  const zh = {
    pill: '未回关',
    titleFollowing: '谁没回关你',
    titleFollowers: '你没回关谁',
    count: '{0} / {1}',
    filterOnly: '只看未回关',
    filterAll: '显示全部',
    exportCsv: '导出 CSV',
    batch: '批量取消关注',
    batchConfirm: '确认取关 {0} 个？',
    stop: '停止',
    autoConfirm: '自动点弹窗「取消关注」',
    hintFollowing: '只在「正在关注」列表页有效；批量默认每次 40 个、间隔 1.6 秒，中途可停。',
    hintFollowers: '这是粉丝列表：筛出来的是「关注了你、你还没回关」的人，点按钮关注即可，批量在这里不生效。',
    metaCounting: '正在统计…',
    metaNotList: '请打开「正在关注」或粉丝列表页',
    metaStatFollowing: '共 {0} 人 · 回关 {1} 人 · 未回关 {2} 人',
    metaStatFollowers: '共 {0} 人 · 你已回关 {1} 人 · 没回关 {2} 人',
    metaHidden: '已隐藏 {0} 人 · 剩 {1} 人',
    metaRunning: '取消关注 @{0}（{1}/{2}）',
    metaFailed: '@{0} 失败：{1}',
    stopped: '已停止',
    batchDone: '批量完成',
    metaSummary: '{0}：成功 {1} 个 · 剩余未回关 {2} 人',
    metaSummaryFail: '{0}：成功 {1} 个，失败 {2} 个 · 剩余 {3} 人',
    metaNoTargets: '这个页面没有可取消关注的人',
    metaExportEmpty: '当前页面没有未回关的人可导出',
    metaExported: '已导出 {0} 人',
    metaAutoOn: '弹窗会自动点「取消关注」',
    metaAutoOff: '弹窗需要你自己点',
    metaStopping: '正在停止…',
    reasonNoButton: '没有「正在关注」按钮',
    reasonNoDialog: '没等到确认弹窗',
    reasonNoConfirm: '弹窗里找不到「取消关注」',
    reasonDialogStuck: '弹窗没关掉',
    csvPrefix: '未回关',
    popupTitle: '未回关筛选',
    statTotal: '这个列表',
    statBack: '回关了你',
    statTargets: '未回关',
    openPanel: '打开页面筛选面板',
    onlyNon: '只看未回关',
    popupHint: '批量取消关注、导出名单、自动确认弹窗都在面板里。只能用在关注 / 粉丝列表页。',
    popupNotList: '当前不是关注 / 粉丝列表页',
    popupNoConn: '没能连上页面，刷新这个标签页再试',
    popupDescFollowing: '这里还有 {0} 个人没回关你',
    popupDescFollowers: '这里有 {0} 个人关注了你、你还没回关',
    popupEmpty: '这个列表里没有未回关的人',
  };

  let lang = 'en';
  try {
    lang = (chrome.i18n.getUILanguage() || 'en').toLowerCase();
  } catch (error) {
    lang = 'en';
  }
  const table = lang.indexOf('zh') === 0 ? zh : en;

  window.__noxinT = function (key) {
    const args = Array.prototype.slice.call(arguments, 1);
    let text = table[key] || en[key] || key;
    args.forEach(function (value, index) {
      text = text.split('{' + index + '}').join(String(value));
    });
    return text;
  };
})();
