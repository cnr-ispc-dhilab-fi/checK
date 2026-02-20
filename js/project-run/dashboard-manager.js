let currentPhase = 0;

let protocolConfigStorage;
let protocolAssetLibraryStorage;
let phasesObj;

window.addEventListener('DOMContentLoaded', async function() {
    await initialiseRightPanel();
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

  await updateLeftPanel(currentPhase);
}

// --- CHECK IF SHOULD BE USED ---
async function updatePhase(phase) {
    await uploadScene(phase);
    await updateLeftPanel(phase);
}
// --------------------------------

async function initialiseRightPanel() {
    
    const projectConfig = await ATON.App.getStorage(getProjectConfigStorageId(getIdFromURL()));
    document.getElementById("session-project").innerHTML = projectConfig["title"];

    document.getElementById("session-subject").innerHTML = getSubjectIDFromURL();
    document.getElementById("session-group").innerHTML = getGroupAndMeasureFromURL().split(",")[0];
    document.getElementById("session-measure").innerHTML = getGroupAndMeasureFromURL().split(",")[1];

}

function updateLeftPanel(phase) {

    let titlePhase = phasesObj[phase]["title"];

    if (phasesObj[0] === false) {
        phase += 1; // If protocol does not foresee training, jump to phase 1
    } else {
        titlePhase = "Training";

    }

    document.getElementById("phase-in-protocol-label").innerHTML = `Phase ${phase} / ${Object.keys(phasesObj).length}`;
    document.getElementById("phase-name-label").innerHTML = titlePhase;

    if (phase === 0) {
        document.getElementById("task-content").style.display = "none";
        document.getElementById("training-content").style.display = "flex";
        document.getElementById("multimedia-tab").setAttribute("disabled", "true");
    } else {
        document.getElementById("task-content").style.display = "block";
        document.getElementById("training-content").style.display = "none";
        document.getElementById("multimedia-tab").removeAttribute("disabled");
        console.log("HEI");
    }

}