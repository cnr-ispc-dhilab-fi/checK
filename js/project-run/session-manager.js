const params = new URLSearchParams(window.location.search);

// ===================================
// == TRIGGER FUNCTIONS FOR SUBJECT ==
// These functions call events through
// Photon.fire to act on subject's in-
// terface. See experiment-scene.html 
// for listeners & ancillary funtions
// ===================================

function loadPhaseSubjectATONScene(s_id) {
    let atonFrame = document.getElementById("testerATONSceneFrame");
    atonFrame.contentWindow.subjectATONSceneLoader({ sid: s_id });
}

// Missing: SPATIAL UI
function playMedia(assetName) {
    alert("The subject is viewing: " + assetName);
}

// ==================================
// === MODAL ACTIVATION FUNCTIONS ===
// ==================================

function subjectTrigger(cover) {

    $('#positionViewer').attr("src", cover.src);
    $('#modalSelectionViewer').modal('show');

}

function changePhaseModal(isCorrect) {

    let countCorrect = parseInt($('#phase-correct').text());
    let countWrong = parseInt($('#phase-wrong').text());

    // Add values to modal
    if (isCorrect) {
        $('#taskCorrectBoolSpan').text("completed");
        countCorrect++;
        $('#phase-correct').text(countCorrect);
    } else {
        $('#taskCorrectBoolSpan').text("did not complete");
        countWrong++;
        $('#phase-wrong').text(countWrong);
    }

    $('#taskRepeatCountSpan').text($('#phase-iter').text());
    $('#taskMistakeCountSpan').text(countWrong);
    $('#taskCorrectCountSpan').text(countCorrect);


    $('#currentPhaseSpan').text(currentPhase);
    $('#phaseCountSpan').text(Object.keys(phasesObj).length - 1); // -1 because of the "training" phase

    let selectPhaseJump = document.getElementById("phaseJumpSelect");
    selectPhaseJump.innerHTML = `<option selected>Select phase...</option>`; // Initialize select options
    for (let i = 1; i <= parseInt(Object.keys(phasesObj).length - 1); i++) {
        selectPhaseJump.insertAdjacentHTML("beforeend", `<option value="${i}">Phase ${i}</option>`);
    }

    $('#modalPhaseChange').modal('show');
}