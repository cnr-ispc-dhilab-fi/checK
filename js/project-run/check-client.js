// ATON/wapps/check/js/project-run/check-client.js

// --------------------------------
// Shared with project setup client

const SERVER_BASE = "http://localhost:3001";

// ATON App setup
let app = ATON.App.realize(false);
app.requireFlares(["check-flare"]);

let checkFlare = null;

// Storage IDs used in ATON.App storage  getIdFromURL
const PROJECTS_STORAGE_ID = "user-projects/projects";                     // list of projects

// =================================
// SERVER FUNCTIONS FOR PROJECT FORM
// =================================

// Helper to build a storage id for the asset library of a given project
function getProject3DAssetsStorageId(projectId) {
  return `user-projects/${projectId}/upload/upload`;
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

  ATON.on("AllFlaresReady", () => {
    console.log("All flares ready");

    checkFlare = ATON.getFlare("check");
    console.log("Check flare:", checkFlare);

    // Remove 3D view if not needed
    const view3D = document.getElementById("idView3D");
    if (view3D) view3D.remove();
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

// --------------------------------

async function updateGMSelect() { 

  projectId = getIdFromURL()

  const configStorage = await ATON.App.getStorage(getProjectConfigStorageId(projectId));

  let selectGroupEl = document.getElementById("selectGroup");
  for (let i = 1; i <= parseInt(configStorage["groups"]); i++) {
    selectGroupEl.insertAdjacentHTML("beforeend", `<option value="${i}">Group ${i}</option>`);
  }

  let selectMeasureEl = document.getElementById("selectMeasure");
  for (let i = 1; i <= parseInt(configStorage["repeatedMeasures"]); i++) {
    selectMeasureEl.insertAdjacentHTML("beforeend", `<option value="${i}">Repeated Measure ${i}</option>`);
  }
}

