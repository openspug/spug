/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const LANG_KEY = 'spug:language';

export function getLanguage() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'zh' || stored === 'en') return stored;
  const nav = (navigator.language || 'zh-CN').toLowerCase();
  return nav.indexOf('zh') === 0 ? 'zh' : 'en';
}

export function setLanguage(lang) {
  if (lang === getLanguage()) return;
  localStorage.setItem(LANG_KEY, lang);
  window.location.reload()
}

export const langMode = getLanguage();
export const isEN = langMode === 'en';

// 词典约 80KB，仅英文模式需要；切换语言会整页 reload，因此可在模块加载期一次性决定
const translations = isEN ? require('../locales/en').default : {};

// t('确定要删除【{}】?', name) => 'Are you sure you want to delete [xxx]?'
// The key is the original Chinese text, optionally containing {} placeholders
// that are substituted with the extra arguments in order (both languages).
export function t(text, ...args) {
  let msg = text;
  if (isEN) {
    const hit = translations[text];
    if (hit !== undefined && hit !== null && hit !== '') msg = hit;
  }
  if (args.length && typeof msg === 'string') {
    let i = 0;
    msg = msg.replace(/\{\}/g, () => (args[i] !== undefined ? String(args[i++]) : ''));
  }
  return msg;
}
