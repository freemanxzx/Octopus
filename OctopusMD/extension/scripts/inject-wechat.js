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
  if (!payload || payload.target !== 'wechat') return;

  console.log('[Octopus MD Sync] WeChat Injection Started.');

  try {
    const iframeEditor = await observeElement(() => {
      const el = document.getElementById('ueditor_0');
      if (el && el.contentDocument && el.contentDocument.body) return el;
      return null;
    });
    
    const titleInput = document.getElementById('title');
    
    console.log('[Octopus MD Sync] WeChat Editor found. Injecting payload.');
    
    if (titleInput) {
      titleInput.value = payload.meta.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    const editorBody = iframeEditor.contentDocument.body;
    editorBody.innerHTML = payload.html;

    chrome.storage.local.remove('octopus_sync_payload');
  } catch (e) {
    console.warn('[Octopus MD Sync] Target editor unresolvable (DOM changed). Degrading to manual paste.', e);
    alert('🐙 Octopus MD Sync: 无法自动锁定输入框。\n请在此页面的输入框内直接按下 Ctrl+V 完成格式无损粘贴。');
    chrome.storage.local.remove('octopus_sync_payload');
  }
});
