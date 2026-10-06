let launcherItems = [];

let contextMenuItem = null;

let deleteTargetItem = null;

let editingItemId = null;


/* ==============================
   Settings State & Logic
================================= */

const SETTINGS_STORAGE_KEY = "my_launcher_settings";

let appSettings = {
    theme: "dark",
    density: "comfortable",
    accentColor: "#3b82f6",
    autoStart: false,
    minimizeToTray: true,
    startMinimized: false,
    hotkey: "Alt+Space"
};

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
    applySettings();
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
    applySettings();
}

function applySettings() {
    if (appSettings.theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
        document.documentElement.setAttribute("data-theme", appSettings.theme);
    }

    if (appSettings.density === "compact") {
        document.body.classList.add("layout-compact");
    } else {
        document.body.classList.remove("layout-compact");
    }

    document.documentElement.style.setProperty("--accent-color", appSettings.accentColor);

    const themeSelect = document.querySelector("#setting-theme");
    const densitySelect = document.querySelector("#setting-density");
    const autoStartToggle = document.querySelector("#setting-autostart");
    const trayToggle = document.querySelector("#setting-tray");
    const startMinToggle = document.querySelector("#setting-start-minimized");
    const hotkeySelect = document.querySelector("#setting-hotkey");

    if (themeSelect) themeSelect.value = appSettings.theme;
    if (densitySelect) densitySelect.value = appSettings.density;
    if (autoStartToggle) autoStartToggle.checked = Boolean(appSettings.autoStart);
    if (trayToggle) trayToggle.checked = Boolean(appSettings.minimizeToTray);
    if (startMinToggle) startMinToggle.checked = Boolean(appSettings.startMinimized);
    if (hotkeySelect) hotkeySelect.value = appSettings.hotkey;

    document.querySelectorAll(".accent-swatch").forEach((swatch) => {
        if (swatch.dataset.color === appSettings.accentColor) {
            swatch.classList.add("active");
        } else {
            swatch.classList.remove("active");
        }
    });
}

function initSettingsEvents() {
    const themeSelect = document.querySelector("#setting-theme");
    const densitySelect = document.querySelector("#setting-density");
    const autoStartToggle = document.querySelector("#setting-autostart");
    const trayToggle = document.querySelector("#setting-tray");
    const startMinToggle = document.querySelector("#setting-start-minimized");
    const hotkeySelect = document.querySelector("#setting-hotkey");

    if (themeSelect) {
        themeSelect.addEventListener("change", (e) => {
            appSettings.theme = e.target.value;
            saveSettings();
        });
    }

    if (densitySelect) {
        densitySelect.addEventListener("change", (e) => {
            appSettings.density = e.target.value;
            saveSettings();
        });
    }

    document.querySelectorAll(".accent-swatch").forEach((swatch) => {
        swatch.addEventListener("click", () => {
            appSettings.accentColor = swatch.dataset.color;
            saveSettings();
        });
    });

    if (autoStartToggle) {
        autoStartToggle.addEventListener("change", (e) => {
            appSettings.autoStart = e.target.checked;
            saveSettings();
        });
    }

    if (trayToggle) {
        trayToggle.addEventListener("change", (e) => {
            appSettings.minimizeToTray = e.target.checked;
            saveSettings();
        });
    }

    if (startMinToggle) {
        startMinToggle.addEventListener("change", (e) => {
            appSettings.startMinimized = e.target.checked;
            saveSettings();
        });
    }

    if (hotkeySelect) {
        hotkeySelect.addEventListener("change", (e) => {
            appSettings.hotkey = e.target.value;
            saveSettings();
        });
    }

    const btnBackup = document.querySelector("#btn-backup-data");
    const btnRestore = document.querySelector("#btn-restore-data");
    const importInput = document.querySelector("#import-file-input");
    const btnReset = document.querySelector("#btn-reset-data");

    if (btnBackup) {
        btnBackup.addEventListener("click", exportBackupData);
    }

    if (btnRestore && importInput) {
        btnRestore.addEventListener("click", () => importInput.click());
        importInput.addEventListener("change", handleImportBackup);
    }

    if (btnReset) {
        btnReset.addEventListener("click", resetAllData);
    }

    const btnCheckUpdate = document.querySelector("#btn-check-update");
    if (btnCheckUpdate) {
        btnCheckUpdate.addEventListener("click", () => {
            showMessage("Check for Updates", "Aap My Launcher ka latest version use kar rahe hain (v1.0.0).");
        });
    }
}


