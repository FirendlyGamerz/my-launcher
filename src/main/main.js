const {
    app,
    BrowserWindow,
    ipcMain,
    shell,
    clipboard,
    dialog,
    Tray,
    Menu,
    nativeImage,
    globalShortcut
} = require('electron');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const dataFile = path.join(
    app.getPath('userData'),
    'launcher-data.json'
);
const behaviorSettingsFile = path.join(
    app.getPath('userData'),
    'launcher-behavior.json'
);

let isQuitting = false;

function loadBehaviorSettings() {
    try {
        if (!fs.existsSync(behaviorSettingsFile)) return {};
        const value = JSON.parse(fs.readFileSync(behaviorSettingsFile, 'utf8'));
        return value && typeof value === 'object' ? value : {};
    } catch {
        return {};
    }
}

function saveBehaviorSettings(settings) {
    try {
        const tempFile = behaviorSettingsFile + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(settings, null, 2), 'utf8');
        fs.renameSync(tempFile, behaviorSettingsFile);
        return true;
    } catch (error) {
        console.error('Failed to save behavior settings:', error);
        return false;
    }
}

const imagesDir = app.isPackaged
    ? path.join(
        app.getPath('userData'),
        'images'
    )
    : path.join(
        app.getAppPath(),
        'images'
    );

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const webAppWindows = new Map();

let mainWindow = null;
let tray = null;
let trayEnabled = false;
let startMinimized = false;
let registeredHotkey = null;

function registerGlobalHotkey(accelerator) {
    if (registeredHotkey) {
        globalShortcut.unregister(registeredHotkey);
        registeredHotkey = null;
    }

    if (!accelerator || accelerator === 'disabled') return;

    try {
        if (globalShortcut.register(accelerator, () => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            else if (mainWindow.isFocused()) mainWindow.hide();
            else mainWindow.show();
            if (mainWindow.isVisible()) mainWindow.focus();
        })) {
            registeredHotkey = accelerator;
        }
    } catch (error) {
        console.error('Failed to register global hotkey:', error);
    }
}

function createTray() {
    if (tray || !trayEnabled) return;

    const trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR4nGO0bvr2n4ECwESJ5lEDRg0YNWAwGQAAMLgC0lzzz3wAAAAASUVORK5CYII=');
    tray = new Tray(trayIcon);
    tray.setToolTip('My Launcher');
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: 'Open My Launcher',
            click: () => {
                if (!mainWindow || mainWindow.isDestroyed()) return;
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                isQuitting = true;
                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
                app.quit();
            }
        }
    ]));
}

function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

function applyBehaviorSettings(settings = {}) {
    if (typeof settings.autoStart === 'boolean') {
        app.setLoginItemSettings({ openAtLogin: settings.autoStart });
    }

    if (typeof settings.minimizeToTray === 'boolean') {
        trayEnabled = settings.minimizeToTray;
        if (trayEnabled) createTray();
        else destroyTray();
    }

    if (typeof settings.startMinimized === 'boolean') {
        startMinimized = settings.startMinimized;
    }

    if (typeof settings.hotkey === 'string') {
        registerGlobalHotkey(settings.hotkey);
    }

    saveBehaviorSettings({
        autoStart: Boolean(settings.autoStart),
        minimizeToTray: Boolean(settings.minimizeToTray),
        startMinimized: Boolean(settings.startMinimized),
        hotkey: typeof settings.hotkey === 'string' ? settings.hotkey : 'disabled'
    });
}


function createWindow() {

    const window = new BrowserWindow({

        width: 1000,

        height: 700,

        minWidth: 520,

        minHeight: 420,

        webPreferences: {

            preload: path.join(
                __dirname,
                'preload.js'
            ),

            contextIsolation: true,

            nodeIntegration: false

        }

    });


    mainWindow = window;

    window.on('close', (event) => {
        if (trayEnabled && !isQuitting) {
            event.preventDefault();
            window.hide();
        }
    });

    window.on('closed', () => {
        mainWindow = null;
    });

    window.loadFile(
        'src/renderer/index.html'
    );

    if (startMinimized) {
        window.once('ready-to-show', () => window.hide());
    }
}


ipcMain.handle('apply-behavior-settings', (event, settings) => {
    applyBehaviorSettings(settings || {});
    return true;
});

ipcMain.handle('load-launcher-data', () => {

    try {

        if (!fs.existsSync(dataFile)) {

            return [];

        }


        const data = fs.readFileSync(
            dataFile,
            'utf8'
        );


        return JSON.parse(data);

    }

    catch (error) {
        console.error('Failed to load launcher data:', error);

        try {
            if (fs.existsSync(dataFile)) {
                const corruptFile = dataFile + '.corrupt-' + Date.now();
                fs.copyFileSync(dataFile, corruptFile);
            }
        } catch (backupError) {
            console.error('Failed to preserve corrupt launcher data:', backupError);
        }

        return [];
    }

});


