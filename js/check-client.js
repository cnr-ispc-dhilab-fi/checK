const SERVER_BASE = "http://localhost:3001";

let app = ATON.App.realize(false);

// Richedi il flare "check" - The name of the flare folder!
app.requireFlares(["check-flare"]);

let checkFlare = null;

app.setup = () => {
  
  // Realizza l'app, rimuovendo la view 3D non necessaria 
    ATON.realize();
  
  // aspetto che TUTTI i flares siano pronti
    ATON.on("AllFlaresReady", () => {
        console.log("Flares ready!");

        // ora posso recuperare il flare
        checkFlare = ATON.getFlare("check");
        console.log("Check flare:", checkFlare);

        document.getElementById("idView3D").remove();


    });
};

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  const n = Number(params.get("id"));
  return n;
}

// ===============================
// FUNZIONE CLIENT: CREA PROGETTO
// ===============================

// Ancillary function to create project ID (YYMMDDhhmm)

function generateProjectId() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return yy + MM + dd + HH + mm;
}

// Body of the main function

async function createProjectFromUI() {
    const id = generateProjectId();

    try {
        const res = await fetch("http://localhost:3001/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                label: ""   // nome vuoto; l’utente lo definirà più tardi
            })
        });

        if (!res.ok) {
            throw new Error("Server responded with " + res.status);
        }

        const project = await res.json();

        console.log("Project:", project);
        window.location.href = `project-form.html?id=${id}&n=0`;

    // qui puoi:
    // - salvare l'ID in una variabile globale
    // - aggiornare la UI
    // - fare redirect a una pagina del progetto
    // es:
    // currentProjectId = project.id;
    // refreshProjectList();
    } catch (err) {
        console.error(err);
        alert("Error creating project: " + err.message);
    }
}

window.createProjectFromUI = createProjectFromUI; // Render functions as GLOBAL (to call from HTML)

// ===============================
// UPLOAD ASSET PER IL PROGETTO CORRENTE
// - legge GLB dall'input
// - genera thumb con generateGlbThumbnail()
// - invia tutto al server (/projects/:projectId/upload)
// ===============================
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
    // 1) genera thumb 3D
    const { blob: thumbBlob } = await generateGlbThumbnail(glbFile);

    // 2) prepara FormData
    const assetId = "A" + Date.now();
    const formData = new FormData();
    formData.append("assetId", assetId);
    formData.append("glb", glbFile, glbFile.name);
    formData.append("thumb", thumbBlob, assetId + "_thumb.png");

    // 3) invia al server
    const res = await fetch(`${SERVER_BASE}/projects/${projectId}/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }

    const data = await res.json(); // { message, projectId, asset }

    console.log("3D Asset uploaded:", data);

    // 4) aggiungo SOLO la nuova card
    add3DAssetCard(projectId, assetId, data.asset);

    // reset input
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error uploading asset: " + err.message);
  }
}

window.upload3DAssetForCurrentProject = upload3DAssetForCurrentProject; // Render functions as GLOBAL (to call from HTML)

// ===============================
// LEGGI & RENDER ASSET LIST
// ===============================
async function refresh3DAssetsList(projectId) {
  if (!projectId) {
    projectId = getIdFromURL();
  }
  if (!projectId) return;

  try {
    const res = await fetch(`${SERVER_BASE}/projects/${projectId}/assets`);
    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }
    const assets = await res.json(); // { assetId: {...}, ... }
    render3DAssetsList(projectId, assets);
  } catch (err) {
    console.error(err);
    alert("Error loading 3D assets: " + err.message);
  }
}

function add3DAssetCard(projectId, assetId, asset) {
  const container = document.getElementById("new-project-upload");
  if (!container) return;

  // Costruisco la thumb URL
  let thumbUrl = "";
  if (asset.thumb && asset.thumb.filename) {
    thumbUrl = `${SERVER_BASE}/user-projects/${projectId}/upload/thumb/${asset.thumb.filename}`;
  }

  const card_html = `
    <div class="col-md-3 col-sm-12 mb-3 d-flex justify-content-center div-thumb-cards" id="div-thumb-card-${assetId}">
      <div class="card thumb-card">
        <button class="thumb-close-btn" type="button" aria-label="Rimuovi"
                onclick="deleteAsset('${projectId}', '${assetId}')">
          <i class="bi bi-x-lg"></i>
        </button>
        <img src="${thumbUrl}" class="card-img-top glb-img" alt="thumbnail ambiente ${assetId}">
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", card_html);
}


function render3DAssetsList(projectId, assets) {
  const container = document.getElementById("new-project-upload");
  if (!container) return;


  const assetIds = Object.keys(assets);
 


  assetIds.forEach(assetId => {
    const asset = assets[assetId];

    // Costruisco la thumb URL
    let thumbUrl = "";
    if (asset.thumb && asset.thumb.filename) {
      thumbUrl = `${SERVER_BASE}/user-projects/${projectId}/upload/thumb/${asset.thumb.filename}`;
    }

    // Template HTML della card, in stile Bootstrap
    const card_html = `
      <div class="col-md-3 col-sm-12 mb-3 d-flex justify-content-center div-thumb-cards" id="div-thumb-card-${assetId}">
        <div class="card thumb-card">

          <button class="thumb-close-btn" type="button" aria-label="Rimuovi" onclick="deleteAsset('${projectId}', '${assetId}')">
            <i class="bi bi-x-lg"></i>
          </button>

          <img src="${thumbUrl}" class="card-img-top glb-img" alt="thumbnail ambiente ${assetId}">
        
        </div>
      </div>
    `;

    // Appendo al container
    container.insertAdjacentHTML("beforeend", card_html);
  });
}


// ===============================
// DELETE ASSET
// ===============================
async function deleteAsset(projectId, assetId) {
  if (!confirm(`Delete asset ${assetId}?`)) return;

  try {
    const res = await fetch(
      `${SERVER_BASE}/projects/${projectId}/assets/${assetId}`,
      {
        method: "DELETE"
      }
    );

    if (!res.ok) {
      throw new Error("Server responded with " + res.status);
    }

    const data = await res.json();
    console.log("Asset deleted:", data);

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
// SAVE PROJECT METADATA
// ===============================

async function submitData() {

  // Get the source JSON file "config.json"
  const projectId = getIdFromURL();;
  const res = await fetch(`http://localhost:3001/user-projects/${projectId}/config.json`);
  const config = await res.json(); 

  // Store all the variables
  let projectTemplate = "";
  if (getIsTaskTest()) {
    projectTemplate = "Task 'n Test";
  } else {
    projectTemplate = "Free Wander";
  }

  let projectTitle =  $("#project-name").val();
  let projectObjectives =  $("#project-objectives").val();
  let projectAudience =  $("#project-audience").val();
  let projectActions =  $("#project-actions").val();
  let projectMeasureDesc =  $("#project-measures").val();
  let projectGroups =  $("#project-groups").val();
  let projectRepMeasures =  $("#project-rep-measures").val();

  console.log(projectTemplate, projectTitle, projectObjectives, projectAudience, projectActions, projectMeasureDesc, projectGroups, projectRepMeasures);

  await fetch(`${SERVER_BASE}/projects/${projectId}/metadata`, {
    method: "PATCH",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      template: projectTemplate,
      title: projectTitle,
      objectives_description: projectObjectives,
      audience_description: projectAudience,
      actions_description: projectActions,
      measure_description: projectMeasureDesc,
      groups_number: projectGroups,
      repeated_measures: projectRepMeasures,
      updatedAt: new Date().toISOString()
    })
  });
}