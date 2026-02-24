let currentPhase = 0; // 0!

let projectConfig;
let currenTemplate;

let protocolConfigStorage;
let protocolAssetLibraryStorage;
let protocolMultimediaLibraryStorage;
let phasesObj;


window.addEventListener('DOMContentLoaded', async function() {
    await initialiseRightPanel();
    projectConfig = await ATON.App.getStorage(getProjectConfigStorageId(getIdFromURL()));
    protocolMultimediaLibraryStorage = await ATON.App.getStorage(getProjectProtocolAssetLibraryStorageId(getIdFromURL()));
    currentTemplate = projectConfig["template"];
});

async function uploadScene(phase) {
  protocolConfigStorage = await ATON.App.getStorage(getProjectProtocolConfigStorageId(getIdFromURL()));
  protocolAssetLibraryStorage = await ATON.App.getStorage(getProject3DAssetsStorageId(getIdFromURL()));
  phasesObj = protocolConfigStorage[getGroupAndMeasureFromURL()]["phase"];

  let phaseKey = phase;
  if (phase === 0) {
    phaseKey += 1
  }

  let envID = phasesObj[phaseKey]["environmentID"];
  let envPath = protocolAssetLibraryStorage[envID]["glb"]["url"];

  ATON.createSceneNode(`phase${phaseKey}`).load(`${SERVER_BASE}${envPath}`).attachToRoot();
  // !! -- Hard Coded: To replace with info from protocol config --
  ATON.Nav.setHomePOV( new ATON.POV().setPosition(-0.467, 1.743, 6.391).setTarget(0.5, 2.234, 0.647) ); 
  // --------------------------------------------------------------
}

function goToNextPhase() {

    if (currentPhase < Object.keys(phasesObj).length - 1) {
        currentPhase++;
        updatePhase(currentPhase);
    }
}

async function updatePhase(phase) {
    await uploadScene(phase);
    await updateLeftPanel(phase);
}

async function initialiseRightPanel() {
    
    const projectConfig = await ATON.App.getStorage(getProjectConfigStorageId(getIdFromURL()));
    document.getElementById("session-project").innerHTML = projectConfig["title"];

    document.getElementById("session-subject").innerHTML = getSubjectIDFromURL();
    document.getElementById("session-group").innerHTML = getGroupAndMeasureFromURL().split(",")[0];
    document.getElementById("session-measure").innerHTML = getGroupAndMeasureFromURL().split(",")[1];

}

function updateLeftPanel(phase) {

    console.log(phase);
    let titlePhase;

    console.log(phasesObj);

    if (phase === 0 &&phasesObj[0] === false) {
        phase += 1; // If protocol does not foresee training, jump to phase 1
        titlePhase = phasesObj[phase]["name"];
    } else if (phase === 0 && phasesObj[0] !== false) {
        titlePhase = "Training";
    } else {
        titlePhase = phasesObj[phase]["name"];
    }

    console.log(titlePhase);

    document.getElementById("phase-in-protocol-label").innerHTML = `Phase ${phase} / ${Object.keys(phasesObj).length - 1}`;
    document.getElementById("phase-name-label").innerHTML = titlePhase;

    if (phase === 0) {
        // Show in the first panel the content of training, mute other
        document.getElementById("task-content").style.display = "none";
        document.getElementById("training-content").style.display = "flex";

        // Deactivate and disable Multimedia tab
        document.getElementById("multimedia-tab").classList.add("disabled");
        document.getElementById("multimedia-tab").setAttribute("aria-disabled", "true");
        document.getElementById("multimedia-tab").disabled = true;

    } else {

        // 1. HANDLE TABS
        
        if (currentTemplate === "Free Wander") {

            // ----- Handle panels for Free Wander template -----
            // Deactivate and DISABLE Task tab button
            document.getElementById("task-tab").classList.remove("active");
            document.getElementById("task-tab").classList.add("disabled");
            document.getElementById("task-tab").setAttribute("aria-selected", "false");
            document.getElementById("task-tab").setAttribute("aria-disabled", "true");
            document.getElementById("task-tab").disabled = true;

            // Deactivate Task panel
            document.getElementById("task-panel").classList.remove("show", "active");

            // Activate Multimedia tab button
            document.getElementById("multimedia-tab").classList.remove("disabled");
            document.getElementById("multimedia-tab").classList.add("active");
            document.getElementById("multimedia-tab").setAttribute("aria-selected", "true");
            document.getElementById("multimedia-tab").setAttribute("aria-disabled", "false");
            document.getElementById("multimedia-tab").disabled = false;

            // Activate Multimedia panel
            document.getElementById("multimedia-panel").classList.add("show", "active");
            // --------------------------------------------------


        } else if (currentTemplate === "Task 'n Test") {

            // ----- Handle panels for Task 'n Test template -----
            // Activate Multimedia tab button
            document.getElementById("multimedia-tab").classList.remove("disabled");
            document.getElementById("multimedia-tab").setAttribute("aria-disabled", "false");
            document.getElementById("multimedia-tab").disabled = false;
            // ---------------------------------------------------

            // 2A. POPULATE TABLE WITH VARIABLES
            addMultimediaTable(isInstruction = false, phase);
        }

        // 2B-1. ADD TEXTUAL CONTENT FOR TASK
        document.getElementById("training-content").style.display = "none";
        document.getElementById("task-content").style.display = "block";

        document.getElementById("task-description-p").innerHTML = phasesObj[phase]["taskDes"];
        document.getElementById("task-instruction-p").innerHTML = phasesObj[phase]["taskInst"];

        // 2B-2. POPULATE TABLE WITH INSTRUCTION MULTIMEDIA
        addMultimediaTable(isInstruction = true, phase);

        // 3. MUTE BUTTON IF END OF PROTOCOL
        if (phase === Object.keys(phasesObj).length - 1) {
            document.getElementById("next-phase-button").disabled = true;
        }
    }

}

