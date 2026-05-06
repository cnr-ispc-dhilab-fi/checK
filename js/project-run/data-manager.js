const RECORDS_STORAGE_ID = "session/records";

// Create session ID

function generateSessionCode() {
    const arr = new Uint8Array(3);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createSessionRecord(projectId, subjectId, group, measure, extra = {}) {
    const sessionCode = generateSessionCode();

    const record = { subjectID: subjectId, group, measure };
    if (extra.age    != null) record.age    = extra.age;
    if (extra.gender != null) record.gender = extra.gender;

    const patch = { [projectId]: { [sessionCode]: record } };

    await ATON.App.addToStorage(RECORDS_STORAGE_ID, patch);

    return sessionCode;
}

window.createSessionRecord = createSessionRecord;
window.saveSessionCSV      = saveSessionCSV;

window.addEventListener('DOMContentLoaded', async function() {
    if (new URLSearchParams(window.location.search).get("sc")) {
        await updateStorageObjects();
    }
});

// Capture data chunks

// Save data into .CSV
async function saveSessionCSV(csvContent) {
    const sc        = getSessionCodeFromURL();
    const projectId = sessionRecord.projectId;

    const res = await fetch(`${SERVER_BASE}/session/${projectId}/${sc}/csv`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ csv: csvContent })
    });

    if (!res.ok) throw new Error(`saveSessionCSV failed: ${res.status}`);
    return res.json();
}