let launcherItems = [];

let contextMenuItem = null;

let deleteTargetItem = null;

let editingItemId = null;


/* ==============================
   Elements
================================= */

const navItems =
    document.querySelectorAll(".nav-item");


const pageSections = {

    home:
        document.querySelector("#home-section"),

    favorites:
        document.querySelector("#favorites-section"),

    websites:
        document.querySelector("#websites-section"),

    webapps:
        document.querySelector("#webapps-section"),

    applications:
        document.querySelector("#applications-section"),

    settings:
        document.querySelector("#settings-section")

};


const homeGrids = {

    websites:
        document.querySelector("#home-websites-grid"),

    webapps:
        document.querySelector("#home-webapps-grid"),

    applications:
        document.querySelector("#home-applications-grid")

};


const categoryGrids = {

    favorites:
        document.querySelector("#favorites-grid"),

    websites:
        document.querySelector("#websites-grid"),

    webapps:
        document.querySelector("#webapps-grid"),

    applications:
        document.querySelector("#applications-grid")

};


const addButton =
    document.querySelector("#add-button");

const addDialog =
    document.querySelector("#add-dialog");

const closeDialog =
    document.querySelector("#close-dialog");

const itemTypeSelection =
    document.querySelector(".item-type-selection");

const websiteButton =
    document.querySelector("#website-button");

const websiteForm =
    document.querySelector("#website-form");

const saveWebsiteButton =
    document.querySelector("#save-website");

const applicationButton =
    document.querySelector("#application-button");

const applicationForm =
    document.querySelector("#application-form");

const browseApplicationButton =
    document.querySelector("#browse-application");

const saveApplicationButton =
    document.querySelector("#save-application");


const messageDialog =
    document.querySelector("#message-dialog");

const messageTitle =
    document.querySelector("#message-title");

const messageText =
    document.querySelector("#message-text");

const messageClose =
    document.querySelector("#message-close");


const deleteDialog =
    document.querySelector("#delete-dialog");

const deleteMessage =
    document.querySelector("#delete-message");

const deleteCancel =
    document.querySelector("#delete-cancel");

const deleteConfirm =
    document.querySelector("#delete-confirm");


const contextMenu =
    document.querySelector("#context-menu");

const contextFavorite =
    document.querySelector("#context-favorite");

const contextCopy =
    document.querySelector("#context-copy");


const searchInput =
    document.querySelector("#search-input");


/* ==============================
   Page Navigation
================================= */

function showPage(pageName) {

    Object.values(pageSections)
        .forEach((section) => {

            section.classList.remove(
                "active-page"
            );

        });


    if (pageSections[pageName]) {

        pageSections[pageName]
            .classList.add(
                "active-page"
            );

    }


    navItems.forEach((item) => {

        item.classList.remove("active");


        if (
            item.dataset.section ===
            pageName
        ) {

            item.classList.add("active");

        }

    });


    closeContextMenu();

}


navItems.forEach((item) => {

    item.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            showPage(
                item.dataset.section
            );

        }
    );

});


/* ==============================
   Message Dialog
================================= */

function showMessage(
    title,
    message
) {

    messageTitle.textContent =
        title;

    messageText.textContent =
        message;

    messageDialog.style.display =
        "flex";

}


function closeMessage() {

    messageDialog.style.display =
        "none";

}


messageClose.addEventListener(
    "click",
    closeMessage
);


messageDialog.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            messageDialog
        ) {

            closeMessage();

        }

    }
);


/* ==============================
   Add / Edit Dialog
================================= */

function openAddDialog() {

    editingItemId = null;

    itemTypeSelection.style.display =
        "block";

    websiteForm.style.display =
        "none";

    applicationForm.style.display =
        "none";

    websiteForm.reset();
    applicationForm.reset();


    document.querySelector(
        ".dialog-header h3"
    ).textContent =
        "Add Item";


    saveWebsiteButton.textContent =
        "Save";


    addDialog.style.display =
        "flex";

}


