const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
    loadData: () => ipcRenderer.invoke('load-launcher-data'),

    saveData: (items) => ipcRenderer.invoke(
        'save-launcher-data',
        items
    )
});