// ATON/wapps/check/js/check-client.js

const SERVER_BASE = "http://localhost:3001";

// ATON App setup
let app = ATON.App.realize(false);
app.requireFlares(["check-flare"]);

let checkFlare = null;

// Storage IDs used in ATON.App storage  getIdFromURL
const PROJECTS_STORAGE_ID = "user-projects/projects";                     // list of projects

// Helper to build a storage id for the asset library of a given project
function getProject3DAssetsStorageId(projectId) {
  return `user-projects/${projectId}/upload/upload`;
}

// Helper to build a storage id for the metadata (main config) of a given project
function getProjectConfigStorageId(projectId) {
  return `user-projects/${projectId}/config`;
}

// Helper to build a storage id for the protocol of a given project
function getProjectProtocolConfigStorageId(projectId) {
  return `user-projects/${projectId}/protocol/protocol-config`;
}

app.setup = () => {
  ATON.realize();

  ATON.on("AllFlaresReady", () => {
    console.log("All flares ready");

    checkFlare = ATON.getFlare("check");
    console.log("Check flare:", checkFlare);

    // Remove 3D view if not needed
    const view3D = document.getElementById("idView3D");
    if (view3D) view3D.remove();
  });
};

// ===============================
// URL helper
// ===============================
function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// ===============================
// PROJECT CREATION & LIST (ATON storage + server)
// ===============================