ipcMain.handle(
    'save-launcher-data',
    (event, items) => {

        try {

            const serialized = JSON.stringify(items, null, 4);
        const tempFile = dataFile + '.tmp';
        fs.writeFileSync(tempFile, serialized, 'utf8');
        fs.renameSync(tempFile, dataFile);

        return true;

        }

        catch (error) {

            console.error(
                'Failed to save launcher data:',
                error
            );

            return false;

        }

    }
);


// Favicon auto-fetch, local save & offline fallback handler
ipcMain.handle('fetch-favicon', async (event, targetUrl) => {
    try {
        if (!targetUrl) return null;
        const parsed = new URL(targetUrl);
        const domain = parsed.hostname;
        const sanitizedDomain = domain.replace(/[^a-z0-9]/gi, '_');
        const filePath = path.join(imagesDir, `${sanitizedDomain}.png`);

        if (fs.existsSync(filePath)) {
            const bitmap = fs.readFileSync(filePath);
            const base64 = Buffer.from(bitmap).toString('base64');
            return `data:image/png;base64,${base64}`;
        }

        const faviconApiUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        const fetchImageWithRedirects = (url, resolve, redirects = 0) => {
            if (redirects > 5) {
                resolve(null);
                return;
            }

            let requestUrl;
            try {
                requestUrl = new URL(url);
                if (requestUrl.protocol !== 'https:') {
                    resolve(null);
                    return;
                }
            } catch {
                resolve(null);
                return;
            }

            const request = https.get(requestUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    try {
                        const nextUrl = new URL(res.headers.location, requestUrl);
                        if (nextUrl.protocol !== 'https:') {
                            resolve(null);
                            res.resume();
                            return;
                        }
                        return fetchImageWithRedirects(nextUrl.href, resolve, redirects + 1);
                    } catch {
                        resolve(null);
                        res.resume();
                        return;
                    }
                }

                if (res.statusCode === 200) {
                    let chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        if (buffer.length > 0) {
                            fs.writeFileSync(filePath, buffer);
                            const base64 = buffer.toString('base64');
                            resolve(`data:image/png;base64,${base64}`);
                        } else {
                            resolve(null);
                        }
                    });
                    res.on('error', () => resolve(null));
                } else {
                    resolve(null);
                }
            });
            request.setTimeout(5000, () => {
                request.destroy();
                resolve(null);
            });
            request.on('error', () => resolve(null));
        };

        return new Promise((resolve) => {
            fetchImageWithRedirects(faviconApiUrl, resolve);
        });
    } catch (err) {
        return null;
    }
});



// Electron ka built-in native icon extractor & local saver
ipcMain.handle('fetch-app-icon', async (event, exePath) => {
    try {
        if (!exePath || !fs.existsSync(exePath)) return null;

        const normalizedExePath = path.resolve(exePath).toLowerCase();
        const basename = path.basename(exePath, '.exe');
        const sanitizedName = basename.replace(/[^a-z0-9]/gi, '_');
        const filePath = path.join(
            imagesDir,
            `exe_${hashCode(normalizedExePath)}_${sanitizedName}.png`
        );

        // 1. Agar pehle se folder mein saved hai, toh wahi se base64 read karke bhej do
        if (fs.existsSync(filePath)) {
            const bitmap = fs.readFileSync(filePath);
            const base64 = Buffer.from(bitmap).toString('base64');
            return `data:image/png;base64,${base64}`;
        }

        // 2. Electron ki built-in API se icon nikalna
        // Size options: 'small' (16x16), 'normal' (32x32), 'large' (48x48 ya us se bara)
        const icon = await app.getFileIcon(exePath, { size: 'large' });

        if (icon && !icon.isEmpty()) {
            const pngBuffer = icon.toPNG();
            if (pngBuffer && pngBuffer.length > 0) {
                // Seedha images folder mein save kar do
                fs.writeFileSync(filePath, pngBuffer);
                const base64 = pngBuffer.toString('base64');
                return `data:image/png;base64,${base64}`;
            }
        }

        return null;
    } catch (err) {
        console.error('Failed to get app icon:', err);
        return null;
    }
});
// Helper function for unique string hash
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}


