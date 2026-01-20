// ATON/wapps/check/js/check-client.js

const SERVER_BASE = "http://localhost:3001";

// ATON App setup
let app = ATON.App.realize(false);
app.requireFlares(["check-flare"]);

let checkFlare = null;

// Storage IDs used in ATON.App storage  getIdFromURL
const PROJECTS_STORAGE_ID = "user-projects/projects";                     // list of projects

// =================================
// SERVER FUNCTIONS FOR PROJECT FORM
// =================================

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

    // (se qui vuoi anche fare addToStorage, fallo PRIMA del redirect)
    // await ATON.App.addToStorage(PROJECTS_STORAGE_ID, { [projectInfo.id]: projectInfo });

    alert(`New project created: ${projectInfo.id}`);

    const url = `project-form.html?id=${encodeURIComponent(projectId)}&n=0`;

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
    if (!container) {
      console.warn("renderProjectsFromStorage: #user-projects-list not found");
      return;
    }

    container.innerHTML = "";

    const ids = Object.keys(projects).reverse();
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
  const d = new Date(projectMeta.createdAt) || "";

  const formattedDate = 
    d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0") + " " +
    String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0");

  let titleLabel = "";

  let configStorage = await ATON.App.getStorage(`user-projects/${id}/config`);

  if (configStorage.title) {
    titleLabel = configStorage.title;
  } else {
    titleLabel = `Project #${id}`;
  }


  let projectsUpload = await ATON.App.getStorage(`user-projects/${id}/upload/upload`);

  let first3DAsset = projectsUpload[Object.keys(projectsUpload)[0]];

  const cardHtml = `
    <div class="col-md-4 col-sm-12">
      <div class="card dashboard-card check-card-class" onclick="window.location.href='project-summary.html?id=${id}'">
        <img src="${SERVER_BASE}${first3DAsset.thumb.url}" class="card-img-top" alt="Thumb for project #${id}">
        <div class="card-body">
          <h4 class="card-title">${titleLabel}</h5>
          <p class="card-text">Template: ${configStorage.template}</p>
          <p class="card-text">Created: ${formattedDate}</p>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", cardHtml);
}

// ===============================
// SAVE & SHOW PROJECT METADATA (config.json -> ATON storage)
// ===============================

// Read form fields and store metadata of the current project
async function saveProjectConfigFromForm(id) {
  const projectId = getIdFromURL();
  if (!projectId) {
    alert("Missing project id in URL.");
    return;
  }

  let projectTemplate = "";
  if (getIsTaskTest()) {projectTemplate = "Task 'n Test"} else {projectTemplate = "Free Wander"}

  let patch = "";

  if (id == 1) {
    patch = {
      template: projectTemplate,
      title:  localStorage.getItem(STORAGE_TITLE_KEY),
      objectives: localStorage.getItem(STORAGE_OBJS_KEY),
      audience: localStorage.getItem(STORAGE_AUD_KEY),
  };
  } else if (id == 2) {
    patch = {
      actions: localStorage.getItem(STORAGE_ACT_KEY),
      measureDescription: localStorage.getItem(STORAGE_MESURE_DESC_KEY),
      groups: localStorage.getItem(STORAGE_GROUPS_KEY),
      repeatedMeasures: localStorage.getItem(STORAGE_REP_MESURE_KEY),
      updatedAt: new Date().toISOString()
  };
  } else {
    patch = "";
  }

  try {
    await ATON.App.addToStorage(getProjectConfigStorageId(projectId), patch);
    console.log("Project configuration saved (ATON storage).");
  } catch (err) {
    console.error(err);
    console.log("Error saving configuration: " + err.message);
  }
}

// IN THE FORM: Load config for current project and populate the form
async function loadProjectConfigIntoForm() {
  const projectId = getIdFromURL();
  if (!projectId) return;

  try {
    const cfg =
      (await ATON.App.getStorage(getProjectConfigStorageId(projectId))) || {};

    if (!cfg || Object.keys(cfg).length === 0) {
      console.log("No config yet for project", projectId);
      return;
    }

    $("#project-name").val(cfg.title || "");
    $("#project-objectives").val(cfg.objectives || "");
    $("#project-audience").val(cfg.audience || "");
    $("#project-actions").val(cfg.actions || "");
    $("#project-measure").val(cfg.measureDescription || "");
    $("#project-groups").val(cfg.groups || "");
    $("#project-repeated-measures").val(cfg.repeatedMeasures || "");
  } catch (err) {
    console.error(err);
  }
}

// IN THE SUMMARY: Load config for current project and populate the summary
async function renderProjectSummaryFromStorage() {

  // Get current ID
  const projectId = getIdFromURL();
  if (!projectId) {
    alert("Missing project id in URL.");
    return;
  }

  // Load textual metadata
  const configStorage = await ATON.App.getStorage(getProjectConfigStorageId(projectId));
  
  $("#summary-project-template").html(configStorage["template"]);

  $("#summary-project-title-bread").html(configStorage["title"]);
  $("#summary-project-title").html(configStorage["title"]);

  $("#summary-project-group").html(configStorage["groups"]);
  $("#summary-project-rep-measures").html(configStorage["repeatedMeasures"]);

  $("#summary-accordion-0").html(configStorage["objectives"] || "No description provided");
  $("#summary-accordion-1").html(configStorage["audience"] || "No description provided");
  $("#summary-accordion-2").html(configStorage["actions"] || "No description provided");
  $("#summary-accordion-3").html(configStorage["measureDescription"] || "No description provided");

  // Upload thumbs to carousel
  const assets3DStorage = await ATON.App.getStorage(getProject3DAssetsStorageId(projectId));
  let assets3SArray = Object.values(assets3DStorage);

    $("#summary-project-no-3Dassets").html(assets3SArray.length);

  let carouselContainer = document.getElementById("summary-carousel-inner");
  
  for (let i = 0; i < assets3SArray.length; i++) {
    let carouselChild = "";
    if (i == 0) {
      carouselChild = `<div class="carousel-item active">
                          <img src="${SERVER_BASE}${assets3SArray[i].thumb.url}" class="d-block w-100" style="width: 512px; object-fit: contain" alt="Thumb 3D asset no. ${i}">
                        </div>`;

    } else {
      carouselChild = `<div class="carousel-item">
                          <img src="${SERVER_BASE}${assets3SArray[i].thumb.url}" class="d-block w-100" style="width: 512px; object-fit: contain" alt="Thumb 3D asset no. ${i}">
                        </div>`;
    }

    carouselContainer.insertAdjacentHTML("beforeend", carouselChild);
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
    <div class="col-md-3 col-sm-12 mb-3 d-flex justify-content-center div-thumb-cards" id="div-thumb-card-${assetId}">
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

// ==================================
// SERVER FUNCTIONS FOR PROTOCOL FORM
// ==================================

// Add information in the breadcrumb

async function importProjectInfo() {

  projectId = getIdFromURL()

  const configStorage = await ATON.App.getStorage(getProjectConfigStorageId(projectId));
  
  $("#breadcrumb-template").html(configStorage["template"]);
  $("#breadcrumb-title").html(configStorage["title"]);

  let selectGroupEl = document.getElementById("selectGroup");
  for (let i = 1; i <= parseInt(configStorage["groups"]); i++) {
    selectGroupEl.insertAdjacentHTML("beforeend", `<option value="${i}">Group ${i}</option>`);
  }

  let selectMeasureEl = document.getElementById("selectMeasure");
  for (let i = 1; i <= parseInt(configStorage["repeatedMeasures"]); i++) {
    selectMeasureEl.insertAdjacentHTML("beforeend", `<option value="${i}">Repeated Measure ${i}</option>`);
  }

}

// Add environments thumbnails in the modal
async function renderEnvThumbForModal() {

  let projectId = getIdFromURL();

  let envContainer = document.getElementById("environment-thumb-wrapper");

  try {
    const uploadedImg =
      (await ATON.App.getStorage(`user-projects/${projectId}/upload/upload`)) || {};
    
    for (const key in uploadedImg) {

      let thumbHtml = `
        <div class="col-md-3 mb-3 d-flex justify-content-center div-environment-thumb-cards">
            <div class="card environment-thumb-cards" onclick="highlightEnvironmentCard(event)">       
                <img src="${SERVER_BASE}${uploadedImg[key]["thumb"]["url"]}" data-envid="${key}" class="card-img-top glb-img" id="chosen-env" alt="thumbnail 3D asset">
            </div>
        </div>
      `;

      envContainer.insertAdjacentHTML("beforeend", thumbHtml);
    }

  } catch (err) {
    console.error("Error reading projects from ATON storage:", err);
  }
}

// Save info 

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getPhaseFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("p");
}

function getStepFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("s");
}

function getTemplateFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("t");
}

// LEFT HERE. SAVE IN JSON THAT THERE IS NO TRAINING PHASE //
async function saveProtocolStep(bolVal = null) {
  projectId = getIdFromURL();
  phaseNo = getPhaseFromURL();
  stepNo = getStepFromURL();

  if (getTemplateFromURL() == "0" && stepNo == "2") {
    stepNo = parseInt(stepNo) + 1;
  }

  console.log(stepNo);

  let patch = {};

  if (phaseNo == 0) {
    patch = {
        phase: {
            [phaseNo]: bolVal
        }
      };
  } else {
  
  switch (parseInt(stepNo)) {
    case 1:
      patch = {
        phase: {
          [phaseNo]: {
            name: document.getElementById("phase-name").value,
            environmentID: document.getElementById("chosen-env").dataset.envid,
            analytics: {
              time: document.getElementById("trackTime").checked,
              pos: document.getElementById("trackPos").checked,
              dir: document.getElementById("trackDir").checked,
              fov: document.getElementById("trackFov").checked
            }
          }
        }
      };
      break;

      case 2:
        patch = {
          phase: {
            [phaseNo]: {
              taskDes: document.getElementById("taskDesc").value,
              taskInst: document.getElementById("taskInst").value,
              hasCheck: document.querySelector('input[name="checkCommand"]:checked').value === "true" 
            }
          }
        };
        break;
      
      case 3:
        patch = {
          phase: {
            [phaseNo]: {
              assets: {
                asset1: {
                  id: "",
                  role: "",
                  content: "" // For text only
                }
              }
            }
          }
        }
  }
  
  }

  try {
      const result = await ATON.App.addToStorage(getProjectProtocolConfigStorageId(projectId), patch);
      console.log("Write result:", result);
      console.log("Write successful!");
  } catch (error) {
      console.error("Write failed:", error);
  }
}

// ===============================
// EXPOSE FUNCTIONS TO HTML
// ===============================

window.createProjectFromUI = createProjectFromUI;
window.renderProjectsFromStorage = renderProjectsFromStorage;

window.saveProjectConfigFromForm = saveProjectConfigFromForm;
window.renderProjectSummaryFromStorage = renderProjectSummaryFromStorage;
window.loadProjectConfigIntoForm = loadProjectConfigIntoForm;

window.upload3DAssetForCurrentProject = upload3DAssetForCurrentProject;
window.refresh3DAssetsForCurrentProject = refresh3DAssetsForCurrentProject;
window.delete3DAsset = delete3DAsset;


window.importProjectInfo = importProjectInfo;
window.renderEnvThumbForModal = renderEnvThumbForModal;
window.saveProtocolStep = saveProtocolStep;