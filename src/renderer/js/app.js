let launcherItems = [];

let launcherCategories = [];
let pendingCategoryId = null;
let editingCategoryId = null;
let deleteTargetCategory = null;

const CATEGORIES_STORAGE_KEY = "my_launcher_categories";

let contextMenuItem = null;
let contextMenuTarget = null;

/* ==============================
   Selection State
================================= */

const selectionState = {
    active: false,
    scope: null,
    categoryId: null,
    selectedItemIds: new Set(),
    selectedCategoryIds: new Set()
};

function clearSelection() {
    selectionState.active = false;
    selectionState.scope = null;
    selectionState.categoryId = null;
    selectionState.selectedItemIds.clear();
    selectionState.selectedCategoryIds.clear();
}

function enterSelectionMode(scope, categoryId = null, initialItemId = null) {
    clearSelection();

    selectionState.active = true;
    selectionState.scope = scope;
    selectionState.categoryId =
        categoryId === null || categoryId === undefined
            ? null
            : Number(categoryId);

    if (initialItemId !== null && initialItemId !== undefined) {
        selectionState.selectedItemIds.add(Number(initialItemId));
    }
}

function exitSelectionMode() {
    clearSelection();
}

function isItemSelected(itemId) {
    return selectionState.selectedItemIds.has(Number(itemId));
}

function isCategorySelected(categoryId) {
    return selectionState.selectedCategoryIds.has(Number(categoryId));
}

function toggleItemSelection(itemId) {
    const id = Number(itemId);

    if (selectionState.selectedItemIds.has(id)) {
        selectionState.selectedItemIds.delete(id);
    } else {
        selectionState.selectedItemIds.add(id);
    }
}

function toggleCategorySelection(categoryId) {
    const id = Number(categoryId);

    if (selectionState.selectedCategoryIds.has(id)) {
        selectionState.selectedCategoryIds.delete(id);
    } else {
        selectionState.selectedCategoryIds.add(id);
    }
}

function getSelectedItemIds() {
    return [...selectionState.selectedItemIds];
}

function getSelectedCategoryIds() {
    return [...selectionState.selectedCategoryIds];
}

function isSelectionModeActive() {
    return selectionState.active;
}

function getSelectionCount() {
    if (selectionState.scope === "categories") {
        return selectionState.selectedCategoryIds.size;
    }

    return selectionState.selectedItemIds.size;
}

/* ==============================
   Selection UI Helpers
================================= */

function getScopeItemIds(scope, categoryId = null) {
    let items = [];

    if (scope === "home") {
        items = launcherItems.filter(
            (item) =>
                item.categoryId === undefined ||
                item.categoryId === null
        );
    } else if (
        scope === "favorites" ||
        scope === "favorites-websites" ||
        scope === "favorites-webapps" ||
        scope === "favorites-applications" ||
        scope === "websites" ||
        scope === "webapps" ||
        scope === "applications"
    ) {
        items = launcherItems.filter((item) => {
            const original =
                item.categoryId === undefined ||
                item.categoryId === null;

            if (!original) return false;

            if (scope === "favorites") return item.favorite === true;
            if (scope === "favorites-websites") return item.favorite === true && item.type === "website";
            if (scope === "favorites-webapps") return item.favorite === true && item.type === "webapp";
            if (scope === "favorites-applications") return item.favorite === true && item.type === "application";
            if (scope === "websites") return item.type === "website";
            if (scope === "webapps") return item.type === "webapp";
            if (scope === "applications") return item.type === "application";

            return false;
        });
    } else if (scope === "category-items") {
        items = launcherItems.filter(
            (item) => Number(item.categoryId) === Number(categoryId)
        );
    }

    return items.map((item) => Number(item.id));
}

function getCategoryIds() {
    return launcherCategories.map((category) => Number(category.id));
}

function getCategoryItemIds(categoryId) {
    return launcherItems
        .filter((item) => Number(item.categoryId) === Number(categoryId))
        .map((item) => Number(item.id));
}

function areAllScopeItemsSelected(scope, categoryId = null) {
    const ids = getScopeItemIds(scope, categoryId);

    if (ids.length === 0) {
        return false;
    }

    return ids.every((id) => selectionState.selectedItemIds.has(id));
}

function toggleAllScopeItems(scope, categoryId = null) {
    const ids = getScopeItemIds(scope, categoryId);

    if (ids.length === 0) {
        return;
    }

    const allSelected = ids.every((id) =>
        selectionState.selectedItemIds.has(id)
    );

    if (allSelected) {
        ids.forEach((id) => selectionState.selectedItemIds.delete(id));
    } else {
        ids.forEach((id) => selectionState.selectedItemIds.add(id));
    }
}

function areAllCategoryItemsSelected(categoryId) {
    const ids = getCategoryItemIds(categoryId);

    if (ids.length === 0) {
        return true;
    }

    return ids.every((id) => selectionState.selectedItemIds.has(id));
}

function syncCategorySelectionState(categoryId) {
    const id = Number(categoryId);
    const itemIds = getCategoryItemIds(id);

    // Empty categories should not become selected automatically.
    // They can still be selected manually through their category checkbox.
    if (itemIds.length === 0) {
        return;
    }

    if (areAllCategoryItemsSelected(id)) {
        selectionState.selectedCategoryIds.add(id);
    } else {
        selectionState.selectedCategoryIds.delete(id);
    }
}

function toggleCategorySelectionWithItems(categoryId) {
    const id = Number(categoryId);
    const itemIds = getCategoryItemIds(id);
    const categorySelected =
        selectionState.selectedCategoryIds.has(id) &&
        areAllCategoryItemsSelected(id);

    if (categorySelected) {
        selectionState.selectedCategoryIds.delete(id);
        itemIds.forEach((itemId) =>
            selectionState.selectedItemIds.delete(itemId)
        );
    } else {
        selectionState.selectedCategoryIds.add(id);
        itemIds.forEach((itemId) =>
            selectionState.selectedItemIds.add(itemId)
        );
    }
}

function toggleAllCategories() {
    const categoryIds = getCategoryIds();

    if (categoryIds.length === 0) {
        return;
    }

    const allSelected = categoryIds.every((id) =>
        selectionState.selectedCategoryIds.has(id) &&
        areAllCategoryItemsSelected(id)
    );

    if (allSelected) {
        selectionState.selectedCategoryIds.clear();
        selectionState.selectedItemIds.clear();
        return;
    }

    categoryIds.forEach((id) => {
        selectionState.selectedCategoryIds.add(id);
        getCategoryItemIds(id).forEach((itemId) =>
            selectionState.selectedItemIds.add(itemId)
        );
    });
}

function areAllCategoriesSelected() {
    const ids = getCategoryIds();

    if (ids.length === 0) {
        return false;
    }

    return ids.every((id) =>
        selectionState.selectedCategoryIds.has(id) &&
        areAllCategoryItemsSelected(id)
    );
}

function syncCategorySelectionStates() {
    if (selectionState.scope !== "categories") {
        return;
    }

    getCategoryIds().forEach((categoryId) => {
        syncCategorySelectionState(categoryId);
    });
}

function syncSelectionUI() {
    syncCategorySelectionStates();

    document.body.classList.toggle(
        "selection-mode",
        selectionState.active
    );

    if (selectionState.active) {
        document.body.dataset.selectionScope = selectionState.scope || "";
    } else {
        delete document.body.dataset.selectionScope;
    }

    document
        .querySelectorAll(".selection-master-checkbox")
        .forEach((checkbox) => {
            const scope = checkbox.dataset.selectionScope;

            if (scope === "categories") {
                checkbox.checked = areAllCategoriesSelected();
                return;
            }

            const categoryId = checkbox.dataset.categoryId;

            checkbox.checked = areAllScopeItemsSelected(
                scope,
                categoryId === undefined
                    ? null
                    : Number(categoryId)
            );
        });

    document
        .querySelectorAll(".card-selection-checkbox")
        .forEach((checkbox) => {
            const itemId = Number(checkbox.dataset.itemId);
            const selected = isItemSelected(itemId);

            checkbox.checked = selected;

            const card = checkbox.closest(".app-card");
            if (card) {
                card.classList.toggle("selected", selected);
            }
        });

    document
        .querySelectorAll(".category-selection-checkbox")
        .forEach((checkbox) => {
            const categoryId = Number(checkbox.dataset.categoryId);
            checkbox.checked = isCategorySelected(categoryId);
        });

    document
        .querySelectorAll(".category-card")
        .forEach((card) => {
            const categoryId = Number(card.dataset.categoryId);
            const activeCategory =
                selectionState.scope === "category-items" &&
                Number(selectionState.categoryId) === categoryId;

            card.classList.toggle(
                "selection-category-active",
                activeCategory
            );

            const itemMaster =
                card.querySelector(".category-item-master-checkbox");

            if (itemMaster) {
                itemMaster.style.display =
                    activeCategory ? "inline-grid" : "none";
            }
        });
}

function startSelection(scope, categoryId = null, initialItemId = null) {
    enterSelectionMode(scope, categoryId, initialItemId);

    if (scope === "categories") {
        if (categoryId !== null && categoryId !== undefined) {
            selectionState.selectedItemIds.add(Number(initialItemId));
        } else if (initialItemId !== null && initialItemId !== undefined) {
            toggleCategorySelectionWithItems(initialItemId);
        }
    }

    if (scope === "categories") {
        renderCategories();
    } else {
        renderItems();
    }

    syncSelectionUI();
}

document.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".selection-master-checkbox");

    if (!checkbox || !selectionState.active) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const scope = checkbox.dataset.selectionScope;

    if (scope === "categories") {
        toggleAllCategories();
    } else {
        const categoryId = checkbox.dataset.categoryId;

        toggleAllScopeItems(
            scope,
            categoryId === undefined ? null : Number(categoryId)
        );
    }

    syncSelectionUI();
});

document.addEventListener("click", (event) => {
    if (selectedItemsContextMenu && !selectedItemsContextMenu.contains(event.target)) {
        closeSelectedItemsContextMenu();
    }

    const exitButton = event.target.closest(".selection-exit-button");

    if (!exitButton) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    exitSelectionMode();
    renderItems();
    renderCategories();
    syncSelectionUI();
});

let deleteTargetItem = null;