/* ==============================
   Data Backup, Restore & Reset
================================= */

function exportBackupData() {
    const backupObj = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        settings: appSettings,
        items: launcherItems
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mylauncher_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showMessage("Backup Exported", "Aapka data aur settings JSON backup file me export ho chuki hain.");
}

function handleImportBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (importedData && Array.isArray(importedData.items)) {
                launcherItems = importedData.items;
                if (importedData.settings) {
                    appSettings = { ...appSettings, ...importedData.settings };
                    saveSettings();
                }
                await saveLauncherItems(launcherItems);
                renderItems();
                showMessage("Restore Successful", "Items aur settings successfully restore ho chuki hain.");
            } else {
                showMessage("Invalid File", "Selected JSON file me valid launcher data mojood nahi hai.");
            }
        } catch (err) {
            showMessage("Import Error", "Imported JSON file parse karne me fail ho gaya.");
        }
        e.target.value = "";
    };
    reader.readAsText(file);
}

async function resetAllData() {
    if (confirm("Kya aap saara launcher data aur settings reset karna chahte hain? Yeh action undo nahi ho sakta.")) {
        launcherItems = [];
        appSettings = {
            theme: "dark",
            density: "comfortable",
            accentColor: "#3b82f6",
            autoStart: false,
            minimizeToTray: true,
            startMinimized: false,
            hotkey: "Alt+Space"
        };
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        await saveLauncherItems(launcherItems);
        applySettings();
        renderItems();
        showMessage("Reset Complete", "Sabhi items aur settings default state par reset ho gaye hain.");
    }
}


/* ==============================
   Elements
================================= */

const navItems = document.querySelectorAll(".nav-item");

const pageSections = {
    home: document.querySelector("#home-section"),
    favorites: document.querySelector("#favorites-section"),
    websites: document.querySelector("#websites-section"),
    webapps: document.querySelector("#webapps-section"),
    applications: document.querySelector("#applications-section"),
    settings: document.querySelector("#settings-section")
};

const homeGrid = document.querySelector("#home-grid");
const homeEmptyState = document.querySelector("#home-empty-state");

const categoryGrids = {
    favoritesWebsites: document.querySelector("#favorites-websites-grid"),
    favoritesWebapps: document.querySelector("#favorites-webapps-grid"),
    favoritesApplications: document.querySelector("#favorites-applications-grid"),
    websites: document.querySelector("#websites-grid"),
    webapps: document.querySelector("#webapps-grid"),
    applications: document.querySelector("#applications-grid")
};

const addButton = document.querySelector("#add-button");
const addDialog = document.querySelector("#add-dialog");
const closeDialog = document.querySelector("#close-dialog");
const itemTypeSelection = document.querySelector(".item-type-selection");

const websiteButton = document.querySelector("#website-button");
const websiteForm = document.querySelector("#website-form");
const webappButton = document.querySelector("#webapp-button");
const webappForm = document.querySelector("#webapp-form");
const saveWebappButton = document.querySelector("#save-webapp");
const saveWebsiteButton = document.querySelector("#save-website");

const applicationButton = document.querySelector("#application-button");
const applicationForm = document.querySelector("#application-form");
const browseApplicationButton = document.querySelector("#browse-application");
const saveApplicationButton = document.querySelector("#save-application");

const formCancelButtons = document.querySelectorAll(".form-cancel");

const messageDialog = document.querySelector("#message-dialog");
const messageTitle = document.querySelector("#message-title");
const messageText = document.querySelector("#message-text");
const messageClose = document.querySelector("#message-close");

