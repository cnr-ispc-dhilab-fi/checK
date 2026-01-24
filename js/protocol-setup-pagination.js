// --- Global variables ---
const STORAGE_TRAINING_KEY = "hasTraining";

let globalCurrentStepIndex;
let globalCurrentPhaseIndex;
//  -----------------------

window.addEventListener('DOMContentLoaded', function() {

    importProjectInfo();

    if (getHasTraining() === undefined){
        document.getElementById("iconTraining").classList.remove("bi-check-circle");
    } else {
        if (!getHasTraining()) {
            document.getElementById("iconTraining").classList.remove("bi-check-circle"); 
            document.getElementById("iconTraining").classList.remove("bi-x-circle");
        }
    }

    queryParams = new URLSearchParams(window.location.search);
    
    const paramsObject = Object.fromEntries(queryParams);

    // The object has:
    // - p = Phase (training, phase 1 ...)
    // - s = Step (3D environment, media library)
    // - g = Group
    // - m = Repeated Measure
    // - t = Template: 0 = Free Wander, 1 = Task and Test

    goToCurrentPage(paramsObject);

    // populateCurrentPage(paramsObject);

    createEnvThumbModal();
});

function goToCurrentPage(paramsObject) {


    // *************************************
    // 1. SET PHASES STACK WITH CURRENT BUTTON
    // *************************************

    uploadContentInPhase(paramsObject);

    // ---------------------------------------

    // *************************************
    // 2. DISPLAY THE CORRECT STEP CONTAINER
    // *************************************

    // For the step (controlled by s param)
    let stepContainer = Array.from(document.querySelectorAll(".step-detail-container"));

    let currentPhaseIndex = parseInt(paramsObject['p']);
    let currentStepIndex = parseInt(paramsObject['s']); // To anticipate to handle difference in templates

    // You set tasks only in task and test (t = 1)
    if (parseInt(paramsObject['t']) == 0) {
        stepContainer[2].remove();
        stepContainer.splice(2, 1); // Remove from array (idx 3 becomes idx 2)
        if (currentStepIndex > 2) {
            currentStepIndex -= 1; // Update current step index
        }
    }

    // Initialise the containers
    stepContainer.forEach(div => {
        div.classList.add("step-container-hidden");
    });

    
    if (currentStepIndex === 1) {
        document.getElementById("thumb-and-analytics-div").style.display = "none";
    }
    // Display the correct step container
    stepContainer[currentStepIndex].classList.remove("step-container-hidden");

    // ---------------------------------------

    // ADD HERE TWO SIMPLE STATEMENTS TO UPDATE THE SELECT INPUTS FOR GROUP AND REPEATED MEASURE

    globalCurrentStepIndex = currentStepIndex; 
    globalCurrentPhaseIndex = currentPhaseIndex;
}


// ADD HERE THE CORRECT CONTENT UPLOAD FUNCTION

async function uploadContentInPhase(paramsObject) {

    // Access the phase stack
    let phaseStack = document.getElementById("phase-btn-container");
    
    console.log("======================")

    console.log(paramsObject)
    const protocolConfig = await importProjectProtocolConfig();
    
    const gmKey = `${parseInt(paramsObject['m'])},${parseInt(paramsObject['g'])}`;
    const noExistingPhases = Object.values(protocolConfig[gmKey]['phase']).length;

    // Iterate over the phase of the protocol set for reference measure and group
    for (let i = 0; i < Object.values(protocolConfig[gmKey]["phase"]).length; i++) {

        let currentPhase = Object.values(protocolConfig[gmKey]["phase"])[i];

        // Different button for training phase
        if (i === 0) {

            let divTrainingPhase = `
            <button type="button" class="btn btn-outline-primary w-100" onclick="updatePage({'p': 0, 's': 0})">
                Training <i id="iconTraining" class="bi bi-check-circle ml-2"></i></i>
            </button>
            <h4 class="text-center my-2">
                <i class="bi bi-chevron-compact-down"></i>
            </h4>
            `;

            phaseStack.insertAdjacentHTML('beforeend', divTrainingPhase);

        // Standard button for other phase
        } else {

            let divPhase = `
            <button type="button" class="btn btn-outline-primary w-100" onclick="updatePage({'p': ${i}, 's': 1})">
                ${currentPhase["name"]}
            </button>
            <h4 class="text-center my-2">
                <i class="bi bi-chevron-compact-down"></i>
            </h4>
            `;

            // console.log("Create new button for other phases ",Object.values(protocolConfig[gmKey]["phase"])[i]);

            phaseStack.insertAdjacentHTML('beforeend', divPhase);
        }
    }

    phaseStack.insertAdjacentHTML('beforeend',`
    <button type="button" class="btn btn-outline-primary w-100" id="btn-add-class" onclick="addNewPhase(${noExistingPhases})" disabled>
                <i class="bi bi-plus-circle"></i>
    </button>`);

    // Select button of current phase
    const buttons = Array.from(phaseStack.children).filter(child => child.tagName === 'BUTTON'); 
    let currentPhaseIndex = parseInt(paramsObject['p']);
    let currentButton = buttons[currentPhaseIndex];

    // Highlight correct button
    currentButton.classList.remove("btn-outline-primary");
    currentButton.classList.add("btn-phase-active");
    currentButton.classList.add("btn-primary");

}

