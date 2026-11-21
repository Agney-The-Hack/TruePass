/**
 * FacialRecognitionSDK (v2.0)
 * Reusable, embeddable client-side facial recognition engine for any website.
 * Powered by Face-API (TensorFlow.js) with 128-d deep metric face embeddings.
 */
(function (global) {
    'use strict';

    // Model CDN sources with failover
    const MODEL_URLS = [
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model',
        'https://raw.githubusercontent.com/vladmandic/face-api/master/model',
        'https://justadudewhohacks.github.io/face-api.js/models'
    ];

    const FACEAPI_CDNS = [
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js',
        'https://unpkg.com/@vladmandic/face-api@1.7.12/dist/face-api.js',
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    ];

    class FacialRecognitionSDK {
        constructor(config = {}) {
            this.config = Object.assign({
                modelUrl: null, // Custom model directory or null for CDN
                distanceThreshold: 0.55, // 0.40 (strict) to 0.65 (lenient)
                detector: 'tiny', // 'tiny' (faster, mobile friendly) or 'ssd' (higher accuracy)
                minConfidence: 0.5,
                enableLandmarks: true,
                autoDraw: false
            }, config);

            this.isInitialized = false;
            this.isLoading = false;
            this.matcher = null;
            this.enrolledPeople = new Map(); // name -> { role, descriptors: [], photo }
            this.videoStream = null;
            this.videoElement = null;
            this.activeDetectorOptions = null;
            this.listeners = {};
        }

        // Event listener system
        on(event, handler) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(handler);
            return this;
        }

        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(fn => {
                    try { fn(data); } catch (e) { console.error(e); }
                });
            }
        }

        // Ensure faceapi library script is present
        async _ensureLibraryLoaded() {
            if (global.faceapi) return true;

            for (const url of FACEAPI_CDNS) {
                try {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = url;
                        script.async = true;
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error(`Failed to load ${url}`));
                        document.head.appendChild(script);
                    });
                    if (global.faceapi) return true;
                } catch (err) {
                    console.warn(`CDN failed (${url}), trying next...`, err);
                }
            }
            throw new Error('Could not load Face-API library from CDNs. Please verify internet connection.');
        }

        /**
         * Initialize neural network models
         */
        async init(customModelUrl = null) {
            if (this.isInitialized) return true;
            if (this.isLoading) {
                return new Promise(resolve => this.on('ready', resolve));
            }
            this.isLoading = true;
            this.emit('loading', { status: 'Loading Face-API library...' });

            await this._ensureLibraryLoaded();

            const faceapi = global.faceapi;

            // Choose models path
            const candidateUrls = customModelUrl 
                ? [customModelUrl, ...MODEL_URLS] 
                : (this.config.modelUrl ? [this.config.modelUrl, ...MODEL_URLS] : MODEL_URLS);

            let modelsLoaded = false;
            let lastErr = null;

            for (const modelPath of candidateUrls) {
                try {
                    this.emit('loading', { status: `Loading neural networks from ${modelPath}...` });
                    await Promise.all([
                        this.config.detector === 'ssd'
                            ? faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath)
                            : faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
                    ]);
                    modelsLoaded = true;
                    console.log(`[FaceRecognitionSDK] Models loaded successfully from: ${modelPath}`);
                    break;
                } catch (e) {
                    lastErr = e;
                    console.warn(`Failed loading models from ${modelPath}:`, e.message);
                }
            }

            if (!modelsLoaded) {
                this.isLoading = false;
                this.emit('error', { error: lastErr });
                throw new Error(`Failed to load neural models: ${lastErr?.message || 'Network error'}`);
            }

            // Detector settings
            this.activeDetectorOptions = this.config.detector === 'ssd'
                ? new faceapi.SsdMobilenetv1Options({ minConfidence: this.config.minConfidence })
                : new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: this.config.minConfidence });

            this.isInitialized = true;
            this.isLoading = false;
            this.emit('ready', { initialized: true });
            return true;
        }

        setThreshold(val) {
            this.config.distanceThreshold = Math.max(0.2, Math.min(0.9, parseFloat(val)));
            this.rebuildMatcher();
        }

        /**
         * Enroll a person with a facial descriptor vector
         */
        enrollPerson(name, descriptors, metadata = {}) {
            if (!name || !name.trim()) throw new Error('Person name is required.');
            const key = name.trim();
            const descList = Array.isArray(descriptors) ? descriptors : [descriptors];
            
            // Convert to Float32Array
            const normalized = descList.map(d => (d instanceof Float32Array ? d : new Float32Array(d)));

            if (this.enrolledPeople.has(key)) {
                const existing = this.enrolledPeople.get(key);
                existing.descriptors.push(...normalized);
                if (metadata.photo) existing.photo = metadata.photo;
                if (metadata.role) existing.role = metadata.role;
            } else {
                this.enrolledPeople.set(key, {
                    name: key,
                    role: metadata.role || '',
                    photo: metadata.photo || '',
                    descriptors: normalized
                });
            }

            this.rebuildMatcher();
            this.emit('enrolled', { name: key, totalSamples: this.enrolledPeople.get(key).descriptors.length });
            return true;
        }

        removePerson(name) {
            const key = name.trim();
            const deleted = this.enrolledPeople.delete(key);
            if (deleted) {
                this.rebuildMatcher();
                this.emit('person-removed', { name: key });
            }
            return deleted;
        }

        clearAllEnrolled() {
            this.enrolledPeople.clear();
            this.matcher = null;
            this.emit('enrolled-cleared');
        }

        getEnrolledList() {
            return Array.from(this.enrolledPeople.values()).map(p => ({
                name: p.name,
                role: p.role,
                photo: p.photo,
                sampleCount: p.descriptors.length
            }));
        }

        /**
         * Rebuild FaceMatcher with current distance threshold
         */
        rebuildMatcher() {
            const faceapi = global.faceapi;
            if (!faceapi || this.enrolledPeople.size === 0) {
                this.matcher = null;
                return;
            }

            const labeledDescriptors = [];
            for (const [name, data] of this.enrolledPeople.entries()) {
                if (data.descriptors && data.descriptors.length > 0) {
                    labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, data.descriptors));
                }
            }

            if (labeledDescriptors.length > 0) {
                this.matcher = new faceapi.FaceMatcher(labeledDescriptors, this.config.distanceThreshold);
            } else {
                this.matcher = null;
            }
        }

        /**
         * Start webcam feed on a <video> element
         */
        async startCamera(videoElement, constraints = { width: 640, height: 480, facingMode: 'user' }) {
            this.videoElement = videoElement;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Webcam API is not supported in this browser. Please use HTTPS or localhost (e.g. http://localhost:8088).');
            }

            if (this.videoStream) {
                this.stopCamera();
            }

            let stream = null;
            // 1. Try with requested constraints
            try {
                let videoConfig = true;
                if (typeof constraints === 'object' && constraints !== null) {
                    videoConfig = {};
                    if (constraints.deviceId) videoConfig.deviceId = constraints.deviceId;
                    if (constraints.width) videoConfig.width = { ideal: constraints.width };
                    if (constraints.height) videoConfig.height = { ideal: constraints.height };
                    if (constraints.facingMode && !constraints.deviceId) videoConfig.facingMode = constraints.facingMode;
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConfig,
                    audio: false
                });
            } catch (errPref) {
                console.warn('[FaceSDK] Preferred constraints failed, falling back to basic video...', errPref);
                try {
                    // Fallback to basic { video: true } (solves OverconstrainedError)
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                } catch (errFallback) {
                    console.error('[FaceSDK] Camera access error:', errFallback);
                    if (errFallback.name === 'NotAllowedError' || errFallback.name === 'PermissionDeniedError') {
                        throw new Error('Camera access permission was denied. Please allow camera permissions in your browser URL bar.');
                    } else if (errFallback.name === 'NotFoundError' || errFallback.name === 'DevicesNotFoundError') {
                        throw new Error('No camera hardware was detected on this device.');
                    } else if (errFallback.name === 'NotReadableError' || errFallback.name === 'TrackStartError') {
                        throw new Error('Webcam is currently in use by another app. Please close other camera apps and retry.');
                    }
                    throw errFallback;
                }
            }

            this.videoStream = stream;
            videoElement.srcObject = stream;
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('muted', 'true');
            videoElement.muted = true;

            return new Promise((resolve) => {
                let resolved = false;
                const finish = () => {
                    if (resolved) return;
                    resolved = true;
                    try {
                        const playPromise = videoElement.play();
                        if (playPromise && typeof playPromise.catch === 'function') {
                            playPromise.catch(e => console.warn('[FaceSDK] Video play notice:', e));
                        }
                    } catch (e) {}
                    this.emit('camera-started', { video: videoElement, stream: stream });
                    resolve(videoElement);
                };

                if (videoElement.readyState >= 2) {
                    finish();
                } else {
                    videoElement.onloadedmetadata = finish;
                    setTimeout(finish, 1000);
                }
            });
        }

        stopCamera() {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            this.emit('camera-stopped');
        }

        /**
         * Extract face descriptor from an image, canvas, or video element
         */
        async extractDescriptor(inputSource) {
            await this.init();
            const faceapi = global.faceapi;

            const detection = await faceapi
                .detectSingleFace(inputSource, this.activeDetectorOptions)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                return null;
            }

            return {
                descriptor: detection.descriptor,
                box: detection.detection.box,
                landmarks: detection.landmarks,
                score: detection.detection.score
            };
        }

        /**
         * Recognize all faces in an input source (video frame, image, canvas)
         */
        async recognize(inputSource) {
            await this.init();
            const faceapi = global.faceapi;

            const detections = await faceapi
                .detectAllFaces(inputSource, this.activeDetectorOptions)
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (!detections || detections.length === 0) {
                return [];
            }

            const results = detections.map(det => {
                const box = det.detection.box;
                let match = { label: 'unknown', distance: 1.0 };

                if (this.matcher) {
                    const best = this.matcher.findBestMatch(det.descriptor);
                    match = {
                        label: best.label,
                        distance: best.distance
                    };
                }

                const isRecognized = match.label !== 'unknown';
                // Calculate human-friendly confidence percentage
                let confidencePercent = 0;
                if (isRecognized) {
                    const maxDist = this.config.distanceThreshold;
                    const normalized = Math.max(0, 1 - (match.distance / maxDist));
                    confidencePercent = Math.min(99, Math.round(50 + normalized * 49));
                } else {
                    confidencePercent = Math.round((1 - Math.min(1, match.distance)) * 100);
                }

                const personInfo = isRecognized ? this.enrolledPeople.get(match.label) : null;

                return {
                    box: {
                        x: box.x,
                        y: box.y,
                        width: box.width,
                        height: box.height
                    },
                    name: match.label,
                    role: personInfo ? personInfo.role : '',
                    distance: match.distance,
                    confidence: confidencePercent,
                    isRecognized: isRecognized,
                    score: det.detection.score,
                    landmarks: det.landmarks
                };
            });

            return results;
        }

        /**
         * Compare two faces directly (1-to-1 Verification)
         */
        async compareFaces(sourceA, sourceB) {
            await this.init();
            const [descA, descB] = await Promise.all([
                this.extractDescriptor(sourceA),
                this.extractDescriptor(sourceB)
            ]);

            if (!descA) throw new Error('No face detected in Image 1.');
            if (!descB) throw new Error('No face detected in Image 2.');

            const faceapi = global.faceapi;
            const distance = faceapi.euclideanDistance(descA.descriptor, descB.descriptor);
            const isMatch = distance <= this.config.distanceThreshold;
            const similarity = Math.max(0, Math.min(100, Math.round((1 - (distance / 1.2)) * 100)));

            return {
                isMatch,
                distance: parseFloat(distance.toFixed(4)),
                similarity,
                threshold: this.config.distanceThreshold
            };
        }

        /**
         * Draw high-tech bounding boxes, landmark points, and identity badges on a canvas
         */
        drawHUD(canvas, results, options = {}) {
            const ctx = canvas.getContext('2d');
            const showLandmarks = options.showLandmarks ?? this.config.enableLandmarks;
            const mirrored = options.mirrored || false;

            results.forEach(res => {
                let { x, y, width, height } = res.box;
                if (mirrored) {
                    x = canvas.width - (x + width);
                }

                const isKnown = res.isRecognized;
                const primaryColor = isKnown ? '#10b981' : '#f59e0b'; // Green or Amber
                const glowColor = isKnown ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

                ctx.save();

                // High-tech corner bracket box
                ctx.strokeStyle = primaryColor;
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 12;
                ctx.lineWidth = 2.5;

                const cornerSize = Math.min(width, height) * 0.22;

                // Rounded main bounding box (subtle)
                ctx.beginPath();
                ctx.strokeStyle = isKnown ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.3)';
                ctx.strokeRect(x, y, width, height);

                // Four Accent Corner Brackets (HUD style)
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 3.5;

                // Top-Left
                ctx.beginPath();
                ctx.moveTo(x, y + cornerSize);
                ctx.lineTo(x, y);
                ctx.lineTo(x + cornerSize, y);
                ctx.stroke();

                // Top-Right
                ctx.beginPath();
                ctx.moveTo(x + width - cornerSize, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + cornerSize);
                ctx.stroke();

                // Bottom-Left
                ctx.beginPath();
                ctx.moveTo(x, y + height - cornerSize);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x + cornerSize, y + height);
                ctx.stroke();

                // Bottom-Right
                ctx.beginPath();
                ctx.moveTo(x + width - cornerSize, y + height);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x + width, y + height - cornerSize);
                ctx.stroke();

                // Face Landmarks (optional dots)
                if (showLandmarks && res.landmarks) {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = isKnown ? '#34d399' : '#fbbf24';
                    const positions = res.landmarks.positions;
                    positions.forEach(pt => {
                        const px = mirrored ? canvas.width - pt.x : pt.x;
                        ctx.beginPath();
                        ctx.arc(px, pt.y, 1.5, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }

                // Identity Badge Banner
                const labelText = isKnown ? res.name.toUpperCase() : 'UNKNOWN';
                const subText = isKnown 
                    ? (res.role ? `${res.role} • ${res.confidence}%` : `CONFIDENCE: ${res.confidence}%`)
                    : 'UNREGISTERED FACE';

                ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
                const titleWidth = ctx.measureText(labelText).width;
                ctx.font = '10px system-ui, -apple-system, sans-serif';
                const subWidth = ctx.measureText(subText).width;
                const badgeWidth = Math.max(titleWidth, subWidth) + 24;
                const badgeHeight = 36;
                const badgeX = x;
                const badgeY = Math.max(10, y - badgeHeight - 6);

                // Badge Background with gradient
                const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + badgeHeight);
                grad.addColorStop(0, isKnown ? 'rgba(6, 78, 59, 0.95)' : 'rgba(120, 53, 15, 0.95)');
                grad.addColorStop(1, isKnown ? 'rgba(17, 24, 39, 0.95)' : 'rgba(17, 24, 39, 0.95)');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6) : ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
                ctx.fill();

                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Status Indicator Dot
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.arc(badgeX + 10, badgeY + 13, 4, 0, 2 * Math.PI);
                ctx.fill();

                // Text Rendering
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
                ctx.fillText(labelText, badgeX + 20, badgeY + 16);

                ctx.fillStyle = isKnown ? '#a7f3d0' : '#fde68a';
                ctx.font = '10px system-ui, -apple-system, sans-serif';
                ctx.fillText(subText, badgeX + 20, badgeY + 29);

                ctx.restore();
            });
        }
    }

    // Expose to window
    global.FacialRecognitionSDK = FacialRecognitionSDK;

})(typeof window !== 'undefined' ? window : this);