const deleteDialog = document.querySelector("#delete-dialog");
const deleteMessage = document.querySelector("#delete-message");
const deleteCancel = document.querySelector("#delete-cancel");
const deleteConfirm = document.querySelector("#delete-confirm");

const contextMenu = document.querySelector("#context-menu");
const contextFavorite = document.querySelector("#context-favorite");
const contextCopy = document.querySelector("#context-copy");
const searchInput = document.querySelector("#search-input");


/* ==============================
   Page Navigation
================================= */

function showPage(pageName) {
    Object.values(pageSections).forEach((section) => {
        if (section) section.classList.remove("active-page");
    });

    if (pageSections[pageName]) {
        pageSections[pageName].classList.add("active-page");
    }

    navItems.forEach((item) => {
        item.classList.remove("active");
        if (item.dataset.section === pageName) {
            item.classList.add("active");
        }
    });

    closeContextMenu();
}

navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(item.dataset.section);
    });
});


/* ==============================
   Message Dialog
================================= */

function showMessage(title, message) {
    messageTitle.textContent = title;
    messageText.textContent = message;
    messageDialog.style.display = "flex";
}

function closeMessage() {
    messageDialog.style.display = "none";
}

messageClose.addEventListener("click", closeMessage);
messageDialog.addEventListener("click", (event) => {
    if (event.target === messageDialog) {
        closeMessage();
    }
});


/* ==============================
   Add / Edit Dialog
================================= */

function openAddDialog() {
    editingItemId = null;
    document.querySelector(".dialog-header h3").textContent = "Add Item";
    saveWebsiteButton.textContent = "Save";
    saveWebappButton.textContent = "Save";
    saveApplicationButton.textContent = "Save";

    formCancelButtons.forEach((button) => {
        button.style.display = "";
    });

    itemTypeSelection.style.display = "block";
    websiteForm.style.display = "none";
    webappForm.style.display = "none";
    applicationForm.style.display = "none";

    websiteForm.reset();
    webappForm.reset();
    applicationForm.reset();

    addDialog.style.display = "flex";
}

function closeAddDialog() {
    editingItemId = null;
    formCancelButtons.forEach((button) => {
        button.style.display = "";
    });

    addDialog.style.display = "none";
    itemTypeSelection.style.display = "block";
    websiteForm.style.display = "none";
    webappForm.style.display = "none";
    applicationForm.style.display = "none";

    websiteForm.reset();
    webappForm.reset();
    applicationForm.reset();
}

if (addButton) addButton.addEventListener("click", openAddDialog);
if (closeDialog) closeDialog.addEventListener("click", closeAddDialog);

addDialog.addEventListener("click", (event) => {
    if (event.target === addDialog) {
        closeAddDialog();
    }
});


/* ==============================
   Form Type Selection & Enter Key
================================= */

websiteButton.addEventListener("click", () => {
    itemTypeSelection.style.display = "none";
    websiteForm.style.display = "block";
    document.querySelector("#website-name").focus();
});

webappButton.addEventListener("click", () => {
    itemTypeSelection.style.display = "none";
    webappForm.style.display = "block";
    document.querySelector("#webapp-name").focus();
});

applicationButton.addEventListener("click", () => {
    itemTypeSelection.style.display = "none";
    applicationForm.style.display = "block";
    document.querySelector("#application-name").focus();
});

formCancelButtons.forEach((button) => {
    button.addEventListener("click", closeAddDialog);
});

[websiteForm, webappForm, applicationForm].forEach((form) => {
    form?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT") {
            e.preventDefault();
            form.requestSubmit();
        }
    });
});


/* ==============================
   URL Helpers & Duplicate Checks
================================= */

function normalizeWebsiteUrl(input) {
    let value = input.trim();
    if (!value) return null;

    if (!/^https?:\/\//i.test(value)) {
        value = `https://${value}`;
    }

    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        if (!url.hostname) return null;

        url.hostname = url.hostname.toLowerCase();
        if (url.protocol === "https:" && url.port === "443") url.port = "";
        if (url.protocol === "http:" && url.port === "80") url.port = "";
        if (url.pathname === "/") url.pathname = "";

        return url.href;
    } catch {
        return null;
    }
}

