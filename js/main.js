window.onload = (event) => {
  console.log("page is fully loaded");
};

function manageFormSections(display_state) {
    var sectionIdx = window.location.href.split("q=")[1];
    let sectionArray = document.getElementsByClassName("new-project-form-section");
    sectionArray[sectionIdx].style.display = display_state;
}