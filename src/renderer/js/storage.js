async function loadLauncherItems() {
    return await window.launcherAPI.loadData();
}


async function saveLauncherItems(items) {
    return await window.launcherAPI.saveData(items);
}