function getWebsiteKey(url) {
    try {
        const parsedUrl = new URL(normalizeWebsiteUrl(url));
        let hostname = parsedUrl.hostname.toLowerCase();
        if (hostname.startsWith("www.")) {
            hostname = hostname.slice(4);
        }
        let pathname = parsedUrl.pathname;
        while (pathname.length > 1 && pathname.endsWith("/")) {
            pathname = pathname.slice(0, -1);
        }
        return hostname + pathname + parsedUrl.search;
    } catch {
        return null;
    }
}

function findDuplicateWebsite(url, ignoredItemId = null) {
    const newKey = getWebsiteKey(url);
    if (!newKey) return null;

    return launcherItems.find((item) => {
        if (item.type !== "website") return false;
        if (ignoredItemId !== null && item.id === ignoredItemId) return false;
        return getWebsiteKey(item.target) === newKey;
    }) || null;
}

function findDuplicateWebApp(url, ignoredItemId = null) {
    const newKey = getWebsiteKey(url);
    if (!newKey) return null;

    return launcherItems.find((item) => {
        if (item.type !== "webapp") return false;
        if (ignoredItemId !== null && item.id === ignoredItemId) return false;
        return getWebsiteKey(item.target) === newKey;
    }) || null;
}


/* ==============================
   Website Form Submit
================================= */

websiteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#website-name").value.trim();
    const rawUrl = document.querySelector("#website-url").value;
    const favorite = document.querySelector("#website-favorite").checked;

    if (!name) {
        showMessage("Name Required", "Please enter a name for this website.");
        return;
    }

    const normalizedUrl = normalizeWebsiteUrl(rawUrl);
    if (!normalizedUrl) {
        showMessage("Invalid URL", "Please enter a valid website address, such as youtube.com.");
        return;
    }

    const duplicate = findDuplicateWebsite(normalizedUrl, editingItemId);
    if (duplicate) {
        showMessage("Already Added", `"${duplicate.name}" is already saved with this website address.`);
        return;
    }

    saveWebsiteButton.disabled = true;
    saveWebsiteButton.textContent = "Checking...";

    let websiteCheck;
    try {
        websiteCheck = await window.launcherAPI.checkWebsite(normalizedUrl);
    } catch {
        websiteCheck = { valid: false, available: false };
    }

    saveWebsiteButton.disabled = false;
    saveWebsiteButton.textContent = editingItemId ? "Update" : "Save";

    if (!websiteCheck || !websiteCheck.valid) {
        showMessage("Invalid URL", "The website address is not valid.");
        return;
    }

    if (!websiteCheck.available) {
        showMessage("Website Not Reachable", "This website could not be reached right now.");
        return;
    }

    const favicon = await window.launcherAPI.fetchFavicon(websiteCheck.url);

    if (editingItemId !== null) {
        const item = launcherItems.find((entry) => entry.id === editingItemId);
        if (!item) {
            showMessage("Update Failed", "The selected item could not be found.");
            return;
        }
        item.name = name;
        item.target = websiteCheck.url;
        item.favorite = favorite;
        if (favicon) item.favicon = favicon;
    } else {
        launcherItems.push({
            id: Date.now(),
            name: name,
            type: "website",
            target: websiteCheck.url,
            favorite: favorite,
            favicon: favicon || null
        });
    }

    const saved = await saveLauncherItems(launcherItems);
    if (!saved) {
        showMessage("Save Failed", "The website could not be saved.");
        return;
    }

    renderItems();
    closeAddDialog();
});


/* ==============================
   Web App Form Submit
================================= */

webappForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#webapp-name").value.trim();
    const rawUrl = document.querySelector("#webapp-url").value;
    const favorite = document.querySelector("#webapp-favorite").checked;

    if (!name) {
        showMessage("Name Required", "Please enter a name for this web app.");
        return;
    }

    const normalizedUrl = normalizeWebsiteUrl(rawUrl);
    if (!normalizedUrl) {
        showMessage("Invalid URL", "Please enter a valid website address.");
        return;
    }

    const duplicate = findDuplicateWebApp(normalizedUrl, editingItemId);
    if (duplicate) {
        showMessage("Already Added", `"${duplicate.name}" is already saved with this web app address.`);
        return;
    }

    saveWebappButton.disabled = true;
    saveWebappButton.textContent = "Checking...";

    let websiteCheck;
    try {
        websiteCheck = await window.launcherAPI.checkWebsite(normalizedUrl);
    } catch {
        websiteCheck = { valid: false, available: false };
    }

    saveWebappButton.disabled = false;
    saveWebappButton.textContent = editingItemId !== null ? "Update" : "Save";

    if (!websiteCheck || !websiteCheck.valid || !websiteCheck.available) {
        showMessage("Invalid Web App", "The web app address is not valid or reachable.");
        return;
    }

    const favicon = await window.launcherAPI.fetchFavicon(websiteCheck.url);

    if (editingItemId !== null) {
        const item = launcherItems.find((entry) => entry.id === editingItemId);
        if (!item) {
            showMessage("Update Failed", "The selected web app could not be found.");
            return;
        }
        item.name = name;
        item.target = websiteCheck.url;
        item.favorite = favorite;
        if (favicon) item.favicon = favicon;
    } else {
        launcherItems.push({
            id: Date.now(),
            name: name,
            type: "webapp",
            target: websiteCheck.url,
            favorite: favorite,
            favicon: favicon || null
        });
    }

    const saved = await saveLauncherItems(launcherItems);
    if (!saved) {
        showMessage("Save Failed", "The web app could not be saved.");
        return;
    }

    renderItems();
    closeAddDialog();
});


/* ==============================
   Windows Application Form
================================= */

function normalizeApplicationPath(applicationPath) {
    return applicationPath.trim().replaceAll("/", "\\").replace(/\\+$/, "").toLowerCase();
}

function findDuplicateApplication(applicationPath, ignoredItemId = null) {
    const newPath = normalizeApplicationPath(applicationPath);
    if (!newPath) return null;

    return launcherItems.find((item) => {
        if (item.type !== "application") return false;
        if (ignoredItemId !== null && item.id === ignoredItemId) return false;
        return normalizeApplicationPath(item.target) === newPath;
    }) || null;
}

browseApplicationButton.addEventListener("click", async () => {
    browseApplicationButton.disabled = true;
    try {
        const result = await window.launcherAPI.selectApplication();
        if (result && !result.canceled && result.path) {
            document.querySelector("#application-path").value = result.path;
            document.querySelector("#application-name").focus();
        }
    } catch {
        showMessage("Browse Failed", "The application file could not be selected.");
    } finally {
        browseApplicationButton.disabled = false;
    }
});

applicationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#application-name").value.trim();
    const applicationPath = document.querySelector("#application-path").value.trim();
    const favorite = document.querySelector("#application-favorite").checked;

    if (!name || !applicationPath) {
        showMessage("Fields Required", "Please enter a name and select an executable file.");
        return;
    }

    saveApplicationButton.disabled = true;
    saveApplicationButton.textContent = "Checking...";

    let applicationCheck;
    try {
        applicationCheck = await window.launcherAPI.checkApplication(applicationPath);
    } catch {
        applicationCheck = { valid: false, exists: false };
    }

    saveApplicationButton.disabled = false;
    saveApplicationButton.textContent = editingItemId !== null ? "Update" : "Save";

    if (!applicationCheck || !applicationCheck.valid || !applicationCheck.exists) {
        showMessage("Invalid Application", "Please select a valid Windows executable (.exe) file.");
        return;
    }

    const duplicateApplication = findDuplicateApplication(applicationPath, editingItemId);
    if (duplicateApplication) {
        showMessage("Already Added", `"${duplicateApplication.name}" is already saved with this path.`);
        return;
    }

    if (editingItemId !== null) {
        const item = launcherItems.find((entry) => entry.id === editingItemId);
        if (!item) {
            showMessage("Update Failed", "The selected application could not be found.");
            return;
        }
        item.name = name;
        item.target = applicationPath;
        item.favorite = favorite;
    } else {
        launcherItems.push({
            id: Date.now(),
            name: name,
            type: "application",
            target: applicationPath,
            favorite: favorite
        });
    }

    const saved = await saveLauncherItems(launcherItems);
    if (!saved) {
        showMessage("Save Failed", "The application could not be saved.");
        return;
    }

    renderItems();
    closeAddDialog();
});


