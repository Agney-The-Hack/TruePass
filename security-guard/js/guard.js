/**
 * TruePass Guard — Turnstile & Gate Security Console Controller
 * High-performance operator portal for live biometric verification,
 * Supabase Cloud ticket inspection, turnstile gate admission, and audit logging.
 */

(function () {
    'use strict';

    // Application State
    let guardSdk = null;
    let isCameraRunning = false;
    let cameraLoopId = null;
    let soundEnabled = true;

    let allTickets = [];
    let allProfiles = [];
    let allFaces = [];
    let gateLogs = [];

    let currentInspectedAttendee = null;
    let currentInspectedTicket = null;
    let selectedEventFilter = 'all';
    let currentTicketFilter = 'all';

    const SUPABASE_PROJECT_URL = 'https://ojrkqevmrfegabedamhz.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_DTcjF-ZIn2NPiBoTdhU7lw_sXC3GMVJ';

    // ----------------------------------------------------
    // INITIALIZATION ON DOM READY
    // ----------------------------------------------------
    function bootstrapGuard() {
        initClock();
        setupNavigationTabs();
        setupAudioToggle();
        setupSearchAndFilters();
        setupGateActions();

        // 1. Initialize Camera Engine IMMEDIATELY (wire click handlers with zero delay)
        initTurnstileCamera();

        // 2. Initialize Supabase Cloud Connection & Sync Data in background
        initSupabaseGuard();
        refreshAllCloudData().catch(e => console.warn('[Supabase Sync Warn]', e));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapGuard);
    } else {
        bootstrapGuard();
    }

    // ----------------------------------------------------
    // LIVE CLOCK & DATE
    // ----------------------------------------------------
    function initClock() {
        const clockEl = document.getElementById('liveClock');
        const dateEl = document.getElementById('liveDate');

        function update() {
            const now = new Date();
            if (clockEl) {
                clockEl.textContent = now.toTimeString().split(' ')[0] + ' ' + (now.getHours() >= 12 ? 'PM' : 'AM');
            }
            if (dateEl) {
                const options = { day: '2-digit', month: 'short', year: 'numeric' };
                dateEl.textContent = now.toLocaleDateString('en-GB', options).toUpperCase();
            }
        }
        update();
        setInterval(update, 1000);
    }

    // ----------------------------------------------------
    // NAVIGATION TABS
    // ----------------------------------------------------
    function setupNavigationTabs() {
        const tabs = [
            { btn: 'navTabScanner', view: 'viewScanner' },
            { btn: 'navTabTickets', view: 'viewTickets' },
            { btn: 'navTabFaces', view: 'viewFaces' },
            { btn: 'navTabLogs', view: 'viewLogs' }
        ];

        tabs.forEach(t => {
            const btn = document.getElementById(t.btn);
            if (!btn) return;

            btn.addEventListener('click', () => {
                tabs.forEach(o => {
                    document.getElementById(o.view)?.classList.add('hidden');
                    const b = document.getElementById(o.btn);
                    if (b) {
                        b.className = 'tab-btn px-3.5 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all';
                    }
                });

                document.getElementById(t.view)?.classList.remove('hidden');
                btn.className = 'tab-btn px-3.5 py-1 rounded-lg text-xs font-bold transition-all bg-red-600 text-white shadow-md shadow-red-600/30';

                // Auto refresh relevant tab content
                if (t.view === 'viewTickets') renderTicketsTable();
                if (t.view === 'viewFaces') renderFacesGrid();
                if (t.view === 'viewLogs') renderLogsTable();
            });
        });
    }

    // ----------------------------------------------------
    // AUDIO TOGGLE
    // ----------------------------------------------------
    function setupAudioToggle() {
        const toggleBtn = document.getElementById('toggleAudioBtn');
        const onIcon = document.getElementById('audioIconOn');
        const offIcon = document.getElementById('audioIconOff');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                soundEnabled = !soundEnabled;
                if (soundEnabled) {
                    onIcon?.classList.remove('hidden');
                    offIcon?.classList.add('hidden');
                    playSound('success');
                } else {
                    onIcon?.classList.add('hidden');
                    offIcon?.classList.remove('hidden');
                }
            });
        }
    }

    function playSound(type) {
        if (!soundEnabled) return;
        try {
            if (window.soundEffects) {
                if (type === 'success') window.soundEffects.playSuccess();
                if (type === 'alert' || type === 'denied') window.soundEffects.playAlert();
                if (type === 'shutter') window.soundEffects.playShutter();
            }
        } catch (e) {}
    }

    // ----------------------------------------------------
    // SUPABASE CLOUD CONNECTION
    // ----------------------------------------------------
    function initSupabaseGuard() {
        if (window.supabaseSync) {
            if (typeof window.supabaseSync.initClient === 'function') {
                window.supabaseSync.initClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
            } else if (typeof window.supabaseSync.init === 'function') {
                window.supabaseSync.init(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
            }
            updateSupabasePill(true, 'Live');
        } else {
            updateSupabasePill(false, 'Offline');
        }

        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = `
                    <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    <span>Syncing...</span>
                `;
                await refreshAllCloudData();
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    <span>Sync Cloud</span>
                `;
            });
        }
    }

    function updateSupabasePill(isOnline, latency) {
        const pill = document.getElementById('guardSupabasePill');
        const text = document.getElementById('guardSupabaseText');
        const badge = document.getElementById('guardSupabaseLatency');

        if (!pill || !text) return;

        if (isOnline) {
            pill.className = 'px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg shadow-emerald-500/10';
            text.textContent = 'Cloud: Connected';
            if (badge) badge.textContent = latency || 'Live';
        } else {
            pill.className = 'px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/50 text-xs font-bold text-red-300 flex items-center gap-2';
            text.textContent = 'Cloud: Disconnected';
            if (badge) badge.textContent = 'Offline';
        }
    }

    // ----------------------------------------------------
    // REFRESH ALL DATA (SUPABASE CLOUD + LOCAL FALLBACK)
    // ----------------------------------------------------
    async function refreshAllCloudData() {
        const startTime = Date.now();
        let loadedTickets = [];
        let loadedProfiles = [];
        let loadedFaces = [];

        // 1. Fetch tickets from Supabase Cloud
        if (window.supabaseSync && window.supabaseSync.client) {
            try {
                const { data: tData, error: tErr } = await window.supabaseSync.client
                    .from('tickets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (tData && !tErr) {
                    loadedTickets = tData.map(r => ({
                        bookingId: r.booking_id,
                        buyerName: r.buyer_name,
                        buyerEmail: r.buyer_email,
                        buyerPhone: r.buyer_phone,
                        eventTitle: r.event_title,
                        venue: r.venue,
                        date: r.event_date || r.date,
                        time: r.showtime || r.time,
                        format: r.format || 'Standard',
                        seats: Array.isArray(r.seats) ? r.seats : (typeof r.seats === 'string' ? JSON.parse(r.seats || '[]') : []),
                        totalAmount: r.total_amount,
                        status: r.status || 'CONFIRMED',
                        faceVerified: r.face_verified,
                        photoDataUrl: r.photo_url || r.photo_data_url || '',
                        createdAt: r.created_at,
                        isCloudSynced: true
                    }));
                }
            } catch (e) {
                console.warn('[Guard] Tickets fetch error:', e);
            }

            // 2. Fetch Profiles & Faces from Supabase Cloud
            try {
                const { data: pData } = await window.supabaseSync.client.from('profiles').select('*');
                if (pData) loadedProfiles = pData;

                const { data: fData } = await window.supabaseSync.client.from('faces').select('*');
                if (fData) loadedFaces = fData;
            } catch (e) {
                console.warn('[Guard] Profiles/Faces fetch error:', e);
            }
        }

        // 3. Merge Local Storage Tickets (Ensures 100% data visibility)
        try {
            const localRaw = localStorage.getItem('truepass_ticket_bookings') || '[]';
            const localTickets = JSON.parse(localRaw);
            localTickets.forEach(lt => {
                if (!loadedTickets.some(t => t.bookingId === lt.bookingId)) {
                    loadedTickets.push(lt);
                }
            });
        } catch (e) {}

        // 4. Merge Local Profile if available
        try {
            const localProf = JSON.parse(localStorage.getItem('truepass_onboarded_profile') || '{}');
            if (localProf && localProf.name && !loadedProfiles.some(p => p.name.toLowerCase() === localProf.name.toLowerCase())) {
                loadedProfiles.push({
                    name: localProf.name,
                    email: localProf.email,
                    phone: localProf.phone,
                    photo_url: localProf.photo,
                    loyalty_tier: localProf.loyaltyTier || 'Standard',
                    descriptors: localProf.descriptors || []
                });
            }
        } catch (e) {}

        allTickets = loadedTickets;
        allProfiles = loadedProfiles;
        allFaces = loadedFaces;

        const latency = (Date.now() - startTime) + 'ms';
        updateSupabasePill(true, latency);

        // Update UI components
        updateMetricCounters();
        populateEventFilterDropdown();
        renderTicketsTable();
        renderFacesGrid();

        // Sync enrolled faces into Guard Facial Recognition Engine
        if (guardSdk) {
            enrollAllFacesIntoSdk();
        }
    }

    // ----------------------------------------------------
    // METRICS COUNTER BAR
    // ----------------------------------------------------
    function updateMetricCounters() {
        const total = allTickets.length;
        const active = allTickets.filter(t => t.status !== 'REFUNDED' && t.status !== 'CHECKED_IN').length;
        const admitted = allTickets.filter(t => t.status === 'CHECKED_IN').length;
        const revoked = allTickets.filter(t => t.status === 'REFUNDED').length;
        const facesCount = allProfiles.length + allFaces.length;

        document.getElementById('metricTotalTickets').textContent = total;
        document.getElementById('metricActiveTickets').textContent = active;
        document.getElementById('metricAdmittedTickets').textContent = admitted;
        document.getElementById('metricRevokedTickets').textContent = revoked;
        document.getElementById('metricEnrolledFaces').textContent = facesCount;

        document.getElementById('countAll').textContent = total;
        document.getElementById('countActive').textContent = active;
        document.getElementById('countCheckedIn').textContent = admitted;
        document.getElementById('countRefunded').textContent = revoked;
    }

    // ----------------------------------------------------
    // EVENT SELECTOR POPULATION & ONGOING EVENT ENFORCEMENT
    // ----------------------------------------------------
    const CATALOG_EVENTS = [
        'Coldplay: Music of the Spheres World Tour 2026',
        'Dune: Part Two (IMAX 70mm Special Screening)',
        'Diljit Dosanjh - Dil-Luminati Tour Live',
        'Premier League: Arsenal vs Manchester City (Club Level VIP)',
        'Taylor Swift: The Eras Tour (Extended VIP)',
        'A.R. Rahman - Symphony of Peace World Tour',
        'Oppenheimer (70mm Extended Cut)'
    ];

    function populateEventFilterDropdown() {
        const headerSelect = document.getElementById('guardEventSelect');
        const ongoingSelect = document.getElementById('ongoingEventSelect');

        const events = new Set(CATALOG_EVENTS);
        allTickets.forEach(t => { if (t.eventTitle) events.add(t.eventTitle); });

        const buildOptionsHtml = (selectedVal) => {
            let html = '<option value="all">Any Valid TruePass Event (Open Admission)</option>';
            events.forEach(ev => {
                const isSel = (ev === selectedVal) ? 'selected' : '';
                html += `<option value="${ev}" ${isSel}>${ev}</option>`;
            });
            return html;
        };

        if (headerSelect) {
            headerSelect.innerHTML = buildOptionsHtml(selectedEventFilter);
            headerSelect.onchange = () => {
                selectedEventFilter = headerSelect.value;
                if (ongoingSelect) ongoingSelect.value = selectedEventFilter;
                renderTicketsTable();
                if (currentInspectedAttendee && lastInspectedName) {
                    evaluateGateAdmission(lastInspectedName, 98, { photo: currentInspectedAttendee.photo_url || currentInspectedAttendee.photo });
                }
            };
        }

        if (ongoingSelect) {
            ongoingSelect.innerHTML = buildOptionsHtml(selectedEventFilter);
            ongoingSelect.onchange = () => {
                selectedEventFilter = ongoingSelect.value;
                if (headerSelect) headerSelect.value = selectedEventFilter;
                renderTicketsTable();
                if (currentInspectedAttendee && lastInspectedName) {
                    evaluateGateAdmission(lastInspectedName, 98, { photo: currentInspectedAttendee.photo_url || currentInspectedAttendee.photo });
                }
            };
        }
    }

    // ----------------------------------------------------
    // BIOMETRIC TURNSTILE CAMERA ENGINE
    // ----------------------------------------------------
    let currentCameraFacing = 'user';
    let availableVideoDevices = [];
    let currentDeviceIndex = 0;
    let currentVideoStream = null;

    // Immediate global controller hooks
    window.guardStartCamera = (constraints) => {
        if (typeof window._guardInternalStartCamera === 'function') {
            return window._guardInternalStartCamera(constraints);
        }
    };
    window.guardStopCamera = () => {
        if (typeof window._guardInternalStopCamera === 'function') {
            return window._guardInternalStopCamera();
        }
    };
    window.guardToggleCamera = () => {
        if (typeof window._guardInternalToggleCamera === 'function') {
            return window._guardInternalToggleCamera();
        }
    };
    window.guardSwitchCamera = () => {
        if (typeof window._guardInternalSwitchCamera === 'function') {
            return window._guardInternalSwitchCamera();
        }
    };

    async function initTurnstileCamera() {
        const video = document.getElementById('guardVideo');
        const canvas = document.getElementById('guardCanvas');
        const toast = document.getElementById('liveDetectionToast');
        const standbyOverlay = document.getElementById('cameraStandbyOverlay');
        const openCameraBtn = document.getElementById('openCameraBtn');
        const toggleCameraHeaderBtn = document.getElementById('toggleCameraHeaderBtn');
        const cameraHeaderBtnText = document.getElementById('cameraHeaderBtnText');
        const switchCameraHeaderBtn = document.getElementById('switchCameraHeaderBtn');
        const troubleshootNotice = document.getElementById('cameraTroubleshootNotice');
        const troubleshootText = document.getElementById('cameraTroubleshootText');
        const laser = document.getElementById('guardLaser');

        if (!video || !canvas) return;

        // Wire click handlers for explicit user camera activation
        if (openCameraBtn) {
            openCameraBtn.addEventListener('click', (e) => {
                e.preventDefault();
                startCamera();
            });
        }

        if (toggleCameraHeaderBtn) {
            toggleCameraHeaderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isCameraRunning) {
                    stopCamera();
                } else {
                    startCamera();
                }
            });
        }

        if (switchCameraHeaderBtn) {
            switchCameraHeaderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchCamera();
            });
        }

        async function enumerateCameras() {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    availableVideoDevices = devices.filter(d => d.kind === 'videoinput');
                    if (availableVideoDevices.length > 1 && switchCameraHeaderBtn) {
                        switchCameraHeaderBtn.classList.remove('hidden');
                        switchCameraHeaderBtn.style.display = 'flex';
                    }
                }
            } catch (e) {}
        }

        async function switchCamera() {
            if (availableVideoDevices.length > 1) {
                currentDeviceIndex = (currentDeviceIndex + 1) % availableVideoDevices.length;
                const nextDevice = availableVideoDevices[currentDeviceIndex];
                stopCamera();
                await startCamera({ video: { deviceId: { exact: nextDevice.deviceId } }, audio: false });
            } else {
                currentCameraFacing = (currentCameraFacing === 'user') ? 'environment' : 'user';
                stopCamera();
                await startCamera({ video: { facingMode: currentCameraFacing }, audio: false });
            }
        }

        async function startCamera(customConstraints) {
            if (isCameraRunning && currentVideoStream) {
                console.log('[Guard Cam] Camera is already active.');
                return;
            }

            try {
                if (troubleshootNotice) {
                    troubleshootNotice.classList.add('hidden');
                    troubleshootNotice.style.display = 'none';
                }
                if (toast) toast.textContent = 'Requesting camera access...';
                if (cameraHeaderBtnText) cameraHeaderBtnText.textContent = 'Opening...';

                // Verify browser support & secure context
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    if (!isLocal && !window.isSecureContext) {
                        throw new Error('Camera requires HTTPS or http://localhost. Please navigate using http://localhost:8089/guard.html.');
                    }
                    throw new Error('Camera API (getUserMedia) is not supported in this browser environment.');
                }

                // 1. HARDWARE CAMERA STREAM: Open immediately with multi-tier fallback
                let stream = null;
                const preferredConstraints = customConstraints || {
                    video: {
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        facingMode: currentCameraFacing
                    },
                    audio: false
                };

                try {
                    stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
                } catch (prefErr) {
                    console.warn('[Guard Cam] Preferred constraints rejected, trying basic facingMode...', prefErr);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: currentCameraFacing },
                            audio: false
                        });
                    } catch (facingErr) {
                        console.warn('[Guard Cam] FacingMode rejected, requesting bare { video: true }...', facingErr);
                        stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    }
                }

                if (!stream) {
                    throw new Error('No video stream returned from camera device.');
                }

                // Stop any previous tracks
                if (currentVideoStream) {
                    try { currentVideoStream.getTracks().forEach(t => t.stop()); } catch (e) {}
                }
                currentVideoStream = stream;

                // Bind stream to video element
                video.srcObject = stream;
                video.setAttribute('playsinline', 'true');
                video.setAttribute('muted', 'true');
                video.setAttribute('autoplay', 'true');
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;

                // Play video immediately
                try {
                    await video.play();
                } catch (playErr) {
                    console.warn('[Guard Cam] Autoplay warning:', playErr);
                    setTimeout(() => { try { video.play(); } catch(e){} }, 50);
                }

                isCameraRunning = true;

                // IMMEDIATELY HIDE OVERLAY so user sees their camera viewfinder in <100ms
                if (standbyOverlay) {
                    standbyOverlay.classList.add('hidden');
                    standbyOverlay.style.display = 'none';
                }
                if (laser) laser.style.display = 'block';
                if (cameraHeaderBtnText) cameraHeaderBtnText.textContent = 'Stop Camera';
                if (toggleCameraHeaderBtn) {
                    toggleCameraHeaderBtn.classList.remove('bg-red-600/20', 'text-red-300', 'border-red-500/40');
                    toggleCameraHeaderBtn.classList.add('bg-neutral-800', 'text-white', 'border-white/30');
                }

                if (toast) toast.textContent = 'Turnstile Camera Active. Initializing AI facial recognition...';

                enumerateCameras();

                // 2. NEURAL NETWORK INITIALIZATION (Runs in background while camera is already showing live video)
                (async () => {
                    try {
                        if (!guardSdk) {
                            guardSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.58, minConfidence: 0.35 });
                        }
                        if (!guardSdk.isInitialized) {
                            await guardSdk.init();
                        }

                        // Attach live stream to SDK
                        guardSdk.videoStream = stream;
                        guardSdk.videoElement = video;

                        // Ensure cloud data is loaded if not already
                        if (allProfiles.length === 0 && allFaces.length === 0) {
                            await refreshAllCloudData();
                        }

                        await enrollAllFacesIntoSdk();

                        const totalEnrolled = guardSdk.enrolledPeople ? guardSdk.enrolledPeople.size : 0;
                        if (toast) toast.textContent = `Gate Scanner Ready • Facial Recognition Online (${totalEnrolled} face(s) enrolled) ✓`;
                        startScanLoop();
                    } catch (sdkErr) {
                        console.error('[Guard AI Error]', sdkErr);
                        if (toast) toast.textContent = 'Camera active • AI model loading from CDN...';
                    }
                })();

            } catch (err) {
                console.error('[Guard Cam Hardware Error]', err);
                isCameraRunning = false;
                if (standbyOverlay) {
                    standbyOverlay.classList.remove('hidden');
                    standbyOverlay.style.display = 'flex';
                }
                if (laser) laser.style.display = 'none';
                if (cameraHeaderBtnText) cameraHeaderBtnText.textContent = 'Open Camera';
                if (toggleCameraHeaderBtn) {
                    toggleCameraHeaderBtn.classList.remove('bg-neutral-800', 'text-white', 'border-white/30');
                }

                if (troubleshootNotice) {
                    troubleshootNotice.classList.remove('hidden');
                    troubleshootNotice.style.display = 'block';
                    if (troubleshootText) {
                        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || (err.message && err.message.toLowerCase().includes('denied'))) {
                            troubleshootText.innerHTML = 'Camera access was blocked by the browser. Click the lock or camera permission icon in your browser address bar at the top, select <strong>"Allow"</strong>, and click <strong>Open Camera</strong>.';
                        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                            troubleshootText.textContent = 'No camera hardware found. Please connect a USB webcam or enable your device camera in Windows Privacy Settings.';
                        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                            troubleshootText.textContent = 'Camera is currently in use by another program (Teams, Zoom, browser tab). Please close other camera apps and retry.';
                        } else {
                            troubleshootText.textContent = `Camera error: ${err.message}. Ensure you are running on http://localhost:8089/guard.html.`;
                        }
                    }
                }
                if (toast) toast.textContent = `Camera error: ${err.message}`;
            }
        }

        function stopCamera() {
            isCameraRunning = false;
            if (cameraLoopId) cancelAnimationFrame(cameraLoopId);
            if (currentVideoStream) {
                try {
                    currentVideoStream.getTracks().forEach(t => t.stop());
                } catch (e) {}
                currentVideoStream = null;
            }
            if (guardSdk) guardSdk.stopCamera();
            if (video) video.srcObject = null;
            if (standbyOverlay) {
                standbyOverlay.classList.remove('hidden');
                standbyOverlay.style.display = 'flex';
            }
            if (laser) laser.style.display = 'none';
            if (cameraHeaderBtnText) cameraHeaderBtnText.textContent = 'Open Camera';
            if (toggleCameraHeaderBtn) {
                toggleCameraHeaderBtn.classList.remove('bg-neutral-800', 'text-white', 'border-white/30');
            }
            if (toast) toast.textContent = 'Turnstile Camera Stopped. Click Open Camera to resume.';
        }

        // Bind internal implementations to global hooks
        window._guardInternalStartCamera = startCamera;
        window._guardInternalStopCamera = stopCamera;
        window._guardInternalToggleCamera = () => {
            if (isCameraRunning) stopCamera();
            else startCamera();
        };
        window._guardInternalSwitchCamera = switchCamera;
    }

    // Enroll all faces from Supabase Cloud + FaceDB into the SDK FaceMatcher
    async function enrollAllFacesIntoSdk() {
        if (!guardSdk) return;
        guardSdk.clearAllEnrolled();

        // 1. From local FaceDB (IndexedDB)
        if (window.faceDB) {
            try {
                await window.faceDB.init();
                const people = await window.faceDB.getAllPeople();
                people.forEach(p => {
                    if (p.name && p.descriptors) {
                        guardSdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo });
                    }
                });
            } catch (e) {
                console.warn('[Guard] Local FaceDB enroll notice:', e);
            }
        }

        // 2. From Supabase Cloud faces table
        allFaces.forEach(f => {
            if (f.name && f.descriptors) {
                guardSdk.enrollPerson(f.name, f.descriptors, {
                    role: f.role || 'Attendee',
                    photo: f.photo_url || ''
                });
            }
        });

        // 3. From Supabase Cloud profiles table
        allProfiles.forEach(p => {
            if (p.name && p.descriptors && p.descriptors.length > 0) {
                guardSdk.enrollPerson(p.name, p.descriptors, {
                    role: `${p.loyalty_tier || 'Standard'} Member`,
                    photo: p.photo_url || ''
                });
            } else if (p.name && p.photo_url && guardSdk.enrolledPeople.has(p.name)) {
                // Attach photo metadata if missing
                const enrolled = guardSdk.enrolledPeople.get(p.name);
                if (!enrolled.photo) enrolled.photo = p.photo_url;
            }
        });

        const totalEnrolled = guardSdk.enrolledPeople.size;
        console.log(`[Guard SDK] FaceMatcher ready with ${totalEnrolled} attendee(s):`, Array.from(guardSdk.enrolledPeople.keys()));

        const metricFaces = document.getElementById('metricEnrolledFaces');
        if (metricFaces) metricFaces.textContent = totalEnrolled;
    }

    // ----------------------------------------------------
    // REAL-TIME BIOMETRIC SCAN LOOP
    // ----------------------------------------------------
    let isProcessingFrame = false;
    let consecutiveMatchCount = 0;
    let lastInspectedName = '';

    function startScanLoop() {
        const video = document.getElementById('guardVideo');
        const canvas = document.getElementById('guardCanvas');
        const toast = document.getElementById('liveDetectionToast');
        const engineText = document.getElementById('engineStatusText');

        async function loop() {
            if (!isCameraRunning) return;

            if (!isProcessingFrame && video.readyState >= 2 && video.videoWidth > 0) {
                isProcessingFrame = true;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                try {
                    const results = await guardSdk.recognize(video);
                    guardSdk.drawHUD(canvas, results);

                    if (results.length > 0) {
                        if (engineText) engineText.textContent = `FACE DETECTED (${results.length})`;

                        const recognizedMatch = results.find(r => r.isRecognized);
                        if (recognizedMatch) {
                            const personName = recognizedMatch.name;
                            const similarity = recognizedMatch.confidence || 95;

                            lastInspectedName = personName;
                            consecutiveMatchCount++;

                            // Capture live video frame snapshot
                            captureLiveInspectSnapshot(video, recognizedMatch.box);

                            // Inspect attendee ticket and evaluate admission verdict immediately
                            evaluateGateAdmission(personName, similarity, recognizedMatch);

                            if (toast) {
                                toast.textContent = `Recognized: ${personName} (${similarity}% match) — Analyzing ticket...`;
                            }

                        } else {
                            // Face detected, but not enrolled in database
                            consecutiveMatchCount = 0;
                            lastInspectedName = '';
                            renderUnknownFaceVerdict();
                            if (toast) {
                                toast.textContent = `⚠️ Unrecognized face in frame. No matching biometric profile.`;
                            }
                        }

                    } else {
                        consecutiveMatchCount = 0;
                        if (engineText) engineText.textContent = 'SCANNING...';
                    }

                } catch (err) {
                    console.debug('Guard loop notice:', err);
                } finally {
                    isProcessingFrame = false;
                }
            }

            cameraLoopId = requestAnimationFrame(loop);
        }

        loop();
    }

    // Captures the live camera face crop into the inspector card
    function captureLiveInspectSnapshot(video, box) {
        const liveCanvas = document.getElementById('inspectLiveCanvas');
        const placeholder = document.getElementById('inspectLivePlaceholder');
        if (!liveCanvas || !video) return;

        const ctx = liveCanvas.getContext('2d');
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        let cx = vw / 2;
        let cy = vh / 2;
        let size = Math.min(vw, vh) * 0.6;

        if (box && box.width > 0) {
            cx = box.x + box.width / 2;
            cy = box.y + box.height / 2;
            size = Math.max(box.width, box.height) * 1.4;
        }

        size = Math.min(size, Math.min(vw, vh));
        const sx = Math.max(0, Math.min(vw - size, cx - size / 2));
        const sy = Math.max(0, Math.min(vh - size, cy - size / 2));

        ctx.drawImage(video, sx, sy, size, size, 0, 0, liveCanvas.width, liveCanvas.height);
        liveCanvas.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
    }

    // ----------------------------------------------------
    // ATTENDEE TICKET HISTORY RENDERING
    // ----------------------------------------------------
    function renderAttendeeTicketHistory(attendeeTickets, matchingTicket, selectedOngoingEvent) {
        const container = document.getElementById('inspectTicketHistoryList');
        const countBadge = document.getElementById('inspectHistoryCountBadge');
        if (!container) return;

        const count = (attendeeTickets || []).length;
        if (countBadge) {
            countBadge.textContent = `${count} Ticket${count === 1 ? '' : 's'}`;
        }

        if (!attendeeTickets || attendeeTickets.length === 0) {
            container.innerHTML = `
                <div class="py-4 text-center text-xs text-neutral-400 font-mono">
                    No tickets found on record for this face.
                </div>
            `;
            return;
        }

        container.innerHTML = attendeeTickets.map(t => {
            const isSelectedEvent = (selectedOngoingEvent !== 'all') && (t.eventTitle === selectedOngoingEvent);
            const isMatched = matchingTicket && (t.bookingId === matchingTicket.bookingId);

            let statusBadge = '';
            let borderStyle = 'border-white/10 bg-neutral-900/60';

            if (t.status === 'REFUNDED') {
                statusBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-950 text-red-400 border border-red-500/40">REFUNDED</span>';
                borderStyle = 'border-red-500/30 bg-red-950/20';
            } else if (t.status === 'CHECKED_IN') {
                statusBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-500/40">ALREADY USED</span>';
                borderStyle = 'border-amber-500/30 bg-amber-950/20';
            } else if (isSelectedEvent || selectedOngoingEvent === 'all') {
                statusBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1"><span>PASS ELIGIBLE</span><span>✓</span></span>';
                borderStyle = 'border-emerald-500/70 bg-emerald-950/40 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/30';
            } else {
                statusBadge = '<span class="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-neutral-800 text-neutral-300 border border-white/10">OTHER EVENT</span>';
            }

            const seatsStr = Array.isArray(t.seats) ? t.seats.join(', ') : (t.seats || 'General');

            return `
                <div class="p-3 rounded-xl border ${borderStyle} transition-all space-y-1.5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="font-bold text-white text-xs leading-snug truncate">
                            ${t.eventTitle}
                        </div>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                        <span>ID: <strong class="text-neutral-200">${t.bookingId}</strong></span>
                        <span>Seats: <strong class="text-emerald-400 font-sans font-semibold">${seatsStr}</strong></span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-neutral-500 border-t border-white/5 pt-1">
                        <span>${t.date || 'TBD'} • ${t.time || '19:00'}</span>
                        <span>₹${(t.totalAmount || 0).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // GATE ADMISSION VERDICT & ONGOING EVENT EVALUATION
    // ----------------------------------------------------
    function evaluateGateAdmission(attendeeName, confidence, matchData) {
        const gateId = document.getElementById('guardGateSelect')?.value || 'Gate 1 - Main Turnstile';
        const inspectProfilePhoto = document.getElementById('inspectProfilePhoto');
        const inspectProfilePlaceholder = document.getElementById('inspectProfilePhotoPlaceholder');
        const inspectProfileName = document.getElementById('inspectProfileName');
        const inspectMatchSimilarity = document.getElementById('inspectMatchSimilarity');

        // Look up registered attendee profile
        const profile = allProfiles.find(p => p.name.toLowerCase() === attendeeName.toLowerCase()) ||
                        allFaces.find(f => f.name.toLowerCase() === attendeeName.toLowerCase()) ||
                        { name: attendeeName, photo_url: matchData.photo || '' };

        currentInspectedAttendee = profile;

        if (inspectProfileName) inspectProfileName.textContent = profile.name;
        if (inspectMatchSimilarity) inspectMatchSimilarity.textContent = `Match: ${confidence}%`;

        if (profile.photo_url || profile.photo) {
            inspectProfilePhoto.src = profile.photo_url || profile.photo;
            inspectProfilePhoto.classList.remove('hidden');
            inspectProfilePlaceholder?.classList.add('hidden');
        }

        // Look up all tickets bound to this attendee
        const cleanAttendee = attendeeName.trim().toLowerCase();
        const attendeeTickets = allTickets.filter(t => {
            const name = (t.buyerName || t.name || '').trim().toLowerCase();
            return name === cleanAttendee || name.includes(cleanAttendee) || cleanAttendee.includes(name);
        });

        const ongoingEvent = selectedEventFilter;
        let targetTicket = null;
        let isPassVerdict = false;
        let verdictStatusType = 'NONE'; // 'VALID_ONGOING', 'WRONG_EVENT', 'CHECKED_IN', 'REFUNDED', 'NO_TICKET'

        if (ongoingEvent !== 'all') {
            // Find ticket specifically for the chosen ongoing event
            const eventTicket = attendeeTickets.find(t => {
                if (!t.eventTitle) return false;
                const tTitle = t.eventTitle.trim().toLowerCase();
                const oEvent = ongoingEvent.trim().toLowerCase();
                return tTitle === oEvent || tTitle.includes(oEvent) || oEvent.includes(tTitle);
            });
            if (eventTicket) {
                targetTicket = eventTicket;
                if (eventTicket.status === 'REFUNDED') {
                    verdictStatusType = 'REFUNDED';
                } else if (eventTicket.status === 'CHECKED_IN') {
                    verdictStatusType = 'CHECKED_IN';
                } else {
                    verdictStatusType = 'VALID_ONGOING';
                    isPassVerdict = true;
                }
            } else {
                verdictStatusType = 'WRONG_EVENT';
                // Point targetTicket to their first available ticket so guard can inspect what they hold
                targetTicket = attendeeTickets[0] || null;
            }
        } else {
            // Open Gate Admission (Any valid active event ticket)
            const activeTicket = attendeeTickets.find(t => t.status !== 'REFUNDED' && t.status !== 'CHECKED_IN');
            if (activeTicket) {
                targetTicket = activeTicket;
                verdictStatusType = 'VALID_ONGOING';
                isPassVerdict = true;
            } else if (attendeeTickets.some(t => t.status === 'CHECKED_IN')) {
                targetTicket = attendeeTickets.find(t => t.status === 'CHECKED_IN');
                verdictStatusType = 'CHECKED_IN';
            } else if (attendeeTickets.some(t => t.status === 'REFUNDED')) {
                targetTicket = attendeeTickets.find(t => t.status === 'REFUNDED');
                verdictStatusType = 'REFUNDED';
            } else {
                verdictStatusType = 'NO_TICKET';
            }
        }

        currentInspectedTicket = targetTicket;
        updateInspectorCardDetails(targetTicket, attendeeName, profile);
        renderAttendeeTicketHistory(attendeeTickets, targetTicket, ongoingEvent);

        const banner = document.getElementById('verdictBanner');
        const dot = document.getElementById('verdictIndicatorDot');
        const title = document.getElementById('verdictTitle');
        const timeBadge = document.getElementById('verdictTimeBadge');
        const admitBtn = document.getElementById('verdictAdmitBtn');
        const frameContainer = document.getElementById('scannerFrameContainer');

        if (timeBadge) timeBadge.textContent = new Date().toTimeString().split(' ')[0];

        // CASE 1: Valid Ticket for Ongoing Event -> PASSED / ACCESS GRANTED ✓
        if (isPassVerdict && targetTicket) {
            if (banner) banner.className = 'p-5 rounded-3xl bg-emerald-950/80 border-2 border-emerald-500 shadow-2xl transition-all glow-success';
            if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping';
            if (title) title.innerHTML = `<span class="text-emerald-400 font-black">PASSED ✓</span> — TICKET VERIFIED FOR EVENT`;
            if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-2xl shadow-emerald-500/30 transition-all';

            playSound('success');
            if (admitBtn) {
                admitBtn.className = 'w-full btn-glass-primary py-3 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer';
                admitBtn.innerHTML = `<span>Admit ${attendeeName} (Unlock Turnstile)</span> &rarr;`;
                admitBtn.disabled = false;
            }

            recordGateLog({
                attendee: attendeeName,
                photo: profile.photo_url || profile.photo || '',
                gateId,
                verdict: 'GRANTED',
                confidence: `${confidence}%`,
                note: `Admitted for "${targetTicket.eventTitle}" • Seats: ${targetTicket.seats?.join(', ')}`
            });

        // CASE 2: Wrong Event -> ACCESS DENIED ✕
        } else if (verdictStatusType === 'WRONG_EVENT') {
            if (banner) banner.className = 'p-5 rounded-3xl bg-red-950/90 border-2 border-red-500 shadow-2xl transition-all glow-danger';
            if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-red-500';
            if (title) title.innerHTML = `<span class="text-red-400 font-black">DENIED ✕</span> — NO TICKET FOR ONGOING EVENT`;
            if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-red-500 shadow-2xl shadow-red-500/50 transition-all';

            playSound('denied');
            if (admitBtn) {
                admitBtn.className = 'w-full py-3 rounded-xl bg-red-950 border border-red-500/50 text-red-300 font-bold text-xs cursor-not-allowed opacity-75';
                const hasCount = attendeeTickets.length;
                admitBtn.innerHTML = `<span>Wrong Event (Holds ${hasCount} other pass${hasCount===1?'':'es'}, not ${ongoingEvent})</span>`;
                admitBtn.disabled = true;
            }

            const otherTitles = attendeeTickets.map(t => t.eventTitle).join(', ');
            recordGateLog({
                attendee: attendeeName,
                photo: profile.photo_url || profile.photo || '',
                gateId,
                verdict: 'DENIED',
                confidence: `${confidence}%`,
                note: `Wrong Event: Attempted entry to "${ongoingEvent}". Attendee holds tickets for: ${otherTitles || 'None'}`
            });

        // CASE 3: Ticket Already Checked In -> ACCESS DENIED ✕
        } else if (verdictStatusType === 'CHECKED_IN') {
            if (banner) banner.className = 'p-5 rounded-3xl bg-amber-950/80 border-2 border-amber-500 shadow-2xl transition-all';
            if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-amber-400';
            if (title) title.innerHTML = `<span class="text-amber-400 font-black">DENIED ✕</span> — TICKET ALREADY USED`;
            if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-amber-500 shadow-2xl transition-all';

            playSound('alert');
            if (admitBtn) {
                admitBtn.className = 'w-full py-3 rounded-xl bg-gray-800 text-gray-400 font-bold text-xs cursor-not-allowed opacity-60';
                admitBtn.innerHTML = `<span>Ticket Already Checked In</span>`;
                admitBtn.disabled = true;
            }

            recordGateLog({
                attendee: attendeeName,
                photo: profile.photo_url || profile.photo || '',
                gateId,
                verdict: 'DENIED',
                confidence: `${confidence}%`,
                note: `Duplicate Entry Attempt: Already checked in for ${targetTicket?.eventTitle}`
            });

        // CASE 4: Ticket Refunded / Revoked -> ACCESS DENIED ✕
        } else if (verdictStatusType === 'REFUNDED') {
            if (banner) banner.className = 'p-5 rounded-3xl bg-red-950/90 border-2 border-red-500 shadow-2xl transition-all glow-danger';
            if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-red-500';
            if (title) title.innerHTML = `<span class="text-red-400 font-black">DENIED ✕</span> — TICKET REFUNDED / REVOKED`;
            if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-red-500 shadow-2xl shadow-red-500/50 transition-all';

            playSound('denied');
            if (admitBtn) {
                admitBtn.className = 'w-full py-3 rounded-xl bg-red-950 border border-red-500 text-red-300 font-bold text-xs cursor-not-allowed opacity-75';
                admitBtn.innerHTML = `<span>Biometrics Revoked (Refunded Ticket)</span>`;
                admitBtn.disabled = true;
            }

            recordGateLog({
                attendee: attendeeName,
                photo: profile.photo_url || profile.photo || '',
                gateId,
                verdict: 'DENIED',
                confidence: `${confidence}%`,
                note: `Security Alert: Attempted admission on refunded ticket #${targetTicket?.bookingId}`
            });

        // CASE 5: Attendee Enrolled but NO Ticket on Record -> ACCESS DENIED ✕
        } else {
            if (banner) banner.className = 'p-5 rounded-3xl bg-red-950/90 border-2 border-red-500/80 shadow-2xl transition-all';
            if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-red-500';
            if (title) title.innerHTML = `<span class="text-red-400 font-black">DENIED ✕</span> — NO TICKET ON FILE`;
            if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-red-500 transition-all';

            playSound('denied');
            if (admitBtn) {
                admitBtn.className = 'w-full py-3 rounded-xl bg-gray-800 text-gray-400 font-bold text-xs cursor-not-allowed';
                admitBtn.innerHTML = `<span>No Ticket Found on File</span>`;
                admitBtn.disabled = true;
            }

            recordGateLog({
                attendee: attendeeName,
                photo: profile.photo_url || profile.photo || '',
                gateId,
                verdict: 'DENIED',
                confidence: `${confidence}%`,
                note: `Attendee has registered face, but no tickets purchased in TruePass system.`
            });
        }
    }

    // Handles Unknown face verdict
    function renderUnknownFaceVerdict() {
        const banner = document.getElementById('verdictBanner');
        const dot = document.getElementById('verdictIndicatorDot');
        const title = document.getElementById('verdictTitle');
        const timeBadge = document.getElementById('verdictTimeBadge');
        const admitBtn = document.getElementById('verdictAdmitBtn');
        const frameContainer = document.getElementById('scannerFrameContainer');

        if (timeBadge) timeBadge.textContent = new Date().toTimeString().split(' ')[0];
        if (banner) banner.className = 'p-5 rounded-3xl bg-gray-900 border border-red-500/40 shadow-2xl transition-all';
        if (dot) dot.className = 'w-3.5 h-3.5 rounded-full bg-red-500';
        if (title) title.innerHTML = `<span class="text-red-400 font-black">DENIED ✕</span> — UNREGISTERED ATTENDEE`;
        if (frameContainer) frameContainer.className = 'relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border-2 border-red-500/70 transition-all';

        document.getElementById('inspectTicketId').textContent = 'UNAUTHORIZED';
        document.getElementById('inspectEventTitle').textContent = '--';
        document.getElementById('inspectSeats').textContent = '--';
        document.getElementById('inspectHolderName').textContent = 'Unregistered Face';
        document.getElementById('inspectTierBadge').textContent = 'No Account';
        document.getElementById('inspectStatusBadge').className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-500/40';
        document.getElementById('inspectStatusBadge').textContent = 'UNKNOWN';

        const historyContainer = document.getElementById('inspectTicketHistoryList');
        if (historyContainer) {
            historyContainer.innerHTML = `
                <div class="py-4 text-center text-xs text-red-400 font-mono">
                    Unregistered attendee face. No ticket history on record.
                </div>
            `;
        }
        const countBadge = document.getElementById('inspectHistoryCountBadge');
        if (countBadge) countBadge.textContent = '0 Tickets';

        if (admitBtn) {
            admitBtn.className = 'w-full py-3 rounded-xl bg-gray-800 text-gray-500 font-bold text-xs cursor-not-allowed';
            admitBtn.innerHTML = `<span>Unregistered Face (Deny Entry)</span>`;
            admitBtn.disabled = true;
        }
    }

    // Updates details inside the attendee inspector card
    function updateInspectorCardDetails(ticket, name, profile) {
        document.getElementById('inspectTicketId').textContent = ticket ? ticket.bookingId : 'NONE';
        document.getElementById('inspectEventTitle').textContent = ticket ? ticket.eventTitle : 'No Active Event';
        document.getElementById('inspectSeats').textContent = ticket ? (ticket.seats?.join(', ') || 'General') : 'None';
        document.getElementById('inspectHolderName').textContent = name || 'Member';
        document.getElementById('inspectTierBadge').textContent = (profile.loyalty_tier || 'Standard') + ' Member';

        const statusBadge = document.getElementById('inspectStatusBadge');
        if (!statusBadge) return;

        if (!ticket) {
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-500/40';
            statusBadge.textContent = 'NO PASS';
        } else if (ticket.status === 'CHECKED_IN') {
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-500/40';
            statusBadge.textContent = 'CHECKED IN';
        } else if (ticket.status === 'REFUNDED') {
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-500/50';
            statusBadge.textContent = 'REFUNDED';
        } else {
            statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40';
            statusBadge.textContent = 'ACTIVE TICKET';
        }
    }

    // ----------------------------------------------------
    // SECURITY GUARD OPERATOR ACTIONS
    // ----------------------------------------------------
    function setupGateActions() {
        const verdictAdmitBtn = document.getElementById('verdictAdmitBtn');
        const manualAdmitBtn = document.getElementById('manualAdmitBtn');
        const manualDenyBtn = document.getElementById('manualDenyBtn');

        // Admit Attendee & Confirm Check-In
        if (verdictAdmitBtn) {
            verdictAdmitBtn.addEventListener('click', () => {
                if (currentInspectedTicket && currentInspectedTicket.status !== 'REFUNDED') {
                    admitTicketAttendee(currentInspectedTicket);
                }
            });
        }

        if (manualAdmitBtn) {
            manualAdmitBtn.addEventListener('click', () => {
                if (currentInspectedTicket) {
                    admitTicketAttendee(currentInspectedTicket);
                } else if (allTickets.length > 0) {
                    // Prompt guard to choose ticket from list
                    document.getElementById('navTabTickets')?.click();
                }
            });
        }

        // Manual Deny Entry
        if (manualDenyBtn) {
            manualDenyBtn.addEventListener('click', () => {
                const gateId = document.getElementById('guardGateSelect')?.value || 'Gate 1 - Main Turnstile';
                const name = currentInspectedAttendee ? currentInspectedAttendee.name : 'Unknown';
                playSound('denied');

                recordGateLog({
                    attendee: name,
                    photo: currentInspectedAttendee?.photo_url || '',
                    gateId,
                    verdict: 'DENIED',
                    confidence: 'Manual',
                    note: 'Security Officer Denied Entry Manually at Gate Turnstile.'
                });

                if (window.showToast) window.showToast(`Entry Denied for ${name} by Security Officer`, 'error');
            });
        }
    }

    // Admits the attendee and updates Supabase Cloud
    async function admitTicketAttendee(ticket) {
        if (!ticket) return;

        ticket.status = 'CHECKED_IN';
        ticket.admittedAt = new Date().toISOString();

        // 1. Update in local storage
        try {
            const localRaw = localStorage.getItem('truepass_ticket_bookings') || '[]';
            const local = JSON.parse(localRaw);
            const idx = local.findIndex(t => t.bookingId === ticket.bookingId);
            if (idx >= 0) {
                local[idx].status = 'CHECKED_IN';
                local[idx].admittedAt = ticket.admittedAt;
                localStorage.setItem('truepass_ticket_bookings', JSON.stringify(local));
            }
        } catch (e) {}

        // 2. Update in Supabase Cloud public.tickets table
        if (window.supabaseSync && window.supabaseSync.client) {
            try {
                await window.supabaseSync.client
                    .from('tickets')
                    .update({ status: 'CHECKED_IN' })
                    .eq('booking_id', ticket.bookingId);
            } catch (err) {
                console.warn('[Guard] Supabase update check-in note:', err);
            }
        }

        playSound('success');
        updateMetricCounters();
        renderTicketsTable();

        const banner = document.getElementById('verdictBanner');
        const title = document.getElementById('verdictTitle');
        if (banner) banner.className = 'p-5 rounded-3xl bg-emerald-950/90 border border-emerald-400 shadow-2xl';
        if (title) title.innerHTML = `<span class="text-white font-black">ADMITTED ✓</span> — TURNSTILE UNLOCKED`;

        const admitBtn = document.getElementById('verdictAdmitBtn');
        if (admitBtn) {
            admitBtn.className = 'w-full py-3 rounded-xl bg-gray-800 text-emerald-400 font-bold text-xs cursor-default';
            admitBtn.innerHTML = `<span>✓ Attendee Admitted Successfully</span>`;
        }

        if (window.showToast) {
            window.showToast(`Gate Turnstile Unlocked: ${ticket.buyerName} admitted to ${ticket.eventTitle}`, 'success');
        }
    }

    // ----------------------------------------------------
    // TICKETS ROSTER TABLE RENDERING
    // ----------------------------------------------------
    function setupSearchAndFilters() {
        const searchInput = document.getElementById('ticketSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => renderTicketsTable());
        }

        const filterBtns = document.querySelectorAll('.ticket-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.className = 'ticket-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-gray-900 border border-gray-800';
                });
                btn.className = 'ticket-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white';
                currentTicketFilter = btn.dataset.filter;
                renderTicketsTable();
            });
        });

        const faceSearch = document.getElementById('faceSearchInput');
        if (faceSearch) {
            faceSearch.addEventListener('input', () => renderFacesGrid());
        }

        const exportBtn = document.getElementById('exportLogsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => exportAuditLogsToCSV());
        }
    }

    function renderTicketsTable() {
        const tbody = document.getElementById('ticketsTableBody');
        const query = (document.getElementById('ticketSearchInput')?.value || '').toLowerCase().trim();

        if (!tbody) return;

        let filtered = allTickets.filter(t => {
            // Event filter
            if (selectedEventFilter !== 'all' && t.eventTitle !== selectedEventFilter) return false;

            // Status filter
            if (currentTicketFilter === 'active' && (t.status === 'REFUNDED' || t.status === 'CHECKED_IN')) return false;
            if (currentTicketFilter === 'checkedin' && t.status !== 'CHECKED_IN') return false;
            if (currentTicketFilter === 'refunded' && t.status !== 'REFUNDED') return false;

            // Text search query
            if (query) {
                const name = (t.buyerName || '').toLowerCase();
                const id = (t.bookingId || '').toLowerCase();
                const event = (t.eventTitle || '').toLowerCase();
                const seats = (t.seats || []).join(' ').toLowerCase();
                return name.includes(query) || id.includes(query) || event.includes(query) || seats.includes(query);
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-gray-500 font-mono">
                        No tickets matching current filters.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(t => {
            const profile = allProfiles.find(p => p.name.toLowerCase() === (t.buyerName || '').toLowerCase());
            const photoUrl = t.photoDataUrl || profile?.photo_url || profile?.photo || 'https://via.placeholder.com/80';

            let statusBadge = '';
            if (t.status === 'CHECKED_IN') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">CHECKED IN</span>';
            } else if (t.status === 'REFUNDED') {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/40">REFUNDED</span>';
            } else {
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">ACTIVE PASS</span>';
            }

            const canAdmit = t.status !== 'REFUNDED' && t.status !== 'CHECKED_IN';

            return `
                <tr class="hover:bg-gray-900/60 transition-colors">
                    <td class="p-3.5 pl-6">
                        <div class="flex items-center gap-3">
                            <img src="${photoUrl}" class="w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0">
                            <div>
                                <div class="font-bold text-white text-xs">${escapeHtml(t.buyerName || 'Member')}</div>
                                <div class="text-[11px] text-gray-400 truncate max-w-[150px]">${escapeHtml(t.buyerEmail || 'fan@truepass.io')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="p-3.5 font-mono font-bold text-gray-200">${escapeHtml(t.bookingId)}</td>
                    <td class="p-3.5">
                        <div class="font-bold text-white text-xs">${escapeHtml(t.eventTitle)}</div>
                        <div class="text-[11px] text-gray-400">${escapeHtml(t.venue)}</div>
                    </td>
                    <td class="p-3.5 font-mono text-emerald-400 font-bold">${escapeHtml((t.seats || []).join(', ') || 'GA')}</td>
                    <td class="p-3.5">${statusBadge}</td>
                    <td class="p-3.5">
                        <span class="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            128-d Vector
                        </span>
                    </td>
                    <td class="p-3.5 pr-6 text-right">
                        ${canAdmit ? `
                            <button onclick="window.truePassGuard.fastAdmit('${t.bookingId}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer">
                                Fast Admit
                            </button>
                        ` : `
                            <span class="text-[11px] text-gray-500 font-mono">--</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // FACES DIRECTORY GRID RENDERING
    // ----------------------------------------------------
    function renderFacesGrid() {
        const grid = document.getElementById('facesGrid');
        const query = (document.getElementById('faceSearchInput')?.value || '').toLowerCase().trim();

        if (!grid) return;

        // Combine unique faces
        const combined = [];
        const seenNames = new Set();

        allProfiles.forEach(p => {
            if (p.name && !seenNames.has(p.name.toLowerCase())) {
                seenNames.add(p.name.toLowerCase());
                combined.push({
                    name: p.name,
                    role: `${p.loyalty_tier || 'Standard'} Member`,
                    photo: p.photo_url || p.photo || '',
                    source: 'profiles'
                });
            }
        });

        allFaces.forEach(f => {
            if (f.name && !seenNames.has(f.name.toLowerCase())) {
                seenNames.add(f.name.toLowerCase());
                combined.push({
                    name: f.name,
                    role: f.role || 'Member',
                    photo: f.photo_url || '',
                    source: 'faces'
                });
            }
        });

        const filtered = combined.filter(f => !query || f.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-gray-500 font-mono text-xs">
                    No enrolled face profiles found matching search.
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(f => {
            const ticketCount = allTickets.filter(t => (t.buyerName || '').toLowerCase() === f.name.toLowerCase()).length;
            const photoUrl = f.photo || 'https://via.placeholder.com/150';

            return `
                <div class="glass-panel rounded-2xl p-3.5 text-center space-y-2 relative overflow-hidden group hover:border-red-500/50 transition-all">
                    <div class="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-gray-900 border border-white/10 relative">
                        <img src="${photoUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        <span class="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-emerald-500 text-[8px] font-black text-white">SAVED</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-white text-xs truncate">${escapeHtml(f.name)}</h4>
                        <p class="text-[10px] text-gray-400 truncate">${escapeHtml(f.role)}</p>
                    </div>
                    <div class="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span>Tickets: <strong class="text-emerald-400">${ticketCount}</strong></span>
                        <span class="text-red-400 font-bold">✓ Enrolled</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // GATE ENTRY AUDIT LOGGING & CSV EXPORT
    // ----------------------------------------------------
    function recordGateLog(entry) {
        entry.id = 'LOG-' + Date.now();
        entry.time = new Date().toLocaleTimeString();
        entry.timestamp = new Date().toISOString();

        gateLogs.unshift(entry);
        if (gateLogs.length > 200) gateLogs.pop();

        // Push to Supabase Cloud public.face_logs table if connected
        if (window.supabaseSync && window.supabaseSync.client) {
            try {
                window.supabaseSync.client.from('face_logs').insert([{
                    name: entry.attendee,
                    role: entry.gateId,
                    status: entry.verdict === 'GRANTED' ? 'ALLOWED' : 'DENIED',
                    confidence: parseFloat(entry.confidence) || 0.95,
                    notes: entry.note,
                    photo_url: entry.photo
                }]).then(() => {}).catch(() => {});
            } catch (e) {}
        }

        renderRecentMiniStream();
        renderLogsTable();
    }

    function renderRecentMiniStream() {
        const stream = document.getElementById('recentScansStream');
        const count = document.getElementById('recentScansCount');
        if (!stream) return;

        if (count) count.textContent = `${gateLogs.length} scans`;

        if (gateLogs.length === 0) {
            stream.innerHTML = `<div class="py-6 text-center text-xs text-gray-500 font-mono">No scans recorded yet this session</div>`;
            return;
        }

        stream.innerHTML = gateLogs.slice(0, 8).map(log => {
            const isGranted = log.verdict === 'GRANTED';
            return `
                <div class="p-2.5 rounded-xl bg-black/60 border ${isGranted ? 'border-emerald-500/30' : 'border-red-500/30'} flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2 h-2 rounded-full ${isGranted ? 'bg-emerald-400' : 'bg-red-500'}"></span>
                        <div>
                            <span class="font-bold text-white text-xs block">${escapeHtml(log.attendee)}</span>
                            <span class="text-[10px] text-gray-400">${escapeHtml(log.note || log.gateId)}</span>
                        </div>
                    </div>
                    <div class="text-right font-mono">
                        <span class="text-[10px] font-bold ${isGranted ? 'text-emerald-400' : 'text-red-400'} block">${log.verdict}</span>
                        <span class="text-[9px] text-gray-500">${log.time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderLogsTable() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;

        if (gateLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500 font-mono">No gate turnstile attempts recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = gateLogs.map(l => {
            const isGranted = l.verdict === 'GRANTED';
            return `
                <tr class="hover:bg-gray-900/60 transition-colors">
                    <td class="p-3.5 pl-6 font-mono text-gray-400">${l.time}</td>
                    <td class="p-3.5 font-bold text-white">${escapeHtml(l.attendee)}</td>
                    <td class="p-3.5 font-mono text-gray-300">${escapeHtml(l.gateId)}</td>
                    <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black ${isGranted ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-red-950 text-red-400 border border-red-500/40'}">
                            ${l.verdict}
                        </span>
                    </td>
                    <td class="p-3.5 font-mono text-gray-300">${l.confidence || '95%'}</td>
                    <td class="p-3.5 text-gray-400 text-xs">${escapeHtml(l.note || '--')}</td>
                </tr>
            `;
        }).join('');
    }

    function exportAuditLogsToCSV() {
        if (gateLogs.length === 0) {
            alert('No audit logs to export.');
            return;
        }

        const headers = ['Timestamp', 'Attendee', 'Gate', 'Verdict', 'Confidence', 'Notes'];
        const rows = gateLogs.map(l => [
            `"${l.timestamp}"`,
            `"${l.attendee.replace(/"/g, '""')}"`,
            `"${l.gateId}"`,
            `"${l.verdict}"`,
            `"${l.confidence}"`,
            `"${(l.note || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `TruePass_Gate_Audit_Log_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }

    // Global Guard Interface
    window.truePassGuard = {
        fastAdmit: function (bookingId) {
            const ticket = allTickets.find(t => t.bookingId === bookingId);
            if (ticket) admitTicketAttendee(ticket);
        },
        refreshData: refreshAllCloudData
    };

})();
