async function loadLauncherItems() {
    return await window.launcherAPI.loadData();
}


async function saveLauncherItems(items, options = {}) {
    return await window.launcherAPI.saveData(items, options);
}