let editingItemId = null;
let submittingItemForm = false;
const openingItems = new Set();
let editingCategoryItemId = null;
let pendingNewItemCategorySelect = null;
let pendingNewCategoryType = null;
let pendingNewCategorySelectedIds = [];
let editingCategoriesItem = null;


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
    if (window.launcherAPI && window.launcherAPI.applyBehaviorSettings) {
        window.launcherAPI.applyBehaviorSettings({
            autoStart: Boolean(appSettings.autoStart),
            minimizeToTray: Boolean(appSettings.minimizeToTray),
            startMinimized: Boolean(appSettings.startMinimized),
            hotkey: appSettings.hotkey
        }).catch((error) => console.error("Failed to apply behavior settings:", error));
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
    applySettings();
    if (window.launcherAPI && window.launcherAPI.applyBehaviorSettings) {
        window.launcherAPI.applyBehaviorSettings({
            autoStart: Boolean(appSettings.autoStart),
            minimizeToTray: Boolean(appSettings.minimizeToTray),
            startMinimized: Boolean(appSettings.startMinimized),
            hotkey: appSettings.hotkey
        }).catch((error) => console.error("Failed to apply behavior settings:", error));
    }
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
        btnCheckUpdate.addEventListener("click", async () => {
            btnCheckUpdate.disabled = true;
            btnCheckUpdate.textContent = "Checking...";
            try {
                const result = await window.launcherAPI.checkForUpdates();
                if (!result || !result.success) {
                    showMessage("Update Check Failed", result?.message || "Could not check GitHub releases.");
                } else if (result.updateAvailable) {
                    showMessage("Update Available", `Version ${result.latestVersion} is available.`);
                } else {
                    showMessage("No Updates", `You are using the latest release (${result.currentVersion}).`);
                }
            } catch {
                showMessage("Update Check Failed", "Could not check GitHub releases.");
            } finally {
                btnCheckUpdate.disabled = false;
                btnCheckUpdate.textContent = "Check Now";
            }
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
        categories: launcherCategories,
        items: launcherItems
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
    const dataUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataUrl);
    downloadAnchor.setAttribute("download", `mylauncher_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(dataUrl);

    showMessage("Backup Exported", "Aapka data aur settings JSON backup file me export ho chuki hain.");
}

function validateBackupData(data) {
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.categories)) return false;

    const validTypes = new Set(["website", "webapp", "application"]);
    const categoryIds = new Set(
        data.categories
            .filter((c) => c && (typeof c.id === "number" || typeof c.id === "string") && String(c.name || "").trim())
            .map((c) => Number(c.id))
    );

    const ids = new Set();

    return data.items.every((item) => {
        if (!item || (typeof item.id !== "number" && typeof item.id !== "string")) return false;
        if (ids.has(Number(item.id))) return false;
        ids.add(Number(item.id));

        if (!validTypes.has(item.type)) return false;
        if (typeof item.name !== "string" || !item.name.trim()) return false;
        if (typeof item.target !== "string" || !item.target.trim()) return false;

        const isCopy = item.categoryId !== undefined && item.categoryId !== null;
        if (isCopy) {
            if (!categoryIds.has(Number(item.categoryId))) return false;
            if (item.sourceItemId === undefined || item.sourceItemId === null) return false;
        }

        return true;
    });
}

function handleImportBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);

            if (!validateBackupData(importedData)) {
                showMessage("Invalid File", "Selected backup contains invalid launcher data.");
                return;
            }

            const oldItems = [...launcherItems];
            const oldCategories = [...launcherCategories];
            const oldSettings = { ...appSettings };

            const normalizedCategories = importedData.categories.map((category) => ({
                ...category,
                id: Number(category.id),
                name: String(category.name).trim()
            }));

            launcherCategories = normalizedCategories;
            launcherItems = importedData.items.map((item) => ({
                ...item,
                id: Number(item.id),
                categoryId: item.categoryId === undefined || item.categoryId === null ? undefined : Number(item.categoryId),
                sourceItemId: item.sourceItemId === undefined || item.sourceItemId === null ? undefined : Number(item.sourceItemId),
                favorite: Boolean(item.favorite),
                missing: Boolean(item.missing),
                favicon: typeof item.favicon === "string" ? item.favicon : null
            }));

            if (importedData.settings && typeof importedData.settings === "object") {
                const allowedThemes = new Set(["dark", "light", "system"]);
                const allowedDensity = new Set(["comfortable", "compact"]);
                const allowedHotkeys = new Set(["Alt+Space", "Ctrl+Shift+L", "Ctrl+Space", "disabled"]);
                const importedSettings = importedData.settings;

                appSettings = {
                    ...appSettings,
                    theme: allowedThemes.has(importedSettings.theme) ? importedSettings.theme : appSettings.theme,
                    density: allowedDensity.has(importedSettings.density) ? importedSettings.density : appSettings.density,
                    accentColor: typeof importedSettings.accentColor === "string" ? importedSettings.accentColor : appSettings.accentColor,
                    autoStart: Boolean(importedSettings.autoStart),
                    minimizeToTray: Boolean(importedSettings.minimizeToTray),
                    startMinimized: Boolean(importedSettings.startMinimized),
                    hotkey: allowedHotkeys.has(importedSettings.hotkey) ? importedSettings.hotkey : appSettings.hotkey
                };
            }

            const categoriesSaved = saveLauncherCategories();
            const settingsBefore = localStorage.getItem(SETTINGS_STORAGE_KEY);
            saveSettings();
            const itemsSaved = await saveLauncherItems(launcherItems, { force: true });

            if (!categoriesSaved || !itemsSaved) {
                launcherItems = oldItems;
                launcherCategories = oldCategories;
                appSettings = oldSettings;
                if (settingsBefore === null) localStorage.removeItem(SETTINGS_STORAGE_KEY);
                else localStorage.setItem(SETTINGS_STORAGE_KEY, settingsBefore);
                showMessage("Restore Failed", "The backup could not be fully saved.");
                return;
            }

            refreshAllAddCategoryControls();
            renderItems();
            showMessage("Restore Successful", "Items aur settings successfully restore ho chuki hain.");
        } catch (err) {
            showMessage("Import Error", "Imported JSON file parse karne me fail ho gaya.");
        } finally {
            e.target.value = "";
        }
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
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const appShell = document.querySelector(".app");

const SIDEBAR_COLLAPSED_STORAGE_KEY = "my_launcher_sidebar_collapsed";

function applySidebarState(collapsed) {
    if (!appShell || !sidebarToggle) return;

    appShell.classList.toggle("sidebar-collapsed", collapsed);

    sidebarToggle.setAttribute(
        "aria-label",
        collapsed ? "Expand sidebar" : "Collapse sidebar"
    );

    sidebarToggle.setAttribute(
        "title",
        collapsed ? "Expand sidebar" : "Collapse sidebar"
    );
}

function loadSidebarState() {
    const savedState =
        localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);

    applySidebarState(savedState === "true");
}

if (sidebarToggle) {
    sidebarToggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const collapsed =
            !appShell.classList.contains("sidebar-collapsed");

        applySidebarState(collapsed);

        localStorage.setItem(
            SIDEBAR_COLLAPSED_STORAGE_KEY,
            String(collapsed)
        );
    });
}

loadSidebarState();
const pageSections = {
    home: document.querySelector("#home-section"),
    favorites: document.querySelector("#favorites-section"),
    websites: document.querySelector("#websites-section"),
    webapps: document.querySelector("#webapps-section"),
    applications: document.querySelector("#applications-section"),
    settings: document.querySelector("#settings-section"),
    categories: document.querySelector("#categories-section")
};

const homeGrid = document.querySelector("#home-grid");
const homeEmptyState = document.querySelector("#home-empty-state");

const categoriesGrid = document.querySelector("#categories-grid");
const categoriesEmptyState = document.querySelector("#categories-empty-state");
const addCategoryButton = document.querySelector("#add-category-button");
const addCategoryEmptyButton = document.querySelector("#add-category-empty-button");
const categoryDialog = document.querySelector("#category-dialog");
const closeCategoryDialog = document.querySelector("#close-category-dialog");
const cancelCategoryButton = document.querySelector("#cancel-category");
const categoryForm = document.querySelector("#category-form");
const categoryNameInput = document.querySelector("#category-name");

const categorySourceDialog = document.querySelector("#category-source-dialog");
const categoryNewButton = document.querySelector("#category-new-button");
const categoryExistingButton = document.querySelector("#category-existing-button");
const closeCategorySourceDialog = document.querySelector("#close-category-source-dialog");

const launcherPickerDialog = document.querySelector("#launcher-picker-dialog");
const closeLauncherPicker = document.querySelector("#close-launcher-picker");
const launcherPickerSearch = document.querySelector("#launcher-picker-search");
const launcherPickerList = document.querySelector("#launcher-picker-list");
const favoritesPickerDialog = document.querySelector("#favorites-picker-dialog");
const closeFavoritesPicker = document.querySelector("#close-favorites-picker");
const cancelFavoritesPicker = document.querySelector("#cancel-favorites-picker");
const favoritesPickerSearch = document.querySelector("#favorites-picker-search");
const favoritesPickerList = document.querySelector("#favorites-picker-list");
const favoritesPickerTitle = document.querySelector("#favorites-picker-title");
const favoritesPickerSubmit = document.querySelector("#favorites-picker-submit");
const favoritesPickerResultCount = document.querySelector("#favorites-picker-result-count");
const favoritesPickerSelectedCount = document.querySelector("#favorites-picker-selected-count");

let favoritesPickerMode = "add";
let favoritesPickerSelectedIds = new Set();



function openCategorySourceDialog() {
    categorySourceDialog.style.display = "flex";
}

function closeCategorySourceDialogDialog(keepPendingCategory = false) {
    categorySourceDialog.style.display = "none";

    if (!keepPendingCategory) {
        pendingCategoryId = null;
    }
}

function openCategoryNewFlow() {
    closeCategorySourceDialogDialog(true);
    openAddDialog();
    setAddCategoryModeVisible(false);
    addDialog.querySelector(".dialog-header h3").textContent =
        "Add Item to Category";
}

function getLauncherTypeLabel(type) {
    if (type === "application") return "Application";
    if (type === "webapp") return "Web App";
    return "Website";
}

function renderLauncherPicker() {
    if (!launcherPickerList) {
        return;
    }

    const query = launcherPickerSearch.value.trim().toLowerCase();
    launcherPickerList.innerHTML = "";

    const filteredItems = launcherItems.filter((item) => {
        // Only original launcher items can be selected.
        // Category copies must not appear in the picker.
        if (item.categoryId !== undefined && item.categoryId !== null) {
            return false;
        }

        // An item already added to this category must be removed from the list.
        const alreadyInCategory = launcherItems.some(
            (entry) =>
                Number(entry.categoryId) === Number(pendingCategoryId) &&
                Number(entry.sourceItemId) === Number(item.id)
        );

        if (alreadyInCategory) {
            return false;
        }

        const name = String(item.name || "").toLowerCase();
        const type = getLauncherTypeLabel(item.type).toLowerCase();
        const target = String(item.target || "").toLowerCase();

        return (
            !query ||
            name.includes(query) ||
            type.includes(query) ||
            target.includes(query)
        );
    });

    if (filteredItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "launcher-picker-empty";
        empty.textContent = launcherItems.length === 0
            ? "No launcher items have been added yet."
            : "No matching launcher items found.";
        launcherPickerList.appendChild(empty);
        return;
    }

    filteredItems.forEach((item) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "launcher-picker-item";

        const icon = document.createElement("div");
        icon.className = "launcher-picker-icon";

        if (item.favicon) {
            const image = document.createElement("img");
            image.src = item.favicon;
            image.alt = "";
            icon.appendChild(image);
        } else {
            icon.textContent = item.type === "application" ? "APP" : "WEB";
        }

        const info = document.createElement("div");
        info.className = "launcher-picker-info";

        const name = document.createElement("strong");
        name.textContent = item.name;

        const type = document.createElement("span");
        type.textContent = getLauncherTypeLabel(item.type);

        info.appendChild(name);
        info.appendChild(type);

        row.appendChild(icon);
        row.appendChild(info);

        row.addEventListener("click", async () => {
            if (pendingCategoryId === null) {
                closeLauncherPickerDialog();
                return;
            }

            const alreadyInCategory = launcherItems.some(
                (entry) =>
                    Number(entry.categoryId) === Number(pendingCategoryId) &&
                    Number(entry.sourceItemId) === Number(item.id)
            );

            if (alreadyInCategory) {
                showMessage(
                    "Already Added",
                    '"' + item.name + '" is already in this category.'
                );
                return;
            }

            const copiedItem = {
                ...item,
                id: Date.now(),
                categoryId: pendingCategoryId,
                sourceItemId: item.id,
                customName: false
            };

            launcherItems.push(copiedItem);

            const saved = await saveLauncherItems(launcherItems);

            if (!saved) {
                launcherItems.pop();
                showMessage("Save Failed", "The launcher could not be added to this category.");
                return;
            }

            closeLauncherPickerDialog();
            renderItems();
            renderCategories();
        });

        launcherPickerList.appendChild(row);
    });
}

function openLauncherPickerDialog() {
    closeCategorySourceDialogDialog(true);
    launcherPickerSearch.value = "";
    renderLauncherPicker();
    launcherPickerDialog.style.display = "flex";
    launcherPickerSearch.focus();
}

function closeLauncherPickerDialog() {
    launcherPickerDialog.style.display = "none";
    launcherPickerSearch.value = "";
    pendingCategoryId = null;
}

if (categoryNewButton) {
    categoryNewButton.addEventListener("click", openCategoryNewFlow);
}

if (categoryExistingButton) {
    categoryExistingButton.addEventListener("click", openLauncherPickerDialog);
}

if (closeCategorySourceDialog) {
    closeCategorySourceDialog.addEventListener(
        "click",
        closeCategorySourceDialogDialog
    );
}

if (closeLauncherPicker) {
    closeLauncherPicker.addEventListener(
        "click",
        closeLauncherPickerDialog
    );
}

if (categorySourceDialog) {
    categorySourceDialog.addEventListener("click", (event) => {
        if (event.target === categorySourceDialog) {
            closeCategorySourceDialogDialog();
        }
    });
}

if (launcherPickerDialog) {
    launcherPickerDialog.addEventListener("click", (event) => {
        if (event.target === launcherPickerDialog) {
            closeLauncherPickerDialog();
        }
    });
}

if (launcherPickerSearch) {
    launcherPickerSearch.addEventListener("input", renderLauncherPicker);
}

function openFavoritesPicker(mode) {
    if (!favoritesPickerDialog) return;

    favoritesPickerMode = mode === "remove" ? "remove" : "add";
    favoritesPickerSelectedIds.clear();

    if (favoritesPickerTitle) {
        favoritesPickerTitle.textContent =
            favoritesPickerMode === "add"
                ? "Add to Favorite"
                : "Remove from Favorite";
    }

    if (favoritesPickerSubmit) {
        favoritesPickerSubmit.textContent =
            favoritesPickerMode === "add" ? "Add" : "Remove";
    }

    if (favoritesPickerSearch) {
        favoritesPickerSearch.value = "";
    }

    renderFavoritesPicker();
    favoritesPickerDialog.style.display = "flex";
    favoritesPickerSearch?.focus();
}

function closeFavoritesPickerDialog() {
    if (favoritesPickerDialog) {
        favoritesPickerDialog.style.display = "none";
    }

    favoritesPickerSelectedIds.clear();

    if (favoritesPickerSearch) {
        favoritesPickerSearch.value = "";
    }
}

function updateFavoritesPickerMeta(resultCount) {
    if (favoritesPickerResultCount) {
        favoritesPickerResultCount.textContent =
            resultCount + (resultCount === 1 ? " item" : " items");
    }

    if (favoritesPickerSelectedCount) {
        const count = favoritesPickerSelectedIds.size;
        favoritesPickerSelectedCount.textContent =
            count + (count === 1 ? " selected" : " selected");
    }

    if (favoritesPickerSubmit) {
        favoritesPickerSubmit.disabled = favoritesPickerSelectedIds.size === 0;
    }
}

function renderFavoritesPicker() {
    if (!favoritesPickerList) return;

    const query = favoritesPickerSearch?.value.trim().toLowerCase() || "";
    favoritesPickerList.innerHTML = "";

    const filteredItems = launcherItems.filter((item) => {
        if (item.categoryId !== undefined && item.categoryId !== null) {
            return false;
        }

        const isFavorite = item.favorite === true;

        if (favoritesPickerMode === "add" && isFavorite) return false;
        if (favoritesPickerMode === "remove" && !isFavorite) return false;

        const name = String(item.name || "").toLowerCase();
        const type = getLauncherTypeLabel(item.type).toLowerCase();
        const target = String(item.target || "").toLowerCase();

        return !query ||
            name.includes(query) ||
            type.includes(query) ||
            target.includes(query);
    });

    updateFavoritesPickerMeta(filteredItems.length);

    if (filteredItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "launcher-picker-empty";
        empty.textContent = query
            ? "No matching launcher items found."
            : favoritesPickerMode === "add"
                ? "All launcher items are already favorites."
                : "No favorite launcher items have been added yet.";
        favoritesPickerList.appendChild(empty);
        return;
    }

    filteredItems.forEach((item) => {
        const row = document.createElement("label");
        row.className = "favorites-picker-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "favorites-picker-checkbox";
        checkbox.checked = favoritesPickerSelectedIds.has(Number(item.id));
        checkbox.addEventListener("change", () => {
            const id = Number(item.id);
            if (checkbox.checked) {
                favoritesPickerSelectedIds.add(id);
            } else {
                favoritesPickerSelectedIds.delete(id);
            }
            updateFavoritesPickerMeta(filteredItems.length);
        });

        const icon = document.createElement("div");
        icon.className = "launcher-picker-icon";

        if (item.favicon) {
            const image = document.createElement("img");
            image.src = item.favicon;
            image.alt = "";
            icon.appendChild(image);
        } else {
            icon.textContent = item.type === "application" ? "APP" : "WEB";
        }

        const info = document.createElement("div");
        info.className = "launcher-picker-info";

        const name = document.createElement("strong");
        name.textContent = item.name;

        const type = document.createElement("span");
        type.textContent = getLauncherTypeLabel(item.type);

        info.appendChild(name);
        info.appendChild(type);

        row.appendChild(checkbox);
        row.appendChild(icon);
        row.appendChild(info);
        favoritesPickerList.appendChild(row);
    });
}

async function applyFavoritesPicker() {
    const selectedIds = [...favoritesPickerSelectedIds];

    if (selectedIds.length === 0) {
        return;
    }

    const oldItems = launcherItems.map((item) => ({ ...item }));

    launcherItems.forEach((item) => {
        if (selectedIds.includes(Number(item.id))) {
            item.favorite = favoritesPickerMode === "add";
        }
    });

    const saved = await saveLauncherItems(launcherItems);

    if (!saved) {
        launcherItems = oldItems;
        showMessage(
            "Save Failed",
            favoritesPickerMode === "add"
                ? "The selected favorites could not be saved."
                : "The selected favorites could not be removed."
        );
        return;
    }

    closeFavoritesPickerDialog();
    renderItems();
}


if (closeFavoritesPicker) {
    closeFavoritesPicker.addEventListener("click", closeFavoritesPickerDialog);
}

if (cancelFavoritesPicker) {
    cancelFavoritesPicker.addEventListener("click", closeFavoritesPickerDialog);
}

if (favoritesPickerDialog) {
    favoritesPickerDialog.addEventListener("click", (event) => {
        if (event.target === favoritesPickerDialog) {
            closeFavoritesPickerDialog();
        }
    });
}

if (favoritesPickerSearch) {
    favoritesPickerSearch.addEventListener("input", renderFavoritesPicker);
}

if (favoritesPickerSubmit) {
    favoritesPickerSubmit.addEventListener("click", applyFavoritesPicker);
}


function loadLauncherCategories() {
    try {
        const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        launcherCategories = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(launcherCategories)) {
            launcherCategories = [];
        }
    } catch (error) {
        console.error("Failed to load launcher categories:", error);
        launcherCategories = [];
    }
}

function saveLauncherCategories() {
    try {
        localStorage.setItem(
            CATEGORIES_STORAGE_KEY,
            JSON.stringify(launcherCategories)
        );
        return true;
    } catch (error) {
        console.error("Failed to save launcher categories:", error);
        return false;
    }
}

function openCategoryDialog() {
    editingCategoryId = null;
    categoryForm.reset();
    categoryDialog.querySelector(".dialog-header h3").textContent = "Add Category";
    categoryForm.querySelector('button[type="submit"]').textContent = "Add Category";
    categoryDialog.style.display = "flex";
    categoryNameInput.focus();
}

function closeCategoryDialogDialog() {
    categoryDialog.style.display = "none";
    categoryForm.reset();
    editingCategoryId = null;
    categoryDialog.querySelector(".dialog-header h3").textContent = "Add Category";
    categoryForm.querySelector('button[type="submit"]').textContent = "Add Category";
}

function createCategoryCard(category) {
    const card = document.createElement("section");
    card.className = "category-card";
    card.dataset.categoryId = category.id;

    const categoryItems = launcherItems.filter(
        (item) => Number(item.categoryId) === Number(category.id)
    );

    const sectionHeader = document.createElement("div");
    sectionHeader.className = "category-card-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "category-card-title";

    const categorySelectionCheckbox = document.createElement("input");
    categorySelectionCheckbox.type = "checkbox";
    categorySelectionCheckbox.className = "category-selection-checkbox";
    categorySelectionCheckbox.dataset.categoryId = category.id;
    categorySelectionCheckbox.checked = isCategorySelected(category.id);
    categorySelectionCheckbox.setAttribute(
        "aria-label",
        "Select category " + String(category.name || "")
    );
    categorySelectionCheckbox.addEventListener("click", (event) => {
        event.stopPropagation();

        if (!selectionState.active || selectionState.scope !== "categories") {
            return;
        }

        toggleCategorySelectionWithItems(category.id);
        syncSelectionUI();
    });

    const categoryItemMasterCheckbox = document.createElement("input");
    categoryItemMasterCheckbox.type = "checkbox";
    categoryItemMasterCheckbox.className = "category-item-master-checkbox";
    categoryItemMasterCheckbox.dataset.selectionScope = "category-items";
    categoryItemMasterCheckbox.dataset.categoryId = category.id;
    categoryItemMasterCheckbox.checked =
        selectionState.scope === "category-items" &&
        Number(selectionState.categoryId) === Number(category.id) &&
        areAllScopeItemsSelected("category-items", category.id);
    categoryItemMasterCheckbox.setAttribute(
        "aria-label",
        "Select all items in " + String(category.name || "")
    );
    categoryItemMasterCheckbox.addEventListener("click", (event) => {
        event.stopPropagation();

        if (
            !selectionState.active ||
            selectionState.scope !== "category-items" ||
            Number(selectionState.categoryId) !== Number(category.id)
        ) {
            return;
        }

        toggleAllScopeItems("category-items", category.id);
        syncSelectionUI();
    });

    const title = document.createElement("h3");
    title.textContent = category.name;

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = String(categoryItems.length);

    const categoryMenuButton = document.createElement("button");
    categoryMenuButton.type = "button";
    categoryMenuButton.className = "category-menu-button";
    categoryMenuButton.textContent = "⋮";
    categoryMenuButton.title = "Category options";
    categoryMenuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openCategoryMenu(category, categoryMenuButton);
    });

    const categoryExitButton = document.createElement("button");
    categoryExitButton.type = "button";
    categoryExitButton.className =
        "selection-exit-button category-selection-exit";
    categoryExitButton.setAttribute(
        "aria-label",
        "Exit selection mode"
    );
    categoryExitButton.textContent = "×";
    categoryExitButton.addEventListener("click", (event) => {
        event.stopPropagation();
        exitSelectionMode();
        renderItems();
        renderCategories();
        syncSelectionUI();
    });

    titleWrap.appendChild(categorySelectionCheckbox);
    titleWrap.appendChild(categoryItemMasterCheckbox);
    titleWrap.appendChild(title);
    titleWrap.appendChild(count);
    titleWrap.appendChild(categoryMenuButton);
    titleWrap.appendChild(categoryExitButton);

    const addLauncherButton = document.createElement("button");
    addLauncherButton.type = "button";
    addLauncherButton.className = "category-launcher-button";
    addLauncherButton.textContent = "+ Add Launcher";
    addLauncherButton.addEventListener("click", (event) => {
        event.stopPropagation();
        pendingCategoryId = category.id;
        openCategorySourceDialog();
    });

    sectionHeader.appendChild(titleWrap);

    sectionHeader.addEventListener("click", (event) => {
        if (event.target.closest("button, input")) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!selectionState.active) {
            startSelection("categories", null, category.id);
            return;
        }

        if (selectionState.scope === "categories") {
            toggleCategorySelectionWithItems(category.id);
            syncSelectionUI();
        }
    });

    let longPressTimer = null;
    let longPressTriggered = false;

    const clearLongPress = () => {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    card.addEventListener("mousedown", (event) => {
        if (
            event.button !== 0 ||
            selectionState.active ||
            event.target.closest("button, input, a, .app-card")
        ) {
            return;
        }

        longPressTriggered = false;
        clearLongPress();

        longPressTimer = setTimeout(() => {
            longPressTimer = null;
            longPressTriggered = true;
            startSelection("categories", null, category.id);
        }, 500);
    });

    card.addEventListener("mouseup", clearLongPress);
    card.addEventListener("mouseleave", clearLongPress);
    card.addEventListener("dragstart", clearLongPress);

    card.addEventListener("click", (event) => {
        if (longPressTriggered) {
            longPressTriggered = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (event.target.closest(".app-card")) {
            return;
        }

        if (selectionState.active && selectionState.scope === "categories") {
            toggleCategorySelection(category.id);
            syncSelectionUI();
        }
    });

    const grid = document.createElement("div");
    grid.className = "app-grid category-item-grid";

    if (categoryItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "category-item-empty";
        empty.innerHTML =
            "<h4>No launchers in this category yet</h4><p>Use + Add Launcher to add an item here.</p>";
        grid.appendChild(empty);
    } else {
        const sortMode = sortSelect ? sortSelect.value : "default";
        const sortedCategoryItems = [...categoryItems];

        if (sortMode === "name-az") {
            sortedCategoryItems.sort((a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || ""),
                    undefined,
                    { sensitivity: "base" }
                )
            );
        } else if (sortMode === "name-za") {
            sortedCategoryItems.sort((a, b) =>
                String(b.name || "").localeCompare(
                    String(a.name || ""),
                    undefined,
                    { sensitivity: "base" }
                )
            );
        }

        sortedCategoryItems.forEach((item) => {
            grid.appendChild(createCard(item));
        });
    }

    card.appendChild(sectionHeader);
    card.appendChild(grid);
    card.appendChild(addLauncherButton);

    return card;
}

function renderCategories() {
    if (!categoriesGrid || !categoriesEmptyState) {
        return;
    }

    categoriesGrid.innerHTML = "";

    const hasCategories = launcherCategories.length > 0;

    categoriesEmptyState.style.display = hasCategories ? "none" : "flex";
    addCategoryButton.style.display = hasCategories ? "inline-flex" : "none";

    launcherCategories.forEach((category) => {
        categoriesGrid.appendChild(createCategoryCard(category));
    });

    syncSelectionUI();
}

let activeCategoryMenu = null;

function closeCategoryMenu() {
    if (activeCategoryMenu) {
        activeCategoryMenu.remove();
        activeCategoryMenu = null;
    }
}

function openCategoryMenu(category, categoryButton) {
    closeCategoryMenu();

    const menu = document.createElement("div");
    menu.className = "category-menu";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit Category";
    editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeCategoryMenu();
        editCategory(category);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "category-menu-delete";
    deleteButton.textContent = "Delete Category";
    deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeCategoryMenu();
        deleteCategory(category);
    });

    menu.appendChild(editButton);
    menu.appendChild(deleteButton);
    document.body.appendChild(menu);

    if (categoryButton) {
        const rect = categoryButton.getBoundingClientRect();
        menu.style.top = Math.min(
            rect.bottom + 6,
            window.innerHeight - menu.offsetHeight - 8
        ) + "px";
        menu.style.left = Math.min(
            rect.right - menu.offsetWidth,
            window.innerWidth - menu.offsetWidth - 8
        ) + "px";
    }

    activeCategoryMenu = menu;
}

function editCategory(category) {
    editingCategoryId = category.id;
    categoryNameInput.value = category.name;
    categoryDialog.querySelector(".dialog-header h3").textContent = "Edit Category";
    categoryForm.querySelector('button[type="submit"]').textContent = "Save Changes";
    categoryDialog.style.display = "flex";
    categoryNameInput.focus();
}

function deleteCategory(category) {
    const categoryItems = launcherItems.filter(
        (item) => Number(item.categoryId) === Number(category.id)
    );

    if (categoryItems.length === 0) {
        closeDeleteDialog();

        const oldCategories = [...launcherCategories];
        launcherCategories = launcherCategories.filter(
            (entry) => Number(entry.id) !== Number(category.id)
        );

        if (!saveLauncherCategories()) {
            launcherCategories = oldCategories;
            showMessage("Delete Failed", "The category could not be deleted.");
            return;
        }

        refreshAllAddCategoryControls();
        renderCategories();
        return;
    }

    closeDeleteDialog();
    deleteTargetCategory = category;
    deleteTargetItem = null;
    deleteTitle.textContent = "Delete Category?";
    deleteMessage.textContent =
        'Are you sure you want to delete "' + category.name + '"?';
    deleteDialog.style.display = "flex";
}

function createCategory() {
    const name = categoryNameInput.value.trim();

    if (!name) {
        showMessage("Name Required", "Please enter a name for the category.");
        return;
    }

    const duplicate = launcherCategories.some(
        (category) =>
            Number(category.id) !== Number(editingCategoryId) &&
            String(category.name || "").trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        showMessage("Already Exists", '"' + name + '" is already an existing category.');
        return;
    }

    if (editingCategoryId !== null) {
        const category = launcherCategories.find(
            (entry) => Number(entry.id) === Number(editingCategoryId)
        );

        if (!category) {
            showMessage("Update Failed", "The category could not be found.");
            return;
        }

        const oldName = category.name;
        category.name = name;

        if (!saveLauncherCategories()) {
            category.name = oldName;
            showMessage("Save Failed", "The category could not be updated.");
            return;
        }
    } else {
        launcherCategories.push({
            id: Date.now(),
            name
        });

        if (!saveLauncherCategories()) {
            launcherCategories.pop();
            showMessage("Save Failed", "The category could not be saved.");
            return;
        }
    }

    const createdCategoryId =
        editingCategoryId === null
            ? launcherCategories[launcherCategories.length - 1]?.id
            : null;

    closeCategoryDialogDialog();
    refreshAllAddCategoryControls();

    if (
        createdCategoryId !== undefined &&
        createdCategoryId !== null &&
        pendingNewCategoryType
    ) {
        const ids = [
            ...pendingNewCategorySelectedIds,
            Number(createdCategoryId)
        ].filter((id, index, arr) => arr.indexOf(id) === index);

        if (pendingNewCategoryType === "item") {
            renderMultiCategoryMenu(
                itemCategoriesMenu,
                ids,
                "item",
                (selected) => updateMultiCategoryTrigger(itemCategoriesTrigger, selected)
            );
            updateMultiCategoryTrigger(itemCategoriesTrigger, ids);
        } else if (addCategoryControls[pendingNewCategoryType]) {
            const controls = addCategoryControls[pendingNewCategoryType];
            controls.toggle.checked = true;
            controls.row.style.display = "block";
            refreshAddCategoryControls(pendingNewCategoryType, ids);
        }
    }

    pendingNewCategoryType = null;
    pendingNewCategorySelectedIds = [];

    renderCategories();

    if (searchInput && searchInput.value.trim()) {
        applySearch();
    }
}

if (addCategoryButton) {
    addCategoryButton.addEventListener("click", openCategoryDialog);
}

if (addCategoryEmptyButton) {
    addCategoryEmptyButton.addEventListener("click", openCategoryDialog);
}

if (closeCategoryDialog) {
    closeCategoryDialog.addEventListener("click", closeCategoryDialogDialog);
}

if (cancelCategoryButton) {
    cancelCategoryButton.addEventListener("click", closeCategoryDialogDialog);
}

if (categoryDialog) {
    categoryDialog.addEventListener("click", (event) => {
        if (event.target === categoryDialog) {
            closeCategoryDialogDialog();
        }
    });
}

if (categoryForm) {
    categoryForm.addEventListener("submit", (event) => {
        event.preventDefault();
        createCategory();
    });
}

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
const deleteTitle = document.querySelector("#delete-title");
const deleteMessage = document.querySelector("#delete-message");
const deleteCancel = document.querySelector("#delete-cancel");
const deleteConfirm = document.querySelector("#delete-confirm");

const contextMenu = document.querySelector("#context-menu");
const homeContextMenu = document.querySelector("#home-context-menu");
const sectionContextMenu = document.querySelector("#section-context-menu");
const favoritesContextMenu = document.querySelector("#favorites-context-menu");
const categoriesContextMenu = document.querySelector("#categories-context-menu");
const categoryContextMenu = document.querySelector("#category-context-menu");
const selectedItemsContextMenu = document.querySelector("#selected-items-context-menu");

// The launcher shell uses overflow:hidden. Keep the context menu outside
// that clipping container so it can appear at any position in the window.
if (contextMenu && contextMenu.parentElement !== document.body) {
    document.body.appendChild(contextMenu);
}
if (contextMenu) {
    contextMenu.style.zIndex = "10000";
}

if (homeContextMenu && homeContextMenu.parentElement !== document.body) {
    document.body.appendChild(homeContextMenu);
}

if (selectedItemsContextMenu) {
    selectedItemsContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");
        if (!button || !selectedItemsContextMenu.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();
        // Step 11 is UI-only. Action logic will be implemented in later steps.
        closeSelectedItemsContextMenu();
    });
}

if (homeContextMenu) {
    homeContextMenu.style.zIndex = "10000";
}

if (categoryContextMenu && categoryContextMenu.parentElement !== document.body) {
    document.body.appendChild(categoryContextMenu);
}

if (categoryContextMenu) {
    categoryContextMenu.style.zIndex = "10000";
}

if (selectedItemsContextMenu && selectedItemsContextMenu.parentElement !== document.body) {
    document.body.appendChild(selectedItemsContextMenu);
}

if (selectedItemsContextMenu) {
    selectedItemsContextMenu.style.zIndex = "10000";
}

const contextFavorite = document.querySelector("#context-favorite");
const contextCopy = document.querySelector("#context-copy");
const contextRepair = document.querySelector("#context-repair");
const contextEdit = contextMenu?.querySelector('[data-action="edit"]');
const contextAddCategories = contextMenu?.querySelector('[data-action="add-categories"]');
const contextDelete = contextMenu?.querySelector('[data-action="delete"]');
const contextSeparators = contextMenu
    ? contextMenu.querySelectorAll(".context-menu-separator")
    : [];
const searchInput = document.querySelector("#search-input");

const categoryItemNameDialog = document.querySelector("#category-item-name-dialog");
const categoryItemNameForm = document.querySelector("#category-item-name-form");
const categoryItemNameInput = document.querySelector("#category-item-name");
const closeCategoryItemNameDialogButton = document.querySelector("#close-category-item-name-dialog");
const cancelCategoryItemName = document.querySelector("#cancel-category-item-name");

const itemCategoriesDialog = document.querySelector("#item-categories-dialog");
const closeItemCategoriesDialogButton = document.querySelector("#close-item-categories-dialog");
const cancelItemCategories = document.querySelector("#cancel-item-categories");
const saveItemCategories = document.querySelector("#save-item-categories");
const itemCategoriesTrigger = document.querySelector("#item-categories-trigger");
const itemCategoriesMenu = document.querySelector("#item-categories-menu");
const sortSelect = document.querySelector("#sort-select");


/* ==============================
   Page Navigation
================================= */

function showPage(pageName) {
    clearSelection();
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
    syncSelectionUI();
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
        saveSettings();
        showMessage("Settings Reset", "Settings have been restored to their default values.");
        return;
    }

    if (action === "all") {
        clearSelection();
        const oldItems = [...launcherItems];
        const oldCategories = [...launcherCategories];
        launcherItems = [];
        launcherCategories = [];
        localStorage.removeItem(CATEGORIES_STORAGE_KEY);
        appSettings = getDefaultSettings();
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        const categoriesSaved = saveLauncherCategories();
        const saved = await saveLauncherItems(launcherItems, { force: true });
        if (!saved || !categoriesSaved) {
            launcherItems = oldItems;
            launcherCategories = oldCategories;
            saveLauncherCategories();
            await saveLauncherItems(launcherItems, { force: true });
            showMessage("Reset Failed", "The launcher data could not be reset because it could not be saved.");
            return;
        }
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
   Add Item Category Controls
================================= */

const addCategoryControls = {
    website: {
        toggle: document.querySelector("#website-category-toggle"),
        row: document.querySelector("#website-category-select-row"),
        trigger: document.querySelector("#website-category-trigger"),
        menu: document.querySelector("#website-category-menu")
    },
    webapp: {
        toggle: document.querySelector("#webapp-category-toggle"),
        row: document.querySelector("#webapp-category-select-row"),
        trigger: document.querySelector("#webapp-category-trigger"),
        menu: document.querySelector("#webapp-category-menu")
    },
    application: {
        toggle: document.querySelector("#application-category-toggle"),
        row: document.querySelector("#application-category-select-row"),
        trigger: document.querySelector("#application-category-trigger"),
        menu: document.querySelector("#application-category-menu")
    }
};

function closeAllCategoryDropdowns() {
    document.querySelectorAll(".multi-category-menu.open").forEach((menu) => {
        menu.classList.remove("open");
    });
}

function updateMultiCategoryTrigger(trigger, selectedIds) {
    if (!trigger) return;
    const text = trigger.querySelector("span");
    if (!text) return;

    if (selectedIds.length === 0) {
        text.textContent = "Select categories";
        return;
    }

    if (selectedIds.length === 1) {
        const category = launcherCategories.find(
            (entry) => Number(entry.id) === Number(selectedIds[0])
        );
        text.textContent = category ? category.name : "1 category selected";
        return;
    }

    text.textContent = selectedIds.length + " categories selected";
}

function getCheckedCategoryIds(menu) {
    if (!menu) return [];
    return Array.from(
        menu.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => Number(input.value));
}

function renderMultiCategoryMenu(menu, selectedIds = [], mode = "add", onChange = null) {
    if (!menu) return;
    menu.innerHTML = "";

    const newButton = document.createElement("button");
    newButton.type = "button";
    newButton.className = "multi-category-new";
    newButton.textContent = "+ New Category";
    newButton.addEventListener("click", (event) => {
        event.stopPropagation();

        if (mode === "item") {
            editingCategoriesItem = editingCategoriesItem || null;
            pendingNewCategoryType = "item";
        } else {
            pendingNewCategoryType = mode;
        }

        pendingNewCategorySelectedIds = [...getCheckedCategoryIds(menu)];
        closeAllCategoryDropdowns();
        openCategoryDialog();
    });
    menu.appendChild(newButton);

    if (launcherCategories.length === 0) {
        const empty = document.createElement("div");
        empty.className = "multi-category-empty";
        empty.textContent = "No categories available.";
        menu.appendChild(empty);
        return;
    }

    launcherCategories.forEach((category) => {
        const label = document.createElement("label");
        label.className = "multi-category-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = String(category.id);
        checkbox.checked = selectedIds.some(
            (id) => Number(id) === Number(category.id)
        );

        checkbox.addEventListener("change", () => {
            if (onChange) onChange(getCheckedCategoryIds(menu));
        });

        const name = document.createElement("span");
        name.textContent = category.name;

        label.appendChild(checkbox);
        label.appendChild(name);
        menu.appendChild(label);
    });
}

function refreshAddCategoryControls(type, selectedIds = []) {
    const controls = addCategoryControls[type];
    if (!controls) return;

    renderMultiCategoryMenu(
        controls.menu,
        selectedIds,
        type,
        (ids) => updateMultiCategoryTrigger(controls.trigger, ids)
    );
    updateMultiCategoryTrigger(controls.trigger, selectedIds);
}

function refreshAllAddCategoryControls() {
    Object.keys(addCategoryControls).forEach((type) => {
        refreshAddCategoryControls(type);
    });
}

function resetAddCategoryControls() {
    Object.entries(addCategoryControls).forEach(([type, controls]) => {
        controls.toggle.checked = false;
        controls.row.style.display = "none";
        refreshAddCategoryControls(type, []);
    });
}

function setAddCategoryModeVisible(visible) {
    Object.values(addCategoryControls).forEach((controls) => {
        const group = controls?.toggle?.closest(".add-category-group");
        if (group) group.style.display = visible ? "" : "none";
    });
}

function getAddCategoryIds(type) {
    const controls = addCategoryControls[type];
    if (!controls?.toggle?.checked) return [];
    return getCheckedCategoryIds(controls.menu);
}

Object.entries(addCategoryControls).forEach(([type, controls]) => {
    controls.toggle.addEventListener("change", () => {
        controls.row.style.display = controls.toggle.checked ? "block" : "none";
        if (controls.toggle.checked) refreshAddCategoryControls(type);
    });

    controls.trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = controls.menu.classList.contains("open");
        closeAllCategoryDropdowns();
        controls.menu.classList.toggle("open", !open);
    });
});

/* ==============================
   Add / Edit Dialog
================================= */

function openAddDialog() {
    editingItemId = null;
    addDialog.querySelector(".dialog-header h3").textContent = "Add Item";
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
    resetAddCategoryControls();
    setAddCategoryModeVisible(true);

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
    resetAddCategoryControls();
    setAddCategoryModeVisible(true);
    pendingCategoryId = null;
    pendingNewItemCategorySelect = null;
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
        const localHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\\d+)?(?:\/|$)/i.test(value);
        const privateHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(value);
        value = `${localHost || privateHost ? "http" : "https"}://${value}`;
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
        return parsedUrl.protocol.toLowerCase() + "//" + hostname + (parsedUrl.port ? ":" + parsedUrl.port : "") + pathname + parsedUrl.search;
    } catch {
        return null;
    }
}

function isCategoryCopy(item) {
    return item && item.categoryId !== undefined && item.categoryId !== null;
}

function findDuplicateWebsite(url, ignoredItemId = null) {
    const newKey = getWebsiteKey(url);
    if (!newKey) return null;

    return launcherItems.find((item) => {
        if (item.type !== "website" || isCategoryCopy(item)) return false;
        if (ignoredItemId !== null && Number(item.id) === Number(ignoredItemId)) return false;
        return getWebsiteKey(item.target) === newKey;
    }) || null;
}

function findDuplicateWebApp(url, ignoredItemId = null) {
    const newKey = getWebsiteKey(url);
    if (!newKey) return null;

    return launcherItems.find((item) => {
        if (item.type !== "webapp" || isCategoryCopy(item)) return false;
        if (ignoredItemId !== null && Number(item.id) === Number(ignoredItemId)) return false;
        return getWebsiteKey(item.target) === newKey;
    }) || null;
}


function addItemToCategory(originalItem, categoryId) {
    if (categoryId === null || categoryId === undefined) return;

    const exists = launcherItems.some(
        (entry) =>
            Number(entry.sourceItemId) === Number(originalItem.id) &&
            Number(entry.categoryId) === Number(categoryId)
    );

    if (exists) return;

    launcherItems.push({
        ...originalItem,
        id: Date.now() + Math.floor(Math.random() * 100000),
        categoryId,
        sourceItemId: originalItem.id,
        customName: false
    });
}


/* ==============================
   Website Form Submit
================================= */

websiteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submittingItemForm) return;

    submittingItemForm = true;

    try {
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

        if (duplicate && pendingCategoryId !== null && editingItemId === null) {
            showMessage(
                "Already Exists",
                `"${duplicate.name}" is already exists. Please import from launcher.`
            );
            return;
        }

        if (duplicate) {
            showMessage(
                "Already Added",
                `"${duplicate.name}" is already saved with this website address.`
            );
            return;
        }

        saveWebsiteButton.disabled = true;
        saveWebsiteButton.textContent = "Checking...";

        let websiteCheck;

        try {
            websiteCheck = await window.launcherAPI.checkWebsite(normalizedUrl);
        } catch {
            websiteCheck = {
                valid: false,
                available: false
            };
        }

        saveWebsiteButton.disabled = false;
        saveWebsiteButton.textContent =
            editingItemId !== null ? "Update" : "Save";

        if (!websiteCheck || !websiteCheck.valid) {
            showMessage("Invalid URL", "The website address is not valid.");
            return;
        }

        const favicon =
            await window.launcherAPI.fetchFavicon(websiteCheck.url);

        if (editingItemId !== null) {
            const item = launcherItems.find(
                (entry) => Number(entry.id) === Number(editingItemId)
            );

            if (!item) {
                showMessage(
                    "Update Failed",
                    "The selected item could not be found."
                );
                return;
            }

            item.name = name;
            item.target = websiteCheck.url;
            item.favorite = favorite;
            item.favicon = favicon || null;

            syncOriginalItemToCategoryCopies(item);
        } else {
            const originalItem = {
                id: Date.now(),
                name: name,
                type: "website",
                target: websiteCheck.url,
                favorite: favorite,
                favicon: favicon || null
            };

            launcherItems.push(originalItem);

            // "+ New" from inside a category creates the original
            // launcher item plus a separate category copy.
            if (pendingCategoryId !== null) {
                addItemToCategory(originalItem, pendingCategoryId);
            } else {
                getAddCategoryIds("website").forEach((categoryId) => {
                    addItemToCategory(originalItem, categoryId);
                });
            }
        }

        const saved = await saveLauncherItems(launcherItems);

        if (!saved) {
            showMessage(
                "Save Failed",
                "The website could not be saved."
            );
            return;
        }

        renderItems();
        closeAddDialog();

    } finally {
        submittingItemForm = false;
    }
});