/* ==============================
   Create Card & Favicon Integration
================================= */

function createCard(item) {
    const card = document.createElement("div");
    card.classList.add("app-card");
    card.dataset.itemId = item.id;

    let iconHtml = "▣";

    if (item.favicon) {
        iconHtml = `<img src="${item.favicon}" alt="icon" onerror="this.src=''; this.innerHTML='🌐';">`;
    } else if (item.type === "website") {
        iconHtml = "🌐";
    } else if (item.type === "webapp") {
        iconHtml = "◉";
    } else if (item.type === "application") {
        iconHtml = "▦";
    }

    const favoriteStar = item.favorite ? `<span class="card-favorite-star" title="Favorite">★</span>` : "";

    card.innerHTML = `
        <div class="card-icon">${iconHtml}</div>
        ${favoriteStar}
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.type)}</p>
    `;

    card.addEventListener("click", () => openItem(item));
    card.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openContextMenu(item, event.clientX, event.clientY);
    });

    return card;
}


/* ==============================
   HTML Escape
================================= */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==============================
   Open Item
================================= */

async function openItem(item) {
    if (item.type === "website") {
        const opened = await window.launcherAPI.openWebsite(item.target);
        if (!opened) {
            showMessage("Open Failed", "The website could not be opened.");
        }
        return;
    }

    if (item.type === "webapp") {
        const result = await window.launcherAPI.openWebApp(item.id, item.name, item.target);
        if (!result || !result.success) {
            showMessage("Web App Not Available", result && result.message ? result.message : "The web app could not be opened.");
        }
        return;
    }

    if (item.type === "application") {
        const result = await window.launcherAPI.openApplication(item.target);
        if (!result || !result.success) {
            showMessage("Application Not Available", result && result.message ? result.message : "The application could not be opened.");
        }
        return;
    }
}


/* ==============================
   Render Items
================================= */

function renderItems() {
    homeGrid.innerHTML = "";
    categoryGrids.favoritesWebsites.innerHTML = "";
    categoryGrids.favoritesWebapps.innerHTML = "";
    categoryGrids.favoritesApplications.innerHTML = "";
    categoryGrids.websites.innerHTML = "";
    categoryGrids.webapps.innerHTML = "";
    categoryGrids.applications.innerHTML = "";

    launcherItems.forEach((item) => {
        homeGrid.appendChild(createCard(item));

        if (item.type === "website") {
            categoryGrids.websites.appendChild(createCard(item));
            if (item.favorite) {
                categoryGrids.favoritesWebsites.appendChild(createCard(item));
            }
        } else if (item.type === "webapp") {
            categoryGrids.webapps.appendChild(createCard(item));
            if (item.favorite) {
                categoryGrids.favoritesWebapps.appendChild(createCard(item));
            }
        } else if (item.type === "application") {
            categoryGrids.applications.appendChild(createCard(item));
            if (item.favorite) {
                categoryGrids.favoritesApplications.appendChild(createCard(item));
            }
        }
    });

    homeEmptyState.style.display = launcherItems.length === 0 ? "flex" : "none";
}


/* ==============================
   Context Menu & Actions
================================= */

function openContextMenu(item, x, y) {
    contextMenuItem = item;
    contextFavorite.textContent = item.favorite ? "Remove from Favorites" : "Add to Favorites";
    contextCopy.textContent = item.type === "application" ? "Copy Path" : "Copy URL";

    contextMenu.style.display = "block";
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
}

