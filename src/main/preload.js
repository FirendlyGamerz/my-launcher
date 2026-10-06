const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld(
    'launcherAPI',
    {

        loadData: () => ipcRenderer.invoke(
            'load-launcher-data'
        ),


        saveData: (items) => ipcRenderer.invoke(
            'save-launcher-data',
            items
        ),


        openWebsite: (url) => ipcRenderer.invoke(
            'open-website',
            url
        ),


        checkWebsite: (url) => ipcRenderer.invoke(
            'check-website',
            url
        ),


        selectApplication: () => ipcRenderer.invoke(
            'select-application'
        ),


        checkApplication: (applicationPath) => ipcRenderer.invoke(
            'check-application',
            applicationPath
        ),


        openApplication: (applicationPath) => ipcRenderer.invoke(
            'open-application',
            applicationPath
        ),


        copyToClipboard: (text) => ipcRenderer.invoke(
            'copy-to-clipboard',
            text
        )

    }
);