/* ==============================
   Web App Form Submit
================================= */

webappForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submittingItemForm) return;

    submittingItemForm = true;

    try {
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

        const duplicate = findDuplicateWebApp(
            normalizedUrl,
            editingItemId
        );

        if (duplicate && pendingCategoryId !== null && editingItemId === null) {
            showMessage(
                "Already Exists",
                `"${duplicate.name}" is already exists. Please import from launcher.`
            );
            return;
        }

        if (duplicate) {
            showMessage(
                "Already Added",
                `"${duplicate.name}" is already saved with this web app address.`
            );
            return;
        }

        saveWebappButton.disabled = true;
        saveWebappButton.textContent = "Checking...";

        let websiteCheck;

        try {
            websiteCheck =
                await window.launcherAPI.checkWebsite(normalizedUrl);
        } catch {
            websiteCheck = {
                valid: false,
                available: false
            };
        }

        saveWebappButton.disabled = false;
        saveWebappButton.textContent =
            editingItemId !== null ? "Update" : "Save";

        if (!websiteCheck || !websiteCheck.valid) {
            showMessage(
                "Invalid Web App",
                "The web app address is not valid."
            );
            return;
        }

        const favicon =
            await window.launcherAPI.fetchFavicon(websiteCheck.url);

        if (editingItemId !== null) {
            const item = launcherItems.find(
                (entry) => Number(entry.id) === Number(editingItemId)
            );

            if (!item) {
                showMessage(
                    "Update Failed",
                    "The selected web app could not be found."
                );
                return;
            }

            item.name = name;
            item.target = websiteCheck.url;
            item.favorite = favorite;
            item.favicon = favicon || null;

            syncOriginalItemToCategoryCopies(item);
        } else {
            const originalItem = {
                id: Date.now(),
                name: name,
                type: "webapp",
                target: websiteCheck.url,
                favorite: favorite,
                favicon: favicon || null
            };

            launcherItems.push(originalItem);

            // "+ New" from inside a category creates the original
            // launcher item plus a separate category copy.
            if (pendingCategoryId !== null) {
                addItemToCategory(originalItem, pendingCategoryId);
            } else {
                getAddCategoryIds("webapp").forEach((categoryId) => {
                    addItemToCategory(originalItem, categoryId);
                });
            }
        }

        const saved = await saveLauncherItems(launcherItems);

        if (!saved) {
            showMessage(
                "Save Failed",
                "The web app could not be saved."
            );
            return;
        }

        renderItems();
        closeAddDialog();

    } finally {
        submittingItemForm = false;
    }
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
        if (item.type !== "application" || isCategoryCopy(item)) return false;
        if (ignoredItemId !== null && Number(item.id) === Number(ignoredItemId)) return false;
        return normalizeApplicationPath(item.target) === newPath;
    }) || null;
}

