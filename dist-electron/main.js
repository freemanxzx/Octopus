import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { fetchAccessToken, uploadMaterial, publishArticle } from './wechatApi.js';
import { publishToZhihu, publishToJuejin, publishToCSDN } from './platformPublisher.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    // Strip out the legacy OS-level native menu bar (File, Edit, View, etc.)
    mainWindow.setMenu(null);
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
app.whenReady().then(() => {
    ipcMain.handle('read-file', async (_, filePath) => {
        return fs.promises.readFile(filePath, 'utf-8');
    });
    ipcMain.handle('write-file', async (_, filePath, content, encoding = 'utf-8') => {
        await fs.promises.writeFile(filePath, content, encoding);
        return true;
    });
    ipcMain.handle('wechat-fetch-access-token', async (_, appId, appSecret) => {
        return await fetchAccessToken(appId, appSecret);
    });
    ipcMain.handle('wechat-upload-material', async (_, accessToken, filePath, mimeType, type) => {
        const fileBuffer = await fs.promises.readFile(filePath);
        const fileName = path.basename(filePath);
        return await uploadMaterial(accessToken, fileBuffer, fileName, mimeType, type);
    });
    ipcMain.handle('wechat-publish-article', async (_, accessToken, publishOptions) => {
        return await publishArticle(accessToken, publishOptions);
    });
    ipcMain.handle('platform-publish-zhihu', async (_, cookie, title, content) => {
        return await publishToZhihu(cookie, title, content);
    });
    ipcMain.handle('platform-publish-juejin', async (_, cookie, title, content) => {
        return await publishToJuejin(cookie, title, content);
    });
    ipcMain.handle('platform-publish-csdn', async (_, cookie, title, content) => {
        return await publishToCSDN(cookie, title, content);
    });
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
