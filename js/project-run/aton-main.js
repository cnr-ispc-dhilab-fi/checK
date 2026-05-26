// Extract scene ID for URL
const params = new URLSearchParams(window.location.search);
const subject = params.get("sc");
const s_id = `${params.get("sid")}`;
const role = params.get("r");

let currentPov = [] // initialise current pos for main button

let mkId;

let aton_actions = {};

let APP = ATON.App.realize();

APP.setup = () => {
    // Realize base ATON and add base UI events
    ATON.realize();
    ATON.UI.addBasicEvents();

    // Load the scene
    ATON.App.loadScene(s_id, async () => {

        // Multi-user with Photon
        ATON.Photon.connect();

        console.log(protocolConfigStorage);

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

            // Register _onConnected before any await so it is never missed
            ATON.Photon._onConnected = () => {
                ATON.Photon.fireEvent("triggerAlert", subject);
            };

            // Show welcome modal: fetch protocol config to check if training phase exists
            await updateStorageObjects();
            const hasIntro = phasesObj[0] !== false;
            ATON.UI.showModal({
                header: "Welcome!",
                body: ATON.UI.createContainer({
                    items: hasIntro ? [
                        ATON.UI.elem(`<p>Thank you for participating in this project.</p>`),
                        ATON.UI.elem(`<p>You can move in the space via <i style="font-weight: bold">teleport</i>: point with the controller on the floor and a white disk will appear. Confirm your destination with the trigger of the controller to move</p>`),
                        ATON.UI.elem(`<img class="img-fluid" src="../img/navigation.png"/>`)
                    ] : [
                        ATON.UI.elem(`<p>Thank you for participating in this project.</p>`),
                        ATON.UI.elem(`<p>The tester will now provide you with the instructions to begin the experiment.</p>`)
                    ]
                })
            });

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
                    confirmButtonColor: "var(--bs-primary)",
                    allowOutsideClick: false,
                    allowEscapeKey: false
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
                window.parent.console.log(window.parent.startCaptureDataChunk({ mkid: mkId }));
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
                let mkgid = evtData.sid.replace("/", "-");
                let kaptoPars = `mk.hub=https://interlumo.ispc.cnr.it/kapto/&mk.freq=200&mk.attr=pos,dir&mk.dur=900&mk.gid=${mkgid}`;
                let appendixURLSearch = `id=${getIdFromURL()}&sc=${subject}&${kaptoPars}`;
                window.location.href = `scene.html?sid=${evtData.sid}&r=1&${appendixURLSearch}`;
            }
        });

        ATON.Photon.on("showIntroModal", (boolParams) => {
            if (role != 1) return;

            if (boolParams.hasIntro) {
                ATON.UI.showModal({
                    header: "Welcome!",

                    body: ATON.UI.createContainer({
                        items: [
                        ATON.UI.elem(`<p>Thank you for participating in this project.</p>`),
                        ATON.UI.elem(`<p>You can move in the space via <i style="font-weight: bold">teleport</i>: point with the controller on the floor and a white disk will appear. Confirm your destination with the trigger of the controller to move</p>`)
            ]
        })
    });
            } else {
                ATON.UI.showModal({
                    header: "Welcome!",

                    body: ATON.UI.createContainer({
                        items: [
                        ATON.UI.elem(`<p>Thank you for participating in this project. Wait for your tester's instructions.</p>`),
            ]
        })
    });
            }
            
        });

        // 4. Request Home POV

        ATON.Photon.on("homePOV", () => {
            if (role == 1) {
                ATON.Nav.requestHomePOV();
            }
        });


        // 3. End experiment session, showing final modal [! TO ADAPT TO VR !]

        ATON.Photon.on("closeSession", () => {
            if (role == 1) {
                ATON.UI.showModal({
                    header: "The session is concluded",
                    body: ATON.UI.createContainer({
                        items: [ATON.UI.elem(`<p>Thank you for participating in the experiment. You can now give the material back to the tester</p>`)]
                    })
                });
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

        // 4A. Play animation
        ATON.Photon.on("requestPlayAnimation", () => {
            mainAnimationPlayRoutine();
        });

        // 4B. Stop animation
        ATON.Photon.on("requestStopAnimation", () => {
            mainAnimationStopRoutine();
        });

        window.parent.dispatchEvent(new CustomEvent('atonSceneReady'));

        stopMainAnimation();
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

function modalStopNavigation() {
    ATON.UI.showModal({
        header: "Wait! A selection was made",

        body: ATON.UI.createContainer({
            items: [
                ATON.UI.elem(`<p>Your selection has been sent to the tester, who will comment and register your progress.</p>`),
                ATON.UI.elem(`<div class="alert alert-danger" role="alert"> <b>Do not move until you are told to!</b> </div>`),
                ATON.UI.elem(`<p>The tester will inform you when you can proceed with your exploration</p>`)
            ]
        })
    });
}

// [!] Associate to VR controller trigger [!]
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        triggerModal();
        modalStopNavigation()
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

// 3 BIS Show customised modal for training

async function subjectWelcomeModal(params) {
    if (role == 0) {
        await ATON.Photon.fireEvent("showIntroModal", params);
    }
}

// 4. Request Home POV

function requestHomePOV() {
    if (role == 0) {
        ATON.Photon.fireEvent("homePOV", {});
    }
}

// 5. End-of-session modal for the tester

function endSessionModal() {
    if (role == 0) {
        ATON.Photon.fireEvent("closeSession", {});
    }
}


/* ----- TEMPLATE TO FIRE EVENTS FROM AND INSIDE IFRAME 

function cilecca() {
    console.log("cilecca");
    //ATON.Photon.fireEvent("gotoscene", { sid: "20260318-check-7151d5", r: 1 })
}

// iframediv.contentWindow.cilecca()  !!!!!!!!! 
// iframediv.contentWindow.window.parent.subjectTrigger

*/

/* Animation control */

function _waitForAnimations(callback) {
    let sNode = ATON.getSceneNode("main");
    if (!sNode || !sNode._aniMixers || sNode._aniMixers.length === 0) {
        setTimeout(() => _waitForAnimations(callback), 300);
        return;
    }
    sNode._aniMixers[0]._actions.forEach(action => {
        aton_actions[action._clip.name] = action;
    });
    callback();
}

function stopMainAnimation() {
    _waitForAnimations(() => {
        Object.values(aton_actions).forEach(a => a.stop());
    });
}

function mainAnimationPlayRoutine() {
    _waitForAnimations(() => {
        Object.values(aton_actions).forEach(a => {
            a.setLoop(THREE.LoopOnce, 1);
            a.clampWhenFinished = true;
            a.reset();
            a.play();
        });

        let sNode = ATON.getSceneNode("main");
        if (sNode && sNode._aniMixers && sNode._aniMixers.length > 0) {
            const mixer = sNode._aniMixers[0];
            mixer.addEventListener('finished', function onFinished() {
                mixer.removeEventListener('finished', onFinished);
                if (window.parent !== window) {
                    window.parent.dispatchEvent(new CustomEvent('animationFinished'));
                }
            });
        }
    });
}

function mainAnimationStopRoutine() {
    _waitForAnimations(() => {
        Object.values(aton_actions).forEach(a => a.stop());
    });
}

function playMainAnimation() {

    // Fire animation in the subject
    if (role == 0) {
        ATON.Photon.fireEvent("requestPlayAnimation", {});
    }

    // Reproduce also for the tester
    mainAnimationPlayRoutine();
}

function stopMainAnimation() {

    // Fire animation in the subject
    if (role == 0) {
        ATON.Photon.fireEvent("requestStopAnimation", {});
    }

    // Reproduce also for the tester
    mainAnimationStopRoutine();
}