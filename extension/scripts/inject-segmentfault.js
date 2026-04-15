/**
 * Octopus MD Sync — SegmentFault (思否) Injection Script
 * Target: segmentfault.com/write
 * 
 * SegmentFault uses a CodeMirror-based editor. We use the icon-outdent
 * focus trick from postbot to ensure the cursor is properly positioned.
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
  if (!payload || payload.target !== 'segmentfault') return;

  console.log('[Octopus MD Sync] SegmentFault Injection Started.');
  
  try {
    const titleInput = await observeElement('#title');
    console.log('[Octopus MD Sync] SegmentFault Title found.');
    
    if (titleInput) {
        titleInput.value = payload.meta.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    const editor = await observeElement(() => {
      return document.querySelector('.CodeMirror-code[role="presentation"]')
        || document.querySelector('.CodeMirror')
        || document.querySelector('.sf-editor [contenteditable="true"]');
    }, 20000);
    console.log('[Octopus MD Sync] SegmentFault Editor found.');

    // Try CodeMirror API first
    const cmContainer = document.querySelector('.CodeMirror');
    if (cmContainer && cmContainer.CodeMirror) {
      cmContainer.CodeMirror.setValue(payload.markdown);
      chrome.storage.local.remove('octopus_sync_payload');
      return;
    }

    // Focus trick: click the outdent button to ensure cursor is in the editor
    const focusHelper = document.querySelector('button.icon-outdent');
    if (focusHelper) focusHelper.click();
    
    editor.focus();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', payload.markdown);
    dataTransfer.setData('text/html', payload.html || payload.markdown);
    
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    }));

    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    chrome.storage.local.remove('octopus_sync_payload');
  } catch(e) {
    console.warn('[Octopus MD Sync] Target editor unresolvable (DOM changed). Degrading to manual paste.', e);
    alert('🐙 Octopus MD Sync: 无法自动锁定输入框。\n请在此页面的输入框内直接按下 Ctrl+V 完成格式无损粘贴。');
    chrome.storage.local.remove('octopus_sync_payload');
  }
});
