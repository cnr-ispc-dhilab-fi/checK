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

// Helper to build a storage id for the protocol of a given project
function getProjectProtocolAssetLibraryStorageId(projectId) {
  return `user-projects/${projectId}/protocol/asset/asset-library`;
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

// Get all assets from library
async function get3DEnvLibrary(projectId) {
  const storageId = getProject3DAssetsStorageId(projectId);
  try {
    const library = await ATON.App.getStorage(storageId) || {};
    return library;
  } catch (err) {
    console.error("Error getting asset library:", err);
    return {};
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

function getGroupFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("g");
}

function getMeasureFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("m");
}

// LEFT HERE. SAVE IN JSON THAT THERE IS NO TRAINING PHASE //
async function saveProtocolStep(bolVal = null) {
  projectId = getIdFromURL();
  phaseNo = getPhaseFromURL();
  stepNo = getStepFromURL();

  groupNo = getGroupFromURL();
  measureNo = getMeasureFromURL();
  let referenceGM = [measureNo, groupNo]

  if (getTemplateFromURL() == "0" && stepNo == "2") {
    stepNo = parseInt(stepNo) + 1;
  }

  let patch = {};

  if (phaseNo == 0) {
    patch = {
         [referenceGM]: {
            phase: {
                [phaseNo]: bolVal
            }
          }
        };
  } else {
  
  switch (parseInt(stepNo)) {
    case 1:
      const phaseName = document.getElementById("phase-name").value.trim();
      patch = {
        [referenceGM]: {
            phase: {
              [phaseNo]: {
                name: phaseName || `Phase ${phaseNo}`,
                environmentID: document.getElementById("chosen-env").dataset.envid,
                analytics: {
                  time: document.getElementById("trackTime").checked,
                  pos: document.getElementById("trackPos").checked,
                  dir: document.getElementById("trackDir").checked,
                  fov: document.getElementById("trackFov").checked
                }
              }
            }
        }
      };
      break;

      case 2:
        patch = {
          [referenceGM]: {
              phase: {
              [phaseNo]: {
                taskDes: document.getElementById("taskDesc").value,
                taskInst: document.getElementById("taskInst").value,
                hasCheck: document.querySelector('input[name="checkCommand"]:checked').value === "true" 
              }
            }
          }
        };
        break;
      
      case 3:
        let uploadedAssetArray = Array.from(document.getElementsByClassName("row-asset"));


        patch = {
          [referenceGM]: {
              phase: {
              [phaseNo]: {
                assets: {}
              }
            }
          }
        };

        patch[referenceGM].phase[phaseNo].assets = {};

        uploadedAssetArray.forEach(el => {


          patch = {
            [referenceGM]: {
                phase: {
                [phaseNo]: {
                  assets: {
                    [el.dataset.assetId]: {
                      customName: el.childNodes[5].innerText,
                      role: el.childNodes[7].innerText
                    }
                  }
                }
              }
            }
          };

        });

        console.log(patch);
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

// Import project protocol config
async function importProjectProtocolConfig() {
    let projectId = getIdFromURL(); 
    const storageId = getProjectProtocolConfigStorageId(projectId);
    
    try {
        const protocolConfig = await ATON.App.getStorage(storageId);
        
        if (!protocolConfig) {
            console.warn("No protocol config found for project:", projectId);
            return null;
        }
        
        return protocolConfig;
        
    } catch (err) {
        console.error("Error importing protocol config:", err);
        return null;
    }
}

async function initialiseProtcolPhases(g, m) {
    let projectId = getIdFromURL();
    let referenceGM = [g, m]

    const sourceProtocol = await ATON.App.getStorage(getProjectProtocolConfigStorageId(projectId));
  
    if (!sourceProtocol[referenceGM]) {
      let patch = {
         [referenceGM]: {
            phase: {
                0: true,
                1: {
                  name: `Phase 1`
                }
            }
          }
        };

      try {
        const result = await ATON.App.addToStorage(getProjectProtocolConfigStorageId(projectId), patch);
        console.log("Write result:", result);
        console.log("Write successful!");
      } catch (error) {
          console.error("Write failed:", error);
      }
    }
}
async function addPhaseToConfig(phaseNo) {
    let projectId = getIdFromURL();
    let groupNo = getGroupFromURL();
    let measureNo = getMeasureFromURL();
    let referenceGM = [measureNo, groupNo]

    let patch = {
         [referenceGM]: {
            phase: {
                [phaseNo]: {
                  name: `Phase ${phaseNo}`
                }
            }
          }
        };

    try {
      const result = await ATON.App.addToStorage(getProjectProtocolConfigStorageId(projectId), patch);
      console.log("Write result:", result);
      console.log("Write successful!");
  } catch (error) {
      console.error("Write failed:", error);
  }
}

async function deletePhaseFromConfig() {
    let phaseNo = parseInt(getPhaseFromURL());
    let projectId = getIdFromURL();
    let groupNo = getGroupFromURL();
    let measureNo = getMeasureFromURL();
    let referenceGM = `${measureNo},${groupNo}`;
    
    const storageId = getProjectProtocolConfigStorageId(projectId);
    
    try {
        console.log(`Deleting phase ${phaseNo} from ${referenceGM}`);
        
        // 1. Read entire config
        const fullConfig = await ATON.App.getStorage(storageId);
        
        if (!fullConfig || !fullConfig[referenceGM] || !fullConfig[referenceGM].phase) {
            console.error("Config not found");
            return false;
        }
        
        const phases = fullConfig[referenceGM].phase;
        const sortedKeys = Object.keys(phases)
            .map(k => parseInt(k))
            .sort((a, b) => a - b);
        
        console.log("Current phases:", sortedKeys);
        console.log("Deleting phase:", phaseNo);
        
        // 2. Check phase exists
        if (phases[phaseNo] === undefined) {
            console.error(`Phase ${phaseNo} not found`);
            return false;
        }
        
        // 3. First, delete the target phase
        await ATON.App.deleteFromStorage(storageId, {
            [referenceGM]: { 
                phase: { 
                    [phaseNo]: {} 
                } 
            }
        });
        
        console.log(`Phase ${phaseNo} deleted`);
        
        // 4. Renumber ONLY phases that come AFTER the deleted one
        for (let key of sortedKeys) {
            if (key > phaseNo) {
                const phaseData = phases[key];
                const newKey = key - 1;
                
                console.log(`Renumbering: phase ${key} → phase ${newKey}`);
                
                // Delete old key
                await ATON.App.deleteFromStorage(storageId, {
                    [referenceGM]: { 
                        phase: { 
                            [key]: {} 
                        } 
                    }
                });
                
                // Add with new key
                await ATON.App.addToStorage(storageId, {
                    [referenceGM]: { 
                        phase: { 
                            [newKey]: phaseData 
                        } 
                    }
                });
            }
        }
        
        console.log("Phase deletion and renumbering complete");
        return true;
        
    } catch (err) {
        console.error("Error:", err);
        return false;
    }
}

// ================================================
//       Upload assets for each protocol step
// ================================================

let currentUploadedAsset = null; // Store current uploaded asset temporarily

async function uploadAudioAssetForCurrentProject() {
    const fileInput = document.getElementById('AssetUpload');
    const file = fileInput.files[0];
    if (!file) return;

    const projectId = getIdFromURL();
    
    try {
        const uploadedAsset = await uploadAudioAsset(projectId, file);
        await addAssetToLibrary(projectId, uploadedAsset, "audio");
        
        // Store for potential removal
        currentUploadedAsset = uploadedAsset;
        
        // Show file preview
        showFilePreview(file.name, 'bi-music-note-beamed');
        
        console.log("Audio uploaded:", uploadedAsset);
    } catch (err) {
        console.error("Error:", err);
        alert("Error uploading audio");
    }
}

async function uploadImageAssetForCurrentProject() {
    const fileInput = document.getElementById('AssetUpload');
    const file = fileInput.files[0];
    if (!file) return;

    const projectId = getIdFromURL();
    
    try {
        const uploadedAsset = await uploadImageAsset(projectId, file);
        await addAssetToLibrary(projectId, uploadedAsset, "image");
        
        currentUploadedAsset = uploadedAsset;
        showFilePreview(file.name, 'bi-file-image');
        
        console.log("Image uploaded:", uploadedAsset);
    } catch (err) {
        console.error("Error:", err);
        alert("Error uploading image");
    }
}

async function uploadVideoAssetForCurrentProject() {
    const fileInput = document.getElementById('AssetUpload');
    const file = fileInput.files[0];
    if (!file) return;

    const projectId = getIdFromURL();
    
    try {
        const uploadedAsset = await uploadVideoAsset(projectId, file);
        await addAssetToLibrary(projectId, uploadedAsset, "video");
        
        currentUploadedAsset = uploadedAsset;
        showFilePreview(file.name, 'bi-camera-video');
        
        console.log("Video uploaded:", uploadedAsset);
    } catch (err) {
        console.error("Error:", err);
        alert("Error uploading video");
    }
}

// Show file preview after upload
function showFilePreview(fileName, iconClass) {
    // Hide upload button
    document.getElementById('uploadAssetBtn').style.display = 'none';
    
    // Show preview
    document.getElementById('fileIcon').className = `bi ${iconClass} mr-2`;
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('filePreviewContainer').style.display = 'flex';
}

// Hide file preview
function hideFilePreview() {
    document.getElementById('filePreviewContainer').style.display = 'none';
    document.getElementById('uploadAssetBtn').style.display = 'inline-flex';
    currentUploadedAsset = null;
}

// Remove uploaded asset from server and library
async function removeUploadedAsset() {
    if (!currentUploadedAsset) {
        console.warn("No asset to remove");
        return;
    }
    
    const projectId = getIdFromURL();
    
    try {
        // Delete from server and library
        await deleteAsset(projectId, currentUploadedAsset.id);
        
        console.log("Asset removed:", currentUploadedAsset.id);
        
        // Reset UI
        hideFilePreview();
        document.getElementById('AssetUpload').value = '';
        
    } catch (err) {
        console.error("Error removing asset:", err);
        alert("Error removing asset");
    }
}

// Upload Audio Asset
async function uploadAudioAsset(projectId, audioFile, assetId = null) {
  const formData = new FormData();
  formData.append("audio", audioFile);
  if (assetId) {
    formData.append("assetId", assetId);
  }

  try {
    const response = await fetch(`${SERVER_BASE}/projects/${projectId}/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Audio uploaded:", result);
    return result.asset;
  } catch (err) {
    console.error("Error uploading audio:", err);
    throw err;
  }
}

// Upload Image Asset
async function uploadImageAsset(projectId, imageFile, assetId = null) {
  const formData = new FormData();
  formData.append("image", imageFile);
  if (assetId) {
    formData.append("assetId", assetId);
  }

  try {
    const response = await fetch(`${SERVER_BASE}/projects/${projectId}/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Image uploaded:", result);
    return result.asset;
  } catch (err) {
    console.error("Error uploading image:", err);
    throw err;
  }
}

// Upload Video Asset
async function uploadVideoAsset(projectId, videoFile, assetId = null) {
  const formData = new FormData();
  formData.append("video", videoFile);
  if (assetId) {
    formData.append("assetId", assetId);
  }

  try {
    const response = await fetch(`${SERVER_BASE}/projects/${projectId}/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Video uploaded:", result);
    return result.asset;
  } catch (err) {
    console.error("Error uploading video:", err);
    throw err;
  }
}

// Save Text Asset (only JSON, no file upload)
async function saveTextAsset(projectId, assetId, textContent) {
  const asset = {
    id: assetId,
    type: "text",
    content: textContent,
    createdAt: new Date().toISOString()
  };

  // Salva direttamente in asset-library.json via ATON storage
  const storageId = getProjectProtocolAssetLibraryStorageId(projectId);
  const patch = {
    [assetId]: asset
  };

  try {
    await ATON.App.addToStorage(storageId, patch);
    console.log("Text asset saved:", asset);
    return asset;
  } catch (err) {
    console.error("Error saving text asset:", err);
    throw err;
  }
}

// Add uploaded asset to asset-library.json
async function addAssetToLibrary(projectId, assetData) {
  const storageId = getProjectProtocolAssetLibraryStorageId(projectId);
  
  // Determina il tipo in base ai campi presenti
  let type = "unknown";
  if (assetData.glb) type = "3d";
  else if (assetData.audio) type = "audio";
  else if (assetData.image) type = "image";
  else if (assetData.video) type = "video";

  const asset = {
    ...assetData,
    type: type,
  };

  const patch = {
    [assetData.id]: asset
  };

  try {
    await ATON.App.addToStorage(storageId, patch);
    console.log("Asset added to library:", asset);
    return asset;
  } catch (err) {
    console.error("Error adding asset to library:", err);
    throw err;
  }
}

// Delete asset from library AND physical files
// Delete asset from library AND physical files
async function deleteAsset(projectId, assetId) {
  const storageId = getProjectProtocolAssetLibraryStorageId(projectId);
  
  try {
    // 1. Read asset library to find the asset
    const library = await ATON.App.getStorage(storageId) || {};
    const asset = library[assetId];
    
    if (!asset) {
      throw new Error(`Asset ${assetId} not found in library`);
    }

    // 2. Delete physical files if they exist
    const filesToDelete = {};
    if (asset.glb) filesToDelete.glbFilename = asset.glb.filename;
    if (asset.thumb) filesToDelete.thumbFilename = asset.thumb.filename;
    if (asset.audio) filesToDelete.audioFilename = asset.audio.filename;
    if (asset.image) filesToDelete.imageFilename = asset.image.filename;
    if (asset.video) filesToDelete.videoFilename = asset.video.filename;

    if (Object.keys(filesToDelete).length > 0) {
      const response = await fetch(`${SERVER_BASE}/projects/${projectId}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filesToDelete)
      });

      if (!response.ok) {
        console.warn("Warning: Could not delete physical files");
      }
    }

    // 3. Remove from asset library using deleteFromStorage
    const patch = { [assetId]: {} };
    await ATON.App.deleteFromStorage(storageId, patch);
    
    console.log("Asset deleted from library:", assetId);
    return true;
  } catch (err) {
    console.error("Error deleting asset:", err);
    throw err;
  }
}

// Get all assets from library
async function getAssetLibrary(projectId) {
  const storageId = getProjectProtocolAssetLibraryStorageId(projectId);
  try {
    const library = await ATON.App.getStorage(storageId) || {};
    return library;
  } catch (err) {
    console.error("Error getting asset library:", err);
    return {};
  }
}

// Get assets filtered by type
async function getAssetsByType(projectId, type) {
  const library = await getAssetLibrary(projectId);
  return Object.values(library).filter(asset => asset.type === type);
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

window.addPhaseToConfig = addPhaseToConfig;
window.deletePhaseFromConfig = deletePhaseFromConfig;
window.saveProtocolStep = saveProtocolStep;
window.importProjectProtocolConfig = importProjectProtocolConfig;

window.uploadAudioAsset = uploadAudioAsset;
window.uploadImageAsset = uploadImageAsset;
window.uploadVideoAsset = uploadVideoAsset;
window.saveTextAsset = saveTextAsset;
window.addAssetToLibrary = addAssetToLibrary;
window.deleteAsset = deleteAsset;
window.getAssetLibrary = getAssetLibrary;
window.getAssetsByType = getAssetsByType;
window.deleteAsset = deleteAsset;