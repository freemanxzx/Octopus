chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'twitter') return;

  console.log('[Octopus COSE] Twitter Injection Started.');

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
    const editor = document.querySelector('.public-DraftEditor-content');
    if (editor) {
      clearInterval(checkReady);
      console.log('[Octopus COSE] Twitter Editor found. Injecting payload.');
      
      const tweetText = payload.meta.title + "\n\n" + payload.markdown.substring(0, 200) + "... (Follow link to read more)";
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', tweetText);
      
      editor.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      }));

      // Cleanup payload once injected
      chrome.storage.local.remove('octopus_sync_payload');
    }
  }, 1000);
});