function syncOriginalItemToCategoryCopies(item) {
    if (!item || isCategoryCopy(item)) return;

    launcherItems.forEach((copy) => {
        if (Number(copy.sourceItemId) !== Number(item.id) || !isCategoryCopy(copy)) return;
        if (!copy.customName) copy.name = item.name;
        copy.type = item.type;
        copy.target = item.target;
        copy.favorite = Boolean(item.favorite);
        copy.favicon = item.favicon || null;
        if (item.type === "application") {
            copy.missing = Boolean(item.missing);
        }
    });
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
    if (submittingItemForm) return;

    submittingItemForm = true;

    try {
        const name = document.querySelector("#application-name").value.trim();
        const applicationPath =
            document.querySelector("#application-path").value.trim();
        const favorite =
            document.querySelector("#application-favorite").checked;

        if (!name || !applicationPath) {
            showMessage(
                "Fields Required",
                "Please enter a name and select an executable file."
            );
            return;
        }

        saveApplicationButton.disabled = true;
        saveApplicationButton.textContent = "Checking...";

        let applicationCheck;

        try {
            applicationCheck =
                await window.launcherAPI.checkApplication(applicationPath);
        } catch {
            applicationCheck = {
                valid: false,
                exists: false
            };
        }

        saveApplicationButton.disabled = false;
        saveApplicationButton.textContent =
            editingItemId !== null ? "Update" : "Save";

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
            findDuplicateApplication(
                applicationPath,
                editingItemId
            );

        if (
            duplicateApplication &&
            pendingCategoryId !== null &&
            editingItemId === null
        ) {
            showMessage(
                "Already Exists",
                `"${duplicateApplication.name}" is already exists. Please import from launcher.`
            );
            return;
        }

        if (duplicateApplication) {
            showMessage(
                "Already Added",
                `"${duplicateApplication.name}" is already saved with this path.`
            );
            return;
        }

        let applicationIcon = null;

        try {
            applicationIcon =
                await window.launcherAPI.fetchAppIcon(applicationPath);
        } catch (error) {
            console.error(
                "Failed to fetch application icon:",
                error
            );
        }

        if (editingItemId !== null) {
            const item = launcherItems.find(
                (entry) => Number(entry.id) === Number(editingItemId)
            );

            if (!item) {
                showMessage(
                    "Update Failed",
                    "The selected application could not be found."
                );
                return;
            }

            item.name = name;
            item.target = applicationPath;
            item.favorite = favorite;

            if (applicationIcon) {
                item.favicon = applicationIcon;
            }

            syncOriginalItemToCategoryCopies(item);

        } else {
            const originalItem = {
                id: Date.now(),
                name: name,
                type: "application",
                target: applicationPath,
                favorite: favorite,
                favicon: applicationIcon || null
            };

            launcherItems.push(originalItem);

            // "+ New" from inside a category creates the original
            // launcher item plus a separate category copy.
            if (pendingCategoryId !== null) {
                addItemToCategory(
                    originalItem,
                    pendingCategoryId
                );
            } else {
                getAddCategoryIds("application").forEach((categoryId) => {
                    addItemToCategory(
                        originalItem,
                        categoryId
                    );
                });
            }
        }

        const saved = await saveLauncherItems(launcherItems);

        if (!saved) {
            showMessage(
                "Save Failed",
                "The application could not be saved."
            );
            return;
        }

        renderItems();
        closeAddDialog();

    } finally {
        submittingItemForm = false;
    }
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

    if (isMissingApplication) {
        card.classList.add("app-card-missing");
    }

    const selectionCheckbox = document.createElement("input");
    selectionCheckbox.type = "checkbox";
    selectionCheckbox.className = "card-selection-checkbox";
    selectionCheckbox.dataset.itemId = item.id;
    selectionCheckbox.checked = isItemSelected(item.id);
    selectionCheckbox.setAttribute(
        "aria-label",
        "Select " + String(item.name || "launcher")
    );
    selectionCheckbox.addEventListener("click", (event) => {
        event.stopPropagation();

        if (!selectionState.active) {
            return;
        }

        toggleItemSelection(item.id);

        if (selectionState.scope === "categories") {
            syncCategorySelectionState(item.categoryId);
        }
        syncSelectionUI();
    });

    card.appendChild(selectionCheckbox);

    const icon = document.createElement("div");
    icon.className = "card-icon";

    if (isMissingApplication) {
        icon.textContent = "⚠";
    } else if (item.favicon) {
        const image = document.createElement("img");
        image.src = String(item.favicon);
        image.alt = "";
        image.addEventListener("error", () => {
            image.remove();
            icon.textContent = "🌐";
        }, { once: true });
        icon.appendChild(image);
    } else {
        icon.textContent =
            item.type === "website" ? "🌐" :
                item.type === "webapp" ? "◉" : "▦";
    }

    const cardTypeLabel = isMissingApplication ? "Application Missing" : item.type;
    card.appendChild(icon);

    if (item.favorite) {
        const star = document.createElement("span");
        star.className = "card-favorite-star";
        star.title = "Favorite";
        star.textContent = "★";
        card.appendChild(star);
    }

    const title = document.createElement("h4");
    title.textContent = String(item.name || "");
    card.appendChild(title);

    const type = document.createElement("p");
    type.textContent = cardTypeLabel;
    card.appendChild(type);

    let longPressTimer = null;
    let longPressTriggered = false;

    const clearLongPress = () => {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    card.addEventListener("mousedown", (event) => {
        if (
            event.button !== 0 ||
            selectionState.active ||
            event.target.closest("button, input, a")
        ) {
            return;
        }

        longPressTriggered = false;
        clearLongPress();

        longPressTimer = setTimeout(() => {
            longPressTimer = null;
            longPressTriggered = true;

            if (item.categoryId !== undefined && item.categoryId !== null) {
                startSelection(
                    "categories",
                    Number(item.categoryId),
                    item.id
                );
            } else if (item.type === "website") {
                startSelection("websites", null, item.id);
            } else if (item.type === "webapp") {
                startSelection("webapps", null, item.id);
            } else if (item.type === "application") {
                startSelection("applications", null, item.id);
            } else {
                startSelection("home", null, item.id);
            }
        }, 500);
    });

    card.addEventListener("mouseup", clearLongPress);
    card.addEventListener("mouseleave", clearLongPress);
    card.addEventListener("dragstart", clearLongPress);

    card.addEventListener("click", (event) => {
        if (longPressTriggered) {
            longPressTriggered = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (selectionState.active) {
            event.preventDefault();
            toggleItemSelection(item.id);

            if (selectionState.scope === "categories") {
                syncCategorySelectionState(item.categoryId);
            }

            syncSelectionUI();
            return;
        }

        openItem(item);
    });

    return card;
}


/* ==============================
   Context Menu Delegation
================================= */

document.addEventListener("contextmenu", (event) => {
    const target = getContextTarget(event);
    contextMenuTarget = target;

    event.preventDefault();
    event.stopPropagation();

    if (target.type === "item") {
        if (selectionState.active) {
            if (!isItemSelected(target.item.id)) {
                closeSelectedItemsContextMenu();
                closeContextMenu();
                return;
            }
            closeContextMenu();
            openSelectedItemsContextMenu(event.clientX, event.clientY);
            return;
        }

        openContextMenu(target.item, event.clientX, event.clientY);
        return;
    }

    closeContextMenu();

    if (target.type === "category") {
        const activePage = document.querySelector(".page-section.active-page");

        if (
            activePage &&
            activePage.id === "categories-section"
        ) {
            if (selectionState.active) {
                if (!isCategorySelected(target.categoryId)) {
                    closeSelectedItemsContextMenu();
                    return;
                }
                openSelectedItemsContextMenu(event.clientX, event.clientY);
                return;
            }

            openCategoryContextMenu(
                target.categoryId,
                event.clientX,
                event.clientY
            );
        }

        return;
    }

    const activePage = document.querySelector(".page-section.active-page");

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "home-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openHomeContextMenu(event.clientX, event.clientY);
        return;
    }

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "favorites-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openFavoritesContextMenu(event.clientX, event.clientY);
        return;
    }

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "categories-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openCategoriesContextMenu(event.clientX, event.clientY);
        return;
    }

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "websites-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openSectionContextMenu("websites", event.clientX, event.clientY);
        return;
    }

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "webapps-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openSectionContextMenu("webapps", event.clientX, event.clientY);
        return;
    }

    if (
        target.type === "background" &&
        activePage &&
        activePage.id === "applications-section"
    ) {
        if (selectionState.active) {
            return;
        }

        openSectionContextMenu("applications", event.clientX, event.clientY);
        return;
    }

    return;
}, true);


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
    const openKey = String(item.id);
    if (openingItems.has(openKey)) return;
    openingItems.add(openKey);

    try {
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
    } finally {
        openingItems.delete(openKey);
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
        // Category copies are shown only inside their category.
        if (item.categoryId !== undefined && item.categoryId !== null) {
            return;
        }

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

    const originalItemsCount = launcherItems.filter(
        (item) => item.categoryId === undefined || item.categoryId === null
    ).length;

    homeEmptyState.style.display = originalItemsCount === 0 ? "flex" : "none";
    renderCategories();
    syncSelectionUI();
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

    const targets = isCategoryCopy(item)
        ? launcherItems.filter((entry) => Number(entry.id) === Number(item.sourceItemId) || Number(entry.sourceItemId) === Number(item.sourceItemId))
        : [item];

    const oldStates = targets.map((entry) => ({
        entry,
        target: entry.target,
        favicon: entry.favicon || null,
        missing: entry.missing === true
    }));

    targets.forEach((entry) => {
        entry.target = newPath;
        entry.missing = false;
        entry.favicon = applicationIcon || null;
    });

    const saved = await saveLauncherItems(launcherItems);

    if (!saved) {
        oldStates.forEach((state) => {
            state.entry.target = state.target;
            state.entry.favicon = state.favicon;
            state.entry.missing = state.missing;
        });

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


function openCategoryItemNameDialog(item) {
    editingCategoryItemId = item.id;
    categoryItemNameInput.value = item.name || "";
    categoryItemNameDialog.style.display = "flex";
    categoryItemNameInput.focus();
    categoryItemNameInput.select();
}

function closeCategoryItemNameDialog() {
    categoryItemNameDialog.style.display = "none";
    editingCategoryItemId = null;
    categoryItemNameInput.value = "";
}

if (closeCategoryItemNameDialogButton) {
    closeCategoryItemNameDialogButton.addEventListener(
        "click",
        closeCategoryItemNameDialog
    );
}

if (cancelCategoryItemName) {
    cancelCategoryItemName.addEventListener(
        "click",
        closeCategoryItemNameDialog
    );
}

if (categoryItemNameDialog) {
    categoryItemNameDialog.addEventListener("click", (event) => {
        if (event.target === categoryItemNameDialog) {
            closeCategoryItemNameDialog();
        }
    });
}

if (categoryItemNameForm) {
    categoryItemNameForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (editingCategoryItemId === null) return;

        const item = launcherItems.find(
            (entry) => Number(entry.id) === Number(editingCategoryItemId)
        );

        if (!item || item.categoryId === undefined || item.categoryId === null) {
            closeCategoryItemNameDialog();
            return;
        }

        const newName = categoryItemNameInput.value.trim();

        if (!newName) {
            showMessage("Name Required", "Please enter a name.");
            return;
        }

        const oldName = item.name;
        const oldCustomName = Boolean(item.customName);
        item.name = newName;
        item.customName = true;

        const saved = await saveLauncherItems(launcherItems);

        if (!saved) {
            item.name = oldName;
            item.customName = oldCustomName;
            showMessage(
                "Save Failed",
                "The category item name could not be updated."
            );
            return;
        }

        closeCategoryItemNameDialog();
        renderItems();
    });
}

