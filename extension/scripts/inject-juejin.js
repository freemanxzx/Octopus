chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'juejin') return;

  console.log('[Octopus COSE] Juejin Injection Started.');

  const checkReady = setInterval(() => {
    // Juejin bytedance markdown core editor
    const editor = document.querySelector('.bytemd-editor .CodeMirror');
    const titleInput = document.querySelector('.title-input');
    
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] Juejin Editor found. Injecting payload.');
      
      if (titleInput) {
        titleInput.value = payload.meta.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', payload.markdown);
      
      editor.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      }));

      chrome.storage.local.remove('octopus_sync_payload');
    }
  }, 1000);
});
