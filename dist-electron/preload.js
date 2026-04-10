import { contextBridge as e, ipcRenderer as t } from "electron";
e.exposeInMainWorld("electronAPI", {
	readFile: (e) => t.invoke("read-file", e),
	writeFile: (e, n, r) => t.invoke("write-file", e, n, r)
}), e.exposeInMainWorld("wechatAPI", {
	fetchAccessToken: (e, n) => t.invoke("wechat-fetch-access-token", e, n),
	uploadMaterial: (e, n, r, i) => t.invoke("wechat-upload-material", e, n, r, i),
	publishArticle: (e, n) => t.invoke("wechat-publish-article", e, n)
}), e.exposeInMainWorld("platformAPI", {
	publishToZhihu: (e, n, r) => t.invoke("platform-publish-zhihu", e, n, r),
	publishToJuejin: (e, n, r) => t.invoke("platform-publish-juejin", e, n, r),
	publishToCSDN: (e, n, r) => t.invoke("platform-publish-csdn", e, n, r)
});
//#endregion
