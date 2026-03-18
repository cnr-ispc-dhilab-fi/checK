const params = new URLSearchParams(window.location.search);

// ==== Replace trigger by subject
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        subjectTrigger();
    }
});

// =========== MISSING ============
// == Integration w/ the subject ==

function playMedia(assetName) {
    alert("The subject is viewing: " + assetName);
}

// ================================
// ================================


function subjectTrigger() {

    // - - - - - - - - - - - - - - - - - - -
    // ! REPLACE with position of the user !
    // - Initialise before loading the img -
    // - - - - - - - - - - - - - - - - - - -

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