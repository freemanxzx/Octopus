import axios from 'axios';
const tokenUrl = "https://api.weixin.qq.com/cgi-bin/token";
const publishUrl = "https://api.weixin.qq.com/cgi-bin/draft/add";
const uploadUrl = "https://api.weixin.qq.com/cgi-bin/material/add_material";
export async function fetchAccessToken(appId, appSecret) {
    const url = `${tokenUrl}?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const response = await axios.get(url);
    const data = response.data;
    if (data.access_token) {
        return { accessToken: data.access_token, expiresIn: data.expires_in };
    }
    else {
        throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
    }
}
export async function uploadMaterial(accessToken, fileBuffer, fileName, mimeType, type = 'image') {
    const url = `${uploadUrl}?access_token=${accessToken}&type=${type}`;
    const form = new FormData();
    form.append('media', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName);
    const response = await axios.post(url, form);
    const data = response.data;
    if (data.media_id && data.url) {
        return { mediaId: data.media_id, url: data.url.replace('http://', 'https://') };
    }
    else {
        throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
    }
}
export async function publishArticle(accessToken, publishOptions) {
    const url = `${publishUrl}?access_token=${accessToken}`;
    const payload = { articles: [publishOptions] };
    const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    const data = response.data;
    if (data.media_id) {
        return data.media_id;
    }
    else {
        throw new Error(`WeChat API Error: ${data.errcode} - ${data.errmsg}`);
    }
}
