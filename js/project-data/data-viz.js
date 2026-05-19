// Update main storages
const RECORDS_STORAGE_ID = "session/records";

let configStorage;
let protocolConfigStorage;
let sessionStorage;
let currentData = [];

async function getProjectSessions(projectId) {
  const records = await ATON.App.getStorage(RECORDS_STORAGE_ID) || {};
  return records[projectId] || {};
}

async function updateStorage() {
  configStorage = await ATON.App.getStorage(getProjectConfigStorageId(getIdFromURL()));
  protocolConfigStorage = await ATON.App.getStorage(getProjectProtocolConfigStorageId(getIdFromURL()));
  sessionStorage = await getProjectSessions(getIdFromURL());
}

// Remove ATON 3D elements
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
// SELECT INPUT UPDATES
// ===============================

function retrieveDataForSelect(field, value = null) {

  switch (field) {

    case "subject":

      let subjects = new Set();
      for (const sessionId in sessionStorage) {
        if (sessionStorage[sessionId].subjectID) {
          subjects.add(sessionStorage[sessionId].subjectID);
        }
      }

      return Array.from(subjects);

    case "session":

      let sessions = new Set();
      for (const sessionId in sessionStorage) {
        if (sessionStorage[sessionId].subjectID === value) {
          sessions.add({ "id": sessionId, "measure": sessionStorage[sessionId].measure });
        }
      }

      return Array.from(sessions);


  }


}

function updateSelect(field) {

  switch (field) {

    case "subject":

      // Retrieve all the subjects involved in the 
      // experimental sessions of the project
      let subjects = retrieveDataForSelect("subject");

      // Populate the select with the subjects
      SubjectSelect.innerHTML = '<option value="default">Choose a subject</option>';

      for (const subject of subjects) {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        SubjectSelect.appendChild(option);
      }

      setStateSelect(field);

      break;

    case "session":

      let Subjvalue = SubjectSelect.value;

      // Retrieve all the sessions in which the 
      // current subject is involved
      let sessions = retrieveDataForSelect("session", Subjvalue);

      // Populate the select with the sessions
      SessionSelect.innerHTML = '<option value="default">Choose a session</option>';

      for (const session of sessions) {
        const option = document.createElement("option");
        option.value = session.id;
        option.textContent = `${session.id} (measure: ${session.measure})`;
        SessionSelect.appendChild(option);
      }

      setStateSelect(field);

      break;

    case "phase":

      if (SessionSelect.value != "default") {
        let referenceProtocol = protocolConfigStorage[`${sessionStorage[SessionSelect.value].group},${sessionStorage[SessionSelect.value].measure}`]["phase"];

        // Populate the select with the phases
        PhaseSelect.innerHTML = '<option value="default">Choose a phase</option>';

        for (const phase of Object.keys(referenceProtocol)) {
          if (phase != 0) {
            const option = document.createElement("option");
            option.value = phase;
            option.textContent = `Phase ${phase}: ${referenceProtocol[phase].name}`;
            PhaseSelect.appendChild(option);
          }
        }
      }

      setStateSelect(field);

      break;

    default:
      break;
  }
}

function updateGoButton() {
  const GoBtn = document.getElementById("btn-set-tm");
  if (!GoBtn) return;
  const allSelected = SubjectSelect.value !== "" && SubjectSelect.value !== "default"
    && SessionSelect.value !== "" && SessionSelect.value !== "default"
    && PhaseSelect.value !== "" && PhaseSelect.value !== "default";
  GoBtn.disabled = !allSelected;
}

function setStateSelect(field) {

  switch (field) {

    case "session":
      if (SubjectSelect.value == "default" || SubjectSelect.value == "") {
        SessionSelect.disabled = true;
        SessionSelect.value = "";

        PhaseSelect.disabled = true;
        PhaseSelect.value = "";
      } else {
        SessionSelect.disabled = false;
      }
      break;

    case "phase":
      if (SessionSelect.value == "default" || SessionSelect.value == "") {
        PhaseSelect.disabled = true;
        PhaseSelect.value = "";
      } else {
        PhaseSelect.disabled = false;
      }
      break;

  }

  updateGoButton();
}

function getFullCSVPath() {
  let csvURL = `${ATON_BASE}/a/checK/data/${sessionStorage[SessionSelect.value].path}`;
  return csvURL;
}

