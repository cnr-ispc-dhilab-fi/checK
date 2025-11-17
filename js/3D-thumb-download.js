document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('gltfUpload');
    const uploadBtn = document.getElementById('uploadBtn');

    // --- Thumbnail settings ---
    const THUMB_WIDTH  = 512;
    const THUMB_HEIGHT = 512;

    // --- Three.js basic setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // sfondo bianco, cambia se vuoi

    const camera = new THREE.PerspectiveCamera(45, THUMB_WIDTH / THUMB_HEIGHT, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true  // importante per toDataURL()
    });
    renderer.setSize(THUMB_WIDTH, THUMB_HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Puoi mettere il canvas in un container nascosto se vuoi
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.left = '-9999px'; // fuori dallo schermo
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

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        // pulizia eventuale modello precedente...
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

        loader.load(
        url,
        (gltf) => {
            URL.revokeObjectURL(url);

            currentModel = gltf.scene;
            scene.add(currentModel);

            // inquadra il modello
            frameObject(currentModel, camera, renderer);

            // render singolo
            renderer.render(scene, camera);

            // nome per la thumbnail
            const thumbFilename = file.name.replace(/\.[^/.]+$/, '') + '_thumb.png';

            // QUI: inviamo sia il GLB che la thumbnail
            uploadModelAndThumbnail(file, renderer.domElement, thumbFilename);
        },
        undefined,
        (error) => {
            URL.revokeObjectURL(url);
            console.error('Errore nel caricamento GLB/GLTF:', error);
            alert('Impossibile caricare il modello. Controlla il file .glb/.gltf.');
        }
        );
    })

    // Centra e adatta la camera al bounding box dell'oggetto
    function frameObject(object, camera, renderer) {
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);

        // Distanza della camera per includere tutto l'oggetto
        let cameraZ = maxDim / (2 * Math.tan(fov / 2));
        cameraZ *= 1.4; // fattore di margine

        camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.2, center.z + cameraZ);
        camera.lookAt(center);

        camera.near = maxDim / 100;
        camera.far  = maxDim * 100;
        camera.updateProjectionMatrix();

        // Optionale: centra l'oggetto sull'origine
        const offset = center.clone().multiplyScalar(-1);
        object.position.add(offset);
    }


    function uploadModelAndThumbnail(glbFile, canvas, thumbFilename) {
    canvas.toBlob(function (thumbBlob) {
      const formData = new FormData();

      // il GLB originale → campo "glb"
      formData.append('glb', glbFile, glbFile.name);

      // la thumbnail → campo "thumb"
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

        console.log('Modello + thumbnail salvati:', data);

        // Esempio: puoi recuperare le URL complete
        // if (data.glb) {
        //   const glbUrl = 'http://localhost:3001' + data.glb.url;
        // }
        // if (data.thumb) {
        //   const thumbUrl = 'http://localhost:3001' + data.thumb.url;
        // }

        // Qui eventualmente aggiorni la tua struttura ATON / lista ambienti
      })
      .catch((err) => {
        console.error('Errore durante upload modello+thumbnail:', err);
        alert('Errore durante upload modello+thumbnail: ' + err.message);
      });
    }, 'image/png');
  }
});