chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'csdn') return;

  console.log('[Octopus MD Sync] CSDN Injection Started.');

  let attempts = 0;
  const checkReady = setInterval(() => {
    attempts++;
    if (attempts > 8) {
      clearInterval(checkReady);
      console.warn('[Octopus MD Sync] Target editor unresolvable (DOM changed). Degrading to manual paste.');
      alert('🐙 Octopus MD Sync: 无法自动锁定输入框。\n请在此页面的输入框内直接按下 Ctrl+V 完成格式无损粘贴。');
      chrome.storage.local.remove('octopus_sync_payload');
      return;
    }
    const iframe = document.querySelector('iframe');
    let editor = null;
    if (iframe) {
       const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
       if (iframeDoc) editor = iframeDoc.querySelector('[contenteditable="true"]');
    }
    if (!editor) {
       editor = document.querySelector('.editor') || document.querySelector('[contenteditable="true"]');
    }
    const titleInput = document.querySelector('#txtTitle') || document.querySelector('.article-bar__title');
    
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus MD Sync] CSDN Editor found. Injecting payload.');
      
      if (titleInput) {
        titleInput.value = payload.meta.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
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
    }
  }, 1500);
});
