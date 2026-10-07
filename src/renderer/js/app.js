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
    const btnResetSettings = document.querySelector("#btn-reset-settings");

    if (btnBackup) {
        btnBackup.addEventListener("click", exportBackupData);
    }

    if (btnRestore && importInput) {
        btnRestore.addEventListener("click", () => importInput.click());
        importInput.addEventListener("change", handleImportBackup);
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => openResetConfirmation("all"));
    }

    if (btnResetSettings) {
        btnResetSettings.addEventListener("click", () => openResetConfirmation("settings"));
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

function getDefaultSettings() {
    return {
        theme: "dark",
        density: "comfortable",
        accentColor: "#3b82f6",
        autoStart: false,
        minimizeToTray: true,
        startMinimized: false,
        hotkey: "Alt+Space"
    };
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
const contextRepair = document.querySelector("#context-repair");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");


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

    searchInput.value = "";
    document.querySelectorAll(".app-card").forEach((card) => {
        card.style.display = "";
    });
    document.querySelectorAll(".search-empty-state").forEach((state) => {
        state.remove();
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

function openResetConfirmation(type) {
    const isSettingsReset = type === "settings";

    confirmDialogTitle.textContent = isSettingsReset
        ? "Reset Settings?"
        : "Reset All Data?";

    confirmDialogText.textContent = isSettingsReset
        ? "Only your launcher settings will be restored to their default values. Your saved items will not be deleted."
        : "This will remove all saved websites, web apps, applications, and settings. This action cannot be undone.";

    confirmDialogConfirm.textContent = isSettingsReset
        ? "Reset Settings"
        : "Reset All";

    confirmDialogConfirm.classList.toggle("danger", !isSettingsReset);
    confirmDialog.dataset.action = type;
    confirmDialog.style.display = "flex";
}

function closeConfirmDialog() {
    confirmDialog.style.display = "none";
    confirmDialog.dataset.action = "";
}

async function handleConfirmAction() {
    const action = confirmDialog.dataset.action;
    closeConfirmDialog();

    if (action === "settings") {
        appSettings = getDefaultSettings();
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        applySettings();
        showMessage("Settings Reset", "Settings have been restored to their default values.");
        return;
    }

    if (action === "all") {
        launcherItems = [];
        appSettings = getDefaultSettings();
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        await saveLauncherItems(launcherItems);
        applySettings();
        renderItems();
        showMessage("Reset Complete", "All launcher items and settings have been reset.");
    }
}

const confirmDialog = document.querySelector("#confirm-dialog");
const confirmDialogTitle = document.querySelector("#confirm-dialog-title");
const confirmDialogText = document.querySelector("#confirm-dialog-text");
const confirmDialogConfirm = document.querySelector("#confirm-dialog-confirm");
const confirmDialogCancel = document.querySelector("#confirm-dialog-cancel");

let toastTimer = null;

function showToast(message) {
    let toast = document.querySelector("#launcher-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "launcher-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("visible");
    }, 2200);
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

confirmDialogCancel.addEventListener("click", closeConfirmDialog);
confirmDialogConfirm.addEventListener("click", handleConfirmAction);
confirmDialog.addEventListener("click", (event) => {
    if (event.target === confirmDialog) {
        closeConfirmDialog();
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

    let applicationIcon = null;

    try {
        applicationIcon = await window.launcherAPI.fetchAppIcon(applicationPath);
    } catch (error) {
        console.error("Failed to fetch application icon:", error);
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

        if (applicationIcon) {
            item.favicon = applicationIcon;
        }
    } else {
        launcherItems.push({
            id: Date.now(),
            name: name,
            type: "application",
            target: applicationPath,
            favorite: favorite,
            favicon: applicationIcon || null
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


async function loadMissingWebIcons() {
    let changed = false;

    for (const item of launcherItems) {
        if (
            (item.type !== "website" && item.type !== "webapp") ||
            item.favicon
        ) {
            continue;
        }

        try {
            const icon = await window.launcherAPI.fetchFavicon(item.target);

            if (icon) {
                item.favicon = icon;
                changed = true;
            }
        } catch (error) {
            console.error(
                "Failed to load web icon:",
                error
            );
        }
    }

    if (changed) {
        const saved = await saveLauncherItems(launcherItems);

        if (saved) {
            renderItems();
        }
    }
}


function hasMissingWebIcons() {
    return launcherItems.some(
        (item) =>
            (item.type === "website" || item.type === "webapp") &&
            !item.favicon
    );
}


/* ==============================
   Create Card & Icon Integration
================================= */

function createCard(item) {
    const card = document.createElement("div");
    card.classList.add("app-card");
    card.dataset.itemId = item.id;

    const isMissingApplication =
        item.type === "application" &&
        item.missing === true;

    let iconHtml = "▣";

    if (isMissingApplication) {
        iconHtml = "⚠";
    } else if (item.favicon) {
        iconHtml = `<img src="${item.favicon}" alt="icon" onerror="this.src=''; this.innerHTML='🌐';">`;
    } else if (item.type === "website") {
        iconHtml = "🌐";
    } else if (item.type === "webapp") {
        iconHtml = "◉";
    } else if (item.type === "application") {
        iconHtml = "▦";
    }

    const favoriteStar = item.favorite ? `<span class="card-favorite-star" title="Favorite">★</span>` : "";

    if (isMissingApplication) {
        card.classList.add("app-card-missing");
    }

    const cardTypeLabel =
        isMissingApplication
            ? "Application Missing"
            : item.type;

    card.innerHTML = `
        <div class="card-icon">${iconHtml}</div>
        ${favoriteStar}
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(cardTypeLabel)}</p>
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
        let applicationCheck;

        try {
            applicationCheck =
                await window.launcherAPI.checkApplication(
                    item.target
                );
        } catch {
            applicationCheck = {
                valid: false,
                exists: false
            };
        }

        if (
            !applicationCheck ||
            !applicationCheck.valid ||
            !applicationCheck.exists
        ) {
            item.missing = true;
            renderItems();

            showMessage(
                "Application Missing",
                `"${item.name}" could not be found. The executable may have been moved or deleted.`
            );

            return;
        }

        if (item.missing) {
            item.missing = false;
            renderItems();
        }

        const result =
            await window.launcherAPI.openApplication(
                item.target
            );

        if (!result || !result.success) {
            showMessage(
                "Application Not Available",
                result && result.message
                    ? result.message
                    : "The application could not be opened."
            );
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

    const sortedItems = [...launcherItems];
    const sortMode = sortSelect ? sortSelect.value : "default";

    if (sortMode === "name-az") {
        sortedItems.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
    } else if (sortMode === "name-za") {
        sortedItems.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), undefined, { sensitivity: "base" }));
    }

    sortedItems.forEach((item) => {
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
   Locate / Repair Missing Application
================================= */

async function repairApplication(item) {
    if (!item || item.type !== "application") {
        return;
    }

    let selection;

    try {
        selection = await window.launcherAPI.selectApplication();
    } catch {
        showMessage("Locate Failed", "The application file could not be selected.");
        return;
    }

    if (!selection || selection.canceled || !selection.path) {
        return;
    }

    const newPath = selection.path.trim();

    let applicationCheck;

    try {
        applicationCheck =
            await window.launcherAPI.checkApplication(newPath);
    } catch {
        applicationCheck = {
            valid: false,
            exists: false
        };
    }

    if (
        !applicationCheck ||
        !applicationCheck.valid ||
        !applicationCheck.exists
    ) {
        showMessage(
            "Invalid Application",
            "Please select a valid Windows executable (.exe) file."
        );
        return;
    }

    const duplicateApplication =
        findDuplicateApplication(newPath, item.id);

    if (duplicateApplication) {
        showMessage(
            "Already Added",
            `"${duplicateApplication.name}" is already saved with this application path.`
        );
        return;
    }

    let applicationIcon = null;

    try {
        applicationIcon =
            await window.launcherAPI.fetchAppIcon(newPath);
    } catch (error) {
        console.error(
            "Failed to fetch repaired application icon:",
            error
        );
    }

    const oldPath = item.target;
    const oldIcon = item.favicon || null;
    const oldMissing = item.missing === true;

    item.target = newPath;
    item.missing = false;
    item.favicon = applicationIcon || null;

    const saved = await saveLauncherItems(launcherItems);

    if (!saved) {
        item.target = oldPath;
        item.favicon = oldIcon;
        item.missing = oldMissing;

        showMessage(
            "Repair Failed",
            "The repaired application could not be saved."
        );
        return;
    }

    renderItems();

    showMessage(
        "Application Repaired",
        `"${item.name}" has been repaired successfully.`
    );
}


/* ==============================
   Context Menu & Actions
================================= */

function openContextMenu(item, x, y) {
    contextMenuItem = item;
    contextFavorite.textContent = item.favorite ? "Remove from Favorites" : "Add to Favorites";
    contextCopy.textContent = item.type === "application" ? "Copy Path" : "Copy URL";

    if (contextRepair) {
        contextRepair.style.display =
            item.type === "application" && item.missing
                ? "flex"
                : "none";
    }

    contextMenu.style.display = "block";

    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const edgePadding = 8;

    const left = Math.min(
        x,
        Math.max(edgePadding, viewportWidth - menuWidth - edgePadding)
    );

    const top = Math.min(
        y,
        Math.max(edgePadding, viewportHeight - menuHeight - edgePadding)
    );

    contextMenu.style.left = left + "px";
    contextMenu.style.top = top + "px";
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
        } else if (action === "repair") {
            await repairApplication(item);
        } else if (action === "favorite") {
            item.favorite = !item.favorite;
            await saveLauncherItems(launcherItems);
            renderItems();
        } else if (action === "copy") {
            if (item.target) {
                const result = await window.launcherAPI.copyToClipboard(item.target);
                if (result && result.success) {
                    showToast(item.type === "application" ? "Path copied to clipboard" : "URL copied to clipboard");
                } else {
                    showMessage("Copy Failed", "The path or URL could not be copied.");
                }
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

function applySearch() {
    const query = searchInput.value.trim().toLowerCase();
    const normalizedQuery = query.replace(/\s+/g, "");

    document.querySelectorAll(".search-empty-state").forEach((state) => {
        state.remove();
    });

    document.querySelectorAll(".app-grid").forEach((grid) => {
        let visibleCount = 0;

        grid.querySelectorAll(".app-card").forEach((card) => {
            const itemId = Number(card.dataset.itemId);
            const item = launcherItems.find((entry) => entry.id === itemId);

            if (!item) {
                card.style.display = "";
                return;
            }

            const name = String(item.name || "").toLowerCase();
            const type = String(item.type || "").toLowerCase();
            const normalizedType = type.replace(/\s+/g, "");
            const target = String(item.target || "").toLowerCase();

            const matches =
                !query ||
                name.includes(query) ||
                normalizedType.includes(normalizedQuery) ||
                target.includes(query);

            card.style.display = matches ? "" : "none";

            if (matches) {
                visibleCount++;
            }
        });

        if (query && visibleCount === 0 && grid.querySelector(".app-card")) {
            const emptyState = document.createElement("div");
            emptyState.className = "search-empty-state";
            emptyState.innerHTML = "<h3>No matching items</h3><p>Try a different name, type, or search term.</p>";
            grid.appendChild(emptyState);
        }
    });
}

searchInput.addEventListener("input", applySearch);

if (sortSelect) {
    sortSelect.addEventListener("change", () => {
        renderItems();
        applySearch();
    });
}


/* ==============================
   Missing Application Detection
================================= */

async function detectMissingApplications() {
    let changed = false;

    for (const item of launcherItems) {
        if (item.type !== "application") {
            continue;
        }

        let applicationCheck;

        try {
            applicationCheck =
                await window.launcherAPI.checkApplication(
                    item.target
                );
        } catch {
            applicationCheck = {
                valid: false,
                exists: false
            };
        }

        const missing =
            !applicationCheck ||
            !applicationCheck.valid ||
            !applicationCheck.exists;

        if (item.missing !== missing) {
            item.missing = missing;
            changed = true;
        }
    }

    return changed;
}


/* ==============================
   Initialize Launcher
================================= */

async function loadMissingApplicationIcons() {
    let changed = false;

    for (const item of launcherItems) {
        if (item.type !== "application" || item.favicon) {
            continue;
        }

        try {
            const icon = await window.launcherAPI.fetchAppIcon(item.target);

            if (icon) {
                item.favicon = icon;
                changed = true;
            }
        } catch (error) {
            console.error(
                "Failed to load application icon:",
                error
            );
        }
    }

    if (changed) {
        await saveLauncherItems(launcherItems);
        renderItems();
    }
}


async function initializeLauncher() {
    loadSettings();
    initSettingsEvents();

    launcherItems = await loadLauncherItems();

    await detectMissingApplications();

    renderItems();

    await loadMissingApplicationIcons();
    await loadMissingWebIcons();
}

window.addEventListener("online", async () => {
    await loadMissingWebIcons();
});

setInterval(async () => {
    if (
        navigator.onLine &&
        hasMissingWebIcons()
    ) {
        await loadMissingWebIcons();
    }
}, 30000);

initializeLauncher();