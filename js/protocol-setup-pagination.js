function highlightEnvironmentCard(e) {

    let envCards = document.getElementsByClassName("environment-thumb-cards");

    [...envCards].forEach(el => {
        el.classList.remove("environment-card-active");
    });

    e.currentTarget.classList.add("environment-card-active");
}