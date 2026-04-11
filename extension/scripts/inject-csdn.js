chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'csdn') return;

  console.log('[Octopus COSE] CSDN Injection Started.');

  const checkReady = setInterval(() => {
    const editor = document.querySelector('.editor');
    const titleInput = document.querySelector('.article-bar__title');
    
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] CSDN Editor found. Injecting payload.');
      
      if (titleInput) {
        titleInput.value = payload.meta.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', payload.markdown);
      dataTransfer.setData('text/html', payload.html);
      
      editor.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      }));

      chrome.storage.local.remove('octopus_sync_payload');
    }
  }, 1500);
});
