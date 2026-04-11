chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'juejin') return;

  console.log('[Octopus COSE] Juejin Injection Started.');

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
