let currentPhase = 0;

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

function addMultimediaTable(isInstruction, phase) {
    let assets;
    let tableContainer = isInstruction 
    ? document.getElementById('instruction-media-table-wrapper') 
    : document.getElementById('variable-media-table-wrapper'); 

    if (isInstruction) {
        assets = Object.values(phasesObj[phase]["assets"])
        .filter(asset => asset.role === 'Instruction');

        if (assets.length === 0) {}
    } else {
        assets = Object.values(phasesObj[phase]["assets"])
        .filter(asset => asset.role === 'Variable');
    }

    console.log("Is instruction? " + isInstruction);
    console.log(assets.length);

    console.log(tableContainer);

    if (assets.length === 0) {
        tableContainer.style.display = "none";
        return;
    }

    // NOW IT WORKS TILL HERE: TO DO] ADD ASSETS AS ROWS. NB FOR MULTIMEDIA YOU ALSO HAVE THE ANIMATION
}