async function removeItemFromCategory(item) {
    if (!item || item.categoryId === undefined || item.categoryId === null) {
        return;
    }

    const oldItems = [...launcherItems];
    launcherItems = launcherItems.filter(
        (entry) => Number(entry.id) !== Number(item.id)
    );

    const saved = await saveLauncherItems(launcherItems);

    if (!saved) {
        launcherItems = oldItems;
        showMessage(
            "Remove Failed",
            "The item could not be removed from this category."
        );
        return;
    }

    renderItems();
}

function getCategoryCopiesForItem(itemId) {
    return launcherItems.filter(
        (entry) =>
            Number(entry.sourceItemId) === Number(itemId) &&
            entry.categoryId !== undefined &&
            entry.categoryId !== null
    );
}

function openItemCategoriesDialog(item) {
    editingCategoriesItem = item;
    const selectedIds = getCategoryCopiesForItem(item.id).map(
        (entry) => Number(entry.categoryId)
    );

    renderMultiCategoryMenu(
        itemCategoriesMenu,
        selectedIds,
        "item",
        (ids) => updateMultiCategoryTrigger(itemCategoriesTrigger, ids)
    );
    updateMultiCategoryTrigger(itemCategoriesTrigger, selectedIds);
    itemCategoriesDialog.style.display = "flex";
}

