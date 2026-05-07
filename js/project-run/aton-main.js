// Extract scene ID for URL
const params = new URLSearchParams(window.location.search);
const subject = params.get("sc");
const s_id = `${params.get("sid")}`;
const role = params.get("r");

let currentPov = [] // initialise current pos for main button

let mkId;

let APP = ATON.App.realize();

APP.setup = () => {
    // Realize base ATON and add base UI events
    ATON.realize();
    ATON.UI.addBasicEvents();

    // Load the scene
    ATON.App.loadScene(s_id, () => {

        // Multi-user with Photon
        ATON.Photon.connect();

        // Set tester as invisible according to Role
        var isTester = role == 0;                   // Tester (Psycologist, Curator etc): r = 0
        ATON.Photon.bSendState = !isTester;         // Tester does not share the state of his avatar with others
        ATON.Photon.setAvatarsVisibility(isTester); // Subject (r = 1) share the state but cannot see the Tester

        // Customise according to Role
        if (role === "0") {       // Psychologist, Curator etc (Tester)

            // Set third-person navigation
            ATON.Nav.setOrbitControl();

        } else if (role === "1") { // Visitor, Participant, Patient etc (Subject)

            // Set first-person navigation
            ATON.Nav.setFirstPersonControl();

            // Notify tester when Photon connection is established
            ATON.Photon._onConnected = () => {
                ATON.Photon.fireEvent("triggerAlert", subject);
            };

        }

        // Update the Merkhet ID once Kapto establishes its session asynchronously
        ATON.Photon.on("KaptoSessionID", (sesid) => { mkId = sesid; });
        
        // ================================
        // == LISTENER FOR PHOTON EVENTS ==
        // ================================

        // TESTER AS LISTENER (RECEIVES EVENTS FROM SUBJECT)

        // 1. Update tester position (follows the subject from above)
        ATON.Photon.on("updateTesterPos", (newTesterPov) => {
            if (role == 0) {
                ATON.Nav.requestPOV(newTesterPov, 0.05);
            }
        });

        // 2. Show alert informing entrance of new participant
        ATON.Photon.on("triggerAlert", (subject) => {
            if (role == 0) {
                window.parent.Swal.fire({
                    title: `Participant ${subject} entered the scene`,
                    text: 'Everything is set! The experiment can now continue',
                    confirmButtonText: 'Start',
                    target: "body",
                    width: "50%",
                    confirmButtonColor: "var(--bs-primary)"
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (window.parent._timerCentiseconds > 0 || window.parent._timerRunning) window.parent.initTimer();
                        window.parent.startTimer();
                    }
                });
            }
        });

        // 3. Show modal in tester interface when subject clicks on the main button
        //    This also initialise the dataChunk, relying on getMerkhetID()
        ATON.Photon.on("showModal", (testerPov) => {
            if (role == 0) {
                window.parent.console.log(window.parent.startCaptureDataChunk({mkid : mkId}));
                let cover = ATON.Utils.takeScreenshotFromPOV(testerPov, 256);
                window.parent.subjectTrigger(cover);
                window.parent.console.log(cover.src);
                return cover.src;
            }
        });

        // SUBJECT AS LISTENER (RECEIVES EVENTS FROM TESTER)

        // 3. Load ATON scene in subject

        ATON.Photon.on("loadScene", (evtData) => {
            console.log("Internal debug 1");
            if (role == 1) {
                console.log("Internal debug 2");
                let mkgid = evtData.sid.replace("/","-");
                let kaptoPars = `mk.hub=https://interlumo.ispc.cnr.it/kapto/&mk.freq=200&mk.attr=pos,dir&mk.dur=900&mk.gid=${mkgid}`;
                let appendixURLSearch = `id=${getIdFromURL()}&sc=${subject}&${kaptoPars}`;
                window.location.href = `scene.html?sid=${evtData.sid}&r=1&${appendixURLSearch}`;
            }
        });


        // Chi manda messaggio
        // ATON.Photon.fireEvent("nameofevent",objectsended);
        // ATON.Photon.fireEvent("gotoscene",{sid: "20260318-check-7151d5", r: 1});

        /*
        ATON.Photon.on("gotoscene", (objectrecived) => {
            console.log("col coso");
            let kaptoPars = "mk.hub=https://interlumo.ispc.cnr.it/kapto/&mk.freq=200&mk.attr=pos,dir&mk.dur=900"
            let appendixURLSearch = `id=${getIdFromURL()}&run=${getRunIDFromURL()}&${kaptoPars}`;
            console.log(`scene.html?sid=${objectrecived.sid}&r=${objectrecived.r}${appendixURLSearch}`);
            //window.location.href = `scene.html?sid=${objectrecived.sid}&r=${objectrecived.r}${appendixURLSearch}`;
        });
        */

    });

}

// ========================
// == FIRE PHOTON EVENTS ==
// ========================

// TESTER AS LISTENER (RECEIVES EVENTS FROM SUBJECT)

// 1. Update position of the tester according subject's POV
function calibrateTesterPOV() {
    if (!ATON.Nav._currPOV) return undefined;
    let subjectPov = ATON.Nav.copyCurrentPOV();

    let newTesterPov = {
        fov: 50,
        pos: {
            x: subjectPov.pos.x,
            y: subjectPov.pos.y + 1.75,
            z: subjectPov.pos.z
        },
        target: subjectPov.pos,
        up: subjectPov.up
    };

    return newTesterPov;
}

function updatePos() {
    if (role == 1) {
        let pov = calibrateTesterPOV();
        if (pov) ATON.Photon.fireEvent("updateTesterPos", pov);
    }
}

setInterval(updatePos, 0.01);

// ------------------------------------------------

// 2. Send alert and modals to the tester

// [!] Associate to VR controller trigger [!]
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        triggerModal();
    }
});


function triggerModal() {    // Fire modal (use ancillary function to ensure correct position)
    if (role == 1) {
        ATON.Photon.fireEvent("showModal", calibrateTesterPOV());
    }
}

// ------------------------------------------------

// SUBJECT AS LISTENER (RECEIVES EVENTS FROM TESTER)

// 3. Load ATON scene in subject (called in: loadPhaseSubjectATONScene - session-manager.js)

async function subjectATONSceneLoader(params) {
    if (role == 0) {
        await ATON.Photon.fireEvent("loadScene", params);
    }
}

/* ----- TEMPLATE TO FIRE EVENTS FROM AND INSIDE IFRAME 

function cilecca() {
    console.log("cilecca");
    ATON.Photon.fireEvent("gotoscene", { sid: "20260318-check-7151d5", r: 1 })
}

// iframediv.contentWindow.cilecca()  !!!!!!!!! 
// iframediv.contentWindow.window.parent.subjectTrigger

*/