function closeAddDialog() {

    editingItemId = null;

    addDialog.style.display =
        "none";

    itemTypeSelection.style.display =
        "block";

    websiteForm.style.display =
        "none";

    applicationForm.style.display =
        "none";

    websiteForm.reset();
    applicationForm.reset();

}


addButton.addEventListener(
    "click",
    openAddDialog
);


closeDialog.addEventListener(
    "click",
    closeAddDialog
);


addDialog.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            addDialog
        ) {

            closeAddDialog();

        }

    }
);


/* ==============================
   Website Form
================================= */

websiteButton.addEventListener(
    "click",
    () => {

        itemTypeSelection.style.display =
            "none";

        websiteForm.style.display =
            "block";

    }
);


applicationButton.addEventListener(
    "click",
    () => {

        itemTypeSelection.style.display =
            "none";

        websiteForm.style.display =
            "none";

        applicationForm.style.display =
            "block";

    }
);


/* ==============================
   URL Helpers
================================= */

function normalizeWebsiteUrl(input) {

    let value =
        input.trim();


    if (!value) {

        return null;

    }


    if (
        !/^https?:\/\//i.test(value)
    ) {

        value =
            `https://${value}`;

    }


    try {

        const url =
            new URL(value);


        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {

            return null;

        }


        if (!url.hostname) {

            return null;

        }


        url.hostname =
            url.hostname.toLowerCase();


        if (
            url.protocol === "https:" &&
            url.port === "443"
        ) {

            url.port = "";

        }

        if (
            url.protocol === "http:" &&
            url.port === "80"
        ) {

            url.port = "";

        }


        if (
            url.pathname === "/"
        ) {

            url.pathname = "";

        }


        return url.href;

    }

    catch {

        return null;

    }

}


/*
 * Generate a duplicate key.
 *
 * Protocol is intentionally ignored.
 *
 * www.youtube.com
 * youtube.com
 *
 * are treated as the same website.
 *
 * Path and query are preserved.
 *
 * youtube.com
 * youtube.com/codewithharry
 *
 * are different websites.
 */

function getWebsiteKey(url) {

    try {

        const parsedUrl =
            new URL(
                normalizeWebsiteUrl(url)
            );


        let hostname =
            parsedUrl.hostname
                .toLowerCase();


        if (
            hostname.startsWith(
                "www."
            )
        ) {

            hostname =
                hostname.slice(4);

        }


        let pathname =
            parsedUrl.pathname;


        while (
            pathname.length > 1 &&
            pathname.endsWith("/")
        ) {

            pathname =
                pathname.slice(0, -1);

        }


        return (
            hostname +
            pathname +
            parsedUrl.search
        );

    }

    catch {

        return null;

    }

}


/* ==============================
   Duplicate Check
================================= */

function findDuplicateWebsite(
    url,
    ignoredItemId = null
) {

    const newKey =
        getWebsiteKey(url);


    if (!newKey) {

        return null;

    }


    return launcherItems.find(
        (item) => {

            if (
                item.type !==
                "website"
            ) {

                return false;

            }


            if (
                ignoredItemId !== null &&
                item.id ===
                ignoredItemId
            ) {

                return false;

            }


            const existingKey =
                getWebsiteKey(
                    item.target
                );


            return (
                existingKey ===
                newKey
            );

        }
    ) || null;

}


/* ==============================
   Website Form Submit
================================= */

websiteForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const name =
            document.querySelector(
                "#website-name"
            ).value.trim();


        const rawUrl =
            document.querySelector(
                "#website-url"
            ).value;


        const favorite =
            document.querySelector(
                "#website-favorite"
            ).checked;


        if (!name) {

            showMessage(
                "Name Required",
                "Please enter a name for this website."
            );

            return;

        }


        const normalizedUrl =
            normalizeWebsiteUrl(
                rawUrl
            );


        if (!normalizedUrl) {

            showMessage(
                "Invalid URL",
                "Please enter a valid website address, such as youtube.com or youtube.com/codewithharry."
            );

            return;

        }


        const duplicate =
            findDuplicateWebsite(
                normalizedUrl,
                editingItemId
            );


        if (duplicate) {

            showMessage(
                "Already Added",
                `"${duplicate.name}" is already saved with this website address.`
            );

            return;

        }


        saveWebsiteButton.disabled =
            true;

        saveWebsiteButton.textContent =
            "Checking...";


        let websiteCheck;


        try {

            websiteCheck =
                await window.launcherAPI
                    .checkWebsite(
                        normalizedUrl
                    );

        }

        catch {

            websiteCheck = {

                valid: false,

                available: false

            };

        }


        saveWebsiteButton.disabled =
            false;

        saveWebsiteButton.textContent =
            editingItemId
                ? "Update"
                : "Save";


        if (
            !websiteCheck ||
            !websiteCheck.valid
        ) {

            showMessage(
                "Invalid URL",
                "The website address is not valid."
            );

            return;

        }


        if (
            !websiteCheck.available
        ) {

            showMessage(
                "Website Not Reachable",
                "This website could not be reached right now. Please check the address and try again."
            );

            return;

        }


        const finalDuplicate =
            findDuplicateWebsite(
                websiteCheck.url,
                editingItemId
            );


        if (finalDuplicate) {

            showMessage(
                "Already Added",
                `"${finalDuplicate.name}" is already saved with this website address.`
            );

            return;

        }


        if (editingItemId !== null) {

            const item =
                launcherItems.find(
                    (entry) =>
                        entry.id ===
                        editingItemId
                );


            if (!item) {

                showMessage(
                    "Update Failed",
                    "The selected item could not be found."
                );

                return;

            }


            item.name =
                name;

            item.target =
                websiteCheck.url;

            item.favorite =
                favorite;

        }

        else {

            const newItem = {

                id: Date.now(),

                name: name,

                type: "website",

                target:
                    websiteCheck.url,

                favorite:
                    favorite

            };


            launcherItems.push(
                newItem
            );

        }


        const saved =
            await saveLauncherItems(
                launcherItems
            );


        if (!saved) {

            showMessage(
                "Save Failed",
                "The website could not be saved."
            );

            return;

        }


        renderItems();


        editingItemId = null;

        websiteForm.reset();

        addDialog.style.display =
            "none";

        itemTypeSelection.style.display =
            "block";

        websiteForm.style.display =
            "none";

    }
);


/* ==============================
   Windows Application Form
================================= */

browseApplicationButton.addEventListener(
    "click",
    async () => {

        browseApplicationButton.disabled =
            true;

        try {

            const result =
                await window.launcherAPI
                    .selectApplication();

            if (!result || result.canceled) {

                return;

            }

            if (result.path) {

                document.querySelector(
                    "#application-path"
                ).value = result.path;

                document.querySelector(
                    "#application-name"
                ).focus();

            }

        }

        catch (error) {

            showMessage(
                "Browse Failed",
                "The application file could not be selected."
            );

        }

        finally {

            browseApplicationButton.disabled =
                false;

        }

    }
);


applicationForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const name =
            document.querySelector(
                "#application-name"
            ).value.trim();


        const applicationPath =
            document.querySelector(
                "#application-path"
            ).value.trim();


        const favorite =
            document.querySelector(
                "#application-favorite"
            ).checked;


        if (!name) {

            showMessage(
                "Name Required",
                "Please enter a name for this application."
            );

            return;

        }


        if (!applicationPath) {

            showMessage(
                "Application Required",
                "Please select an executable (.exe) file."
            );

            return;

        }


        saveApplicationButton.disabled =
            true;

        saveApplicationButton.textContent =
            "Checking...";


        let applicationCheck;

        try {

            applicationCheck =
                await window.launcherAPI
                    .checkApplication(
                        applicationPath
                    );

        }

        catch {

            applicationCheck = {
                valid: false,
                exists: false
            };

        }


        saveApplicationButton.disabled =
            false;

        saveApplicationButton.textContent =
            editingItemId !== null
                ? "Update"
                : "Save";


        if (
            !applicationCheck ||
            !applicationCheck.valid
        ) {

            showMessage(
                "Invalid Application",
                "Please select a valid Windows executable (.exe) file."
            );

            return;

        }


        if (
            !applicationCheck.exists
        ) {

            showMessage(
                "Application Not Found",
                "The selected application file could not be found."
            );

            return;

        }


        if (editingItemId !== null) {

            const item =
                launcherItems.find(
                    (entry) =>
                        entry.id ===
                        editingItemId
                );


            if (!item) {

                showMessage(
                    "Update Failed",
                    "The selected application could not be found."
                );

                return;

            }


            item.name =
                name;

            item.target =
                applicationPath;

            item.favorite =
                favorite;

        }

        else {

            launcherItems.push({

                id: Date.now(),

                name: name,

                type: "application",

                target: applicationPath,

                favorite: favorite

            });

        }


        const saved =
            await saveLauncherItems(
                launcherItems
            );


        if (!saved) {

            showMessage(
                "Save Failed",
                "The application could not be saved."
            );

            return;

        }


        renderItems();

        editingItemId = null;

        applicationForm.reset();

        addDialog.style.display =
            "none";

        itemTypeSelection.style.display =
            "block";

        websiteForm.style.display =
            "none";

        applicationForm.style.display =
            "none";

    }
);


/* ==============================
   Create Card
================================= */

function createCard(item) {

    const card =
        document.createElement("div");


    card.classList.add(
        "app-card"
    );


    card.dataset.itemId =
        item.id;


    let icon = "▣";


    if (
        item.type ===
        "website"
    ) {

        icon = "🌐";

    }

    else if (
        item.type ===
        "webapp"
    ) {

        icon = "◉";

    }

    else if (
        item.type ===
        "application"
    ) {

        icon = "▦";

    }


    card.innerHTML = `

        <div class="card-icon">
            ${icon}
        </div>

        <h4>${escapeHtml(item.name)}</h4>

        <p>${escapeHtml(item.type)}</p>

    `;


    card.addEventListener(
        "click",
        () => {

            openItem(item);

        }
    );


    card.addEventListener(
        "contextmenu",
        (event) => {

            event.preventDefault();

            event.stopPropagation();

            openContextMenu(
                item,
                event.clientX,
                event.clientY
            );

        }
    );


    return card;

}


/* ==============================
   HTML Escape
================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ==============================
   Open Item
================================= */

async function openItem(item) {

    if (
        item.type ===
        "website"
    ) {

        const opened =
            await window.launcherAPI
                .openWebsite(
                    item.target
                );

        if (!opened) {

            showMessage(
                "Open Failed",
                "The website could not be opened."
            );

        }

        return;

    }


    if (
        item.type ===
        "application"
    ) {

        const result =
            await window.launcherAPI
                .openApplication(
                    item.target
                );

        if (
            !result ||
            !result.success
        ) {

            showMessage(
                "Application Not Available",
                result && result.message
                    ? result.message
                    : "The application could not be opened."
            );

        }

        return;

    }


    showMessage(
        "Not Available Yet",
        "This item type will be connected when its launcher feature is added."
    );

}


/* ==============================
   Render Items
================================= */