async function updateCurrentData(sessionId, phaseId) {

  // Retrieve CSV
  let csvURL = getFullCSVPath();

  try {
    const response = await fetch(csvURL);

    if (!response.ok) {
      console.error(`No record for this data: ${csvURL} (HTTP ${response.status})`);
      currentData = [];
      return;
    }

    const csvText = await response.text();

    // Guard against HTML error pages returned with 200 status
    if (csvText.trimStart().startsWith("<")) {
      console.error(`No record for this data: ${csvURL} (received HTML instead of CSV)`);
      currentData = [];
      return;
    }

    // Parse CSV (handles commas inside quoted fields)
    const parseCSVRow = (row) => {
      const values = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') {
          if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === "," && !inQuotes) {
          values.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      values.push(current);
      return values;
    };

    const rows = csvText.trim().split("\n");
    const headers = parseCSVRow(rows[0]);
    const data = rows.slice(1).map(row => {
      const values = parseCSVRow(row);
      let obj = {};
      headers.forEach((header, index) => { obj[header] = values[index]; });
      return obj;
    });

    currentData = data;

  } catch (error) {
    console.error("No record for this data:", error);
    currentData = [];
  }
}

async function displayCurrentData(sessionId, phaseId) {

  console.log(`Displaying data for session ${sessionId}, phase ${phaseId}`);

  await updateCurrentData(sessionId, phaseId);

  if (currentData && currentData.length != 0) {
    document.getElementById("alertContainer").style.display = "none";
    document.getElementById("selectContainer").style.display = "none";
    document.getElementById("dataContainer").style.display = "flex";

    // Filter data for the selected phase
    if (phaseId) currentData = currentData.filter(row => row.currentPhase === String(phaseId));

    // Update Merkhet immersive visualization
    updateMerkhetFrame(sessionId, phaseId);

    // Update other UI elements with the current data
    updateUI(phaseId);

    console.log(currentData);
  } else {
    document.getElementById("alertContainer").style.display = "flex";
    document.getElementById("dataContainer").style.display = "none";
    console.log("No record for this data");
  }

  // let lastRecord = currentData.at(-1)

  // console.log(`Data for session ${sessionId}, phase ${phaseId}:`, currentData);


}

