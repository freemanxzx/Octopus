import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content, encoding) => ipcRenderer.invoke('write-file', filePath, content, encoding)
});
contextBridge.exposeInMainWorld('wechatAPI', {
    fetchAccessToken: (appId, appSecret) => ipcRenderer.invoke('wechat-fetch-access-token', appId, appSecret),
    uploadMaterial: (accessToken, filePath, mimeType, type) => ipcRenderer.invoke('wechat-upload-material', accessToken, filePath, mimeType, type),
    publishArticle: (accessToken, publishOptions) => ipcRenderer.invoke('wechat-publish-article', accessToken, publishOptions)
});
contextBridge.exposeInMainWorld('platformAPI', {
    publishToZhihu: (cookie, title, content) => ipcRenderer.invoke('platform-publish-zhihu', cookie, title, content),
    publishToJuejin: (cookie, title, content) => ipcRenderer.invoke('platform-publish-juejin', cookie, title, content),
    publishToCSDN: (cookie, title, content) => ipcRenderer.invoke('platform-publish-csdn', cookie, title, content)
});
