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