function renderItems() {

    homeGrids.websites.innerHTML =
        "";

    homeGrids.webapps.innerHTML =
        "";

    homeGrids.applications.innerHTML =
        "";


    categoryGrids.favorites.innerHTML =
        "";

    categoryGrids.websites.innerHTML =
        "";

    categoryGrids.webapps.innerHTML =
        "";

    categoryGrids.applications.innerHTML =
        "";


    launcherItems.forEach(
        (item) => {

            if (
                item.type ===
                "website"
            ) {

                homeGrids.websites
                    .appendChild(
                        createCard(item)
                    );

                categoryGrids.websites
                    .appendChild(
                        createCard(item)
                    );

            }

            else if (
                item.type ===
                "webapp"
            ) {

                homeGrids.webapps
                    .appendChild(
                        createCard(item)
                    );

                categoryGrids.webapps
                    .appendChild(
                        createCard(item)
                    );

            }

            else if (
                item.type ===
                "application"
            ) {

                homeGrids.applications
                    .appendChild(
                        createCard(item)
                    );

                categoryGrids.applications
                    .appendChild(
                        createCard(item)
                    );

            }


            if (item.favorite) {

                categoryGrids.favorites
                    .appendChild(
                        createCard(item)
                    );

            }

        }
    );

}


/* ==============================
   Context Menu
================================= */

function openContextMenu(
    item,
    x,
    y
) {

    contextMenuItem =
        item;


    contextFavorite.textContent =
        item.favorite
            ? "Remove from Favorites"
            : "Add to Favorites";


    contextCopy.textContent =
        item.type === "application"
            ? "Copy Path"
            : "Copy URL";


    contextMenu.style.display =
        "block";


    contextMenu.style.left =
        `${x}px`;

    contextMenu.style.top =
        `${y}px`;


    requestAnimationFrame(
        () => {

            const rect =
                contextMenu
                    .getBoundingClientRect();


            const maxX =
                window.innerWidth -
                rect.width -
                8;


            const maxY =
                window.innerHeight -
                rect.height -
                8;


            if (x > maxX) {

                contextMenu.style.left =
                    `${Math.max(
                        8,
                        maxX
                    )}px`;

            }


            if (y > maxY) {

                contextMenu.style.top =
                    `${Math.max(
                        8,
                        maxY
                    )}px`;

            }

        }
    );

}


function closeContextMenu() {

    contextMenu.style.display =
        "none";

    contextMenuItem =
        null;

}


document.addEventListener(
    "click",
    (event) => {

        if (
            !contextMenu.contains(
                event.target
            )
        ) {

            closeContextMenu();

        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {

            closeContextMenu();

            closeDeleteDialog();

        }

    }
);


/* ==============================
   Context Menu Actions
================================= */

contextMenu
    .querySelectorAll(
        ".context-menu-item"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    if (
                        !contextMenuItem
                    ) {

                        return;

                    }


                    const item =
                        contextMenuItem;


                    const action =
                        button.dataset.action;


                    closeContextMenu();


                    if (
                        action ===
                        "open"
                    ) {

                        await openItem(
                            item
                        );

                        return;

                    }


                    if (
                        action ===
                        "edit"
                    ) {

                        editItem(
                            item
                        );

                        return;

                    }


                    if (
                        action ===
                        "favorite"
                    ) {

                        item.favorite =
                            !item.favorite;


                        await saveLauncherItems(
                            launcherItems
                        );


                        renderItems();

                        return;

                    }


                    if (
                        action ===
                        "copy"
                    ) {

                        if (
                            item.target
                        ) {

                            await window.launcherAPI
                                .copyToClipboard(
                                    item.target
                                );


                            showMessage(
                                "Copied",
                                item.type === "application"
                                    ? "The application path has been copied to the clipboard."
                                    : "The URL has been copied to the clipboard."
                            );

                        }

                        return;

                    }


                    if (
                        action ===
                        "delete"
                    ) {

                        openDeleteDialog(
                            item
                        );

                    }

                }
            );

        }
    );


/* ==============================
   Edit Item
================================= */

