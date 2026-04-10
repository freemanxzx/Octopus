import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string, encoding?: string) => ipcRenderer.invoke('write-file', filePath, content, encoding)
});

contextBridge.exposeInMainWorld('wechatAPI', {
  fetchAccessToken: (appId: string, appSecret: string) => ipcRenderer.invoke('wechat-fetch-access-token', appId, appSecret),
  uploadMaterial: (accessToken: string, filePath: string, mimeType: string, type: string) => ipcRenderer.invoke('wechat-upload-material', accessToken, filePath, mimeType, type),
  publishArticle: (accessToken: string, publishOptions: any) => ipcRenderer.invoke('wechat-publish-article', accessToken, publishOptions)
});

contextBridge.exposeInMainWorld('platformAPI', {
  publishToZhihu: (cookie: string, title: string, content: string) => ipcRenderer.invoke('platform-publish-zhihu', cookie, title, content),
  publishToJuejin: (cookie: string, title: string, content: string) => ipcRenderer.invoke('platform-publish-juejin', cookie, title, content),
  publishToCSDN: (cookie: string, title: string, content: string) => ipcRenderer.invoke('platform-publish-csdn', cookie, title, content)
});
