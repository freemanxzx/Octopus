window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  if (event.data && event.data.type === 'OCTOPUS_EMIT_SYNC') {
    console.log('🐙 [Octopus COSE Bridge] Received synchronization payload from vue app.', event.data.payload.target);
    
    // Forward the payload to the Manifest V3 background worker
    chrome.runtime.sendMessage(
      {
        type: 'OCTOPUS_SYNC_PAYLOAD',
        payload: event.data.payload
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('🐙 [Octopus COSE Bridge] Communication Error:', chrome.runtime.lastError);
          window.postMessage({ type: 'OCTOPUS_SYNC_RESULT', success: false, error: chrome.runtime.lastError.message }, '*');
        } else {
          console.log('🐙 [Octopus COSE Bridge] Background Worker acknowledged:', response);
          window.postMessage({ type: 'OCTOPUS_SYNC_RESULT', success: true }, '*');
        }
      }
    );
  }
});

// Acknowledge installation explicitly
window.postMessage({ type: 'OCTOPUS_COSE_INSTALLED', version: '1.0.0' }, '*');
console.log('🐙 [Octopus COSE Bridge] Successfully injected and waiting for IPC payloads.');
