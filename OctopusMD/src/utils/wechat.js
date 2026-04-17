export async function syncToWechatDraft(htmlContent, title, config) {
    const { wechatAppId, wechatAppSecret } = config;
    if (!wechatAppId || !wechatAppSecret) {
        throw new Error('未配置微信公众平台 AppID 和 AppSecret。请在图床/高级配置中填写。');
    }
    if (!window.wechatAPI) {
        throw new Error('一键直接推流属于 Desktop 桌面端越权专属特性。在 Web SaaS 模式下因受浏览器的 CORS 网络域限制而无法使用，请使用原生客户端。');
    }
    try {
        // 1. Access Token Extraction via Native Bypass
        const authData = await window.wechatAPI.fetchAccessToken(wechatAppId, wechatAppSecret);
        const token = authData.accessToken;
        let thumbMediaId = config;
        thumbMediaId = thumbMediaId.wechatThumbMediaId || '';
        // For a highly robust implementation, draft requires a permanent image media ID.
        // If empty, the WeChat API draft/add might reject it explicitly with errcode: 40007.
        // We strictly enforce it as a warning.
        if (!thumbMediaId) {
            throw new Error('未配置默认图文推流封面 (Thumb Media ID)。微信强制要求文章具有一个在自身素材库永久有效的图片Media_ID作为封面。');
        }
        const payload = {
            title: title || 'Octopus MD 云端一键下发同步',
            author: 'Octopus MD Desktop',
            digest: '此篇文稿由 Octopus MD 桌面端原生接口极速下发，彻底告别浏览器手动复制粘贴',
            content: htmlContent,
            content_source_url: '',
            thumb_media_id: thumbMediaId,
            need_open_comment: 0,
            only_fans_can_comment: 0
        };
        const articleId = await window.wechatAPI.publishArticle(token, payload);
        return articleId;
    }
    catch (error) {
        throw new Error(error.message || '微信同步接口内部异常，请检查 AppSecret 或源。');
    }
}
