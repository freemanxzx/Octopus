chrome.storage.local.get(['octopus_sync_payload'], (result) => {
  const payload = result.octopus_sync_payload;
  if (!payload || payload.target !== 'twitter') return;

  console.log('[Octopus COSE] Twitter Injection Started.');

  // Clean raw markdown to inject.
  const checkReady = setInterval(() => {
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