function updateMerkhetFrame(sessionId, phaseId) {
  let phaseSceneId = protocolConfigStorage[`${sessionStorage[sessionId].group},${sessionStorage[sessionId].measure}`]["phase"][phaseId].sceneID;
  let recordId = currentData[0].mkid;

  let merkhetIFrame = document.getElementById("MerkhetContainer");
  merkhetIFrame.onload = () => {
    const win = merkhetIFrame.contentWindow;
    const doc = win.document;
    if (doc.getElementById("userToolbar")) doc.getElementById("userToolbar").style.display = "none";
    if (doc.getElementById("sideToolbar")) doc.getElementById("sideToolbar").style.display = "none";
    const observer = new win.MutationObserver(() => {
      const infoTimeLine = doc.getElementsByClassName("merkhet-timeline-info")[0];
      if (infoTimeLine) {
        infoTimeLine.style.display = "none";
        observer.disconnect();
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
  };
  merkhetIFrame.src = `${ATON_BASE}/a/merkhet/index.html?s=check-user%2F${phaseSceneId}&r=${recordId}`;
}

function updateUI(phaseId) {
  console.log(`Updating UI for phase ${phaseId}`);

  const isTaskNTest = configStorage["template"] === "Task 'n Test";

  // Phase name + total phases (always shown)
  let referenceProtocol = protocolConfigStorage[`${sessionStorage[SessionSelect.value].group},${sessionStorage[SessionSelect.value].measure}`]["phase"];
  let totalPhases = Object.keys(referenceProtocol).filter(k => k != "0").length;
  let phaseName   = referenceProtocol[phaseId]?.name || "";

  $("#ref-subject").text(SubjectSelect.value);
  $("#ref-group").text(sessionStorage[SessionSelect.value].group);
  $("#ref-measure").text(sessionStorage[SessionSelect.value].measure);
  $("#ref-phase").text(`${phaseId}/${totalPhases}`);
  $("#ref-phase-name").text(`Phase ${phaseId}: ${phaseName}`);
  $("#ref-duration").text(currentData.at(-1).timeStamp);
  $("#download-data-btn-session").attr("href", getFullCSVPath());

  const nextPhaseBtn = document.getElementById("next-phase-btn");
  if (nextPhaseBtn) {
    nextPhaseBtn.disabled = (PhaseSelect.selectedIndex >= PhaseSelect.options.length - 1);
  }

  const merkhetCol = document.getElementById("merkhet-col");
  const iframe     = document.getElementById("MerkhetContainer");

  if (isTaskNTest) {

    // Task-specific stats
    let count_correct     = currentData.filter(row => row.is_selection_correct === "true").length;
    let count_incorrect   = currentData.filter(row => row.is_selection_correct === "false").length;
    let count_repetitions = 0;
    currentData.forEach(row => {
      if (row["next_action"] && row["next_action"].includes("Repeat phase")) count_repetitions += 1;
    });
    $("#ref-correct").text(count_correct);
    $("#ref-incorrect").text(count_incorrect);
    $("#ref-repetitions").text(count_repetitions);

    document.getElementById("task-stat-correct").style.removeProperty("display");
    document.getElementById("task-stat-rep-row").style.removeProperty("display");
    document.getElementById("duration-row").className = "d-flex";

    // Merkhet col-7 left, timeline visible
    merkhetCol.className = "col-md-7 col-sm-12";
    merkhetCol.style.cssText = "";
    iframe.style.cssText = "height: 50vh;";
    iframe.style.setProperty("width", "100%", "important");
    document.getElementById("timeline-col").style.removeProperty("display");

    
    document.getElementById("merkhet-timeline-row").classList.remove("mt-4");
    document.getElementById("btn-row").classList.remove("mt-4");

    renderTimeline();

  } else {

    // Only duration, centered in the stats box
    // Use setProperty("important") to override Bootstrap d-flex !important on these elements
    document.getElementById("task-stat-correct").style.setProperty("display", "none", "important");
    document.getElementById("task-stat-rep-row").style.setProperty("display", "none", "important");
    document.getElementById("duration-row").className = "d-flex justify-content-center";

    // Merkhet full-width col, iframe centered via margin:auto at 58.33% width
    merkhetCol.className = "col-12 text-center";
    merkhetCol.style.cssText = "";
    iframe.style.cssText = "display: block; margin: 0 auto; height: 50vh;";
    iframe.style.setProperty("width", "58.33%", "important");
    document.getElementById("timeline-col").style.setProperty("display", "none", "important");
    document.getElementById("btn-row").style.marginTop = "1.5rem";

  }
}

function renderTimeline() {
  const container = document.getElementById("timeline");
  if (!container) return;

  let repCount = 0, corrCount = 0, wrongCount = 0;
  container.innerHTML = "";

  currentData.forEach((row, i) => {
    const correct = row.is_selection_correct === "true";
    const last    = i === currentData.length - 1;

    if (correct) corrCount++; else wrongCount++;
    if (row.next_action && row.next_action.includes("Repeat phase")) repCount++;

    const cls     = correct ? "correct" : "wrong";
    const icon    = correct ? "bi-check-circle-fill" : "bi-x-circle-fill";
    const label   = correct ? "Correct" : "Wrong";
    const comment = row.comment || "";

    container.innerHTML += `
      <div class="tl-spine">
        <i class="bi ${icon} tl-marker ${cls}"></i>
        <div class="tl-line${last ? " last" : ""}"></div>
      </div>
      <div class="tl-cell">
        <div class="tl-card ${cls}">
          <div class="tl-row1">
            <span class="tl-status ${cls}">${label}</span>
            <span class="tl-row-comment">${comment ? `<span class="tl-comment">${comment}</span>` : ""}</span>
          </div>
          <div class="tl-row2">
            <span class="tl-counter tl-counter-rep"><i class="bi bi-arrow-repeat"></i> <b>${repCount}</b></span>
            <span class="tl-counter tl-counter-corr"><i class="bi bi-check-lg"></i> <b>${corrCount}</b></span>
            <span class="tl-counter tl-counter-wrong"><i class="bi bi-x-lg"></i> <b>${wrongCount}</b></span>
            <span class="tl-spacer"></span>
            <span class="tl-ts-inline">${row.timeStamp || ""}</span>
            <span class="tl-next">→ ${row.next_action || ""}</span>
          </div>
        </div>
      </div>`;
  });

  requestAnimationFrame(initCommentExpanders);
}

function initCommentExpanders() {
  document.querySelectorAll('#timeline .tl-comment').forEach(el => {
    if (el.scrollWidth > el.offsetWidth) {
      const row = el.closest('.tl-row-comment');
      const btn = document.createElement('button');
      btn.className = 'tl-toggle-comment';
      btn.textContent = '[...]';
      btn.addEventListener('click', () => {
        const isExpanded = row.classList.toggle('expanded');
        btn.textContent = isExpanded ? '[↑ chiudi]' : '[...]';
      });
      row.appendChild(btn);
    }
  });
}

function resetDataView() {
  document.getElementById("dataContainer").style.display = "none";
  document.getElementById("alertContainer").style.display = "none";
  document.getElementById("selectContainer").style.display = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToNextPhase() {
  if (PhaseSelect.selectedIndex < PhaseSelect.options.length - 1) {
    PhaseSelect.selectedIndex = PhaseSelect.selectedIndex + 1;
    updateGoButton();
    displayCurrentData(SessionSelect.value, PhaseSelect.value);
  }
}