function editItem(item) {

    editingItemId =
        item.id;


    itemTypeSelection.style.display =
        "none";


    if (
        item.type ===
        "website"
    ) {

        applicationForm.style.display =
            "none";

        websiteForm.style.display =
            "block";


        document.querySelector(
            "#website-name"
        ).value =
            item.name;

        document.querySelector(
            "#website-url"
        ).value =
            item.target;

        document.querySelector(
            "#website-favorite"
        ).checked =
            Boolean(item.favorite);


        document.querySelector(
            ".dialog-header h3"
        ).textContent =
            "Edit Website";


        saveWebsiteButton.textContent =
            "Update";

        addDialog.style.display =
            "flex";

        return;

    }


    if (
        item.type ===
        "application"
    ) {

        websiteForm.style.display =
            "none";

        applicationForm.style.display =
            "block";


        document.querySelector(
            "#application-name"
        ).value =
            item.name;

        document.querySelector(
            "#application-path"
        ).value =
            item.target;

        document.querySelector(
            "#application-favorite"
        ).checked =
            Boolean(item.favorite);


        document.querySelector(
            ".dialog-header h3"
        ).textContent =
            "Edit Windows Application";


        saveApplicationButton.textContent =
            "Update";

        addDialog.style.display =
            "flex";

        return;

    }


    editingItemId =
        null;

    showMessage(
        "Not Available Yet",
        "Editing for this item type has not been added yet."
    );

}


/* ==============================
   Delete Confirmation
================================= */

function openDeleteDialog(item) {

    deleteTargetItem =
        item;


    deleteMessage.textContent =
        `Are you sure you want to delete "${item.name}" from My Launcher?`;


    deleteDialog.style.display =
        "flex";

}


function closeDeleteDialog() {

    deleteDialog.style.display =
        "none";

    deleteTargetItem =
        null;

}


deleteCancel.addEventListener(
    "click",
    closeDeleteDialog
);


/*
 * Important:
 * Clicking outside the delete dialog
 * does NOT close it.
 *
 * User must choose Cancel or Delete.
 */


deleteConfirm.addEventListener(
    "click",
    async () => {

        if (
            !deleteTargetItem
        ) {

            return;

        }


        const itemToDelete =
            deleteTargetItem;


        launcherItems =
            launcherItems.filter(
                (entry) =>
                    entry.id !==
                    itemToDelete.id
            );


        const saved =
            await saveLauncherItems(
                launcherItems
            );


        if (!saved) {

            showMessage(
                "Delete Failed",
                "The item could not be deleted."
            );

            return;

        }


        closeDeleteDialog();

        renderItems();

    }
);


/* ==============================
   Search
================================= */

searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();


        document
            .querySelectorAll(
                ".app-card"
            )
            .forEach(
                (card) => {

                    const itemId =
                        Number(
                            card.dataset.itemId
                        );


                    const item =
                        launcherItems.find(
                            (entry) =>
                                entry.id ===
                                itemId
                        );


                    if (!item) {

                        return;

                    }


                    const target =
                        item.target ||
                        "";


                    const matches =
                        !query ||
                        item.name
                            .toLowerCase()
                            .includes(query) ||
                        target
                            .toLowerCase()
                            .includes(query);


                    card.style.display =
                        matches
                            ? ""
                            : "none";

                }
            );

    }
);


/* ==============================
   Initialize Launcher
================================= */

async function initializeLauncher() {

    launcherItems =
        await loadLauncherItems();


    /*
     * Clean up old exact duplicate
     * website entries.
     *
     * The first saved copy is kept.
     */

    const seenWebsiteKeys =
        new Set();


    launcherItems =
        launcherItems.filter(
            (item) => {

                if (
                    item.type !==
                    "website"
                ) {

                    return true;

                }


                const key =
                    getWebsiteKey(
                        item.target
                    );


                if (!key) {

                    return true;

                }


                if (
                    seenWebsiteKeys.has(
                        key
                    )
                ) {

                    return false;

                }


                seenWebsiteKeys.add(
                    key
                );


                return true;

            }
        );


    await saveLauncherItems(
        launcherItems
    );


    renderItems();

}


initializeLauncher();