// This function populates the multimedia table in both the Instruction and Multimedia panel
function addMultimediaTable(isInstruction, phase) {

    // Step 1. Populate the "assets" array with the ID of the assrt to be shown (of correct role)
    let assets;
    let tableContainer = isInstruction 
    ? document.getElementById('instruction-media-table-wrapper') 
    : document.getElementById('variable-media-table-wrapper'); 

    if (isInstruction) {
        assets = Object.keys(phasesObj[phase]["assets"])
        .filter(asset => phasesObj[phase]["assets"][asset].role === 'Instruction');
    } else {
        assets = Object.keys(phasesObj[phase]["assets"])
        .filter(asset => phasesObj[phase]["assets"][asset].role === 'Variable');
    }

    if (assets.length === 0) {
        // If no asset is provided, hide the table
        tableContainer.style.display = "none";
        return;
    } else {

        // Step 2. Show table and populate tbody with assets
        tableContainer.style.display = "block";
        const tbody = tableContainer.querySelector('tbody');

        if (isInstruction) {

            // For loop specific to Instruction
            assets.forEach((assetKey) => {

                console.log("Asset key:", assetKey);
                
                let asset = protocolMultimediaLibraryStorage[assetKey];
                
                console.log(protocolMultimediaLibraryStorage[asset]);

                // Create row
                const newRow = document.createElement('tr');
                newRow.classList.add('row-asset');
                newRow.setAttribute('data-asset-id', asset.id);
                

                newRow.innerHTML = `
                    <td><i class="bi ${getMediaIconClass(asset)}"></i></td>
                    <td>${asset.customName}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button 
                                type="button" 
                                class="btn" 
                                onclick="viewAsset('${asset}')">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(newRow);
            }); 
        } else {

            document.getElementById("multimedia-content-p").remove();
            // Add row for 3D animation: if animation is active...

            if (phasesObj[phase]["playsAnimation"]) {
                const animationRow = document.createElement('tr');
                animationRow.classList.add('row-asset');

                animationRow.innerHTML = `
                    <td><i class="bi bi-badge-3d"></i></td>
                    <td>Environment animation</td>
                    <td></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button 
                                type="button" 
                                class="btn" 
                                onclick="playMedia('3D Animation')">
                                <i class="bi bi-play-circle"></i>
                            </button>
                        </div>
                    </td>
                `;

                tbody.appendChild(animationRow);
            }

            // For loop specific to Variables
            assets.forEach((assetKey) => {

                console.log("Asset key:", assetKey);
                
                let asset = protocolMultimediaLibraryStorage[assetKey];
                
                console.log(protocolMultimediaLibraryStorage[asset]);

                // Create row
                const newRow = document.createElement('tr');
                newRow.classList.add('row-asset');
                newRow.setAttribute('data-asset-id', asset.id);
                
                newRow.innerHTML = `
                    <td><i class="bi ${getMediaIconClass(asset)}"></i></td>
                    <td>${asset.customName}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button 
                                type="button" 
                                class="btn" 
                                onclick="viewAsset('${asset}')">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button 
                                type="button" 
                                class="btn" 
                                onclick="playMedia('${asset.id}')">
                                <i class="bi bi-play-circle"></i>
                            </button>
                        </div>
                    </td>
                    `;

                tbody.appendChild(newRow.cloneNode(true));
                                
            }); 

        }
    }

    // <i class="bi ${iconClass}">...</i> NOW IT WORKS TILL HERE: TO DO] ADD ASSETS AS ROWS. NB FOR MULTIMEDIA YOU ALSO HAVE THE ANIMATION
}

// Ancillary function to select the correct icon
function getMediaIconClass(asset) {
    let iconClass = '';

    switch(asset.type) {
        case 'text':
            iconClass = 'bi-file-earmark-text';
            break;
        case 'audio':
            iconClass = 'bi-music-note-beamed';
            break;
        case 'image':
            iconClass = 'bi-file-earmark-image';
            break;
        case 'video':
            iconClass = 'bi-camera-video';
            break;
            default:
            iconClass = 'bi-file-earmark';
    }
    
    return iconClass;
}

// =========== MISSING ============
// == Integration w/ the subject ==

function playMedia(assetName) {
    alert("The subject is viewing: " + assetName);
}

// ================================
// ================================
