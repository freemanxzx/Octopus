import * as qiniu from 'qiniu-js';
import CryptoJS from 'crypto-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};
const toBase64Raw = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const base64Content = data.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};
const generateFilename = (file) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'png';
    return `${timestamp}-${randomStr}.${ext}`;
};
const compressImage = (file, quality = 0.85) => {
    return new Promise((resolve) => {
        // Only compress extremely large static images (> 1MB)
        if (file.size < 1024 * 1024 || file.type === 'image/gif')
            return resolve(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                // Bounding box constrain to standard 1080p lengths
                if (width > 1920) {
                    height = Math.round(1920 * height / width);
                    width = 1920;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx)
                    return resolve(file);
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                        resolve(newFile);
                    }
                    else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.src = e.target?.result;
        };
        reader.readAsDataURL(file);
    });
};
export const uploadImage = async (inputFile, config) => {
    const file = await compressImage(inputFile);
    if (config.provider === 'base64') {
        return await toBase64(file);
    }
    if (config.provider === 'picgo') {
        const formData = new FormData();
        formData.append('list', file, file.name);
        const response = await fetch('http://127.0.0.1:36677/upload', { method: 'POST', body: formData });
        const parsed = await response.json();
        if (parsed.success && parsed.result && parsed.result.length > 0)
            return parsed.result[0];
        throw new Error(parsed.message || 'PicGo Upload Failed');
    }
    if (config.provider === 'github') {
        if (!config.githubToken || !config.githubRepo)
            throw new Error('GitHub configuration is incomplete.');
        const branch = config.githubBranch || 'main';
        const path = config.githubPath || 'images';
        const filename = generateFilename(file);
        const apiUrl = `https://api.github.com/repos/${config.githubRepo}/contents/${path}/${filename}`;
        const base64Content = await toBase64Raw(file);
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Authorization': `token ${config.githubToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Upload ${filename} via Octopus MD`, content: base64Content, branch }),
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(`GitHub Upload Error: ${errData.message || res.status}`);
        }
        return `https://fastly.jsdelivr.net/gh/${config.githubRepo}@${branch}/${path}/${filename}`;
    }
    // Common Key checks for S3/Qiniu forms
    const { accessKey, secretKey, bucket, region, path: s3Path, domain } = config;
    const dir = s3Path ? `${s3Path}/` : '';
    const dateFilename = dir + generateFilename(file);
    if (config.provider === 'qiniu') {
        if (!accessKey || !secretKey || !bucket || !domain)
            throw new Error('Qiniu configuration is incomplete');
        const policy = JSON.stringify({ scope: bucket, deadline: Math.trunc(Date.now() / 1000) + 3600 });
        const encoded = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(policy));
        const hash = CryptoJS.HmacSHA1(encoded, secretKey);
        const encodedSigned = hash.toString(CryptoJS.enc.Base64);
        const safe64 = (s) => s.replace(/\+/g, '-').replace(/\//g, '_');
        const token = `${accessKey}:${safe64(encodedSigned)}:${safe64(encoded)}`;
        return new Promise((resolve, reject) => {
            qiniu.upload(file, dateFilename, token, {}, { region: region || 'z0' }).subscribe({
                error: (err) => reject(err.message),
                complete: (res) => resolve(`${domain.replace(/\/$/, '')}/${res.key}`)
            });
        });
    }
    if (config.provider === 'alioss' || config.provider === 'txcos') {
        if (!accessKey || !secretKey || !bucket || !region)
            throw new Error(`${config.provider.toUpperCase()} configuration is incomplete`);
        const endpoint = config.provider === 'alioss'
            ? `https://${region}.aliyuncs.com`
            : `https://cos.${region}.myqcloud.com`;
        const s3Client = new S3Client({
            region,
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
            endpoint,
            forcePathStyle: false
        });
        const command = new PutObjectCommand({ Bucket: bucket, Key: dateFilename, ContentType: file.type });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const res = await window.fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
        });
        if (!res.ok)
            throw new Error(`${config.provider.toUpperCase()} Upload Failed: ${res.statusText}`);
        if (config.provider === 'alioss') {
            return `https://${bucket}.${region}.aliyuncs.com/${dateFilename}`;
        }
        else {
            return `https://${bucket}.cos.${region}.myqcloud.com/${dateFilename}`;
        }
    }
    throw new Error('Unknown Provider');
};
