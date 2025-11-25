// --- constants / helpers ---
const SECTION_CLASS = "new-project-form-section";
const STORAGE_KEY = "isTaskTest"; // to persist between page loads

function getSectionIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  const n = Number(params.get("n"));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  const n = Number(params.get("id"));
  return n;
}

function setIsTaskTest(value) {
  // value: true/false
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
}

function getIsTaskTest() {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null; // not chosen yet
}

// --- UI ---
function uploadCurrentSection(currentSection, currentIndex) {

  // show current section
  currentSection.style.display = "flex";

  const isTaskTest = getIsTaskTest();

  if (currentIndex === 0) {
    $("#sect-title").text("Start your new project");
    $("#sect-label").text("Choose the template that best meets your needs");
    $("#form-buttons").addClass("hidden-important"); // hide nav on first screen
  } else {
    $("#form-buttons").removeClass("hidden-important");

    if (isTaskTest === true) {
      $("#sect-title").text("Task 'n Test Project Setup");
    } else if (isTaskTest === false) {
      $("#sect-title").text("Free Wander Project Setup");
    } else {
      // fallback if user jumped straight to later steps
      $("#sect-title").text("Project Setup");
    }

    console.log("CURRENT INDEX:", currentIndex);

    if (currentIndex === 3) {
      $("#form-button-1").text("Done");
    }
  }
}

// --- init on load ---
window.onload = () => {
  const sectionArray = document.getElementsByClassName(SECTION_CLASS);

  // hide all
  for (let i = 0; i < sectionArray.length; i++) {
    sectionArray[i].style.display = "none";
  }

  const sectionIdx = getSectionIndexFromURL();
  const currentSection = sectionArray[sectionIdx] || sectionArray[0];

  uploadCurrentSection(currentSection, Number(sectionIdx));
};

// --- navigation ---
function goToFormSections(isForward, chosenTemplate = null) {
  const currentIdx = getSectionIndexFromURL();
  const nextIdx = isForward ? currentIdx + 1 : currentIdx - 1;

  const projectId = getIdFromURL()

  if ((currentIdx === 3) & (isForward)) {
    window.location.href = `project-summary.html?id=${projectId}`;
  } else {
      // store template choice (so we still know it after redirect)
      if (chosenTemplate === "task") {
        setIsTaskTest(true);
      } else if (chosenTemplate === "free") {
        setIsTaskTest(false);
      }

      // clamp to 0 at least
      const safeNextIdx = Math.max(0, nextIdx);
      window.location.href = `project-form.html?id=${projectId}&n=${safeNextIdx}`;
  }
}