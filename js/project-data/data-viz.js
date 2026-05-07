// Update main storages
const RECORDS_STORAGE_ID = "session/records";

let configStorage;
let protocolConfigStorage;
let sessionStorage;

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




