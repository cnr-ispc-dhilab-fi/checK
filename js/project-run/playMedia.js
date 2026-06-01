/**
 * playMedia.js
 * Self-contained media player for checK experiment scenes.
 *
 * Exposes:  window.playMedia(assetName)   - resolves asset from protocolMultimediaLibraryStorage,
 *                                           then plays/shows it in web (Bootstrap modal) or VR
 *                                           (spatial panel following the user).
 *           window.stopPlayMedia()        - stops audio and removes VR panel.
 *
 * Supported types: text | image | audio | video
 * Combinations:    text + image  (asset has both .content and .image)
 *                  text + video  (asset has both .content and .video)
 * Audio-only: plays without any visual feedback.
 *
 * VR panel replicates the setUserSUI / removeUserSUI / updateLoop pattern from
 * aldrovandi/main.js, rewriting all suiBuilder and positioning dependencies
 * inline so this file is completely self-contained.
 *
 * Include AFTER session-manager.js (which defines protocolMultimediaLibraryStorage
 * and SERVER_BASE):
 *   <script src="../js/project-run/playMedia.js"></script>
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /** VR positioning constants – mirror setUserSUI in main.js */
    var FORWARD_FACTOR = 0.8;
    var LEFT_FACTOR    = 0.0;
    var UP_FACTOR      = -0.1;

    /** VR panel sizes (metres) */
    var TEXT_PLANE_W  = 1.0;
    var TEXT_PLANE_H  = 0.28;
    var MEDIA_PLANE_W = 0.9;
    var MEDIA_PLANE_H = 0.55;
    var PANEL_GAP     = 0.04;

    /** Canvas2D settings for VR text planes */
    var CANVAS_W         = 1024;
    var CANVAS_H         = 256;
    var CANVAS_FONT_SIZE = 28;
    var CANVAS_BG        = 'rgba(18,18,18,0.88)';
    var CANVAS_COLOR     = '#ffffff';
    var CANVAS_PADDING   = 48;
    var CANVAS_RADIUS    = 28;

    // =========================================================================
    // INTERNAL STATE
    // =========================================================================

    /** THREE.Group currently shown in VR */
    var _vrPanel = null;

    /** rAF id for the VR follow-loop */
    var _vrRafId = null;

    /** Reused <audio> element (never recreated – avoids garbage) */
    var _audioEl = null;

    // =========================================================================
    // DEVICE / SESSION HELPERS  (same logic as main.js APP.isVR_Device / isVR_Running)
    // =========================================================================

    function _isVRDevice() {
        var mobileAndTabletCheck = function () {
            var check = false;
            (function (a) {
                if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) ||
                    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
                    check = true;
                }
            })(navigator.userAgent || navigator.vendor || window.opera);
            return check;
        };
        return ('xr' in window.navigator && !mobileAndTabletCheck());
    }

    function _isVRRunning() {
        return !!(typeof ATON !== 'undefined' && ATON.XR && ATON.XR._bPresenting);
    }

    // =========================================================================
    // RAF HELPERS  (XR-session-aware – mirrors getRequestAnimationFrame in main.js)
    // =========================================================================

    function _getRAF() {
        return (typeof ATON !== 'undefined' && ATON.XR && ATON.XR.currSession)
            ? ATON.XR.currSession.requestAnimationFrame.bind(ATON.XR.currSession)
            : window.requestAnimationFrame;
    }

    function _cancelRAF(id) {
        if (typeof ATON !== 'undefined' && ATON.XR && ATON.XR.currSession) {
            ATON.XR.currSession.cancelAnimationFrame(id);
        } else {
            cancelAnimationFrame(id);
        }
    }

    // =========================================================================
    // ASSET RESOLVER
    // =========================================================================

    /**
     * Find an asset entry in protocolMultimediaLibraryStorage by its id key
     * or by its customName field.
     *
     * protocolMultimediaLibraryStorage is declared with `let` at the top level
     * of client-exprun.js.  Top-level `let` is NOT a property of window, so we
     * read it directly from the global lexical scope.  window._pmLibOverride
     * is the escape hatch used by the test bootstrap to inject a library when
     * no live session is running.
     */
    function _resolveAsset(assetName) {
        var lib = null;
        // 1. The real variable from client-exprun.js (let-scoped, not on window)
        try {
            if (typeof protocolMultimediaLibraryStorage !== 'undefined') {
                lib = protocolMultimediaLibraryStorage;
            }
        } catch (e) { /* script not loaded */ }
        // 2. Test-injection escape hatch
        if (!lib) lib = window._pmLibOverride || null;
        if (!lib) {
            console.warn('[playMedia] protocolMultimediaLibraryStorage is not available yet.');
            return null;
        }
        // Direct key match
        if (lib[assetName]) return lib[assetName];
        // customName match
        var keys = Object.keys(lib);
        for (var i = 0; i < keys.length; i++) {
            if (lib[keys[i]].customName === assetName) return lib[keys[i]];
        }
        return null;
    }

    /**
     * Resolve a media URL to an absolute URL that can be fetched safely.
     *
     * Rules:
     *  1. Already absolute (http/https) → return as-is.
     *  2. Page is served over HTTPS → always use window.location.origin so
     *     the browser never makes a Mixed Content request to the upload server.
     *  3. Page is served over HTTP (local dev) → prefer SERVER_BASE if defined
     *     (the checK upload server), fall back to window.location.origin.
     *
     * The ATON server serves the root  data/  directory at  /  , so root-relative
     * paths like  /user-projects/…  resolve correctly when the media files are
     * stored under  data/user-projects/  in the ATON workspace.
     */
    function _assetURL(relUrl) {
        if (!relUrl) return '';
        if (/^https?:\/\//i.test(relUrl)) return relUrl;       // already absolute
        var base;
        if (window.location.protocol === 'https:') {
            base = window.location.origin;                      // always HTTPS – no Mixed Content
        } else {
            base = (typeof SERVER_BASE !== 'undefined' && SERVER_BASE)
                ? SERVER_BASE                                   // local HTTP dev
                : window.location.origin;
        }
        return base + (relUrl.charAt(0) === '/' ? '' : '/') + relUrl;
    }

    // =========================================================================
    // ASSET TYPE HELPERS
    // =========================================================================

    function _hasText(asset) {
        return asset.type === 'text' ||
            (typeof asset.content === 'string' && asset.content.trim().length > 0);
    }
    function _hasImage(asset) {
        return !!(asset.image && asset.image.url);
    }
    function _hasVideo(asset) {
        return !!(asset.video && asset.video.url);
    }
    function _hasAudio(asset) {
        return !!(asset.audio && asset.audio.url);
    }

    // =========================================================================
    // AUDIO  (reused element – avoids garbage creation)
    // =========================================================================

    function _playAudio(url) {
        if (!_audioEl) {
            _audioEl = document.createElement('audio');
        } else {
            _audioEl.pause();
            _audioEl.src = '';
        }
        _audioEl.src = url;
        _audioEl.load();
        _audioEl.play().catch(function (e) {
            console.warn('[playMedia] audio autoplay blocked:', e);
        });
    }

    function _stopAudio() {
        if (_audioEl) {
            _audioEl.pause();
            _audioEl.src = '';
        }
    }

    // =========================================================================
    // VR – CANVAS2D TEXT PLANE
    // Replaces suiBuilder.createLabel (which requires ThreeMeshUI, not loaded
    // in the checK scene) with a plain Three.js plane + CanvasTexture.
    // =========================================================================

    function _roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function _wrapText(ctx, text, cx, startY, maxW, lineH) {
        var words = text.split(' ');
        var line  = '';
        var lines = [];
        for (var i = 0; i < words.length; i++) {
            var test = line + words[i] + ' ';
            if (ctx.measureText(test).width > maxW && i > 0) {
                lines.push(line.trimEnd());
                line = words[i] + ' ';
            } else {
                line = test;
            }
        }
        lines.push(line.trimEnd());
        var totalH = lines.length * lineH;
        var y = startY - totalH / 2 + lineH / 2;
        for (var j = 0; j < lines.length; j++) {
            ctx.fillText(lines[j], cx, y);
            y += lineH;
        }
    }

    function _makeTextMesh(text, planeW, planeH) {
        var canvas  = document.createElement('canvas');
        canvas.width  = CANVAS_W;
        canvas.height = CANVAS_H;
        var ctx = canvas.getContext('2d');

        // Background with rounded corners
        ctx.fillStyle = CANVAS_BG;
        _roundRectPath(ctx, 0, 0, CANVAS_W, CANVAS_H, CANVAS_RADIUS);
        ctx.fill();

        // Text
        ctx.fillStyle   = CANVAS_COLOR;
        ctx.font        = 'bold ' + CANVAS_FONT_SIZE + 'px "DM Sans", "Segoe UI", sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'alphabetic';
        var lineH = CANVAS_FONT_SIZE * 1.45;
        _wrapText(ctx, text, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W - CANVAS_PADDING * 2, lineH);

        var tex  = new THREE.CanvasTexture(canvas);
        var geo  = new THREE.PlaneGeometry(planeW, planeH);
        var mat  = new THREE.MeshBasicMaterial({
            map:         tex,
            transparent: true,
            side:        THREE.DoubleSide,
            depthTest:   false,
            depthWrite:  false
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 999;
        return mesh;
    }

    // =========================================================================
    // VR – IMAGE PLANE  (async: returns Promise<Mesh|null>)
    // =========================================================================

    function _makeImageMesh(url, planeW, planeH) {
        return new Promise(function (resolve) {
            var loader = new THREE.TextureLoader();
            loader.load(url, function (tex) {
                var geo  = new THREE.PlaneGeometry(planeW, planeH);
                var mat  = new THREE.MeshBasicMaterial({
                    map:         tex,
                    transparent: true,
                    side:        THREE.DoubleSide,
                    depthTest:   false,
                    depthWrite:  false
                });
                var mesh = new THREE.Mesh(geo, mat);
                mesh.renderOrder = 999;
                resolve(mesh);
            }, undefined, function (err) {
                console.warn('[playMedia] image load error:', err);
                resolve(null);
            });
        });
    }

    // =========================================================================
    // VR – VIDEO PLANE  (VideoTexture – no garbage creation on repeated calls)
    // =========================================================================

    function _makeVideoMesh(url, planeW, planeH) {
        var vid = document.createElement('video');
        vid.src         = url;
        vid.crossOrigin = 'anonymous';
        vid.loop        = false;
        vid.muted       = false;
        vid.load();
        vid.play().catch(function (e) {
            console.warn('[playMedia] video autoplay blocked:', e);
        });

        var tex  = new THREE.VideoTexture(vid);
        var geo  = new THREE.PlaneGeometry(planeW, planeH);
        var mat  = new THREE.MeshBasicMaterial({
            map:       tex,
            side:      THREE.DoubleSide,
            depthTest: false,
            depthWrite:false
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 999;
        mesh._vidEl      = vid;   // keep reference for disposal
        return mesh;
    }

    // =========================================================================
    // VR – PANEL CLEANUP  (mirrors APP.removeUserSUI)
    // =========================================================================

    function _removeVRPanel() {
        // Cancel follow-loop
        if (_vrRafId !== null) {
            _cancelRAF(_vrRafId);
            _vrRafId = null;
        }
        // Dispose all Three.js resources
        if (_vrPanel) {
            _vrPanel.traverse(function (obj) {
                if (obj._vidEl) {
                    obj._vidEl.pause();
                    obj._vidEl.src = '';
                }
                if (obj.geometry)  obj.geometry.dispose();
                if (obj.material) {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            });
            if (_vrPanel.parent) _vrPanel.parent.remove(_vrPanel);
            _vrPanel = null;
        }
    }

    // =========================================================================
    // VR – FOLLOW-USER LOOP  (mirrors updateLoop inside APP.setUserSUI)
    // Keeps the group positioned FORWARD_FACTOR metres ahead, LEFT_FACTOR
    // metres to the left, and UP_FACTOR metres above the user's eye position,
    // always facing the user.
    // =========================================================================

    function _startFollowLoop(group) {
        var raf = _getRAF();

        function loop() {
            if (!_vrPanel) return; // panel was removed

            var nav = typeof ATON !== 'undefined' && ATON.Nav;
            if (!nav || !nav._currPOV) { _vrRafId = raf(loop); return; }

            var userPos = nav._currPOV.pos.clone();
            var userDir = nav._vDir.clone().normalize();
            var worldUp = new THREE.Vector3(0, 1, 0);
            var left    = new THREE.Vector3().crossVectors(worldUp, userDir).normalize();

            var pos = userPos.clone()
                .add(userDir.clone().multiplyScalar(FORWARD_FACTOR))
                .add(left.clone().multiplyScalar(LEFT_FACTOR))
                .add(worldUp.clone().multiplyScalar(UP_FACTOR));

            group.position.copy(pos);
            group.lookAt(userPos);

            _vrRafId = raf(loop);
        }

        _vrRafId = raf(loop);
    }

    // =========================================================================
    // VR – SHOW PANEL  (mirrors APP.setUserSUI extended for image/video)
    // =========================================================================

    function _showVRPanel(asset) {
        _removeVRPanel();

        var hasTxt = _hasText(asset);
        var hasImg = _hasImage(asset);
        var hasVid = _hasVideo(asset);
        var hasAud = _hasAudio(asset);

        // Audio-only: play silently, no spatial panel
        if (hasAud && !hasTxt && !hasImg && !hasVid) {
            _playAudio(_assetURL(asset.audio.url));
            return;
        }

        // Build a Three.Group as the panel root (same role as label in setUserSUI)
        var group = new THREE.Group();

        // ---- layout offsets ----
        // When text and media (image/video) are combined, stack text above media.
        var textY  = 0;
        var mediaY = 0;
        if (hasTxt && (hasImg || hasVid)) {
            textY  =  MEDIA_PLANE_H / 2 + PANEL_GAP + TEXT_PLANE_H / 2;
            mediaY = 0;
        }

        if (hasTxt) {
            var textContent = asset.content || asset.customName || '';
            var textMesh    = _makeTextMesh(textContent, TEXT_PLANE_W, TEXT_PLANE_H);
            textMesh.position.set(0, textY, 0);
            group.add(textMesh);
        }

        if (hasImg) {
            _makeImageMesh(_assetURL(asset.image.url), MEDIA_PLANE_W, MEDIA_PLANE_H)
                .then(function (mesh) {
                    if (!mesh || !_vrPanel) return; // panel may have been removed
                    mesh.position.set(0, mediaY, 0);
                    group.add(mesh);
                });
        }

        if (hasVid) {
            var vidMesh = _makeVideoMesh(_assetURL(asset.video.url), MEDIA_PLANE_W, MEDIA_PLANE_H);
            vidMesh.position.set(0, mediaY, 0);
            group.add(vidMesh);
        }

        // If there is also audio alongside visuals, play it too
        if (hasAud) {
            _playAudio(_assetURL(asset.audio.url));
        }

        // Attach to ATON scene root and start follow-loop
        ATON.getRootScene().add(group);
        _vrPanel = group;
        _startFollowLoop(group);
    }

    // =========================================================================
    // WEB – BOOTSTRAP MODAL
    // =========================================================================

    function _ensureModal() {
        var id = 'pmMediaModal';
        var el = document.getElementById(id);
        if (el) return el;

        el = document.createElement('div');
        el.id        = id;
        el.className = 'modal fade';
        el.setAttribute('tabindex', '-1');
        el.setAttribute('aria-labelledby', 'pmMediaModalLabel');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML =
            '<div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<h5 class="modal-title" id="pmMediaModalLabel"></h5>' +
                        '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
                    '</div>' +
                    '<div class="modal-body" id="pmMediaModalBody" style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;"></div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(el);
        return el;
    }

    function _buildWebBody(asset) {
        var hasTxt = _hasText(asset);
        var hasImg = _hasImage(asset);
        var hasVid = _hasVideo(asset);
        var hasAud = _hasAudio(asset);

        // Audio-only → play and return null (no modal)
        if (hasAud && !hasTxt && !hasImg && !hasVid) {
            _playAudio(_assetURL(asset.audio.url));
            return null;
        }

        var frag = document.createDocumentFragment();

        if (hasImg) {
            var img = document.createElement('img');
            img.src       = _assetURL(asset.image.url);
            img.className = 'img-fluid';
            img.style.cssText = 'max-height:55vh;border-radius:8px;object-fit:contain;';
            frag.appendChild(img);
        }

        if (hasVid) {
            var vid = document.createElement('video');
            vid.src      = _assetURL(asset.video.url);
            vid.controls = true;
            vid.autoplay = true;
            vid.style.cssText = 'max-width:100%;max-height:55vh;border-radius:8px;';
            frag.appendChild(vid);
        }

        if (hasTxt) {
            var p = document.createElement('p');
            p.textContent  = asset.content || '';
            p.style.cssText = 'margin:0;text-align:center;white-space:pre-wrap;';
            frag.appendChild(p);
        }

        // Also play audio if present alongside visuals
        if (hasAud) {
            _playAudio(_assetURL(asset.audio.url));
        }

        return frag;
    }

    function _showWebModal(asset) {
        var body = _buildWebBody(asset);
        if (!body) return; // audio-only handled inside _buildWebBody

        var title = asset.customName || asset.id || 'Media';

        // Prefer ATON.UI.showModal if available (keeps checK's native modal style)
        if (typeof ATON !== 'undefined' && ATON.UI && typeof ATON.UI.showModal === 'function') {
            var wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1rem;';
            wrapper.appendChild(body);
            ATON.UI.showModal({ header: title, body: wrapper });
            return;
        }

        // Bootstrap 5 fallback (bootstrap is loaded in scene.html)
        var modalEl = _ensureModal();
        document.getElementById('pmMediaModalLabel').textContent = title;
        var bodyEl = document.getElementById('pmMediaModalBody');
        bodyEl.innerHTML = '';
        bodyEl.appendChild(body);

        if (typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * playMedia(assetName)
     *
     * Looks up the asset by id or customName in protocolMultimediaLibraryStorage,
     * then:
     *  - In VR  → builds a spatial panel that follows the user's position.
     *  - In Web → opens a Bootstrap modal.
     *  - Audio-only → plays audio without any visual feedback (both modes).
     */
    window.playMedia = function (assetName) {
        _stopAudio();
        _removeVRPanel();

        var asset = _resolveAsset(assetName);
        if (!asset) {
            console.warn('[playMedia] asset not found: "' + assetName + '"');
            return;
        }

        if (_isVRDevice() && _isVRRunning()) {
            _showVRPanel(asset);
        } else {
            _showWebModal(asset);
        }
    };

    /**
     * stopPlayMedia()
     *
     * Stops any playing audio and removes the active VR panel.
     */
    window.stopPlayMedia = function () {
        _stopAudio();
        _removeVRPanel();
    };

}());
