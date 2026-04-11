chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'wechat') return;

  console.log('[Octopus COSE] WeChat Injection Started.');

  const checkReady = setInterval(() => {
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
