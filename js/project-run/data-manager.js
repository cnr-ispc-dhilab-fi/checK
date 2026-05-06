const RECORDS_STORAGE_ID = "session/records";

function generateSessionCode() {
    const arr = new Uint8Array(3);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createSessionRecord(projectId, subjectId, group, measure) {
    const sessionCode = generateSessionCode();

    const patch = {
        [projectId]: {
            [sessionCode]: {
                subjectID: subjectId,
                group:     group,
                measure:   measure
            }
        }
    };

    await ATON.App.addToStorage(RECORDS_STORAGE_ID, patch);

    return sessionCode;
}

window.createSessionRecord = createSessionRecord;

window.addEventListener('DOMContentLoaded', async function() {
    if (new URLSearchParams(window.location.search).get("run")) {
        await updateStorageObjects();
    }
});
