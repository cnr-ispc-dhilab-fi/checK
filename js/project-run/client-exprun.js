// ATON/wapps/checK/js/project-run/client-exprun.js
// Experiment-run specific client — requires check-client.js

app.setup = () => {
  ATON.realize();

  ATON.on("AllFlaresReady", async () => {
    console.log("All flares ready");

    checkFlare = ATON.getFlare("check");
    console.log("Check flare:", checkFlare);

    const view3D = document.getElementById("idView3D");

    if (!needs3D) {
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

// ===============================
// RUN-SPECIFIC URL HELPERS
// ===============================

function getRunIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("run");
}

function getGroupAndMeasureFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");
  let group = subjStringAsArray[1].split("G")[1];
  let measure = subjStringAsArray[2].split("M")[1];
  return `${group},${measure}`;
}

function getSubjectIDFromURL() {
  const params = new URLSearchParams(window.location.search);
  let subjStringAsArray = params.get("run").split("-");
  return subjStringAsArray[0];
}
