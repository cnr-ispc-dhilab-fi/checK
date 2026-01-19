// --- Global variables ---
const STORAGE_TRAINING_KEY = "hasTraining";

let globalCurrentStepIndex;
let globalCurrentPhaseIndex;
//  -----------------------

window.addEventListener('DOMContentLoaded', function() {

    importProjectInfo();

    if (getHasTraining() === undefined){
        document.getElementById("iconTraining").classList.remove("bi-check-circle");
    } else {
        if (!getHasTraining()) {
            document.getElementById("iconTraining").classList.remove("bi-check-circle"); 
            document.getElementById("iconTraining").classList.remove("bi-x-circle");
        }
    }

    queryParams = new URLSearchParams(window.location.search);
    
    const paramsObject = Object.fromEntries(queryParams);

    // The object has:
    // - p = Phase (training, phase 1 ...)
    // - s = Step (3D environment, media library)
    // - g = Group
    // - m = Repeated Measure
    // - t = Template: 0 = Free Wander, 1 = Task and Test

    goToCurrentPage(paramsObject);

    createEnvThumbModal();
});

function goToCurrentPage(paramsObject) {

    // *************************************
    // 1. HIGHLIGHT THE CORRECT PHASE BUTTON
    // *************************************

    // For the phase (controlled by p param)
    let phaseContainer = document.getElementById("phase-btn-container");

    // Select buttons
    const buttons = Array.from(phaseContainer.children).filter(child => child.tagName === 'BUTTON'); 

    // Initialise button list
    buttons.forEach(btn => {
        btn.classList.remove("btn-phase-active");
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline-primary");
    }); 

    // Highlight correct button
    let currentPhaseIndex = parseInt(paramsObject['p']);

    let currentButton = buttons[currentPhaseIndex];

    currentButton.classList.remove("btn-outline-primary");
    currentButton.classList.add("btn-phase-active");
    currentButton.classList.add("btn-primary");

    // ---------------------------------------

    // *************************************
    // 2. DISPLAY THE CORRECT STEP CONTAINER
    // *************************************

    // For the step (controlled by s param)
    let stepContainer = Array.from(document.querySelectorAll(".step-detail-container"));

    let currentStepIndex = parseInt(paramsObject['s']); // To anticipate to handle difference in templates

    // You set tasks only in task and test (t = 1)
    if (parseInt(paramsObject['t']) == 0) {
        stepContainer[2].remove();
        stepContainer.splice(2, 1); // Remove from array (idx 3 becomes idx 2)
        if (currentStepIndex > 2) {
            currentStepIndex -= 1; // Update current step index
        }
    }

    // Initialise the containers
    stepContainer.forEach(div => {
        div.classList.add("step-container-hidden");
    });

    
    if (currentStepIndex === 1) {
        document.getElementById("thumb-and-analytics-div").style.display = "none";
    }
    // Display the correct step container
    stepContainer[currentStepIndex].classList.remove("step-container-hidden");

    // ---------------------------------------

    globalCurrentStepIndex = currentStepIndex; 
    globalCurrentPhaseIndex = currentPhaseIndex;
}


function updatePage(parObj) {

    queryParams = new URLSearchParams(window.location.search);
    const paramsObject = Object.fromEntries(queryParams);

    for (const key in parObj) {
        paramsObject[key] = parObj[key];
    }

    const newQueryParams = new URLSearchParams(paramsObject).toString();

    // Reload the page with the new parameters
    window.location.search = newQueryParams;
}

// == MINOR ANCILLARY FUNCTIONS ==

// Add training phase
function setHasTraining(value) {
  // value: true/false
  localStorage.setItem(STORAGE_TRAINING_KEY, value ? "1" : "0");
}

function getHasTraining() {
  const v = localStorage.getItem(STORAGE_TRAINING_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null; // not chosen yet
}

// Handle modal environment card selection
async function createEnvThumbModal() {

    let envContainer = document.getElementById("environment-thumb-wrapper");

    renderEnvThumbForModal();
}

function highlightEnvironmentCard(e) {

    let envCards = document.getElementsByClassName("environment-thumb-cards");

    [...envCards].forEach(el => {
        el.classList.remove("environment-card-active");
        el.removeAttribute("id");
    });

    e.currentTarget.classList.add("environment-card-active");

    e.currentTarget.setAttribute("id", "chosen-environent");

}

function setPhaseEnvironment() {

    document.getElementById("thumb-and-analytics-div").style.display = "flex";

    let chosenEnv = document.getElementById("chosen-environent").querySelector('img').src;

    // https://localhost:8083/a/checK/data/user-projects/2511261413/upload/thumb/1764175208247_A1764175207930_thumb.png

    document.getElementById("thumb-step-env").querySelector('img').src = chosenEnv;
}