# Cultural Heritage Expeirments Configuration Kit (checK)

This repository contains the material of checK, CNR ISPC _experiment planner_ i.e. an ATON-based web app to costumise experiments on 3D cultural heritage environment

1. Clone this repository in `[your main aton instance]/webapps/`. See main ATON Framework repository: https://github.com/phoenixbf/aton
2. Run the servers. Two separate servers are necessary to run the webapp
    - ATON Main Server (`npm start` on the main ATON directory)
    - Data Upload Server (`/checK/server/upload-server.js`). To call it, open a new Terminal on the 'checK' directory and run `cd server` and `npm start`
