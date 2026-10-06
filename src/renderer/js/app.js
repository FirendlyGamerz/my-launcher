let launcherItems = [];


// Get all launcher sections
const sections = {
    favorites: document.querySelectorAll(".app-grid")[0],
    websites: document.querySelectorAll(".app-grid")[1],
    webApps: document.querySelectorAll(".app-grid")[2],
    applications: document.querySelectorAll(".app-grid")[3]
};
const addButton = document.querySelector("#add-button");
const addDialog = document.querySelector("#add-dialog");
const closeDialog = document.querySelector("#close-dialog");
const websiteButton = document.querySelector("#website-button");
const websiteForm = document.querySelector("#website-form");

websiteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#website-name").value;
    const url = document.querySelector("#website-url").value;
    const favorite = document.querySelector("#website-favorite").checked;

    const newItem = {
        id: Date.now(),
        name: name,
        type: "website",
        target: url,
        favorite: favorite
    };

    launcherItems.push(newItem);

    await saveLauncherItems(launcherItems);

    renderItems();

    websiteForm.reset();

    addDialog.style.display = "none";
    itemTypeSelection.style.display = "block";
    websiteForm.style.display = "none";
});
const itemTypeSelection = document.querySelector(".item-type-selection");
const cancelWebsite = document.querySelector("#cancel-website");
websiteButton.addEventListener("click", () => {
    itemTypeSelection.style.display = "none";
    websiteForm.style.display = "block";
});
cancelWebsite.addEventListener("click", () => {
    websiteForm.style.display = "none";
    itemTypeSelection.style.display = "block";
});
addButton.addEventListener("click", () => {
    addDialog.style.display = "flex";
});

closeDialog.addEventListener("click", () => {
    addDialog.style.display = "none";
});

// Create one launcher card
function createCard(item) {
    const card = document.createElement("div");

    card.classList.add("app-card");

    card.innerHTML = `
        <h4>${item.name}</h4>
        <p>${item.type}</p>
    `;

    return card;
}


// Display launcher items
function renderItems() {

    sections.favorites.innerHTML = "";
    sections.websites.innerHTML = "";
    sections.webApps.innerHTML = "";
    sections.applications.innerHTML = "";


    launcherItems.forEach((item) => {

        if (item.favorite) {
            sections.favorites.appendChild(
                createCard(item)
            );
        }


        const card = createCard(item);


        if (item.type === "website") {
            sections.websites.appendChild(card);
        }

        else if (item.type === "webapp") {
            sections.webApps.appendChild(card);
        }

        else if (item.type === "application") {
            sections.applications.appendChild(card);
        }

    });
}


// Load saved launcher data
async function initializeLauncher() {

    launcherItems = await loadLauncherItems();

    renderItems();
}

initializeLauncher();
