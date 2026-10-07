const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld(
    'launcherAPI',
    {

        loadData: () => ipcRenderer.invoke(
            'load-launcher-data'
        ),


        saveData: (items, options = {}) => ipcRenderer.invoke(
            'save-launcher-data',
            items,
            options
        ),

        applyBehaviorSettings: (settings) => ipcRenderer.invoke(
            'apply-behavior-settings',
            settings
        ),


        openWebsite: (url) => ipcRenderer.invoke(
            'open-website',
            url
        ),


        openWebApp: (itemId, name, url) => ipcRenderer.invoke(
            'open-webapp',
            itemId,
            name,
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
        ),

        fetchFavicon: (targetUrl) => ipcRenderer.invoke(
            'fetch-favicon',
            targetUrl
        ),


        fetchAppIcon: (applicationPath) => ipcRenderer.invoke(
            'fetch-app-icon',
            applicationPath
        )

    }
);