function closeItemCategoriesDialog() {
    itemCategoriesDialog.style.display = "none";
    editingCategoriesItem = null;
    closeAllCategoryDropdowns();
}

async function syncItemCategories(item, selectedIds) {
    if (!item) return false;

    const oldItems = [...launcherItems];
    const selected = [...new Set(selectedIds.map(Number))];

    launcherItems = launcherItems.filter((entry) => {
        if (Number(entry.sourceItemId) !== Number(item.id)) return true;
        return selected.includes(Number(entry.categoryId));
    });

    selected.forEach((categoryId) => {
        const exists = launcherItems.some(
            (entry) =>
                Number(entry.sourceItemId) === Number(item.id) &&
                Number(entry.categoryId) === Number(categoryId)
        );

        if (!exists) {
            launcherItems.push({
                ...item,
                id: Date.now() + Math.floor(Math.random() * 1000000),
                categoryId,
                sourceItemId: item.id,
                customName: false
            });
        }
    });

    const saved = await saveLauncherItems(launcherItems);

    if (!saved) {
        launcherItems = oldItems;
        showMessage("Save Failed", "The category changes could not be saved.");
        return false;
    }

    renderItems();
    return true;
}

if (itemCategoriesTrigger) {
    itemCategoriesTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = itemCategoriesMenu.classList.contains("open");
        closeAllCategoryDropdowns();
        itemCategoriesMenu.classList.toggle("open", !open);
    });
}