function findBravePath() {

    const possiblePaths = [

        path.join(
            process.env.LOCALAPPDATA || '',
            'BraveSoftware',
            'Brave-Browser',
            'Application',
            'brave.exe'
        ),

        path.join(
            process.env.PROGRAMFILES || '',
            'BraveSoftware',
            'Brave-Browser',
            'Application',
            'brave.exe'
        ),

        path.join(
            process.env['PROGRAMFILES(X86)'] || '',
            'BraveSoftware',
            'Brave-Browser',
            'Application',
            'brave.exe'
        )

    ];


    for (const bravePath of possiblePaths) {

        if (fs.existsSync(bravePath)) {

            return bravePath;

        }

    }


    return null;

}


function checkWebsiteAvailability(url) {

    return new Promise((resolve) => {

        let parsedUrl;


        try {

            parsedUrl = new URL(url);

        }

        catch {

            resolve(false);

            return;

        }


        const client =
            parsedUrl.protocol === 'https:'
                ? https
                : http;


        let finished = false;


        const finish = (result) => {

            if (finished) {

                return;

            }

            finished = true;

            resolve(result);

        };


        // HEAD ki bajaye GET request use kar rahe hain taake Upwork jaisi sites block na karein
        const request = client.request(
            parsedUrl,
            {
                method: 'GET',
                timeout: 4000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            },

            (response) => {

                finish(
                    response.statusCode >= 200 &&
                    response.statusCode < 400
                );

                // Connection destroy kar do taake poori website download na ho, bas status mil jaye
                response.destroy();

            }

        );


        request.on('timeout', () => {

            request.destroy();

            finish(false);

        });


        request.on('error', () => {

            finish(false);

        });


        request.end();

    });

}


ipcMain.handle(
    'check-website',
    async (event, url) => {

        try {

            if (
                typeof url !== 'string' ||
                !url.trim()
            ) {

                return {
                    valid: false,
                    available: false,
                    url: null
                };

            }


            let normalizedUrl =
                url.trim();


            if (
                !/^https?:\/\//i.test(
                    normalizedUrl
                )
            ) {

                normalizedUrl =
                    `https://${normalizedUrl}`;

            }


            const parsedUrl =
                new URL(normalizedUrl);


            if (
                parsedUrl.protocol !== 'http:' &&
                parsedUrl.protocol !== 'https:'
            ) {

                return {
                    valid: false,
                    available: false,
                    url: null
                };

            }


            if (!parsedUrl.hostname) {

                return {
                    valid: false,
                    available: false,
                    url: null
                };

            }


            const available =
                await checkWebsiteAvailability(
                    parsedUrl.href
                );


            return {
                valid: true,
                available: available,
                url: parsedUrl.href
            };

        }

        catch (error) {

            console.error(
                'Website validation failed:',
                error
            );

            return {
                valid: false,
                available: false,
                url: null
            };

        }

    }
);


ipcMain.handle(
    'open-website',
    async (event, url) => {

        try {

            if (
                typeof url !== 'string' ||
                !/^https?:\/\//i.test(url)
            ) {

                return false;

            }


            await shell.openExternal(url);

            return true;

        }

        catch (error) {

            console.error(
                'Failed to open website:',
                error
            );

            return false;

        }

    }
);




ipcMain.handle(
    'open-webapp',
    async (event, itemId, name, url) => {

        try {

            if (
                typeof url !== 'string' ||
                !/^https?:\/\//i.test(url)
            ) {

                return {
                    success: false,
                    message:
                        'The web app URL is not a valid HTTPS address.'
                };

            }

            const parsedUrl =
                new URL(url);

            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return {
                    success: false,
                    message: 'The web app URL must use HTTP or HTTPS.'
                };
            }

            const existingWindow =
                webAppWindows.get(
                    itemId
                );

            if (
                existingWindow &&
                !existingWindow.isDestroyed()
            ) {
                if (existingWindow.__launcherUrl !== parsedUrl.href) {
                    existingWindow.__launcherUrl = parsedUrl.href;
                    await existingWindow.loadURL(parsedUrl.href);
                }
                existingWindow.show();
                existingWindow.focus();

                return {
                    success: true,
                    existing: true
                };
            }

            const webAppWindow =
                new BrowserWindow({

                    width: 1200,

                    height: 800,

                    minWidth: 800,

                    minHeight: 500,

                    title:
                        typeof name === 'string' &&
                            name.trim()
                            ? name.trim()
                            : 'Web App',

                    backgroundColor:
                        '#080808',

                    webPreferences: {

                        nodeIntegration:
                            false,

                        contextIsolation:
                            true,

                        sandbox:
                            true

                    }

                });

            webAppWindow.__launcherUrl = parsedUrl.href;
            webAppWindows.set(itemId, webAppWindow);

            webAppWindow.on(
                'closed',
                () => {

                    webAppWindows.delete(
                        itemId
                    );

                }
            );

            webAppWindow.webContents.setWindowOpenHandler(
                ({ url: requestedUrl }) => {

                    if (/^https?:\/\//i.test(requestedUrl)) {

                        shell.openExternal(
                            requestedUrl
                        );

                    }

                    return {
                        action: 'deny'
                    };

                }
            );

            webAppWindow.loadURL(parsedUrl.href).catch(async (error) => {
                console.error('Web app page failed to load:', error);
                if (webAppWindow.isDestroyed()) return;

                const message = String(error && error.message || 'The page could not be loaded.')
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;');

                const errorHtml = `<!doctype html><html><body style="background:#080808;color:#f5f5f5;font-family:Arial;padding:48px"><h2>Web App could not be loaded</h2><p>${message}</p><button onclick="location.reload()">Retry</button></body></html>`;
                await webAppWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
            });

            return {
                success: true,
                existing: false
            };

        }

        catch (error) {

            console.error(
                'Failed to open web app:',
                error
            );

            return {
                success: false,
                message:
                    'The web app could not be opened.'
            };

        }

    }
);

