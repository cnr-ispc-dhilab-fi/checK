// ===============================
// SESSION CODE URL HELPER
// ===============================

function getSessionCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("sc");
}

// ===============================
// RECORDS.JSON LOOKUP (via ATON storage)
// ===============================

async function getSessionRecord(sessionCode) {
  const records = await ATON.App.getStorage(RECORDS_STORAGE_ID) || {};
  for (const pid of Object.keys(records)) {
    if (records[pid][sessionCode]) {
      return { projectId: pid, ...records[pid][sessionCode] };
    }
  }
  return null;
}

// ===============================
// SESSION ACCESSORS (from sessionRecord)
// ===============================

let sessionRecord = null;

function getGroupAndMeasure() {
  return `${sessionRecord.group},${sessionRecord.measure}`;
}

function getSubjectID() {
  return sessionRecord.subjectID;
}

// ===============================
// RETRIEVE DATA FROM STORAGE
// ===============================

let projectConfig;
let protocolConfigStorage;
let protocolMultimediaLibraryStorage;
let phasesObj;
let currentTemplate;

async function updateStorageObjects() {
  const sc = getSessionCodeFromURL();
  sessionRecord = await getSessionRecord(sc);

  const projectId = sessionRecord.projectId;
  const gm        = getGroupAndMeasure();

  projectConfig                    = await ATON.App.getStorage(getProjectConfigStorageId(projectId));
  protocolConfigStorage            = await ATON.App.getStorage(getProjectProtocolConfigStorageId(projectId));
  protocolMultimediaLibraryStorage = await ATON.App.getStorage(getProjectProtocolAssetLibraryStorageId(projectId));
  currentTemplate                  = projectConfig["template"];
  phasesObj                        = protocolConfigStorage[gm]["phase"];
}
