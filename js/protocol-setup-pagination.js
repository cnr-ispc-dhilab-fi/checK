// Intialise the pagination for the protocol setup phases

window.addEventListener('DOMContentLoaded', function() {

    queryParams = new URLSearchParams(window.location.search);
    
    const paramsObject = Object.fromEntries(queryParams);

    // The object has:
    // - p = Phase (training, phase 1 ...)
    // - s = Step (3D environment, media library)
    // - g = Group
    // - m = Repeated Measure
    // - t = Template: 0 = Free Wander, 1 = Task and Test

    goToCurrentPage(paramsObject);
});

function goToCurrentPage(paramsObject) {

    console.log(paramsObject);

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

    // You set tasks only in task and test (t = 1)
    if (parseInt(paramsObject['t']) == 0) {
        stepContainer[2].remove();
        stepContainer.splice(2, 1); // Remove from array (idx 3 becomes idx 2)
        console.log(stepContainer);
    }

    // Initialise the containers
    stepContainer.forEach(div => {
        div.classList.add("step-container-hidden");
    });

    // Display the correct step container
    let currentStepIndex = parseInt(paramsObject['s']);
    stepContainer[currentStepIndex].classList.remove("step-container-hidden");

    // ---------------------------------------
}
// containerClass[0].classList.remove("step-container-hidden");

/*
function highlightEnvironmentCard(e) {

    let envCards = document.getElementsByClassName("environment-thumb-cards");

    [...envCards].forEach(el => {
        el.classList.remove("environment-card-active");
    });

    e.currentTarget.classList.add("environment-card-active");
}
*/