// function updateStep...


function addNewPhase(noExistingPhases) {
    addPhaseToConfig(noExistingPhases);
    updatePage({'p': parseInt(noExistingPhases), 's': 1});
}

function deletePhase() {
    queryParams = new URLSearchParams(window.location.search);
    const paramsObject = Object.fromEntries(queryParams);
    
    deletePhaseFromConfig().then(success => {
        if (success) {
            updatePage({'p': parseInt(paramsObject['p']) - 1, 's': 1});
        } else {
            console.error("Failed to delete phase");
        }
    });
}

function updatePage(parObj) {

    queryParams = new URLSearchParams(window.location.search);
    paramsObject = Object.fromEntries(queryParams);

    for (const key in parObj) {
        paramsObject[key] = parObj[key];
    }

    const newQueryParams = new URLSearchParams(paramsObject);
    // Reload the page with the new parameters
    window.location.search = newQueryParams.toString();
}

// == MINOR ANCILLARY FUNCTIONS ==

// Add training phase
function setHasTraining(value) {
  // value: true/false
  localStorage.setItem(STORAGE_TRAINING_KEY, value ? "1" : "0");
}

function getHasTraining() {
  const v = localStorage.getItem(STORAGE_TRAINING_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null; // not chosen yet
}

// Handle modal environment card selection
async function createEnvThumbModal() {

    let envContainer = document.getElementById("environment-thumb-wrapper");

    renderEnvThumbForModal();
}

function highlightEnvironmentCard(e) {

    let envCards = document.getElementsByClassName("environment-thumb-cards");

    [...envCards].forEach(el => {
        el.classList.remove("environment-card-active");
        el.removeAttribute("id");
    });

    e.currentTarget.classList.add("environment-card-active");

    e.currentTarget.setAttribute("id", "chosen-environent");

}

function setPhaseEnvironment() {

    document.getElementById("thumb-and-analytics-div").style.display = "flex";

    let chosenEnv = document.getElementById("chosen-environent").querySelector('img').src;

    document.getElementById("thumb-step-env").querySelector('img').src = chosenEnv;
}

// --------
// Handle the asset upload
// --------

function adaptAssetUpload() {
    const selectValue = document.getElementById('assetTypeSelectGroup').value;
    const fileInput = document.getElementById('AssetUpload');
    const uploadBtn = document.getElementById('uploadAssetBtn');
    const textAreaContainer = document.getElementById('textAreaContainer');
    const textArea = document.getElementById('AssetTextArea');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    
    // Reset all inputs
    fileInput.value = '';
    textArea.value = '';
    currentUploadedAsset = null;
    
    // Hide everything first
    uploadBtn.style.display = 'none';
    textAreaContainer.style.display = 'none';
    filePreviewContainer.style.display = 'none';
    
    switch(selectValue) {
        case 'aud':
            fileInput.accept = '.mp3,.wav,.ogg,.m4a';
            fileInput.onchange = uploadAudioAssetForCurrentProject;
            uploadBtn.style.display = 'inline-flex';
            console.log('Asset upload set to: Audio');
            break;
            
        case 'img':
            fileInput.accept = '.jpg,.jpeg,.png,.gif,.webp';
            fileInput.onchange = uploadImageAssetForCurrentProject;
            uploadBtn.style.display = 'inline-flex';
            console.log('Asset upload set to: Image');
            break;
            
        case 'vid':
            fileInput.accept = '.mp4,.webm,.ogg,.mov';
            fileInput.onchange = uploadVideoAssetForCurrentProject;
            uploadBtn.style.display = 'inline-flex';
            console.log('Asset upload set to: Video');
            break;
            
        case 'txt':
            textAreaContainer.style.display = 'flex';
            console.log('Asset input set to: Text (textarea)');
            break;
            
        default:
            console.log('Please choose an asset type');
            break;
    }
}

let tempAssetsList = []; // Global temporary storage for assets before final save

async function saveUploadedAsset() {  
    const selectValue = document.getElementById('assetTypeSelectGroup').value;
    const projectId = getIdFromURL();
    
    const customName = document.getElementById('assetCustomName')?.value.trim();

    if (!selectValue || selectValue === "") {
        alert("Please select an asset format");
        return;
    }
    
    try {
        let assetData;
        const isEditing = !!window.currentEditingAssetId;
        
        if (selectValue === 'txt') {
            const textContent = document.getElementById('AssetTextArea').value;
            if (!textContent.trim()) {
                alert("Please enter some text");
                return;
            }
            
            // Use existing ID if editing, create new if adding
            const assetId = isEditing ? window.currentEditingAssetId : "text_" + Date.now();
            assetData = await saveTextAsset(projectId, assetId, textContent, "");
            
        } else {
            if (isEditing) {
                // If editing, use existing asset (file may not have changed)
                const library = await getAssetLibrary(projectId);
                assetData = library[window.currentEditingAssetId];
                
                if (!assetData) {
                    alert("Asset not found");
                    return;
                }
            } else {
                // If creating new, get the most recent uploaded file
                const library = await getAssetLibrary(projectId);
                const assets = Object.values(library);
                const type = selectValue === 'aud' ? 'audio' : 
                            selectValue === 'img' ? 'image' : 'video';
                const recentAssets = assets.filter(a => a.type === type);
                
                if (recentAssets.length === 0) {
                    alert("Please upload a file first");
                    return;
                }
                
                assetData = recentAssets[recentAssets.length - 1];
            }
        }
        
        if (customName) {
            assetData.customName = customName;
            
            // Update in library with custom name
            const storageId = getProjectProtocolAssetLibraryStorageId(projectId);
            const library = await ATON.App.getStorage(storageId) || {};
            if (library[assetData.id]) {
                library[assetData.id].customName = customName;
                await ATON.App.addToStorage(storageId, { [assetData.id]: library[assetData.id] });
            }
        }
        
        if (isEditing) {
            // UPDATE existing row in table
            updateAssetRowInTable(window.currentEditingAssetId, assetData);
            
            // Update in temp list
            const index = tempAssetsList.findIndex(a => a.id === window.currentEditingAssetId);
            if (index > -1) {
                tempAssetsList[index] = assetData;
            }
            
            console.log("Asset updated:", assetData);
            
            // Reset editing state
            window.currentEditingAssetId = null;
        } else {
            // ADD new to temporary list and table
            tempAssetsList.push(assetData);
            addAssetRowToTable(assetData);
            
            console.log("Asset added:", assetData);
        }
        
        // Reset form
        document.getElementById('assetTypeSelectGroup').value = "";
        document.getElementById('AssetTextArea').value = "";
        document.getElementById('AssetUpload').value = "";
        adaptAssetUpload();
        
    } catch (err) {
        console.error("Error:", err);
        alert("Error saving asset: " + err.message);
    }
}

// Counter for table rows
let assetRowCounter = 0;

function addAssetRowToTable(assetData) {
    console.log("Adding row for:", assetData);
    
    const tableWrapper = document.getElementById('media-table-wrapper');
    const tbody = tableWrapper.querySelector('tbody');
    
    // Show table wrapper if first item
    if (assetRowCounter === 0) {
        tableWrapper.style.display = 'block';
    }
    
    // Increment counter
    assetRowCounter++;
    
    // Determine icon based on asset type
    let iconClass = '';
    let fileName = '';
    let modalContent = '';
    let format = '';
    
    // const customName = document.getElementById('assetCustomName')?.value.trim();
    // Get custom name from assetData if exists, otherwise fallback to original filename
    const customName = assetData.customName || '';
    
    switch(assetData.type) {
        case 'text':
            iconClass = 'bi-file-earmark-text';
            fileName = customName || (assetData.content ? assetData.content.substring(0, 50) + '...' : 'Text asset');
            modalContent = assetData.content;
            format  = 'txt';
            break;
        case 'audio':
            iconClass = 'bi-music-note-beamed';
            fileName = customName || (assetData.audio ? assetData.audio.originalname : 'Audio file');
            modalContent = assetData.audio.originalname;
            format  = 'aud';
            break;
        case 'image':
            iconClass = 'bi-file-earmark-image';
            fileName = customName || (assetData.image ? assetData.image.originalname : 'Image file');
            modalContent = assetData.image.originalname;
            format  = 'img';
            break;
        case 'video':
            iconClass = 'bi-camera-video';
            fileName = customName || (assetData.video ? assetData.video.originalname : 'Video file');
            modalContent = assetData.video.originalname;
            format  = 'vid';
            break;
        default:
            iconClass = 'bi-file-earmark';
            fileName = customName || 'Unknown file';
    }
    
    // Get selected category from radio buttons
    const selectedRadio = document.querySelector('input[name="exampleRadios"]:checked');
    const category = selectedRadio ? selectedRadio.value : 'variable'; // default to 'variable'
    
    // Set badge text based on category
    const badgeText = category === 'instruction' ? 'Instruction' : 'Variable';
    
    // Create new row
    const newRow = document.createElement('tr');
    newRow.classList.add('row-asset');
    newRow.setAttribute('data-asset-id', assetData.id);
    
    newRow.innerHTML = `
        <th scope="row">${assetRowCounter}</th>
        <td><i class="bi ${iconClass}"></i></td>
        <td>${fileName}</td>
        <td><span class="badge rounded-pill bg-primary">${badgeText}</span></td>
        <td>
            <div class="btn-group btn-group-sm" role="group">
                <button 
                    type="button" 
                    class="btn" 
                    data-bs-toggle="modal" data-bs-target="#modalLibraryUpload" 
                    onclick="editAssetRowinModal('${assetData.id}', '${format}', '${fileName}', '${category}', '${modalContent}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button type="button" class="btn" onclick="deleteAssetRow('${assetData.id}')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </td>
    `;
    
    // Append to table
    tbody.appendChild(newRow);
    
    resetAssetModal()

    console.log(`Row added: #${assetRowCounter} - ${fileName} - ${badgeText}`);
}

function resetAssetModal() {
    // Reset select to default
    document.getElementById('assetTypeSelectGroup').value = "";
    
    // Clear custom name input
    document.getElementById('assetCustomName').value = "";
    
    // Clear file input
    document.getElementById('AssetUpload').value = "";
    
    // Clear textarea
    document.getElementById('AssetTextArea').value = "";
    
    // Reset radio to "variable" (first option)
    const variableRadio = document.querySelector('input[name="exampleRadios"][value="variable"]');
    if (variableRadio) {
        variableRadio.checked = true;
    }
    
    // Hide all upload/preview containers
    document.getElementById('uploadAssetBtn').style.display = 'none';
    document.getElementById('filePreviewContainer').style.display = 'none';
    document.getElementById('textAreaContainer').style.display = 'none';
    
    // Reset current uploaded asset
    currentUploadedAsset = null;
    
    // Reset editing state
    window.currentEditingAssetId = null;
    
    console.log("Asset modal reset to default state");
}

// Edit asset row - fill modal fields with existing data
function editAssetRowinModal(id, format, filename, role, pathOrContent) {
    console.log("Editing asset:", id, format, filename, role, pathOrContent);
    
    // Store current editing asset ID
    window.currentEditingAssetId = id;
    
    // Set format select
    const assetTypeSelect = document.getElementById('assetTypeSelectGroup');
    assetTypeSelect.value = format;
    adaptAssetUpload(); // Trigger UI adaptation
    
    // Set custom filename
    document.getElementById('assetCustomName').value = filename;
    
    // Set role radio button
    const roleRadio = document.querySelector(`input[name="exampleRadios"][value="${role}"]`);
    if (roleRadio) {
        roleRadio.checked = true;
    }
    
    // Handle content based on format
    if (format === 'txt') {
        // Fill textarea with text content
        document.getElementById('AssetTextArea').value = pathOrContent;
    } else {
        // Show file preview for audio/image/video
        let iconClass = '';
        
        switch(format) {
            case 'aud':
                iconClass = 'bi-music-note-beamed';
                break;
            case 'img':
                iconClass = 'bi-file-image';
                break;
            case 'vid':
                iconClass = 'bi-camera-video';
                break;
        }
        
        // Extract filename from path
        const fileNameFromPath = pathOrContent.split('/').pop();
        
        showFilePreview(fileNameFromPath, iconClass);
    }
    
    console.log("Modal populated for editing");
}

// Update existing row in table
function updateAssetRowInTable(assetId, assetData) {
    const row = document.querySelector(`tr[data-asset-id="${assetId}"]`);
    
    if (!row) {
        console.error("Row not found for asset:", assetId);
        return;
    }
    
    // Determine icon and filename
    let iconClass = '';
    let fileName = '';
    
    // Get custom name from assetData if exists
    const customName = assetData.customName || '';
    
    switch(assetData.type) {
        case 'text':
            iconClass = 'bi-file-earmark-text';
            fileName = customName || (assetData.content ? assetData.content.substring(0, 50) + '...' : 'Text asset');
            break;
        case 'audio':
            iconClass = 'bi-music-note-beamed';
            fileName = customName || (assetData.audio ? assetData.audio.originalname : 'Audio file');
            break;
        case 'image':
            iconClass = 'bi-file-earmark-image';
            fileName = customName || (assetData.image ? assetData.image.originalname : 'Image file');
            break;
        case 'video':
            iconClass = 'bi-camera-video';
            fileName = customName || (assetData.video ? assetData.video.originalname : 'Video file');
            break;
        default:
            iconClass = 'bi-file-earmark';
            fileName = customName || 'Unknown file';
    }
    
    // Get selected category from radio buttons
    const selectedRadio = document.querySelector('input[name="exampleRadios"]:checked');
    const category = selectedRadio ? selectedRadio.value : 'variable';
    const badgeText = category === 'instruction' ? 'Instruction' : 'Variable';
    
    // Update icon
    const iconCell = row.querySelectorAll('td')[0];
    iconCell.innerHTML = `<i class="bi ${iconClass}"></i>`;
    
    // Update filename
    const titleCell = row.querySelectorAll('td')[1];
    titleCell.textContent = fileName;
    
    // Update category badge
    const categoryCell = row.querySelectorAll('td')[2];
    categoryCell.innerHTML = `<span class="badge rounded-pill bg-primary">${badgeText}</span>`;
    
    console.log("Row updated for asset:", assetId);
}

// Delete asset row
async function deleteAssetRow(assetId) {
    if (!confirm("Are you sure you want to delete this asset?")) {
        return;
    }
    
    const projectId = getIdFromURL();
    
    try {
        // Delete from server and library
        await deleteAsset(projectId, assetId);
        
        // Remove row from table
        const row = document.querySelector(`tr[data-asset-id="${assetId}"]`);
        if (row) {
            row.remove();
            assetRowCounter--;
            
            // Renumber rows
            renumberTableRows();
            
            // Hide table if empty
            if (assetRowCounter === 0) {
                document.getElementById('media-table-wrapper').style.display = 'none';
            }
        }
        
        // Remove from temp list if present
        const index = tempAssetsList.findIndex(a => a.id === assetId);
        if (index > -1) {
            tempAssetsList.splice(index, 1);
        }
        
        console.log("Asset deleted from table:", assetId);
        
    } catch (err) {
        console.error("Error deleting asset:", err);
        alert("Error deleting asset");
    }
}

// Renumber table rows after deletion
function renumberTableRows() {
    const tbody = document.querySelector('#media-table-wrapper tbody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
        row.querySelector('th').textContent = index + 1;
    });
}

// --------

function unlockNewPhase() {
    document.getElementById("btn-add-class").disabled = false;
    document.getElementById("btn-set-tm").disabled = false;
    document.getElementById("selectGroup").disabled = false;
    document.getElementById("selectMeasure").disabled = false;
}