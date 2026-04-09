// ===============================
// RUN-SPECIFIC URL HELPERS
// ===============================

function getRunIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("run");
}

function getGroupAndMeasureFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");
  console.log(subjStringAsArray)
  let group = subjStringAsArray[1].split("G")[1];
  console.log(group)
  let measure = subjStringAsArray[2].split("M")[1];
  return `${group},${measure}`;
}

function getSubjectIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");
  return subjStringAsArray[0];
}

// ===============================
// RETRIEVE DATA FROM STORAGE
// ===============================

let projectConfig;

let protocolConfigStorage;

let protocolMultimediaLibraryStorage;

let phasesObj;

let currenTemplate;

async function updateStorageObjects() {

  projectConfig                    = await ATON.App.getStorage(getProjectConfigStorageId(getIdFromURL()));
  console.log("DEBUG 0", projectConfig);
  protocolConfigStorage            = await ATON.App.getStorage(getProjectProtocolConfigStorageId(getIdFromURL()));
  protocolMultimediaLibraryStorage = await ATON.App.getStorage(getProjectProtocolAssetLibraryStorageId(getIdFromURL()));
  currentTemplate = projectConfig["template"];
  phasesObj       = protocolConfigStorage[getGroupAndMeasureFromURL()]["phase"];

};
