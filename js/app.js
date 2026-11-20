/**
 * App Controller
 * Connects the UI, FacialRecognitionSDK, FaceDB, SupabaseCloudSync, and Web Audio.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const elements = {
        // Navigation
        navTabs: document.querySelectorAll('.nav-tab'),
        tabPanes: document.querySelectorAll('.tab-pane'),

        // Scanner
        webcamVideo: document.getElementById('webcamVideo'),
        overlayCanvas: document.getElementById('overlayCanvas'),
        cameraToggleBtn: document.getElementById('cameraToggleBtn'),
        cameraSelect: document.getElementById('cameraSelect'),
        thresholdSlider: document.getElementById('thresholdSlider'),
        thresholdVal: document.getElementById('thresholdVal'),
        landmarksToggle: document.getElementById('landmarksToggle'),
        soundToggle: document.getElementById('soundToggle'),
        mirrorToggle: document.getElementById('mirrorToggle'),
        fpsBadge: document.getElementById('fpsBadge'),
        detectedCountBadge: document.getElementById('detectedCountBadge'),
        statusIndicator: document.getElementById('scannerStatusIndicator'),
        statusText: document.getElementById('scannerStatusText'),
        activeMatchBadge: document.getElementById('activeMatchBadge'),

        // Logs
        eventLogList: document.getElementById('eventLogList'),
        clearLogsBtn: document.getElementById('clearLogsBtn'),
        exportLogsBtn: document.getElementById('exportLogsBtn'),

        // Enrollment
        enrollVideo: document.getElementById('enrollVideo'),
        enrollCanvas: document.getElementById('enrollCanvas'),
        enrollPreview: document.getElementById('enrollPreview'),
        enrollNameInput: document.getElementById('enrollNameInput'),
        enrollRoleInput: document.getElementById('enrollRoleInput'),
        enrollNotesInput: document.getElementById('enrollNotesInput'),
        captureSampleBtn: document.getElementById('captureSampleBtn'),
        uploadSampleInput: document.getElementById('uploadSampleInput'),
        saveEnrollmentBtn: document.getElementById('saveEnrollmentBtn'),
        resetEnrollmentBtn: document.getElementById('resetEnrollmentBtn'),
        enrollStatusMsg: document.getElementById('enrollStatusMsg'),
        capturedSamplesList: document.getElementById('capturedSamplesList'),

        // Directory
        peopleGrid: document.getElementById('peopleGrid'),
        peopleCountBadge: document.getElementById('peopleCountBadge'),
        exportDbBtn: document.getElementById('exportDbBtn'),
        importDbInput: document.getElementById('importDbInput'),
        clearDbBtn: document.getElementById('clearDbBtn'),

        // Cloud (Supabase)
        cloudStatusBtn: document.getElementById('cloudStatusBtn'),
        cloudStatusDot: document.getElementById('cloudStatusDot'),
        cloudStatusText: document.getElementById('cloudStatusText'),
        cloudPanelBadge: document.getElementById('cloudPanelBadge'),
        supabaseUrlInput: document.getElementById('supabaseUrlInput'),
        supabaseKeyInput: document.getElementById('supabaseKeyInput'),
        saveCloudConfigBtn: document.getElementById('saveCloudConfigBtn'),
        disconnectCloudBtn: document.getElementById('disconnectCloudBtn'),
        syncCloudBtn: document.getElementById('syncCloudBtn'),
        cloudTestResult: document.getElementById('cloudTestResult'),
        copySqlBtn: document.getElementById('copySqlBtn'),

        // Verification Tool
        compareImgA: document.getElementById('compareImgA'),
        compareImgB: document.getElementById('compareImgB'),
        compareInputA: document.getElementById('compareInputA'),
        compareInputB: document.getElementById('compareInputB'),
        runCompareBtn: document.getElementById('runCompareBtn'),
        compareResultBox: document.getElementById('compareResultBox'),

        // Loading Overlay
        loadingModal: document.getElementById('loadingModal'),
        loadingStatus: document.getElementById('loadingStatus'),
        loadingProgress: document.getElementById('loadingProgress')
    };

    // State
    const sdk = new FacialRecognitionSDK({
        distanceThreshold: 0.55,
        detector: 'tiny',
        enableLandmarks: true
    });

    let isScanning = false;
    let scanAnimationId = null;
    let lastLogTimes = new Map(); // name -> timestamp (debounce logs to once per 5s)
    let currentCapturedSamples = []; // [{ descriptor, photoDataUrl }]
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    // --- 1. INITIALIZATION ---
    async function initSystem() {
        try {
            sdk.on('loading', data => {
                if (elements.loadingStatus) elements.loadingStatus.textContent = data.status;
            });

            await sdk.init();
            await window.faceDB.init();

            // Check Supabase Cloud Connection & Sync
            await checkCloudStatus();

            // Load stored people into SDK
            const people = await window.faceDB.getAllPeople();
            people.forEach(p => {
                sdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo });
            });

            // Populate camera devices dropdown
            await enumerateCameras();

            // Render directory and logs
            renderPeopleDirectory();
            renderRecentLogs();

            // Hide loading modal
            if (elements.loadingModal) {
                elements.loadingModal.classList.add('hidden');
            }

            console.log(`[App] Initialized successfully. Loaded ${people.length} people.`);
        } catch (err) {
            console.error('[App] Init Error:', err);
            if (elements.loadingStatus) {
                elements.loadingStatus.innerHTML = `<span class="text-red-400">Error loading neural networks: ${err.message}. Please ensure internet access to load AI models.</span>`;
            }
        }
    }

    async function enumerateCameras() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            elements.cameraSelect.innerHTML = '';
            videoDevices.forEach((dev, idx) => {
                const opt = document.createElement('option');
                opt.value = dev.deviceId;
                opt.textContent = dev.label || `Camera ${idx + 1}`;
                elements.cameraSelect.appendChild(opt);
            });
        } catch (e) {
            console.warn('Could not enumerate cameras:', e);
        }
    }

    // --- 2. CLOUD (SUPABASE) MANAGEMENT ---
    async function checkCloudStatus() {
        if (!window.supabaseSync) return;

        if (elements.supabaseUrlInput && window.supabaseSync.url) {
            elements.supabaseUrlInput.value = window.supabaseSync.url;
        }
        if (elements.supabaseKeyInput && window.supabaseSync.key) {
            elements.supabaseKeyInput.value = window.supabaseSync.key;
        }

        if (window.supabaseSync.isReady) {
            updateCloudUI('testing');
            const res = await window.supabaseSync.testConnection();
            if (res.success) {
                updateCloudUI('connected');
                // Auto-sync cloud faces to local database if needed
                try {
                    const cloudPeople = await window.supabaseSync.fetchPeopleFromCloud();
                    if (cloudPeople.length > 0) {
                        for (const cp of cloudPeople) {
                            const localExists = await window.faceDB.getPerson(cp.name);
                            if (!localExists) {
                                await window.faceDB.savePerson(cp);
                            }
                        }
                    }
                } catch (e) {
                    console.debug('Background cloud sync notice:', e.message);
                }
            } else {
                updateCloudUI('error', res.message);
            }
        } else {
            updateCloudUI('disconnected');
        }
    }

    function updateCloudUI(state, message = '') {
        if (!elements.cloudStatusDot || !elements.cloudStatusText) return;

        if (state === 'connected') {
            elements.cloudStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
            elements.cloudStatusText.textContent = 'Cloud: Supabase';
            elements.cloudPanelBadge.className = 'badge badge-success';
            elements.cloudPanelBadge.textContent = 'Connected (Cloud Live)';
            if (elements.cloudTestResult) {
                elements.cloudTestResult.innerHTML = '<span class="text-emerald-400 font-semibold">✓ Connected to Supabase Cloud Database & Storage</span>';
            }
        } else if (state === 'testing') {
            elements.cloudStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse';
            elements.cloudStatusText.textContent = 'Connecting...';
            elements.cloudPanelBadge.className = 'badge badge-neutral';
            elements.cloudPanelBadge.textContent = 'Verifying...';
            if (elements.cloudTestResult) {
                elements.cloudTestResult.innerHTML = '<span class="text-cyan-400 animate-pulse">Testing cloud connection...</span>';
            }
        } else if (state === 'error') {
            elements.cloudStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-red-400';
            elements.cloudStatusText.textContent = 'Cloud Error';
            elements.cloudPanelBadge.className = 'badge badge-warning';
            elements.cloudPanelBadge.textContent = 'Connection Error';
            if (elements.cloudTestResult) {
                elements.cloudTestResult.innerHTML = `<span class="text-red-400">${escapeHtml(message)}</span>`;
            }
        } else {
            elements.cloudStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-gray-500';
            elements.cloudStatusText.textContent = 'Local Only';
            elements.cloudPanelBadge.className = 'badge badge-neutral';
            elements.cloudPanelBadge.textContent = 'Not Connected';
            if (elements.cloudTestResult) {
                elements.cloudTestResult.innerHTML = '<span class="text-gray-400">Currently using local laptop storage. Connect Supabase above to sync to cloud.</span>';
            }
        }
    }

    // Connect & Test Button
    elements.saveCloudConfigBtn.addEventListener('click', async () => {
        const url = elements.supabaseUrlInput.value.trim();
        const key = elements.supabaseKeyInput.value.trim();

        if (!url || !key) {
            alert('Please enter both your Supabase Project URL and Public Anon Key.');
            return;
        }

        updateCloudUI('testing');
        const initialized = window.supabaseSync.initClient(url, key);
        if (!initialized) {
            updateCloudUI('error', 'Could not initialize Supabase. Check URL format.');
            return;
        }

        const test = await window.supabaseSync.testConnection();
        if (test.success) {
            updateCloudUI('connected');
            alert('✓ Successfully connected to Supabase Cloud!');
            // Sync immediately
            elements.syncCloudBtn.click();
        } else {
            updateCloudUI('error', test.message);
            alert(`Connection test failed: ${test.message}\n\nMake sure you created the 'faces' table using the SQL Schema below.`);
        }
    });

    // Disconnect Button
    elements.disconnectCloudBtn.addEventListener('click', () => {
        if (confirm('Disconnect from Supabase Cloud? (Your local data on this laptop will NOT be deleted).')) {
            window.supabaseSync.clearConfig();
            elements.supabaseUrlInput.value = '';
            elements.supabaseKeyInput.value = '';
            updateCloudUI('disconnected');
        }
    });

    // Sync Now Button
    elements.syncCloudBtn.addEventListener('click', async () => {
        if (!window.supabaseSync.isReady) {
            alert('Please connect to Supabase first by entering your URL and Key.');
            return;
        }

        elements.syncCloudBtn.disabled = true;
        elements.syncCloudBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Syncing Faces...
        `;

        try {
            const result = await window.supabaseSync.syncAll(window.faceDB);
            // Refresh people in SDK & UI
            const allPeople = await window.faceDB.getAllPeople();
            sdk.clearAllEnrolled();
            allPeople.forEach(p => sdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
            renderPeopleDirectory();

            alert(`✓ Cloud Sync Complete!\n• Uploaded to Cloud: ${result.uploaded} face(s)\n• Downloaded to Local: ${result.downloaded} face(s)`);
        } catch (err) {
            console.error('Cloud Sync error:', err);
            alert(`Sync failed: ${err.message}`);
        } finally {
            elements.syncCloudBtn.disabled = false;
            elements.syncCloudBtn.innerHTML = `
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Sync All Faces (Local &harr; Cloud)
            `;
        }
    });

    // Click Header Cloud Badge to open Cloud Tab
    elements.cloudStatusBtn.addEventListener('click', () => {
        const cloudTabBtn = document.querySelector('[data-tab="cloudTab"]');
        if (cloudTabBtn) cloudTabBtn.click();
    });

    // Copy SQL Schema Button
    elements.copySqlBtn.addEventListener('click', () => {
        const sql = `-- 1. Create table for Enrolled People
CREATE TABLE IF NOT EXISTS public.faces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    descriptors JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table for Recognition Logs
CREATE TABLE IF NOT EXISTS public.face_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    confidence INTEGER,
    distance NUMERIC(6,4),
    photo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GRANT TABLE PERMISSIONS (Fixes permission denied error)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.faces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.face_logs TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public on faces" ON public.faces;
CREATE POLICY "Allow public on faces" ON public.faces FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public on logs" ON public.face_logs;
CREATE POLICY "Allow public on logs" ON public.face_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 5. Storage Bucket for Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Allow public on photos" ON storage.objects;
CREATE POLICY "Allow public on photos" ON storage.objects FOR ALL TO anon, authenticated, service_role USING (bucket_id = 'face-photos') WITH CHECK (bucket_id = 'face-photos');`;

        navigator.clipboard.writeText(sql).then(() => {
            const originalText = elements.copySqlBtn.textContent;
            elements.copySqlBtn.textContent = '✓ Copied!';
            elements.copySqlBtn.classList.add('text-emerald-400');
            setTimeout(() => {
                elements.copySqlBtn.textContent = originalText;
                elements.copySqlBtn.classList.remove('text-emerald-400');
            }, 2000);
        });
    });

    // --- 3. LIVE CAMERA SCANNING & RECOGNITION LOOP ---
    async function toggleScanner() {
        if (isScanning) {
            stopScanner();
        } else {
            await startScanner();
        }
    }

    async function startScanner() {
        try {
            const deviceId = elements.cameraSelect.value;
            const constraints = {
                width: 640,
                height: 480,
                deviceId: deviceId ? { exact: deviceId } : undefined
            };

            elements.cameraToggleBtn.innerHTML = `
                <svg class="w-5 h-5 inline mr-1 text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="5" y="5" width="10" height="10" rx="1.5"/>
                </svg> Stop Camera
            `;
            elements.cameraToggleBtn.classList.remove('btn-primary');
            elements.cameraToggleBtn.classList.add('btn-danger');

            await sdk.startCamera(elements.webcamVideo, constraints);
            isScanning = true;

            elements.statusIndicator.className = 'w-3 h-3 rounded-full bg-emerald-400 animate-pulse';
            elements.statusText.textContent = 'Scanner Active (Real-Time)';

            // Match canvas dimensions to video
            const video = elements.webcamVideo;
            const canvas = elements.overlayCanvas;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            // Start detection loop
            lastFrameTime = performance.now();
            frameCount = 0;
            scanLoop();
        } catch (err) {
            console.error('Camera start error:', err);
            alert(`Unable to access webcam: ${err.message}. Make sure permissions are granted and you are using http://localhost or HTTPS.`);
            stopScanner();
        }
    }

    function stopScanner() {
        isScanning = false;
        if (scanAnimationId) {
            cancelAnimationFrame(scanAnimationId);
            scanAnimationId = null;
        }
        sdk.stopCamera();

        // Clear canvas
        const ctx = elements.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);

        elements.cameraToggleBtn.innerHTML = `
            <svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg> Start Camera
        `;
        elements.cameraToggleBtn.classList.add('btn-primary');
        elements.cameraToggleBtn.classList.remove('btn-danger');

        elements.statusIndicator.className = 'w-3 h-3 rounded-full bg-gray-500';
        elements.statusText.textContent = 'Camera Off';
        elements.fpsBadge.textContent = '0 FPS';
        elements.detectedCountBadge.textContent = '0 Detected';
        elements.activeMatchBadge.textContent = 'None';
    }

    async function scanLoop() {
        if (!isScanning) return;

        const video = elements.webcamVideo;
        const canvas = elements.overlayCanvas;

        if (video.readyState >= 2) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            try {
                const results = await sdk.recognize(video);

                // Clear canvas
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw futuristic HUD overlay
                sdk.drawHUD(canvas, results, {
                    showLandmarks: elements.landmarksToggle.checked,
                    mirrored: elements.mirrorToggle.checked
                });

                // Update UI Badges
                elements.detectedCountBadge.textContent = `${results.length} Detected`;

                let topMatch = null;
                for (const res of results) {
                    if (res.isRecognized) {
                        topMatch = res;
                        break;
                    }
                }

                if (topMatch) {
                    elements.activeMatchBadge.textContent = `${topMatch.name} (${topMatch.confidence}%)`;
                    elements.activeMatchBadge.className = 'badge badge-success';
                    handleRecognitionEvent(topMatch, video);
                } else if (results.length > 0) {
                    elements.activeMatchBadge.textContent = 'Unknown Person';
                    elements.activeMatchBadge.className = 'badge badge-warning';
                    handleUnknownEvent(results[0], video);
                } else {
                    elements.activeMatchBadge.textContent = 'Searching...';
                    elements.activeMatchBadge.className = 'badge badge-neutral';
                }

                // FPS calculation
                frameCount++;
                const now = performance.now();
                if (now - lastFrameTime >= 1000) {
                    fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
                    elements.fpsBadge.textContent = `${fps} FPS`;
                    frameCount = 0;
                    lastFrameTime = now;
                }
            } catch (err) {
                console.error('Scan loop error:', err);
            }
        }

        scanAnimationId = requestAnimationFrame(scanLoop);
    }

    function handleRecognitionEvent(result, videoSource) {
        const now = Date.now();
        const lastSeen = lastLogTimes.get(result.name) || 0;

        // Debounce: record event at most once per 6 seconds per individual
        if (now - lastSeen > 6000) {
            lastLogTimes.set(result.name, now);

            // Play audio chime
            if (elements.soundToggle.checked && window.soundEffects) {
                window.soundEffects.playSuccess();
            }

            // Capture face snapshot
            const snapshot = captureFaceSnapshot(videoSource, result.box);

            // Persist to DB (and Supabase Cloud if connected)
            window.faceDB.logEvent({
                name: result.name,
                confidence: result.confidence,
                distance: result.distance,
                photo: snapshot
            }).then(() => {
                renderRecentLogs();
            });
        }
    }

    function handleUnknownEvent(result, videoSource) {
        const now = Date.now();
        const lastSeen = lastLogTimes.get('__unknown__') || 0;

        if (now - lastSeen > 8000) {
            lastLogTimes.set('__unknown__', now);

            if (elements.soundToggle.checked && window.soundEffects) {
                window.soundEffects.playAlert();
            }

            const snapshot = captureFaceSnapshot(videoSource, result.box);
            window.faceDB.logEvent({
                name: 'Unknown Person',
                confidence: result.confidence,
                distance: result.distance,
                photo: snapshot
            }).then(() => {
                renderRecentLogs();
            });
        }
    }

    function captureFaceSnapshot(source, box) {
        try {
            const snapCanvas = document.createElement('canvas');
            const snapCtx = snapCanvas.getContext('2d');
            snapCanvas.width = 120;
            snapCanvas.height = 120;

            const padX = box.width * 0.2;
            const padY = box.height * 0.2;
            const sx = Math.max(0, box.x - padX);
            const sy = Math.max(0, box.y - padY);
            const sw = box.width + padX * 2;
            const sh = box.height + padY * 2;

            snapCtx.drawImage(source, sx, sy, sw, sh, 0, 0, 120, 120);
            return snapCanvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            return '';
        }
    }

    async function renderRecentLogs() {
        const logs = await window.faceDB.getLogs(30);
        elements.eventLogList.innerHTML = '';

        if (logs.length === 0) {
            elements.eventLogList.innerHTML = `
                <div class="text-center py-8 text-gray-500 text-sm">
                    No recognition events logged yet.<br>Start the camera to begin monitoring.
                </div>
            `;
            return;
        }

        logs.forEach(log => {
            const isKnown = log.name !== 'Unknown Person';
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const dateStr = new Date(log.timestamp).toLocaleDateString();

            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition';
            item.innerHTML = `
                <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-900 border ${isKnown ? 'border-emerald-500/50' : 'border-amber-500/50'}">
                    ${log.photo ? `<img src="${log.photo}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">Face</div>`}
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold text-sm truncate ${isKnown ? 'text-emerald-400' : 'text-amber-400'}">${escapeHtml(log.name)}</h4>
                        <span class="text-xs text-gray-400">${timeStr}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span>Match: ${log.confidence}%</span>
                        <span>•</span>
                        <span>Dist: ${log.distance}</span>
                        <span>•</span>
                        <span class="text-gray-500">${dateStr}</span>
                    </div>
                </div>
            `;
            elements.eventLogList.appendChild(item);
        });
    }

    // --- 4. FACE ENROLLMENT LOGIC ---
    let enrollStream = null;

    async function startEnrollCamera() {
        if (enrollStream) return;
        try {
            enrollStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
            elements.enrollVideo.srcObject = enrollStream;
            elements.enrollVideo.play();
        } catch (e) {
            console.warn('Could not start enroll camera:', e);
        }
    }

    function stopEnrollCamera() {
        if (enrollStream) {
            enrollStream.getTracks().forEach(t => t.stop());
            enrollStream = null;
            elements.enrollVideo.srcObject = null;
        }
    }

    async function captureEnrollmentSample() {
        elements.enrollStatusMsg.textContent = 'Detecting face...';
        elements.enrollStatusMsg.className = 'text-xs text-cyan-400';

        if (window.soundEffects) window.soundEffects.playShutter();

        const source = elements.enrollVideo.srcObject ? elements.enrollVideo : elements.enrollPreview;
        
        try {
            const result = await sdk.extractDescriptor(source);
            if (!result) {
                elements.enrollStatusMsg.textContent = '❌ No face detected. Please ensure good lighting and face the camera directly.';
                elements.enrollStatusMsg.className = 'text-xs text-red-400';
                return;
            }

            // Crop face photo
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = 160;
            cropCanvas.height = 160;
            const ctx = cropCanvas.getContext('2d');
            const { x, y, width, height } = result.box;
            const pad = width * 0.25;
            ctx.drawImage(source, Math.max(0, x - pad), Math.max(0, y - pad), width + pad * 2, height + pad * 2, 0, 0, 160, 160);
            const photoUrl = cropCanvas.toDataURL('image/jpeg', 0.85);

            currentCapturedSamples.push({
                descriptor: result.descriptor,
                photo: photoUrl
            });

            elements.enrollStatusMsg.textContent = `✓ Captured sample #${currentCapturedSamples.length}! (More samples = higher accuracy)`;
            elements.enrollStatusMsg.className = 'text-xs text-emerald-400';
            elements.saveEnrollmentBtn.disabled = false;

            renderCapturedSamplesUI();
        } catch (err) {
            console.error('Enroll extraction error:', err);
            elements.enrollStatusMsg.textContent = `Error: ${err.message}`;
            elements.enrollStatusMsg.className = 'text-xs text-red-400';
        }
    }

    function renderCapturedSamplesUI() {
        elements.capturedSamplesList.innerHTML = '';
        currentCapturedSamples.forEach((s, idx) => {
            const div = document.createElement('div');
            div.className = 'relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-500/40 bg-gray-900 group';
            div.innerHTML = `
                <img src="${s.photo}" class="w-full h-full object-cover">
                <span class="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center text-white">#${idx + 1}</span>
                <button type="button" class="absolute top-0 right-0 p-1 bg-red-600/80 text-white rounded-bl text-[9px] opacity-0 group-hover:opacity-100 transition" title="Remove sample">✕</button>
            `;
            div.querySelector('button').addEventListener('click', () => {
                currentCapturedSamples.splice(idx, 1);
                renderCapturedSamplesUI();
                elements.saveEnrollmentBtn.disabled = currentCapturedSamples.length === 0;
            });
            elements.capturedSamplesList.appendChild(div);
        });
    }

    async function saveEnrollment() {
        const name = elements.enrollNameInput.value.trim();
        const role = elements.enrollRoleInput.value.trim();
        const notes = elements.enrollNotesInput.value.trim();

        if (!name) {
            alert('Please enter a person name or ID.');
            elements.enrollNameInput.focus();
            return;
        }

        if (currentCapturedSamples.length === 0) {
            alert('Please capture at least one face sample first.');
            return;
        }

        try {
            const descriptors = currentCapturedSamples.map(s => s.descriptor);
            const primaryPhoto = currentCapturedSamples[0].photo;

            // Check if person already exists to append samples
            const existing = await window.faceDB.getPerson(name);
            let combinedDescriptors = descriptors;
            if (existing && existing.descriptors) {
                combinedDescriptors = [...existing.descriptors.map(d => new Float32Array(d)), ...descriptors];
            }

            // Save in DB (and auto-sync to Supabase Cloud)
            await window.faceDB.savePerson({
                name,
                role: role || (existing ? existing.role : ''),
                descriptors: combinedDescriptors,
                photo: primaryPhoto || (existing ? existing.photo : ''),
                notes
            });

            // Update SDK in-memory
            sdk.enrollPerson(name, combinedDescriptors, {
                role: role || (existing ? existing.role : ''),
                photo: primaryPhoto
            });

            const cloudMsg = (window.supabaseSync && window.supabaseSync.isReady) ? ' and synced to Supabase Cloud!' : '!';
            alert(`Successfully enrolled "${name}" with ${combinedDescriptors.length} face sample(s)${cloudMsg}`);

            // Reset form
            resetEnrollmentForm();
            renderPeopleDirectory();
        } catch (err) {
            console.error('Save enrollment error:', err);
            alert(`Error saving enrollment: ${err.message}`);
        }
    }

    function resetEnrollmentForm() {
        elements.enrollNameInput.value = '';
        elements.enrollRoleInput.value = '';
        elements.enrollNotesInput.value = '';
        currentCapturedSamples = [];
        elements.capturedSamplesList.innerHTML = '';
        elements.enrollStatusMsg.textContent = '';
        elements.saveEnrollmentBtn.disabled = true;
        elements.enrollPreview.classList.add('hidden');
        elements.enrollVideo.classList.remove('hidden');
    }

    // Photo file upload enrollment
    elements.uploadSampleInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            elements.enrollPreview.src = evt.target.result;
            elements.enrollPreview.classList.remove('hidden');
            elements.enrollVideo.classList.add('hidden');
            elements.enrollPreview.onload = () => {
                captureEnrollmentSample();
            };
        };
        reader.readAsDataURL(file);
    });

    // --- 5. DIRECTORY & DATABASE MANAGEMENT ---
    async function renderPeopleDirectory() {
        const people = await window.faceDB.getAllPeople();
        elements.peopleCountBadge.textContent = `${people.length} Registered`;
        elements.peopleGrid.innerHTML = '';

        if (people.length === 0) {
            elements.peopleGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <p class="text-base font-medium">No faces enrolled yet.</p>
                    <p class="text-sm text-gray-400 mt-1">Go to the "Enroll Face" tab to register your first profile!</p>
                </div>
            `;
            return;
        }

        people.forEach(p => {
            const card = document.createElement('div');
            card.className = 'glass-card p-4 rounded-xl flex flex-col justify-between border border-gray-700/60 hover:border-gray-500/60 transition';
            card.innerHTML = `
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-14 h-14 rounded-full overflow-hidden bg-gray-900 border-2 border-emerald-500/60 flex-shrink-0">
                        ${p.photo ? `<img src="${p.photo}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">No Photo</div>`}
                    </div>
                    <div class="min-w-0 flex-grow">
                        <h3 class="font-bold text-base text-white truncate">${escapeHtml(p.name)}</h3>
                        <p class="text-xs text-emerald-400 truncate">${escapeHtml(p.role || 'Member')}</p>
                        <p class="text-[11px] text-gray-400 mt-0.5">${p.descriptors.length} training sample(s)</p>
                    </div>
                </div>
                ${p.notes ? `<p class="text-xs text-gray-400 italic mb-3 line-clamp-2">"${escapeHtml(p.notes)}"</p>` : ''}
                <div class="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
                    <span class="text-gray-500 text-[11px]">Updated ${new Date(p.updatedAt).toLocaleDateString()}</span>
                    <button class="text-red-400 hover:text-red-300 font-medium transition delete-person-btn" data-name="${escapeHtml(p.name)}">Delete</button>
                </div>
            `;

            card.querySelector('.delete-person-btn').addEventListener('click', async (e) => {
                const targetName = e.target.getAttribute('data-name');
                if (confirm(`Are you sure you want to delete "${targetName}" from the database?`)) {
                    await window.faceDB.deletePerson(targetName);
                    sdk.removePerson(targetName);
                    renderPeopleDirectory();
                }
            });

            elements.peopleGrid.appendChild(card);
        });
    }

    // Export DB
    elements.exportDbBtn.addEventListener('click', async () => {
        const jsonStr = await window.faceDB.exportJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import DB
    elements.importDbInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const count = await window.faceDB.importJSON(evt.target.result);
                const people = await window.faceDB.getAllPeople();
                sdk.clearAllEnrolled();
                people.forEach(p => sdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
                alert(`Successfully imported ${count} face profiles!`);
                renderPeopleDirectory();
            } catch (err) {
                alert(`Failed to import backup: ${err.message}`);
            }
        };
        reader.readAsText(file);
    });

    // Clear All DB
    elements.clearDbBtn.addEventListener('click', async () => {
        if (confirm('CAUTION: This will delete all enrolled faces and biometric vectors. Continue?')) {
            await window.faceDB.clearAllPeople();
            sdk.clearAllEnrolled();
            renderPeopleDirectory();
        }
    });

    // --- 6. 1-to-1 FACE COMPARISON TOOL ---
    function setupImageComparator() {
        const handleFile = (input, imgEl) => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        imgEl.src = evt.target.result;
                        imgEl.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                }
            });
        };

        handleFile(elements.compareInputA, elements.compareImgA);
        handleFile(elements.compareInputB, elements.compareImgB);

        elements.runCompareBtn.addEventListener('click', async () => {
            if (!elements.compareImgA.src || elements.compareImgA.classList.contains('hidden') ||
                !elements.compareImgB.src || elements.compareImgB.classList.contains('hidden')) {
                alert('Please upload both Image A and Image B to compare.');
                return;
            }

            elements.compareResultBox.innerHTML = '<div class="text-cyan-400 animate-pulse">Analyzing facial features & computing vectors...</div>';

            try {
                const res = await sdk.compareFaces(elements.compareImgA, elements.compareImgB);
                const isMatch = res.isMatch;

                elements.compareResultBox.innerHTML = `
                    <div class="p-4 rounded-xl border ${isMatch ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-red-950/40 border-red-500/60'}">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-lg font-bold ${isMatch ? 'text-emerald-400' : 'text-red-400'}">
                                ${isMatch ? '✓ IDENTICAL MATCH' : '✕ DIFFERENT PERSONS'}
                            </span>
                            <span class="text-sm font-semibold px-2 py-0.5 rounded ${isMatch ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}">
                                ${res.similarity}% Similarity
                            </span>
                        </div>
                        <div class="text-xs text-gray-300 space-y-1">
                            <p>Euclidean Vector Distance: <strong>${res.distance}</strong> (Match threshold: ≤ ${res.threshold})</p>
                            <p class="text-gray-400">${isMatch ? 'The two facial descriptors are within the biometric match threshold.' : 'The distance exceeds the threshold; these faces do not belong to the same person.'}</p>
                        </div>
                    </div>
                `;
            } catch (err) {
                elements.compareResultBox.innerHTML = `<div class="text-red-400 text-sm">Comparison failed: ${err.message}</div>`;
            }
        });
    }

    // --- 7. EVENT LISTENERS & NAVIGATION ---
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');

            elements.navTabs.forEach(t => t.classList.remove('active'));
            elements.tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            if (targetId === 'enrollTab') {
                startEnrollCamera();
            } else {
                stopEnrollCamera();
            }
        });
    });

    elements.cameraToggleBtn.addEventListener('click', toggleScanner);
    elements.cameraSelect.addEventListener('change', () => {
        if (isScanning) {
            stopScanner();
            startScanner();
        }
    });

    elements.thresholdSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        elements.thresholdVal.textContent = val.toFixed(2);
        sdk.setThreshold(val);
    });

    elements.captureSampleBtn.addEventListener('click', captureEnrollmentSample);
    elements.saveEnrollmentBtn.addEventListener('click', saveEnrollment);
    elements.resetEnrollmentBtn.addEventListener('click', resetEnrollmentForm);

    elements.clearLogsBtn.addEventListener('click', async () => {
        if (confirm('Clear recognition event history?')) {
            await window.faceDB.clearLogs();
            renderRecentLogs();
        }
    });

    elements.exportLogsBtn.addEventListener('click', async () => {
        const logs = await window.faceDB.getLogs(1000);
        let csv = 'ID,Name,Confidence,Distance,Timestamp,Date\n';
        logs.forEach(l => {
            const d = new Date(l.timestamp);
            csv += `"${l.id}","${l.name}","${l.confidence}%","${l.distance}","${d.toLocaleTimeString()}","${d.toLocaleDateString()}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_face_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    setupImageComparator();
    initSystem();

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
});
