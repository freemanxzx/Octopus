chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OCTOPUS_SYNC_PAYLOAD') {
    const payload = request.payload;
    console.log('[Octopus MD Background] Received sync payload for target:', payload.target);
    
    // Save to local extension storage where injectors can retrieve it
    chrome.storage.local.set({ octopus_sync_payload: payload }, () => {
      // Determine URL to open
      let url = '';
      switch(payload.target) {
        case 'wechat': url = 'https://mp.weixin.qq.com/'; break;
        case 'zhihu': url = 'https://zhuanlan.zhihu.com/write'; break;
        case 'juejin': url = 'https://juejin.cn/editor/drafts/new'; break;
        case 'csdn': url = 'https://mp.csdn.net/mp_blog/creation/editor'; break;
        case 'weibo': url = 'https://weibo.com/'; break;
        case 'twitter': url = 'https://twitter.com/compose/tweet'; break;
        default: console.warn('Unknown target platform:', payload.target);
      }
      
      if (url) {
        chrome.tabs.create({ url: url }, (tab) => {
          sendResponse({ success: true, tabId: tab.id });
        });
      } else {
        sendResponse({ success: false, error: 'Unknown target platform string.' });
      }
    });
    
    return true; // Keep message channel open for async response
  }
});
