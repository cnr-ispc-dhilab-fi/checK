// ATON/wapps/checK/js/client-root.js
// Shared base — loaded by both project-setup and project-run pages

const SERVER_BASE = "http://localhost:3001";

// ATON main server — serves 3D models and thumbnails from data/collections/
const ATON_BASE = "http://localhost:8080";

// ATON App setup
let app = ATON.App.realize(false);

app.requireFlares(["check-flare", "merkhet"]);

let checkFlare = null;

// Storage IDs used in ATON.App storage
const PROJECTS_STORAGE_ID = "user-projects/projects";

// ===============================
// STORAGE ID HELPERS
// ===============================

function getProjectConfigStorageId(projectId) {
  return `user-projects/${projectId}/config`;
}

function getProject3DAssetsStorageId(projectId) {
  return `user-projects/${projectId}/environments`;
}

function getProjectProtocolConfigStorageId(projectId) {
  return `user-projects/${projectId}/protocol/protocol-config`;
}

function getProjectProtocolAssetLibraryStorageId(projectId) {
  return `user-projects/${projectId}/protocol/asset/asset-library`;
}

// ===============================
// URL HELPERS
// ===============================

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
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