// Called e.g. from a button on index.html
async function createProjectFromUI() {
  console.log("GO");
  // Generate an ID YYMMDDHHMM
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const projectId = yy + MM + dd + HH + mm;

  try {
    const res = await fetch(`${SERVER_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: projectId, label: "" })
    });

    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }

    const projectInfo = await res.json(); // {id, label, path, createdAt}
    console.log("Project created:", projectInfo);

    // (se qui vuoi anche fare addToStorage, fallo PRIMA del redirect)
    // await ATON.App.addToStorage(PROJECTS_STORAGE_ID, { [projectInfo.id]: projectInfo });

    alert(`New project created: ${projectInfo.id}`);

    const url = `project-form.html?id=${encodeURIComponent(projectId)}&n=0`;
    console.log("Redirecting to:", url);

    // Usa assign per essere super esplicito
    window.location.assign(url);

  } catch (err) {
    console.error("createProjectFromUI error:", err);
    alert("Error creating project: " + err.message);
  }
}


// Load projects from ATON storage and render them.
// You can call this from an inline script in index.html on window load.
async function renderProjectsFromStorage() {
  try {
    const projects =
      (await ATON.App.getStorage(PROJECTS_STORAGE_ID)) || {};

    const container = document.getElementById("user-projects-list");
    console.log(container);
    if (!container) {
      console.warn("renderProjectsFromStorage: #user-projects-list not found");
      return;
    }

    container.innerHTML = "";

    const ids = Object.keys(projects);
    if (ids.length === 0) {
      container.innerHTML = `<p class="text-muted">No projects yet.</p>`;
      return;
    }

    ids.forEach((projectId) => {
      const meta = projects[projectId];
      renderProjectCard(meta, container);
    });
  } catch (err) {
    console.error("Error reading projects from ATON storage:", err);
  }
}

// Example Bootstrap card for a project on index.html
async function renderProjectCard(projectMeta, container) {
  const id = projectMeta.id;
  const createdAt = projectMeta.createdAt || "";

  let projectsUpload = await ATON.App.getStorage("user-projects/2511261318/upload/upload");

  let first3DAsset = projectsUpload[Object.keys(projectsUpload)[0]];

  console.log("DEBUG HERE", first3DAsset);

  const cardHtml = `
    <div class="col-md-4 col-sm-12">
      <div class="card dashboard-card check-card-class">
        <img src="${SERVER_BASE}${first3DAsset.thumb.url}" class="card-img-top" alt="Thumb for project #${id}">
        <div class="card-body">
          <h4 class="card-title">Project #${id}</h5>
          <p class="card-text">Created: ${createdAt}</p>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", cardHtml);
}

// ===============================
// PROJECT METADATA (config.json -> ATON storage)
// ===============================

// Read form fields and store metadata of the current project
async function saveProjectConfigFromForm() {
  const projectId = getIdFromURL();
  if (!projectId) {
    alert("Missing project id in URL.");
    return;
  }

  // Collect data from form (using jQuery or plain DOM)
  const projectTitle = $("#project-name").val();
  const projectObjectives = $("#project-objectives").val();
  const projectAudience = $("#project-audience").val();
  const projectActions = $("#project-actions").val();
  const projectMeasureDesc = $("#project-measures").val();
  const projectGroups = $("#project-groups").val();
  const projectRepMeasures = $("#project-rep-measures").val();

  const patch = {
    [projectId]: {
      title: projectTitle,
      objectives: projectObjectives,
      audience: projectAudience,
      actions: projectActions,
      measureDescription: projectMeasureDesc,
      groups: projectGroups,
      repeatedMeasures: projectRepMeasures,
      updatedAt: new Date().toISOString()
    }
  };

  try {
    console.log(getProjectConfigStorageId(projectId));
    await ATON.App.addToStorage(getProjectConfigStorageId(projectId), patch);
    alert("Project configuration saved (ATON storage).");
  } catch (err) {
    console.error(err);
    alert("Error saving configuration: " + err.message);
  }
}

// Load config for current project and populate the form
async function loadProjectConfigIntoForm() {
  const projectId = getIdFromURL();
  if (!projectId) return;

  try {
    const allConfigs =
      (await ATON.App.getStorage(getProjectConfigStorageId(projectId))) || {};
    const cfg = allConfigs[projectId];
    if (!cfg) {
      console.log("No config yet for project", projectId);
      return;
    }

    $("#project-name").val(cfg.title || "");
    $("#project-objectives").val(cfg.objectives || "");
    $("#project-audience").val(cfg.audience || "");
    $("#project-actions").val(cfg.actions || "");
    $("#project-measures").val(cfg.measureDescription || "");
    $("#project-groups").val(cfg.groups || "");
    $("#project-rep-measures").val(cfg.repeatedMeasures || "");
  } catch (err) {
    console.error(err);
  }
}

// ===============================
// 3D ASSETS (upload + asset-library storage)
// ===============================

// This is called when the user selects a file in the hidden input
// e.g. <input type="file" id="3DFileUpload" onchange="upload3DAssetForCurrentProject()">
async function upload3DAssetForCurrentProject() {
  const projectId = getIdFromURL();
  if (!projectId) {
    alert("Missing project id in URL.");
    return;
  }

  const fileInput = document.getElementById("3DFileUpload");
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("Please choose a GLB/GLTF file first.");
    return;
  }

  const glbFile = fileInput.files[0];

  try {
    // 1) Generate thumbnail using 3D-thumb.js
    const { blob: thumbBlob } = await generateGlbThumbnail(glbFile);

    // 2) Prepare FormData for the server
    const assetId = "A" + Date.now();
    const formData = new FormData();
    formData.append("assetId", assetId);
    formData.append("glb", glbFile, glbFile.name);
    formData.append("thumb", thumbBlob, assetId + "_thumb.png");

    // 3) Upload to server (physical files only)
    const res = await fetch(
      `${SERVER_BASE}/projects/${projectId}/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }

    const data = await res.json(); // { message, projectId, asset }
    const assetEntry = data.asset;
    console.log("3D asset uploaded:", assetEntry);

    // 4) Store asset entry into ATON storage (asset-library)
    const storageId = getProject3DAssetsStorageId(projectId);
    console.log(storageId);
    const patch = {
      [assetEntry.id]: assetEntry
    };
    await ATON.App.addToStorage(storageId, patch);

    // 5) Add a single card to the UI
    add3DAssetCard(projectId, assetEntry.id, assetEntry);

    // Reset input
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error uploading asset: " + err.message);
  }
}

// Load all 3D assets for the current project from ATON storage
// and render them using Bootstrap layout.
// You can call this from project-form.html on page load.
async function refresh3DAssetsForCurrentProject() {
  const projectId = getIdFromURL();
  if (!projectId) return;

  try {
    const storageId = getProject3DAssetsStorageId(projectId);
    const assets = (await ATON.App.getStorage(storageId)) || {};

    render3DAssetsList(projectId, assets);
  } catch (err) {
    console.error("Error loading 3D assets from ATON storage:", err);
  }
}

function render3DAssetsList(projectId, assets) {
  const container = document.getElementById("new-project-upload");
  if (!container) return;

  // We do NOT clear the upload button column.
  const assetIds = Object.keys(assets);

  assetIds.forEach((assetId) => {
    const asset = assets[assetId];
    add3DAssetCard(projectId, assetId, asset);
  });
}

// Append a single Bootstrap card for a 3D asset
function add3DAssetCard(projectId, assetId, asset) {
  const container = document.getElementById("new-project-upload");
  if (!container) return;

  let thumbUrl = "";
  if (asset.thumb && asset.thumb.url) {
    thumbUrl = `${SERVER_BASE}${asset.thumb.url}`;
  } else if (asset.thumb && asset.thumb.filename) {
    thumbUrl = `${SERVER_BASE}/user-projects/${projectId}/upload/thumb/${asset.thumb.filename}`;
  }

  const cardHtml = `
    <div class="col-md-3 col-sm-12 mt-3 d-flex justify-content-center div-thumb-cards" id="div-thumb-card-${assetId}">
      <div class="card thumb-card">
        <button class="thumb-close-btn" type="button" aria-label="Remove"
                onclick="delete3DAsset('${projectId}', '${assetId}')">
          <i class="bi bi-x-lg"></i>
        </button>
        <img src="${thumbUrl}" class="card-img-top glb-img" alt="thumbnail 3D asset ${assetId}">
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", cardHtml);
}

// Delete a 3D asset: server (physical files) + ATON storage + DOM card
async function delete3DAsset(projectId, assetId) {
  if (!confirm(`Delete asset ${assetId}?`)) return;

  try {
    const storageId = getProject3DAssetsStorageId(projectId);
    const allAssets =
      (await ATON.App.getStorage(storageId)) || {};
    const asset = allAssets[assetId];

    if (!asset) {
      console.warn("Asset not found in storage:", assetId);
    }

    const glbFilename = asset?.glb?.filename || null;
    const thumbFilename = asset?.thumb?.filename || null;

    // 1) Ask server to delete physical files
    const res = await fetch(
      `${SERVER_BASE}/projects/${projectId}/files`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glbFilename,
          thumbFilename
        })
      }
    );

    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }

    console.log("Server deleted files for asset", assetId);

    // 2) Remove asset entry from ATON storage
    const deletePatch = {
      [assetId]: {}
    };
    await ATON.App.deleteFromStorage(storageId, deletePatch);

    // 3) Remove card from DOM
    const cardDiv = document.getElementById(`div-thumb-card-${assetId}`);
    if (cardDiv) {
      cardDiv.remove();
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting asset: " + err.message);
  }
}

// ===============================
// EXPOSE FUNCTIONS TO HTML
// ===============================

window.createProjectFromUI = createProjectFromUI;
window.renderProjectsFromStorage = renderProjectsFromStorage;

window.saveProjectConfigFromForm = saveProjectConfigFromForm;
window.loadProjectConfigIntoForm = loadProjectConfigIntoForm;

window.upload3DAssetForCurrentProject = upload3DAssetForCurrentProject;
window.refresh3DAssetsForCurrentProject = refresh3DAssetsForCurrentProject;
window.delete3DAsset = delete3DAsset;
