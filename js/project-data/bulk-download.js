const RECORDS_STORAGE_ID = "session/records";

let sessionStorage;
let projectData = [];

async function getProjectSessions(projectId) {
    const records = await ATON.App.getStorage(RECORDS_STORAGE_ID) || {};
    return records[projectId] || {};
}

function getSessionFullCSVPath(session) {
    let csvURL = `${ATON_BASE}/a/checK/data/${sessionStorage[session].path}`;
    return csvURL;
}

async function loadSessionData(session) {

    // Initialise session
    let currentData = [];

    // Retrieve CSV
    let csvURL = getSessionFullCSVPath(session);

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

    return currentData;
}

// Main call to load all the data of the
// project inside "projectData"
window.addEventListener("load", async () => {
    sessionStorage = await getProjectSessions(getIdFromURL());
    for (const [session, value] of Object.entries(sessionStorage)) {
        let sessionData = await loadSessionData(session);
        if (sessionData) {
            sessionData.forEach((record) => {
                record.sessionID = session;
                record.subjectID = value.subjectID;
                record.group = value.group;
                record.measure = value.measure;
                record.path = getSessionFullCSVPath(session);
                projectData.push(record);
            });
        }
    }

    console.log("=====");
    console.log(projectData);
});

function writesCSVfromArray(array) {
    if (!array.length) return "";
    const escapeField = (val) => {
        const str = val === undefined || val === null ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
    };
    const priority = ["sessionID", "subjectID", "group", "measure", "timeStamp"];
    const rest = Object.keys(array[0]).filter(k => !priority.includes(k));
    const headers = [...priority, ...rest];
    const rows = array.map(obj => headers.map(h => escapeField(obj[h])).join(","));
    return [headers.join(","), ...rows].join("\n");
}

// Interaction with the UI (from button)
function bulkDownload() {
    const csv = writesCSVfromArray(projectData);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getIdFromURL()}_bulk.csv`;
    a.click();
    URL.revokeObjectURL(url);
}