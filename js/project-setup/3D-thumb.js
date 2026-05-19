// 3D-thumb.js
// Script che SI OCCUPA SOLO di generare una thumbnail da un file GLB/GLTF
// Dipende da THREE e THREE.GLTFLoader già caricati in pagina

(function () {
  const THUMB_WIDTH = 512;
  const THUMB_HEIGHT = 512;

  let scene = null;
  let camera = null;
  let renderer = null;
  let loader = null;
  let currentModel = null;

  // Promise che rappresenta "renderer pronto"
  let readyResolve;
  const readyPromise = new Promise((resolve) => {
    readyResolve = resolve;
  });

  // -----------------------
  // INIZIALIZZA SOLO DOPO CHE ESISTE document.body
  // -----------------------
  function initThumbRenderer() {
    if (scene && camera && renderer && loader) {
      // già inizializzato
      return;
    }

    // Se per qualche motivo body non c'è ancora, riprova dopo DOMContentLoaded
    if (!document.body) {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          initThumbRenderer();
        },
        { once: true }
      );
      return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(
      45,
      THUMB_WIDTH / THUMB_HEIGHT,
      0.1,
      1000
    );

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(THUMB_WIDTH, THUMB_HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Lo metto fuori schermo, così non disturba la UI
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.left = "-9999px";
    document.body.appendChild(renderer.domElement);

    // Luci base
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.0);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const floorLight = new THREE.DirectionalLight(0xffffff, 0.5);
    floorLight.position.set(2, -1, 4);
    scene.add(floorLight);

    loader = new THREE.GLTFLoader();

    // segna come pronto
    readyResolve();
  }

  // avvia l’inizializzazione (se il body non c'è aspetterà DOMContentLoaded)
  initThumbRenderer();

  // -----------------------
  // Inquadrare automaticamente il modello
  // -----------------------
  function frameObject(object, camera) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Center the model at origin first, then build everything around (0,0,0)
    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.05;

    // Slightly above and behind so the floor is visible and lit
    camera.position.set(0, dist, dist * 0.35);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
  }

  // -----------------------
  // FUNZIONE PUBBLICA:
  //   genera una thumbnail a partire da un File (GLB/GLTF)
  //   restituisce Promise<{ blob, width, height }>
  // -----------------------
  async function generateGlbThumbnail(glbFile) {
    if (!glbFile) {
      throw new Error("Nessun file GLB fornito");
    }

    // aspetta che renderer/scene/camera siano pronti
    await readyPromise;

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(glbFile);

      // Se c'era un modello precedente, lo elimino
      if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose && m.dispose());
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

          const hasAnimation = Array.isArray(gltf.animations) && gltf.animations.length > 0;

          frameObject(currentModel, camera);
          renderer.render(scene, camera);

          renderer.domElement.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("Impossibile generare la thumbnail"));
              }

              resolve({
                blob,
                width: THUMB_WIDTH,
                height: THUMB_HEIGHT,
                hasAnimation,
              });
            },
            "image/png",
            1.0
          );
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url);
          console.error("Errore nel caricamento GLB/GLTF:", error);
          reject(error);
        }
      );
    });
  }

  // Espone la funzione globalmente
  window.generateGlbThumbnail = generateGlbThumbnail;
})();