function closeContextMenu() {
    contextMenu.style.display = "none";
    contextMenuItem = null;
}

document.addEventListener("click", (event) => {
    if (!contextMenu.contains(event.target)) {
        closeContextMenu();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeContextMenu();
        closeDeleteDialog();
    }
});

contextMenu.querySelectorAll(".context-menu-item").forEach((button) => {
    button.addEventListener("click", async () => {
        if (!contextMenuItem) return;
        const item = contextMenuItem;
        const action = button.dataset.action;
        closeContextMenu();

        if (action === "open") {
            await openItem(item);
        } else if (action === "edit") {
            editItem(item);
        } else if (action === "favorite") {
            item.favorite = !item.favorite;
            await saveLauncherItems(launcherItems);
            renderItems();
        } else if (action === "copy") {
            if (item.target) {
                await window.launcherAPI.copyToClipboard(item.target);
                showMessage("Copied", item.type === "application" ? "Path copied." : "URL copied.");
            }
        } else if (action === "delete") {
            openDeleteDialog(item);
        }
    });
});


/* ==============================
   Edit Item
================================= */

function editItem(item) {
    editingItemId = item.id;
    itemTypeSelection.style.display = "none";

    if (item.type === "website") {
        websiteForm.style.display = "block";
        document.querySelector("#website-name").value = item.name;
        document.querySelector("#website-url").value = item.target;
        document.querySelector("#website-favorite").checked = Boolean(item.favorite);
        document.querySelector(".dialog-header h3").textContent = "Edit Website";
        saveWebsiteButton.textContent = "Update";
    } else if (item.type === "webapp") {
        webappForm.style.display = "block";
        document.querySelector("#webapp-name").value = item.name;
        document.querySelector("#webapp-url").value = item.target;
        document.querySelector("#webapp-favorite").checked = Boolean(item.favorite);
        document.querySelector(".dialog-header h3").textContent = "Edit Web App";
        saveWebappButton.textContent = "Update";
    } else if (item.type === "application") {
        applicationForm.style.display = "block";
        document.querySelector("#application-name").value = item.name;
        document.querySelector("#application-path").value = item.target;
        document.querySelector("#application-favorite").checked = Boolean(item.favorite);
        document.querySelector(".dialog-header h3").textContent = "Edit Windows Application";
        saveApplicationButton.textContent = "Update";
    }

    formCancelButtons.forEach((button) => {
        button.style.display = "none";
    });

    addDialog.style.display = "flex";
}


/* ==============================
   Delete Confirmation
================================= */

function openDeleteDialog(item) {
    deleteTargetItem = item;
    deleteMessage.textContent = `Are you sure you want to delete "${item.name}"?`;
    deleteDialog.style.display = "flex";
}

function closeDeleteDialog() {
    deleteDialog.style.display = "none";
    deleteTargetItem = null;
}

deleteCancel.addEventListener("click", closeDeleteDialog);

deleteConfirm.addEventListener("click", async () => {
    if (!deleteTargetItem) return;
    launcherItems = launcherItems.filter((entry) => entry.id !== deleteTargetItem.id);
    const saved = await saveLauncherItems(launcherItems);
    if (!saved) {
        showMessage("Delete Failed", "The item could not be deleted.");
        return;
    }
    closeDeleteDialog();
    renderItems();
});


/* ==============================
   Search
================================= */

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    document.querySelectorAll(".app-card").forEach((card) => {
        const itemId = Number(card.dataset.itemId);
        const item = launcherItems.find((entry) => entry.id === itemId);
        if (!item) return;

        const target = item.target || "";
        const matches = !query || item.name.toLowerCase().includes(query) || target.toLowerCase().includes(query);
        card.style.display = matches ? "" : "none";
    });
});


/* ==============================
   Initialize Launcher
================================= */

async function initializeLauncher() {
    loadSettings();
    initSettingsEvents();

    launcherItems = await loadLauncherItems();
    renderItems();
}

initializeLauncher();