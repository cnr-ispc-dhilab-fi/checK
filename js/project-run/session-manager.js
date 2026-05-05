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

    pauseTimer();
    $('#positionViewer').attr("src", cover.src);
    $('#modalSelectionViewer').modal('show');

}

function changePhaseModal(isCorrect) {
  const totalPhases = Object.keys(phasesObj).length - 1; // exclude training
  const isLastPhase = currentPhase >= totalPhases;
  const isSinglePhase = totalPhases === 1;

  // --- Update counters ---
  let countCorrect = parseInt($('#phase-correct').text());
  let countWrong   = parseInt($('#phase-wrong').text());

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

  // --- Phase progress label (header) ---
  $('#phaseProgressLabel').text(`Phase ${currentPhase} of ${totalPhases}`);

  // --- Next / End session card ---
  if (isLastPhase) {
    $('#nextPhaseIcon').removeClass('bi-arrow-right-circle').addClass('bi-stop-circle');   // ❚❚ pause-like end icon
    $('#nextPhaseLabel').text('End session');
    $('#nextPhaseDesc').text('Close and save results');
    $('#nextPhaseCard').data('action', 'end');
  } else {
    $('#nextPhaseIcon').removeClass('bi-stop-circle').addClass('bi-arrow-right-circle');
    $('#nextPhaseLabel').text('Next phase');
    $('#nextPhaseDesc').text(`Go to Phase ${currentPhase + 1}`);
    $('#nextPhaseCard').data('action', 'next');
  }

  // --- Jump select ---
  if (isSinglePhase) {
    $('#jumpSection').hide();
  } else {
    $('#jumpSection').show();
    const select = document.getElementById('phaseJumpSelect');
    select.innerHTML = '<option selected disabled>Select phase…</option>';
    for (let i = 1; i <= totalPhases; i++) {
      const label = i === currentPhase ? `Phase ${i} (current)` : `Phase ${i}`;
      select.insertAdjacentHTML('beforeend', `<option value="${i}">${label}</option>`);
    }
  }

  $('#modalPhaseChange').modal('show');
}

// ==================================
// ======== PHASE TIMER =============
// ==================================

// Definition of ancillary internal values and open
// function to access them and update the string value

let _timerInterval    = null;
let _timerCentiseconds = 0;
let _timerRunning     = false;

function _formatTime(cs) {
    const m = Math.floor(cs / 6000);
    const s = Math.floor((cs % 6000) / 100);
    return String(m).padStart(2, '0') + '.' + String(s).padStart(2, '0');
}

function initTimer() {
    clearInterval(_timerInterval);
    _timerInterval     = null;
    _timerCentiseconds = 0;
    _timerRunning      = false;
    const el = document.getElementById('phase-timer');
    el.textContent = '00.00';
    el.classList.remove('timer-running', 'timer-paused');
}

// Function to start timer, called when subject enters the room
function startTimer() {
    if (_timerRunning) return;
    _timerRunning = true;
    const el = document.getElementById('phase-timer');
    el.classList.remove('timer-paused');
    el.classList.add('timer-running');
    _timerInterval = setInterval(() => {
        _timerCentiseconds++;
        el.textContent = _formatTime(_timerCentiseconds);
    }, 10);
}

function getTimerCentiseconds() {
    return _timerCentiseconds;
}

function pauseTimer() {
    if (!_timerRunning) return;
    _timerRunning = false;
    clearInterval(_timerInterval);
    _timerInterval = null;
    const el = document.getElementById('phase-timer');
    el.classList.remove('timer-running');
    el.classList.add('timer-paused');
}