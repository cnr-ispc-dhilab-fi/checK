# Cultural Heritage Expeirments Configuration Kit (checK)

This repository contains the material of **checK** (Cultural Heritage Experiment Configuration Kit), an ATON-based web app to costumise experiments on 3D cultural heritage environment designed and developed by CNR ISPC, DHILab - Florence.

![check logo](img/logo-full.png)

## Instructions

### Installation

1. Create your instance of [ATON Framework repository](https://github.com/phoenixbf/aton)
2. Add the following flares for checK in `[your main aton instance]/config/flares/`
    - [check-flare](https://github.com/cnr-ispc-dhilab-fi/check-flare)
    - [merkhet](https://github.com/phoenixbf/merkhet-plugin)
    - [kapto](https://github.com/phoenixbf/kapto) 
3. Add the following webapps in `[your main aton instance]/webapps/`
    - checK, cloning this repository
    - [merkhet](https://github.com/phoenixbf/merkhet-app) (*)
4. Create the following subfolders to host models and scenes 
    - `[your main aton instance]/data/collections/check-user`
    - `[your main aton instance]/data/scenes/check-user`

(*) To properly set-up the Kapto Hub in Merkhet, add at `[your main aton instance]/webapps/merkhet/` the file `config.json`:

```
{
    "capturehub": "https://interlumo.ispc.cnr.it/kapto/"
}
```

### Deployment

1. Open terminal in your main ATON instance and run `npm run deploy-pm2`. 
2. Access the main dashboard for testers (curators, psychologist) at https://localhost:8080/a/checK
3. Access the onboarding page for tested subjects at https://localhost:8080/a/checK/welcome/
4. Visualise immersive analythics with Merkhet, as indicated in the web-app repository and shown in this [sample link](http://localhost:8080/a/merkhet/?s=check-user%2F20260317-check-5382f1)
 
## Acknowledgment

This project received funding from:
- H2IOSC Project - Humanities and cultural Heritage Italian Open Science Cloud, funded by European Union – NextGenerationEU – NRRP M4C2 - Project code IR0000029 - CUP B63C22000730005;
- PERCEIVE Project - Perceptive Enhanced Realities of Colored collEctions through AI and Virtual Experiences, funded by the European Union under grant agreement Nr. 101061157;
- COLOURS Project - Collaborative On-cloud Lab for the conservation and digital restoration of ColOUred heritage collectionS, funded by the European Union under grant agreement Nr. 101233413;
- CHANGES Foundation - Cultural Heritage Active Innovation for Next Gen Sustainable Society, funded by European Union – NextGenerationEU – NRRP M4C2 - UP B83D22001210006;
- Swiss Government Excellence Scholarship No. 2025.0089.
