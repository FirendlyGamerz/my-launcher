const {
    app,
    BrowserWindow,
    ipcMain,
    shell,
    clipboard,
    dialog
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

const webAppWindows = new Map();


function createWindow() {

    const window = new BrowserWindow({

        width: 1000,

        height: 700,

        webPreferences: {

            preload: path.join(
                __dirname,
                'preload.js'
            ),

            contextIsolation: true,

            nodeIntegration: false

        }

    });


    window.loadFile(
        'src/renderer/index.html'
    );

}


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

        console.error(
            'Failed to load launcher data:',
            error
        );

        return [];

    }

});


ipcMain.handle(
    'save-launcher-data',
    (event, items) => {

        try {

            fs.writeFileSync(

                dataFile,

                JSON.stringify(
                    items,
                    null,
                    4
                ),

                'utf8'

            );


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


        const request = client.request(

            parsedUrl,

            {
                method: 'HEAD',

                timeout: 2500,

                headers: {
                    'User-Agent':
                        'My-Launcher/1.0'
                }
            },

            (response) => {

                finish(
                    response.statusCode >= 200 &&
                    response.statusCode < 400
                );

                response.resume();

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


            const bravePath =
                findBravePath();


            if (bravePath) {

                const braveProcess =
                    spawn(
                        bravePath,
                        [url],
                        {
                            detached: true,
                            stdio: 'ignore'
                        }
                    );

                braveProcess.unref();

                return true;

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
                !/^https:\/\//i.test(url)
            ) {

                return {
                    success: false,
                    message:
                        'The web app URL is not a valid HTTPS address.'
                };

            }

            const parsedUrl =
                new URL(url);

            if (
                parsedUrl.protocol !== 'https:'
            ) {

                return {
                    success: false,
                    message:
                        'Web Apps currently require an HTTPS website.'
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

            webAppWindows.set(
                itemId,
                webAppWindow
            );

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

                    if (
                        /^https:\/\//i.test(
                            requestedUrl
                        )
                    ) {

                        shell.openExternal(
                            requestedUrl
                        );

                    }

                    return {
                        action: 'deny'
                    };

                }
            );

            await webAppWindow.loadURL(
                parsedUrl.href
            );

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
                        windowsHide: false
                    }
                );


            applicationProcess.unref();


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

                return false;

            }


            clipboard.writeText(text);

            return true;

        }

        catch (error) {

            console.error(
                'Failed to copy text:',
                error
            );

            return false;

        }

    }
);


app.whenReady().then(() => {

    createWindow();

});