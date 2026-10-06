const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(
    app.getPath('userData'),
    'launcher-data.json'
);


function createWindow() {

    console.log("Preload path:", path.join(__dirname, 'preload.js'));

    const window = new BrowserWindow({
        width: 1000,
        height: 700,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    window.loadFile('src/renderer/index.html');
}


ipcMain.handle('load-launcher-data', () => {
    try {
        if (!fs.existsSync(dataFile)) {
            return [];
        }

        const data = fs.readFileSync(dataFile, 'utf8');

        return JSON.parse(data);

    } catch (error) {
        console.error('Failed to load launcher data:', error);

        return [];
    }
});


ipcMain.handle('save-launcher-data', (event, items) => {
    try {
        fs.writeFileSync(
            dataFile,
            JSON.stringify(items, null, 4),
            'utf8'
        );

        return true;

    } catch (error) {
        console.error('Failed to save launcher data:', error);

        return false;
    }
});


app.whenReady().then(() => {
    createWindow();
});