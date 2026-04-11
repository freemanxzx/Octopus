chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'weibo') return;

  console.log('[Octopus COSE] Weibo Injection Started.');

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
