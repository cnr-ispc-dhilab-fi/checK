document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('gltfUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const cardsContainer = document.getElementById('new-project-upload');

    const THUMB_WIDTH  = 512;
    const THUMB_HEIGHT = 512;

    // -----------------------
    // 1) SCENA THREE.JS "NASCOSTA"
    // -----------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
        45,
        THUMB_WIDTH / THUMB_HEIGHT,
        0.1,
        1000
    );

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(THUMB_WIDTH, THUMB_HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.left = '-9999px';
    document.body.appendChild(renderer.domElement);

    // Luci base
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const loader = new THREE.GLTFLoader();
    let currentModel = null;

    // -----------------------
    // 2) FUNZIONI PER upload.json
    // -----------------------

    // Legge l'intero upload.json e restituisce un oggetto { id: {glb, thumb}, ... }
    async function readUploadJson() {
        try {
            const response = await fetch('http://localhost:3001/files/upload.json');

            if (!response.ok) {
                console.warn("upload.json non trovato, restituisco {}");
                return {};
            }

            const json = await response.json();
            return json;
        } catch (err) {
            console.warn("Errore leggendo upload.json, restituisco {}:", err);
            return {};
        }
    }

    // Calcola il prossimo ID come length + 1
    async function getNextId() {
        const data = await readUploadJson();
        const length = Object.keys(data).length;
        const nextId = length + 1;
        console.log("Next ID:", nextId);
        return nextId;
    }

    // -----------------------
    // 3) UI: BOTTONE + FILE INPUT
    // -----------------------

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // 1) Calcolo nuovo ID
        const itemId = await getNextId();
        console.log('Nuovo itemId:', itemId);

        const url = URL.createObjectURL(file);

        // 2) Pulizia eventuale modello precedente
        if (currentModel) {
            scene.remove(currentModel);
            currentModel.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose && m.dispose());
                    } else {
                        obj.material.dispose && obj.material.dispose();
                    }
                }
            });
            currentModel = null;
        }

        // 3) Carico il GLB e genero thumbnail + upload + card
        loader.load(
            url,
            async (gltf) => {
                URL.revokeObjectURL(url);

                currentModel = gltf.scene;
                scene.add(currentModel);

                frameObject(currentModel, camera, renderer);
                renderer.render(scene, camera);

                const thumbFilename = file.name.replace(/\.[^/.]+$/, '') + '_thumb.png';

                // Upload modello + thumbnail + ID
                await uploadModelAndThumbnail(file, renderer.domElement, thumbFilename, itemId);

                // Dopo l'upload, aggiorno l'interfaccia con la nuova card
                await appendCard(itemId);
            },
            undefined,
            (error) => {
                URL.revokeObjectURL(url);
                console.error('Errore nel caricamento GLB/GLTF:', error);
                alert('Impossibile caricare il modello. Controlla il file .glb/.gltf.');
            }
        );
    });

    // -----------------------
    // 4) Inquadrare automaticamente il modello
    // -----------------------

    function frameObject(object, camera, renderer) {
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);

        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        cameraZ *= 1.4;

        camera.position.set(
            center.x + cameraZ,
            center.y + cameraZ * 0.2,
            center.z + cameraZ
        );
        camera.lookAt(center);

        camera.near = maxDim / 100;
        camera.far  = maxDim * 100;
        camera.updateProjectionMatrix();

        const offset = center.clone().multiplyScalar(-1);
        object.position.add(offset);
    }

    // -----------------------
    // 5) Upload glb + thumbnail + ID
    // -----------------------

    function uploadModelAndThumbnail(glbFile, canvas, thumbFilename, itemId) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(function (thumbBlob) {
                const formData = new FormData();

                // ID logico che useremo come chiave in upload.json
                formData.append('id', String(itemId));

                formData.append('glb', glbFile, glbFile.name);
                formData.append('thumb', thumbBlob, thumbFilename);

                fetch('http://localhost:3001/upload-model', {
                    method: 'POST',
                    body: formData
                })
                .then(async (res) => {
                    const text = await res.text();

                    if (!res.ok) {
                        console.error('Upload fallito:', res.status, text);
                        throw new Error('HTTP ' + res.status + ' - ' + text);
                    }

                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        console.warn('Risposta non JSON, testo:', text);
                        data = { raw: text };
                    }

                    console.log('Modello + thumbnail salvati, risposta server:', data);
                    resolve(data);
                })
                .catch((err) => {
                    console.error('Errore durante upload modello+thumbnail:', err);
                    alert('Errore durante upload modello+thumbnail: ' + err.message);
                    reject(err);
                });
            }, 'image/png');
        });
    }

    // -----------------------
    // 6) Appendere una card usando upload.json
    // -----------------------

    async function appendCard(id) {
        const uploadJSON = await readUploadJson();

        if (!uploadJSON[id]) {
            console.error("ID non trovato in upload.json:", id, uploadJSON);
            return;
        }

        if (!uploadJSON[id].thumb) {
            console.error("Nessuna thumb per ID:", id, uploadJSON[id]);
            return;
        }

        // Costruisco la URL assoluta della thumbnail
        const thumbUrl = "http://localhost:3001" + uploadJSON[id].thumb.url;
        console.log("Thumbnail URL per ID", id, ":", thumbUrl);

        const card_html = `
            <div class="col-md-3 col-sm-12 d-flex justify-content-center div-thumb-cards" id="div-thumb-card-${id}">
                <div class="card thumb-card">
                    <button class="thumb-close-btn" type="button" aria-label="Rimuovi" onclick="removeAsset(${id})">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <img src="${thumbUrl}" class="card-img-top glb-img" alt="thumbnail ambiente ${id}">
                </div>
            </div>
        `;

        // insertAdjacentHTML si aspetta una stringa
        cardsContainer.insertAdjacentHTML("beforeend", card_html);
    }

    // Espongo per debug/uso da console
    window.readUploadJson = readUploadJson;
    window.appendCard = appendCard;

    // -----------------------
    // 7) Ricostruisco le card esistenti subito dopo il load del DOM
    // -----------------------

    (async () => {
        const data = await readUploadJson();
        for (const id of Object.keys(data)) {
            await appendCard(id);
        }
    })();
});

async function removeAsset(id) {
    const confirmed = window.confirm(`Vuoi davvero rimuovere l'ambiente ${id}?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`http://localhost:3001/asset/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Errore nella cancellazione:', data);
            alert(data.message || 'Errore durante la cancellazione');
            return;
        }

        console.log('Asset cancellato:', data);

        // Rimuovi la card dal DOM
        const card = document.getElementById(`div-thumb-card-${id}`);
        if (card) {
            // card è la .card, ma è dentro una colonna; se vuoi togliere tutta la colonna:
            const col = card.closest('.div-thumb-cards');
            if (col && col.parentNode) {
                col.parentNode.removeChild(col);
            } else {
                // fallback: rimuovi solo la card
                card.parentNode.removeChild(card);
            }
        }
    } catch (err) {
        console.error('Errore di rete durante la cancellazione:', err);
        alert('Errore di rete durante la cancellazione');
    }
}