if (closeItemCategoriesDialogButton) {
    closeItemCategoriesDialogButton.addEventListener("click", closeItemCategoriesDialog);
}

if (cancelItemCategories) {
    cancelItemCategories.addEventListener("click", closeItemCategoriesDialog);
}

if (itemCategoriesDialog) {
    itemCategoriesDialog.addEventListener("click", (event) => {
        if (event.target === itemCategoriesDialog) closeItemCategoriesDialog();
    });
}

if (saveItemCategories) {
    saveItemCategories.addEventListener("click", async () => {
        if (!editingCategoriesItem) return;
        const selectedIds = getCheckedCategoryIds(itemCategoriesMenu);
        const ok = await syncItemCategories(editingCategoriesItem, selectedIds);
        if (ok) closeItemCategoriesDialog();
    });
}

/* ==============================
   Context Menu & Actions
================================= */

function openContextMenu(item, x, y) {
    contextMenuTarget = {
        type: "item",
        itemId: Number(item.id)
    };
    contextMenuItem = item;

    const isCategoryItem =
        item.categoryId !== undefined &&
        item.categoryId !== null;

    if (contextEdit) {
        contextEdit.querySelector("span").textContent =
            isCategoryItem ? "Edit Name" : "Edit";
    }

    if (contextAddCategories) {
        contextAddCategories.style.display = isCategoryItem ? "none" : "flex";
    }

    if (contextFavorite) {
        contextFavorite.style.display = isCategoryItem ? "none" : "flex";
        const favoriteLabel = contextFavorite.querySelector("span");
        if (favoriteLabel) {
            favoriteLabel.textContent = item.favorite
                ? "Remove from Favorites"
                : "Add to Favorites";
        }
    }

    if (contextRepair) {
        contextRepair.style.display =
            item.type === "application" && item.missing
                ? "flex"
                : "none";
    }

    if (contextCopy) {
        contextCopy.textContent =
            item.type === "application" ? "Copy Path" : "Copy URL";
        contextCopy.style.display = "flex";
    }

    if (contextDelete) {
        contextDelete.querySelector("span").textContent =
            isCategoryItem ? "Remove from Category" : "Delete";
    }

    contextSeparators.forEach((separator, index) => {
        separator.style.display = isCategoryItem
            ? (index === 0 ? "block" : "none")
            : "";
    });

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
function closeHomeContextMenu() {
    if (homeContextMenu) {
        homeContextMenu.style.display = "none";
    }
}

function closeSectionContextMenu() {
    if (sectionContextMenu) {
        sectionContextMenu.style.display = "none";
    }
}

function closeFavoritesContextMenu() {
    if (favoritesContextMenu) {
        favoritesContextMenu.style.display = "none";
    }
}

function closeCategoriesContextMenu() {
    if (categoriesContextMenu) {
        categoriesContextMenu.style.display = "none";
    }
}

function closeCategoryContextMenu() {
    if (categoryContextMenu) {
        categoryContextMenu.style.display = "none";
    }
}

function openCategoryContextMenu(categoryId, x, y) {
    if (!categoryContextMenu) {
        return;
    }

    categoryContextMenu.dataset.categoryId = String(categoryId);
    categoryContextMenu.style.display = "block";

    const menuWidth = categoryContextMenu.offsetWidth;
    const menuHeight = categoryContextMenu.offsetHeight;
    const edgePadding = 8;

    categoryContextMenu.style.left = Math.min(
        x,
        Math.max(edgePadding, window.innerWidth - menuWidth - edgePadding)
    ) + "px";

    categoryContextMenu.style.top = Math.min(
        y,
        Math.max(edgePadding, window.innerHeight - menuHeight - edgePadding)
    ) + "px";
}

function openCategoriesContextMenu(x, y) {
    if (!categoriesContextMenu) {
        return;
    }

    categoriesContextMenu.style.display = "block";

    const menuWidth = categoriesContextMenu.offsetWidth;
    const menuHeight = categoriesContextMenu.offsetHeight;
    const edgePadding = 8;

    categoriesContextMenu.style.left = Math.min(
        x,
        Math.max(edgePadding, window.innerWidth - menuWidth - edgePadding)
    ) + "px";

    categoriesContextMenu.style.top = Math.min(
        y,
        Math.max(edgePadding, window.innerHeight - menuHeight - edgePadding)
    ) + "px";
}

function openFavoritesContextMenu(x, y) {
    if (!favoritesContextMenu) {
        return;
    }

    favoritesContextMenu.style.display = "block";

    const menuWidth = favoritesContextMenu.offsetWidth;
    const menuHeight = favoritesContextMenu.offsetHeight;
    const edgePadding = 8;

    favoritesContextMenu.style.left = Math.min(
        x,
        Math.max(edgePadding, window.innerWidth - menuWidth - edgePadding)
    ) + "px";

    favoritesContextMenu.style.top = Math.min(
        y,
        Math.max(edgePadding, window.innerHeight - menuHeight - edgePadding)
    ) + "px";
}

function openSectionContextMenu(type, x, y) {
    if (!sectionContextMenu) {
        return;
    }

    const addButton = sectionContextMenu.querySelector('[data-action="section-add"]');
    const selectButton = sectionContextMenu.querySelector('[data-action="section-select"]');

    if (addButton) {
        addButton.textContent =
            type === "websites"
                ? "Add Website"
                : type === "webapps"
                    ? "Add Web App"
                    : "Add Application";
    }

    sectionContextMenu.dataset.sectionType = type;
    sectionContextMenu.style.display = "block";

    const menuWidth = sectionContextMenu.offsetWidth;
    const menuHeight = sectionContextMenu.offsetHeight;
    const edgePadding = 8;

    sectionContextMenu.style.left = Math.min(
        x,
        Math.max(edgePadding, window.innerWidth - menuWidth - edgePadding)
    ) + "px";

    sectionContextMenu.style.top = Math.min(
        y,
        Math.max(edgePadding, window.innerHeight - menuHeight - edgePadding)
    ) + "px";
}

function closeSelectedItemsContextMenu() {
    if (selectedItemsContextMenu) {
        selectedItemsContextMenu.style.display = "none";
    }
}

function setSelectedMenuAction(action, visible) {
    const button = selectedItemsContextMenu?.querySelector('[data-action="' + action + '"]');
    if (button) button.style.display = visible ? "flex" : "none";
}

function setSelectedMenuLabel(action, text) {
    const button = selectedItemsContextMenu?.querySelector('[data-action="' + action + '"] span');
    if (button) button.textContent = text;
}

function openSelectedItemsContextMenu(x, y) {
    if (!selectedItemsContextMenu || !selectionState.active) return;

    const isCategorySelection = selectionState.scope === "categories";
    const isSpecificCategory = isCategorySelection && selectionState.categoryId !== null && selectionState.categoryId !== undefined;
    const isNormalItemSelection = !isCategorySelection;

    setSelectedMenuAction("selected-open", true);
    setSelectedMenuAction("selected-select-all", isNormalItemSelection);
    setSelectedMenuAction("selected-unselect-all", isNormalItemSelection);
    setSelectedMenuAction("selected-select-all-categories", isCategorySelection && !isSpecificCategory);
    setSelectedMenuAction("selected-unselect-all-categories", isCategorySelection && !isSpecificCategory);
    setSelectedMenuAction("selected-select-category", isSpecificCategory);
    setSelectedMenuAction("selected-unselect-category", isSpecificCategory);

    const selectedItems = launcherItems.filter((item) => selectionState.selectedItemIds.has(Number(item.id)));
    const allFavorite = selectedItems.length > 0 && selectedItems.every((item) => item.favorite === true);
    const allNotFavorite = selectedItems.length > 0 && selectedItems.every((item) => item.favorite !== true);
    setSelectedMenuAction("selected-add-favorite", isNormalItemSelection && !allFavorite);
    setSelectedMenuAction("selected-remove-favorite", isNormalItemSelection && !allNotFavorite);
    setSelectedMenuAction("selected-remove-category", isCategorySelection);
    setSelectedMenuAction("selected-delete", true);

    if (isSpecificCategory) {
        const category = launcherCategories.find((entry) => Number(entry.id) === Number(selectionState.categoryId));
        if (category) {
            setSelectedMenuLabel("selected-select-category", 'Select "' + category.name + '" ');
            setSelectedMenuLabel("selected-unselect-category", 'Unselect "' + category.name + '" ');
        }
    }

    selectedItemsContextMenu.style.display = "block";
    const menuWidth = selectedItemsContextMenu.offsetWidth;
    const menuHeight = selectedItemsContextMenu.offsetHeight;
    const edgePadding = 8;
    selectedItemsContextMenu.style.left = Math.min(x, Math.max(edgePadding, window.innerWidth - menuWidth - edgePadding)) + "px";
    selectedItemsContextMenu.style.top = Math.min(y, Math.max(edgePadding, window.innerHeight - menuHeight - edgePadding)) + "px";
}

function closeContextMenu() {
    contextMenu.style.display = "none";
    closeHomeContextMenu();
    closeSectionContextMenu();
    closeFavoritesContextMenu();
    closeCategoriesContextMenu();
    closeCategoryContextMenu();
    closeSelectedItemsContextMenu();
    contextMenuItem = null;
    contextMenuTarget = null;
}

function openHomeContextMenu(x, y) {
    if (!homeContextMenu) {
        return;
    }

    homeContextMenu.style.display = "block";

    const menuWidth = homeContextMenu.offsetWidth;
    const menuHeight = homeContextMenu.offsetHeight;
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

    homeContextMenu.style.left = left + "px";
    homeContextMenu.style.top = top + "px";
}

function getContextTarget(event) {
    const card = event.target.closest(".app-card");

    if (card) {
        const itemId = Number(card.dataset.itemId);
        const item = launcherItems.find(
            (entry) => Number(entry.id) === itemId
        );

        if (item) {
            return {
                type: "item",
                itemId,
                item
            };
        }
    }

    const categoryCard = event.target.closest(".category-card");

    if (categoryCard) {
        const categoryId = Number(categoryCard.dataset.categoryId);
        const category = launcherCategories.find(
            (entry) => Number(entry.id) === categoryId
        );

        if (category) {
            return {
                type: "category",
                categoryId,
                category
            };
        }
    }

    return {
        type: "background"
    };
}

document.addEventListener("click", (event) => {
    if (!contextMenu.contains(event.target)) {
        closeContextMenu();
    }

    if (
        activeCategoryMenu &&
        !activeCategoryMenu.contains(event.target) &&
        !event.target.closest(".category-menu-button")
    ) {
        closeCategoryMenu();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeContextMenu();
    closeDeleteDialog();
    closeConfirmDialog();
    closeAddDialog();
    closeCategoryDialogDialog();
    closeCategorySourceDialogDialog();
    closeLauncherPickerDialog();
    if (messageDialog) messageDialog.style.display = "none";
    if (itemCategoriesDialog) itemCategoriesDialog.style.display = "none";
    if (categoryItemNameDialog) categoryItemNameDialog.style.display = "none";
});

if (sectionContextMenu && sectionContextMenu.parentElement !== document.body) {
    document.body.appendChild(sectionContextMenu);
}

if (sectionContextMenu) {
    sectionContextMenu.style.zIndex = "10000";
}

if (favoritesContextMenu && favoritesContextMenu.parentElement !== document.body) {
    document.body.appendChild(favoritesContextMenu);
}

if (favoritesContextMenu) {
    favoritesContextMenu.style.zIndex = "10000";
}

if (categoriesContextMenu && categoriesContextMenu.parentElement !== document.body) {
    document.body.appendChild(categoriesContextMenu);
}

if (categoriesContextMenu) {
    categoriesContextMenu.style.zIndex = "10000";
}

if (homeContextMenu) {
    homeContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");

        if (!button || !homeContextMenu.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        closeHomeContextMenu();

        if (action === "home-add") {
            openAddDialog();
        } else if (action === "home-select") {
            startSelection("home");
        }
    });
}if (categoriesContextMenu) {
    categoriesContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");

        if (!button || !categoriesContextMenu.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        closeCategoriesContextMenu();

        if (action === "categories-add") {
            addCategoryButton.click();
        } else if (action === "categories-select") {
            startSelection("categories");
        }
    });
}


