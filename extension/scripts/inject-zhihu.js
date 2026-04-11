chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'zhihu') return;

  console.log('[Octopus COSE] Zhihu Injection Started.');

  const checkReady = setInterval(() => {
    const editor = document.querySelector('.DraftEditor-root');
    const titleInput = document.querySelector('textarea.Input');
    
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] Zhihu Editor found. Injecting payload.');
      
      if (titleInput) {
        titleInput.value = payload.meta.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/html', payload.html);
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
