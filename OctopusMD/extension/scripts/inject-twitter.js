/**
 * Octopus MD Sync — X (Twitter) Injection Script
 * Target: x.com / twitter.com compose area
 * 
 * X/Twitter has migrated to a Lexical-based editor (no longer Draft.js).
 * The composer now uses `[data-testid="tweetTextarea_0"]` with nested
 * contenteditable `[role="textbox"]` elements.
 */
const observeElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    let checkElement = typeof selector === 'function' ? selector : () => document.querySelector(selector);
    let element = checkElement();
    if (element) return resolve(element);
    const observer = new MutationObserver(() => {
      element = checkElement();
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error('timeout')); }, timeout);
  });
};

chrome.storage.local.get(['octopus_sync_payload'], async (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'twitter') return;

  console.log('[Octopus MD Sync] Twitter/X Injection Started.');

  try {
    // Modern X/Twitter uses data-testid attributes and role="textbox"
    const editor = await observeElement(() => {
      return document.querySelector('[data-testid="tweetTextarea_0"] [role="textbox"][contenteditable="true"]')
        || document.querySelector('[role="textbox"][contenteditable="true"]')
        || document.querySelector('.public-DraftEditor-content')
        || document.querySelector('[contenteditable="true"]');
    });
    
    console.log('[Octopus MD Sync] Twitter/X Editor found. Injecting payload.');
    
    // Twitter/X has a character limit, truncate intelligently
    const tweetText = payload.meta.title + '\n\n' + payload.markdown.substring(0, 240);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', tweetText);
    
    editor.focus();
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    }));

    chrome.storage.local.remove('octopus_sync_payload');
  } catch(e) {
    console.warn('[Octopus MD Sync] Target editor unresolvable (DOM changed). Degrading to manual paste.', e);
    alert('🐙 Octopus MD Sync: 无法自动锁定输入框。\n请在此页面的输入框内直接按下 Ctrl+V 完成格式无损粘贴。');
    chrome.storage.local.remove('octopus_sync_payload');
  }
});
