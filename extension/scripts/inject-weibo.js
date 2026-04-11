chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'weibo') return;

  console.log('[Octopus COSE] Weibo Injection Started.');

  const checkReady = setInterval(() => {
    // Weibo home composer textarea
    const editor = document.querySelector('textarea.Form_input_3-oM8');
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] Weibo Editor found. Injecting payload.');
      
      editor.focus();
      editor.value = payload.meta.title + "\n\n" + payload.markdown;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      chrome.storage.local.remove('octopus_sync_payload');
    }
  }, 1000);
});
