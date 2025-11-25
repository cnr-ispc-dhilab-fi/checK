let app = ATON.App.realize(false);

// Richedi il flare "check" - The name of the flare folder!
app.requireFlares(["check-flare"]);

let checkFlare = null;

app.setup = () => {
  
  // Realizza l'app, rimuovendo la view 3D non necessaria 
    ATON.realize();
  
  // aspetto che TUTTI i flares siano pronti
    ATON.on("AllFlaresReady", () => {
        console.log("Flares ready!");

        // ora posso recuperare il flare
        checkFlare = ATON.getFlare("check");
        console.log("Check flare:", checkFlare);

        document.getElementById("idView3D").remove();


    });
};

// ADD LE MIE FUNZIONI 