ipcMain.handle(
    'select-application',
    async () => {

        try {

            const result =
                await dialog.showOpenDialog({

                    title: 'Select Windows Application',

                    properties: [
                        'openFile'
                    ],

                    filters: [
                        {
                            name: 'Windows Applications',
                            extensions: ['exe']
                        }
                    ]

                });


            if (
                result.canceled ||
                !result.filePaths.length
            ) {

                return {
                    canceled: true,
                    path: null
                };

            }


            return {
                canceled: false,
                path: result.filePaths[0]
            };

        }

        catch (error) {

            console.error(
                'Failed to select application:',
                error
            );

            return {
                canceled: true,
                path: null
            };

        }

    }
);


ipcMain.handle(
    'check-application',
    (event, applicationPath) => {

        try {

            if (
                typeof applicationPath !== 'string' ||
                !applicationPath.trim()
            ) {

                return {
                    valid: false,
                    exists: false
                };

            }


            const normalizedPath =
                applicationPath.trim();


            const extension =
                path.extname(normalizedPath)
                    .toLowerCase();


            if (extension !== '.exe') {

                return {
                    valid: false,
                    exists: false
                };

            }


            return {
                valid: true,
                exists:
                    fs.existsSync(
                        normalizedPath
                    )
            };

        }

        catch (error) {

            console.error(
                'Application validation failed:',
                error
            );

            return {
                valid: false,
                exists: false
            };

        }

    }
);


ipcMain.handle(
    'open-application',
    (event, applicationPath) => {

        try {

            if (
                typeof applicationPath !== 'string' ||
                !applicationPath.trim()
            ) {

                return {
                    success: false,
                    message:
                        'No application path was provided.'
                };

            }


            const normalizedPath =
                applicationPath.trim();


            if (
                path.extname(normalizedPath)
                    .toLowerCase() !== '.exe'
            ) {

                return {
                    success: false,
                    message:
                        'The saved application is not a valid .exe file.'
                };

            }


            if (
                !fs.existsSync(
                    normalizedPath
                )
            ) {

                return {
                    success: false,
                    message:
                        'The application file was not found. It may have been moved or deleted.'
                };

            }


            const applicationProcess =
                spawn(
                    normalizedPath,
                    [],
                    {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: false,
                        cwd: path.dirname(normalizedPath)
                    }
                }
            );

            let launchError = null;
            applicationProcess.once('error', (error) => {
                launchError = error;
                console.error('Application process failed:', error);
            });

            applicationProcess.unref();

            if (launchError) {
                return {
                    success: false,
                    message: 'Windows could not start this application.'
                };
            }

            return {
                success: true,
                message: null
            };

        }

        catch (error) {

            console.error(
                'Failed to open application:',
                error
            );

            return {
                success: false,
                message:
                    'Windows could not start this application.'
            };

        }

    }
);


ipcMain.handle(
    'copy-to-clipboard',
    (event, text) => {

        try {

            if (
                typeof text !== 'string' ||
                !text
            ) {

                return { success: false };

            }


            clipboard.writeText(text);

            return { success: true };

        }

        catch (error) {

            console.error(
                'Failed to copy text:',
                error
            );

            return { success: false };

        }

    }
);


const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
} else {
app.whenReady().then(() => {
    applyBehaviorSettings({
        ...loadBehaviorSettings()
    });
    createWindow();
});

app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('will-quit', () => {
    if (registeredHotkey) {
        globalShortcut.unregister(registeredHotkey);
        registeredHotkey = null;
    }
    destroyTray();
});
}