if (categoryContextMenu) {
    categoryContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");

        if (!button || !categoryContextMenu.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        const categoryId = Number(categoryContextMenu.dataset.categoryId);

        closeCategoryContextMenu();

        if (action === "category-add-launcher") {
            pendingCategoryId = categoryId;
            openCategorySourceDialog();
        } else if (action === "category-select-items") {
            startSelection("categories", categoryId);
        }
    });
}


if (favoritesContextMenu) {
    favoritesContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");

        if (!button || !favoritesContextMenu.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        closeFavoritesContextMenu();

        if (action === "favorites-select") {
            startSelection("favorites");
        } else if (action === "favorites-add") {
            openFavoritesPicker("add");
        } else if (action === "favorites-remove") {
            openFavoritesPicker("remove");
        }
    });
}


if (sectionContextMenu) {
    sectionContextMenu.addEventListener("click", (event) => {
        const button = event.target.closest(".context-menu-item");

        if (!button || !sectionContextMenu.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action;
        const type = sectionContextMenu.dataset.sectionType;
        closeSectionContextMenu();

        if (action === "section-add") {
            openAddDialog();

            if (type === "websites") {
                websiteButton.click();
            } else if (type === "webapps") {
                webappButton.click();
            } else if (type === "applications") {
                applicationButton.click();
            }
        } else if (action === "section-select") {
            startSelection(type);
        }
    });
}





contextMenu.addEventListener("click", async (event) => {
    const button = event.target.closest(".context-menu-item");
    if (!button || !contextMenu.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    if (!contextMenuItem) return;

    const item = contextMenuItem;
    const action = button.dataset.action;
    closeContextMenu();

    if (action === "open") {
        await openItem(item);
    } else if (action === "edit") {
        if (item.categoryId !== undefined && item.categoryId !== null) {
            openCategoryItemNameDialog(item);
        } else {
            editItem(item);
        }
    } else if (action === "add-categories") {
        if (item.categoryId === undefined || item.categoryId === null) {
            openItemCategoriesDialog(item);
        }
    } else if (action === "repair") {
        await repairApplication(item);
    } else if (action === "favorite") {
        const oldFavorite = Boolean(item.favorite);
        item.favorite = !oldFavorite;
        if (!isCategoryCopy(item)) syncOriginalItemToCategoryCopies(item);
        const saved = await saveLauncherItems(launcherItems);
        if (!saved) {
            item.favorite = oldFavorite;
            showMessage("Save Failed", "The favorite status could not be saved.");
            return;
        }
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
        if (item.categoryId !== undefined && item.categoryId !== null) {
            await removeItemFromCategory(item);
        } else {
            openDeleteDialog(item);
        }
    }
});


/* ==============================
   Edit Item
================================= */

function editItem(item) {
    editingItemId = item.id;
    setAddCategoryModeVisible(false);
    resetAddCategoryControls();
    itemTypeSelection.style.display = "none";

    if (item.type === "website") {
        websiteForm.style.display = "block";
        document.querySelector("#website-name").value = item.name;
        document.querySelector("#website-url").value = item.target;
        document.querySelector("#website-favorite").checked = Boolean(item.favorite);
        addDialog.querySelector(".dialog-header h3").textContent = "Edit Website";
        saveWebsiteButton.textContent = "Update";
    } else if (item.type === "webapp") {
        webappForm.style.display = "block";
        document.querySelector("#webapp-name").value = item.name;
        document.querySelector("#webapp-url").value = item.target;
        document.querySelector("#webapp-favorite").checked = Boolean(item.favorite);
        addDialog.querySelector(".dialog-header h3").textContent = "Edit Web App";
        saveWebappButton.textContent = "Update";
    } else if (item.type === "application") {
        applicationForm.style.display = "block";
        document.querySelector("#application-name").value = item.name;
        document.querySelector("#application-path").value = item.target;
        document.querySelector("#application-favorite").checked = Boolean(item.favorite);
        addDialog.querySelector(".dialog-header h3").textContent = "Edit Windows Application";
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
    deleteTargetCategory = null;
    deleteTitle.textContent = "Delete Item?";
}

deleteCancel.addEventListener("click", closeDeleteDialog);

deleteConfirm.addEventListener("click", async () => {
    if (deleteTargetCategory) {
        const category = deleteTargetCategory;
        const oldCategories = [...launcherCategories];
        const oldItems = [...launcherItems];

        launcherCategories = launcherCategories.filter(
            (entry) => Number(entry.id) !== Number(category.id)
        );
        launcherItems = launcherItems.filter(
            (entry) => Number(entry.categoryId) !== Number(category.id)
        );

        const categoriesSaved = saveLauncherCategories();
        const itemsSaved = categoriesSaved
            ? await saveLauncherItems(launcherItems)
            : false;

        if (!categoriesSaved || !itemsSaved) {
            launcherCategories = oldCategories;
            launcherItems = oldItems;
            saveLauncherCategories();
            await saveLauncherItems(launcherItems);
            showMessage("Delete Failed", "The category could not be deleted.");
            return;
        }

        closeDeleteDialog();
        refreshAllAddCategoryControls();
        renderItems();
        renderCategories();
        return;
    }

    if (!deleteTargetItem) return;
    const oldItems = [...launcherItems];
    const deletedId = Number(deleteTargetItem.id);
    launcherItems = launcherItems.filter(
        (entry) =>
            Number(entry.id) !== deletedId &&
            Number(entry.sourceItemId) !== deletedId
    );
    const saved = await saveLauncherItems(launcherItems);
    if (!saved) {
        launcherItems = oldItems;
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

searchInput.addEventListener("input", () => {
    clearSelection();
    applySearch();
});

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

    loadLauncherCategories();
    refreshAllAddCategoryControls();

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