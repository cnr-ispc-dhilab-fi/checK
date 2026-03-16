// ATON/wapps/check/js/project-run/check-client.js

// --------------------------------
// Shared with project setup client

const SERVER_BASE = "http://localhost:3001";
// ATON main server — serves 3D models and thumbnails from data/collections/
const ATON_BASE = "http://localhost:8080";

// ATON App setup
let app = ATON.App.realize(false);
app.requireFlares(["check-flare"]);

let checkFlare = null;

// Storage IDs used in ATON.App storage  getIdFromURL
const PROJECTS_STORAGE_ID = "user-projects/projects";                     // list of projects

// =================================
// SERVER FUNCTIONS FOR PROJECT FORM
// =================================

// Helper to build a storage id for the 3D environments library of a given project
function getProject3DAssetsStorageId(projectId) {
  return `user-projects/${projectId}/environments`;
}

// Helper to build a storage id for the metadata (main config) of a given project
function getProjectConfigStorageId(projectId) {
  return `user-projects/${projectId}/config`;
}

// Helper to build a storage id for the protocol of a given project
function getProjectProtocolConfigStorageId(projectId) {
  return `user-projects/${projectId}/protocol/protocol-config`;
}

// Helper to build a storage id for the protocol of a given project
function getProjectProtocolAssetLibraryStorageId(projectId) {
  return `user-projects/${projectId}/protocol/asset/asset-library`;
}

app.setup = () => {
  ATON.realize();

  ATON.on("AllFlaresReady", async () => {
    console.log("All flares ready");

    checkFlare = ATON.getFlare("check");
    console.log("Check flare:", checkFlare);

    // A boolean variable added at the end of the body determines whether we need a 3D view or not
    const view3D = document.getElementById("idView3D");

    if(!needs3D) {

      // Remove 3D view if not needed
      if (view3D) view3D.remove();

    } else {

      const container = document.getElementById("ContainerView3D");
      container.appendChild(view3D);

      ATON.UI.addBasicEvents();
      
      await uploadScene(currentPhase);

      await updateRightPanel(currentPhase);
    }
  });
};

// Helper function

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getRunIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("run");
}

function getPhaseFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("p");
}

function getStepFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("s");
}

function getTemplateFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("t");
}

function getGroupFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("g");
}

function getMeasureFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("m");
}

function getGroupAndMeasureFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");
  let group = subjStringAsArray[1].split("G")[1];
  let measure = subjStringAsArray[2].split("M")[1];

  let gmString = `${group},${measure}`;

  return gmString;
}

function getSubjectIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");

  return subjStringAsArray[0];
}
// --------------------------------
