chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'wechat') return;

  console.log('[Octopus COSE] WeChat Injection Started.');

  let attempts = 0;
  const checkReady = setInterval(() => {
    attempts++;
    if (attempts > 8) {
      clearInterval(checkReady);
      console.warn('[Octopus COSE] Target editor unresolvable (DOM changed). Degrading to manual paste.');
      alert('🐙 Octopus COSE: 无法自动锁定输入框。\n请在此页面的输入框内直接按下 Ctrl+V 完成格式无损粘贴。');
      chrome.storage.local.remove('octopus_sync_payload');
      return;
    }
    const titleInput = document.getElementById('title');
    const iframeEditor = document.getElementById('ueditor_0');
    
    if (titleInput && iframeEditor && iframeEditor.contentDocument) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] WeChat Editor found. Injecting payload.');
      
      // Inject Title
      titleInput.value = payload.meta.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Inject Content
      const editorBody = iframeEditor.contentDocument.body;
      editorBody.innerHTML = payload.html;

      chrome.storage.local.remove('octopus_sync_payload');
    }
  }, 1500);
});
