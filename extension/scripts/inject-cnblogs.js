/**
 * Octopus MD Sync — Cnblogs (博客园) Injection Script
 * Target: i.cnblogs.com Markdown editor
 * 
 * Cnblogs uses CodeMirror for its Markdown editor. Setting `.value` on the
 * container div does nothing. We must dispatch a paste event into the
 * CodeMirror editing surface, or use the CodeMirror API if available.
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
  if (!payload || payload.target !== 'cnblogs') return;

  console.log('[Octopus MD Sync] Cnblogs Injection Started.');
  
  try {
    // Fill title
    const titleInput = await observeElement('#post-title');
    if (titleInput) {
      titleInput.value = payload.meta.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Cnblogs Markdown editor: CodeMirror-based
    // Strategy 1: Try CodeMirror API (cm instance attached to DOM)
    const editorContainer = await observeElement(() => {
      return document.querySelector('.CodeMirror')
        || document.querySelector('#md-editor')
        || document.querySelector('[contenteditable="true"]');
    });
    
    console.log('[Octopus MD Sync] Cnblogs Editor found. Injecting payload.');

    // Try CodeMirror API first (most reliable)
    if (editorContainer && editorContainer.CodeMirror) {
      editorContainer.CodeMirror.setValue(payload.markdown);
      chrome.storage.local.remove('octopus_sync_payload');
      return;
    }

    // Strategy 2: Find the CodeMirror textarea and set value
    const cmTextarea = document.querySelector('.CodeMirror textarea');
    if (cmTextarea) {
      cmTextarea.focus();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', payload.markdown);
      cmTextarea.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      }));
      chrome.storage.local.remove('octopus_sync_payload');
      return;
    }

    // Strategy 3: contenteditable or plain textarea fallback
    const editableArea = editorContainer.querySelector('[contenteditable="true"]') || editorContainer;
    editableArea.focus();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', payload.markdown);
    editableArea.dispatchEvent(new ClipboardEvent('paste', {
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
