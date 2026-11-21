/**
 * TruePass FastTrack Onboarding & Cloud Sync Engine (v3.0)
 * Features:
 * - Persistent "Stay Signed In" session management + Face ID login
 * - Comprehensive Onboarding intake (Name, Email, Phone, DOB, ID Type & Number, Loyalty Tier, 128-d Vector, Photo) saved directly to Supabase Cloud
 * - Active vs. Expired vs. Refunded ticket tracking associated with face
 * - Ticket Refund method that revokes facial association locally & in Supabase Cloud
 * - Clean Cloud Sync Dashboard & Live Toasts
 * - Turnstile simulator that validates active vs expired tickets
 */

(function () {
    'use strict';

    // Curated catalog with both upcoming and a past/expired event for instant testing!
    const EVENTS_DATA = [
        {
            id: 'taylor-swift-eras',
            title: 'Taylor Swift | The Eras Tour',
            category: 'Concert',
            venue: 'SoFi Stadium & Wembley Arena',
            date: 'Sat, 23 Nov 2026',
            time: '18:30',
            price: 2499,
            poster: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80',
            isPast: false
        },
        {
            id: 'dune-part-two',
            title: 'Dune: Part Two (IMAX 70mm)',
            category: 'Movie',
            venue: 'PVR Superplex & Lincoln Square IMAX',
            date: 'Thu, 26 Nov 2026',
            time: '20:15',
            price: 350,
            poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
            isPast: false
        },
        {
            id: 'coldplay-spheres',
            title: 'Coldplay - Music of the Spheres',
            category: 'Concert',
            venue: 'DY Patil Stadium & MetLife Stadium',
            date: 'Sun, 30 Nov 2026',
            time: '19:00',
            price: 1899,
            poster: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
            isPast: false
        },
        {
            id: 'icc-champions-final',
            title: 'World Champions Trophy Grand Final',
            category: 'Sports',
            venue: 'Wankhede Stadium Arena',
            date: 'Sun, 08 Dec 2026',
            time: '14:00',
            price: 2500,
            poster: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
            isPast: false
        },
        // Past / Expired Event for immediate testing of Expired Ticket feature
        {
            id: 'oppenheimer-imax-past',
            title: 'Oppenheimer (IMAX 70mm Special)',
            category: 'Movie',
            venue: 'BFI London IMAX',
            date: 'Sun, 15 Nov 2026',
            time: '17:00',
            price: 450,
            poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
            isPast: true
        }
    ];

    let currentStep = 1;
    let sdk = null;
    let isCameraScanning = false;
    let cameraLoopId = null;
    let capturedPhotoDataUrl = '';
    let extractedDescriptor = null;
    let currentProfile = null;
    let activeTicketFilter = 'all'; // 'all', 'active', 'expired', 'refunded'

    // Turnstile test state
    let turnstileSdk = null;
    let isTurnstileScanning = false;
    let turnstileLoopId = null;
    let lastGateTrigger = 0;

    const SESSION_KEY = 'truepass_active_session';
    const PROFILE_KEY = 'truepass_onboarded_profile';
    const TICKETS_KEY = 'truepass_biometric_tickets';

    document.addEventListener('DOMContentLoaded', async () => {
        initSdk();
        checkPersistentSession();
        updateSupabaseConnectionStatusUI();
        initEventBookingCards();
        setupListeners();
        renderLinkedTickets();
        refreshCloudSyncOverview();
    });

    function initSdk() {
        if (window.FacialRecognitionSDK) {
            sdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });
            sdk.init().catch(err => console.debug('SDK preload note:', err));
        }
    }

    // ========================================================
    // STAY SIGNED IN / SESSION MANAGEMENT & VIEW SWITCHING
    // ========================================================
    function checkPersistentSession() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode') || '';
        const hash = window.location.hash || '';

        const forceNew = mode === 'new' || mode === 'register' || hash === '#signup' || hash === '#register';
        const forceLogin = mode === 'login' || mode === 'signin' || hash === '#login' || hash === '#signin';

        let session = null;
        try {
            const localRaw = localStorage.getItem(SESSION_KEY);
            const sessionRaw = sessionStorage.getItem(SESSION_KEY);
            session = localRaw ? JSON.parse(localRaw) : (sessionRaw ? JSON.parse(sessionRaw) : null);
        } catch (e) {}

        if (session && session.name) {
            currentProfile = session;
            applyUserSignedInState(session);
            if (forceNew) {
                showEnrollView();
                goToStep(1);
            } else if (forceLogin) {
                showLoginView();
            } else {
                // User is already signed in: redirect directly to tickets.html!
                window.location.href = 'tickets.html';
                return;
            }
        } else {
            currentProfile = null;
            applyUserSignedOutState();
            if (forceLogin) {
                showLoginView();
            } else {
                showEnrollView();
                goToStep(1);
            }
        }
    }

    function showPassView() {
        window.location.href = 'tickets.html';
    }

    function showEnrollView() {
        document.getElementById('onboardingCard')?.classList.remove('hidden');
        document.getElementById('loginCard')?.classList.add('hidden');

        const enrollTab = document.getElementById('viewEnrollTabBtn');
        const loginTab = document.getElementById('viewLoginTabBtn');
        if (enrollTab) enrollTab.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-md shadow-red-600/30';
        if (loginTab) loginTab.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1.5';
    }

    function showLoginView() {
        document.getElementById('onboardingCard')?.classList.add('hidden');
        document.getElementById('loginCard')?.classList.remove('hidden');

        const enrollTab = document.getElementById('viewEnrollTabBtn');
        const loginTab = document.getElementById('viewLoginTabBtn');
        if (enrollTab) enrollTab.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1.5';
        if (loginTab) loginTab.className = 'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-md shadow-red-600/30';

        const idInp = document.getElementById('loginIdentifier');
        if (idInp) idInp.focus();
    }

    function startNewEnrollment() {
        showEnrollView();
        goToStep(1);

        const nameInp = document.getElementById('onboardName');
        const emailInp = document.getElementById('onboardEmail');
        const phoneInp = document.getElementById('onboardPhone');
        const idInp = document.getElementById('onboardIdNumber');
        if (nameInp) nameInp.value = '';
        if (emailInp) emailInp.value = '';
        if (phoneInp) phoneInp.value = '';
        if (idInp) idInp.value = '';

        capturedPhotoDataUrl = '';
        extractedDescriptor = null;

        if (nameInp) nameInp.focus();
        window.scrollTo({ top: 250, behavior: 'smooth' });
    }

    function saveUserSession(profileData, staySignedIn = true) {
        currentProfile = profileData;
        const sessionPayload = {
            ...profileData,
            staySignedIn: !!staySignedIn,
            lastLogin: Date.now()
        };

        if (staySignedIn) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
            localStorage.setItem(PROFILE_KEY, JSON.stringify(sessionPayload));
            sessionStorage.removeItem(SESSION_KEY);
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
            localStorage.removeItem(SESSION_KEY);
        }

        applyUserSignedInState(sessionPayload);
    }

    function applyUserSignedInState(session) {
        const sessionNav = document.getElementById('userSessionNav');
        const userAvatar = document.getElementById('navUserAvatar');
        const userName = document.getElementById('navUserName');
        const userTier = document.getElementById('navUserTier');
        const authActions = document.getElementById('authNavActions');

        if (sessionNav) sessionNav.classList.remove('hidden');
        if (authActions) authActions.classList.add('hidden');
        if (userAvatar) userAvatar.src = session.photo || 'https://via.placeholder.com/80';
        if (userName) userName.textContent = session.name;
        if (userTier) userTier.textContent = `${session.loyaltyTier || 'Standard'} Member`;

        renderMembershipCard(session);
        document.getElementById('profileStatusBanner')?.classList.remove('hidden');
        renderLinkedTickets();
    }

    function applyUserSignedOutState() {
        const sessionNav = document.getElementById('userSessionNav');
        const authActions = document.getElementById('authNavActions');
        if (sessionNav) sessionNav.classList.add('hidden');
        if (authActions) authActions.classList.remove('hidden');

        document.getElementById('profileStatusBanner')?.classList.add('hidden');
    }

    function signOutUser() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PROFILE_KEY);
        sessionStorage.clear();
        currentProfile = null;
        if (window.showToast) {
            window.showToast('Signed out of TruePass session', 'info');
        }
        window.location.href = 'index.html';
    }

    // ========================================================
    // TICKET CLASSIFICATION (ACTIVE VS. EXPIRED VS. REFUNDED)
    // ========================================================
    function classifyTicket(ticket) {
        if (ticket.status === 'REFUNDED') {
            return {
                status: 'REFUNDED',
                badgeText: 'REFUNDED (Face Revoked)',
                badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
                isExpired: false,
                isRefunded: true,
                canEnter: false
            };
        }

        const now = new Date();
        let isPast = false;

        if (ticket.isPast === true) {
            isPast = true;
        } else if (ticket.date) {
            const parsed = new Date(ticket.date);
            if (!isNaN(parsed.getTime())) {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                isPast = parsed < today;
            } else if (ticket.date.toLowerCase().includes('past') || ticket.date.includes('15 Nov 2026')) {
                isPast = true;
            }
        }

        if (isPast) {
            return {
                status: 'EXPIRED',
                badgeText: 'EXPIRED (Event Past)',
                badgeClass: 'bg-gray-800 text-gray-400 border-gray-700',
                isExpired: true,
                isRefunded: false,
                canEnter: false
            };
        }

        return {
            status: 'ACTIVE',
            badgeText: 'ACTIVE (Valid for Entry)',
            badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
            isExpired: false,
            isRefunded: false,
            canEnter: true
        };
    }

    function getAllTickets() {
        try {
            return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    // ========================================================
    // TICKET REFUND METHOD (REMOVES FACE ASSOCIATION)
    // ========================================================
    window.truePassOnboard = {
        refundTicket: async function (bookingId) {
            const allTickets = getAllTickets();
            const ticket = allTickets.find(t => t.bookingId === bookingId);
            if (!ticket) return;

            const confirmed = window.showConfirm
                ? await window.showConfirm({
                    title: 'Refund Ticket?',
                    message: `Are you sure you want to refund booking #${bookingId}?`,
                    detail: `Event: ${ticket.eventTitle}\nSeats: ${ticket.seats.join(', ')}\nAmount: ₹${ticket.totalAmount}\n\nNote: Facial biometric admission will be revoked at turnstiles.`,
                    confirmText: 'Yes, Refund Ticket',
                    cancelText: 'Keep Ticket',
                    confirmColor: 'red'
                })
                : confirm(`Are you sure you want to refund Ticket #${bookingId}?`);

            if (!confirmed) return;

            // 1. Update Ticket Status Locally
            ticket.status = 'REFUNDED';
            ticket.refundedAt = new Date().toISOString();
            localStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

            // 2. Remove Ticket Association from FaceDB (IndexedDB)
            if (window.faceDB && currentProfile) {
                try {
                    const remainingActive = allTickets.filter(t => t.buyerName === currentProfile.name && t.status !== 'REFUNDED' && !classifyTicket(t).isExpired);
                    let newRole = 'FastTrack Member (No Active Tickets)';
                    let newNotes = `Ticket ${bookingId} was refunded on ${new Date().toLocaleDateString()}`;

                    if (remainingActive.length > 0) {
                        newRole = `Ticket Holder: ${remainingActive[0].eventTitle} (Seats: ${remainingActive[0].seats.join(', ')})`;
                        newNotes = `Active Booking: ${remainingActive[0].bookingId} • Refunded ${bookingId}`;
                    }

                    await window.faceDB.savePerson({
                        name: currentProfile.name,
                        role: newRole,
                        photo: currentProfile.photo || '',
                        descriptors: extractedDescriptor ? [extractedDescriptor] : [],
                        notes: newNotes
                    });
                } catch (e) {
                    console.warn('FaceDB refund note:', e);
                }
            }

            // 3. Remove Ticket Association & Mark Refunded in Supabase Cloud
            let cloudRefundResult = null;
            if (window.supabaseSync && window.supabaseSync.isReady) {
                try {
                    cloudRefundResult = await window.supabaseSync.refundTicketInCloud(bookingId, currentProfile ? currentProfile.name : ticket.buyerName);
                    if (window.showToast) window.showToast(`Ticket #${bookingId} refunded in Supabase Cloud (${cloudRefundResult.latencyMs}ms)`, 'success');
                } catch (e) {
                    console.warn('[Supabase Cloud] Refund sync error:', e);
                }
            }

            if (window.soundEffects) window.soundEffects.playAlert();

            renderLinkedTickets();
            refreshCloudSyncOverview();

            if (window.showAlert) {
                window.showAlert({
                    title: 'Ticket Refunded',
                    message: `Ticket #${bookingId} for "${ticket.eventTitle}" has been refunded.\nFacial biometric gate access has been revoked.`,
                    type: 'success'
                });
            }
        },

        quickBook: async function (eventId) {
            const ev = EVENTS_DATA.find(e => e.id === eventId);
            if (!ev) return;

            if (!currentProfile) {
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Pre-Registration Required',
                        message: 'Please complete the Onboarding form above to enroll your face before booking tickets.',
                        type: 'warning'
                    });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const bookingId = 'TP-' + Math.floor(100000 + Math.random() * 900000);
            const assignedSeats = ['A' + Math.floor(1 + Math.random() * 8)];

            const ticket = {
                bookingId,
                eventId: ev.id,
                eventTitle: ev.title,
                venue: ev.venue,
                date: ev.date,
                time: ev.time,
                format: 'VIP FastTrack Reserved',
                seats: assignedSeats,
                totalAmount: ev.price,
                buyerName: currentProfile.name,
                buyerEmail: currentProfile.email,
                buyerPhone: currentProfile.phone,
                idType: currentProfile.idType,
                idNumber: currentProfile.idNumber,
                loyaltyTier: currentProfile.loyaltyTier,
                photoDataUrl: currentProfile.photo,
                faceVerified: true,
                status: 'CONFIRMED',
                isPast: ev.isPast,
                createdAt: new Date().toISOString()
            };

            // 1. Mint Soulbound NFT on Blockchain
            if (window.truePassWeb3) {
                try {
                    const nft = await window.truePassWeb3.mintBiometricTicketNFT(ticket, extractedDescriptor || currentProfile.descriptors?.[0]);
                    ticket.nft = nft;
                } catch (e) {}
            }

            // 2. Save to LocalStorage
            try {
                const existing = getAllTickets();
                existing.unshift(ticket);
                localStorage.setItem(TICKETS_KEY, JSON.stringify(existing));
            } catch (e) {}

            // 2. Sync Ticket to Supabase Cloud
            let cloudLatency = 0;
            if (window.supabaseSync && window.supabaseSync.isReady) {
                try {
                    const res = await window.supabaseSync.saveTicketToCloud(ticket);
                    cloudLatency = res ? res.latencyMs : 0;
                    if (window.showToast) window.showToast(`Ticket #${bookingId} synced to Supabase Cloud (${cloudLatency}ms)`, 'success');
                } catch (e) {
                    console.warn('[Supabase Cloud] Ticket sync warning:', e.message);
                }
            }

            if (window.soundEffects) window.soundEffects.playSuccess();

            renderLinkedTickets();
            refreshCloudSyncOverview();

            const isExpired = classifyTicket(ticket).isExpired;
            if (window.showAlert) {
                window.showAlert({
                    title: 'Ticket Purchased & Bound to Face',
                    message: `Booking #${bookingId} for "${ev.title}" is confirmed!\n\n` +
                        `• Seat: ${assignedSeats[0]}\n` +
                        `• Biometrics: Bound to your enrolled face\n` +
                        `• Status: ${isExpired ? 'Expired (Past Event Demo)' : 'Active (Valid for Admission)'}\n` +
                        `• Cloud Database: ${cloudLatency ? `Synced to Supabase (${cloudLatency}ms)` : 'Stored locally'}`,
                    type: 'success'
                });
            }
        },

        filterTickets: function (filterType) {
            activeTicketFilter = filterType;
            document.querySelectorAll('.ticket-filter-btn').forEach(btn => {
                if (btn.dataset.filter === filterType) {
                    btn.className = 'ticket-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-md shadow-red-600/30';
                } else {
                    btn.className = 'ticket-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-gray-400 hover:text-white border border-gray-800';
                }
            });
            renderLinkedTickets();
        },

        signInWithFace: async function () {
            startFaceIdLogin();
        },

        startNewEnrollment: function () {
            startNewEnrollment();
        },

        showEnrollView: function () {
            showEnrollView();
        },

        showRegisterView: function () {
            showEnrollView();
        },

        showLoginView: function () {
            showLoginView();
        },

        showPassView: function () {
            showPassView();
        },

        goToStep: function (stepNum) {
            goToStep(stepNum);
            if (stepNum === 2) startFaceCapture();
        },

        saveAccountAndProceedToFace: function (e) {
            return saveAccountAndProceedToFace(e);
        },

        proceedToStep2: function (e) {
            return saveAccountAndProceedToFace(e);
        },

        handleUserLogin: function (e) {
            return handleUserLogin(e);
        },

        signOut: function () {
            signOutUser();
        }
    };

    // Render Linked Tickets with Active / Expired / Refunded separation & Refund CTA
    function renderLinkedTickets() {
        const listEl = document.getElementById('linkedTicketsList');
        const activeCountEl = document.getElementById('tabCountActive');
        const expiredCountEl = document.getElementById('tabCountExpired');
        const refundedCountEl = document.getElementById('tabCountRefunded');
        const allCountEl = document.getElementById('tabCountAll');

        if (!listEl) return;

        if (!currentProfile) {
            if (allCountEl) allCountEl.textContent = '0';
            if (activeCountEl) activeCountEl.textContent = '0';
            if (expiredCountEl) expiredCountEl.textContent = '0';
            if (refundedCountEl) refundedCountEl.textContent = '0';
            listEl.innerHTML = `
                <div class="py-12 text-center text-gray-500">
                    <p class="text-sm font-semibold text-gray-400">Please sign in to view your tickets</p>
                    <p class="text-xs text-gray-500 mt-1">Your event tickets and passes are bound directly to your verified facial account.</p>
                </div>
            `;
            return;
        }

        const allTickets = getAllTickets();
        const myEmail = (currentProfile.email || '').toLowerCase().trim();
        const myName = (currentProfile.name || '').toLowerCase().trim();
        const userTickets = allTickets.filter(t => {
            const bEmail = (t.buyerEmail || '').toLowerCase().trim();
            const bName = (t.buyerName || '').toLowerCase().trim();
            if (myEmail && bEmail) return bEmail === myEmail;
            return bName === myName;
        });

        let activeCount = 0;
        let expiredCount = 0;
        let refundedCount = 0;

        userTickets.forEach(t => {
            const c = classifyTicket(t);
            if (c.status === 'ACTIVE') activeCount++;
            else if (c.status === 'EXPIRED') expiredCount++;
            else if (c.status === 'REFUNDED') refundedCount++;
        });

        if (allCountEl) allCountEl.textContent = userTickets.length;
        if (activeCountEl) activeCountEl.textContent = activeCount;
        if (expiredCountEl) expiredCountEl.textContent = expiredCount;
        if (refundedCountEl) refundedCountEl.textContent = refundedCount;

        const filtered = userTickets.filter(t => {
            const c = classifyTicket(t);
            if (activeTicketFilter === 'active') return c.status === 'ACTIVE';
            if (activeTicketFilter === 'expired') return c.status === 'EXPIRED';
            if (activeTicketFilter === 'refunded') return c.status === 'REFUNDED';
            return true;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="py-8 text-center text-gray-500">
                    <p class="text-xs font-semibold text-gray-400">No ${activeTicketFilter === 'all' ? '' : activeTicketFilter} tickets found.</p>
                    <p class="text-[11px] text-gray-500 mt-1">Book an event from the right column to test active or expired biometric tickets!</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = filtered.map(t => {
            const classification = classifyTicket(t);
            return `
                <div class="p-4 rounded-2xl glass-surface border ${classification.status === 'ACTIVE' ? 'border-emerald-500/40' : (classification.status === 'REFUNDED' ? 'border-red-500/30 opacity-70' : 'border-gray-800 opacity-80')} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div class="flex items-center gap-3">
                        ${t.photoDataUrl ? `<img src="${t.photoDataUrl}" class="w-12 h-12 rounded-xl object-cover border ${classification.status === 'ACTIVE' ? 'border-emerald-400' : 'border-gray-700'} shrink-0">` : `<div class="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-500">TP</div>`}
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono font-bold text-xs text-red-400">${t.bookingId}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${classification.badgeClass}">
                                    ${classification.badgeText}
                                </span>
                            </div>
                            <h4 class="text-sm font-bold text-white mt-0.5">${t.eventTitle}</h4>
                            <p class="text-xs text-gray-400">${t.date} • ${t.time || '19:00'} • Seat: <strong class="text-white">${t.seats.join(', ')}</strong> • ₹${t.totalAmount}</p>
                            ${t.nft ? `
                                <div class="mt-1 flex items-center gap-1.5 text-[10px] text-purple-300 font-mono">
                                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                                    <span>Soulbound NFT #${t.nft.tokenId}</span>
                                    <a href="${t.nft.explorerUrl}" target="_blank" class="text-purple-400 hover:text-purple-300 underline font-sans ml-1">Polygonscan &nearr;</a>
                                </div>
                            ` : ''}
                            ${classification.isRefunded && t.refundedAt ? `<p class="text-[10px] text-red-400 mt-0.5">Refunded on: ${new Date(t.refundedAt).toLocaleString()}</p>` : ''}
                        </div>
                    </div>

                    <div class="flex items-center gap-2 self-end sm:self-center">
                        ${classification.status === 'ACTIVE' ? `
                            <button onclick="window.truePassOnboard.refundTicket('${t.bookingId}')" class="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition-all flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                                Refund Ticket
                            </button>
                        ` : ''}
                        <a href="tickets.html" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold">
                            View Pass
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================================
    // CLEAN CLOUD SYNC DASHBOARD & LIVE TOASTS
    // ========================================================
    async function refreshCloudSyncOverview() {
        if (!window.supabaseSync) return;
        const metrics = await window.supabaseSync.fetchCloudSyncOverview();

        const badge = document.getElementById('supabaseStatusPill');
        const profilesCountEl = document.getElementById('cloudCountProfiles');
        const facesCountEl = document.getElementById('cloudCountFaces');
        const ticketsCountEl = document.getElementById('cloudCountTickets');
        const activeTicketsEl = document.getElementById('cloudCountActiveTickets');
        const latencyEl = document.getElementById('cloudLatencyMetric');

        if (badge) {
            if (metrics.isConnected) {
                badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer';
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Cloud Synced (${metrics.latencyMs}ms)`;
            } else {
                badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 flex items-center gap-1.5 cursor-pointer';
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-500"></span> Supabase Cloud: Connect Project`;
            }
        }

        if (profilesCountEl) profilesCountEl.textContent = metrics.profilesCount;
        if (facesCountEl) facesCountEl.textContent = metrics.facesCount;
        if (ticketsCountEl) ticketsCountEl.textContent = metrics.ticketsCount;
        if (activeTicketsEl) activeTicketsEl.textContent = metrics.activeTicketsCount;
        if (latencyEl) latencyEl.textContent = metrics.isConnected ? `${metrics.latencyMs}ms latency` : 'Offline (Local DB)';
    }

    function showCloudToast(message, type = 'success') {
        const toastContainer = document.getElementById('cloudToastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `p-3.5 rounded-2xl glass-surface border shadow-2xl flex items-center gap-3 text-xs transition-all duration-300 transform translate-y-4 opacity-0 ${
            type === 'success' ? 'border-emerald-500/50 text-emerald-300' : (type === 'error' ? 'border-red-500/50 text-red-300' : 'border-gray-700 text-gray-200')
        }`;

        toast.innerHTML = `
            <div class="w-6 h-6 rounded-full ${type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} flex items-center justify-center font-bold text-xs shrink-0">
                ${type === 'success' ? '✓' : '!'}
            </div>
            <div class="flex-1 font-medium">${message}</div>
        `;

        toastContainer.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ========================================================
    // SIGN IN WITH FACE ID
    // ========================================================
    async function startFaceIdLogin() {
        const modal = document.getElementById('faceIdLoginModal');
        const video = document.getElementById('faceIdVideo');
        const canvas = document.getElementById('faceIdCanvas');
        const statusEl = document.getElementById('faceIdStatusText');
        const closeBtn = document.getElementById('closeFaceIdModalBtn');
        const cancelBtn = document.getElementById('cancelFaceIdBtn');
        const retryBtn = document.getElementById('retryFaceIdBtn');
        const mismatchCard = document.getElementById('faceIdMismatchCard');
        const container = document.getElementById('faceIdContainer');

        if (!modal || !video) return;
        modal.classList.remove('hidden');

        // Reset UI State
        isScanning = true;
        if (mismatchCard) mismatchCard.classList.add('hidden');
        if (retryBtn) retryBtn.classList.add('hidden');
        if (container) {
            container.className = 'relative w-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/50 mb-4 shadow-xl shadow-emerald-500/10 transition-all duration-300';
        }
        if (statusEl) {
            statusEl.className = 'text-xs text-gray-400 mb-4';
            statusEl.textContent = 'Starting camera for Face ID sign in...';
        }

        let loopId = null;

        const stop = () => {
            isScanning = false;
            if (loopId) cancelAnimationFrame(loopId);
            if (sdk) sdk.stopCamera();
            modal.classList.add('hidden');
        };

        if (closeBtn) closeBtn.onclick = stop;
        if (cancelBtn) cancelBtn.onclick = stop;
        if (retryBtn) retryBtn.onclick = () => startFaceIdLogin();

        try {
            if (!sdk) sdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });
            await sdk.init();

            // Load enrolled faces from local FaceDB & Supabase Cloud
            if (window.faceDB) {
                await window.faceDB.init();
                const people = await window.faceDB.getAllPeople();
                sdk.clearAllEnrolled();
                people.forEach(p => sdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
            }

            if (window.supabaseSync && window.supabaseSync.isReady) {
                try {
                    const cloudPeople = await window.supabaseSync.fetchPeopleFromCloud();
                    cloudPeople.forEach(cp => {
                        if (!sdk.enrolledPeople.has(cp.name)) {
                            sdk.enrollPerson(cp.name, cp.descriptors, { role: cp.role, photo: cp.photo });
                        }
                    });
                } catch(e) {}
            }

            await sdk.startCamera(video);
            if (statusEl) statusEl.textContent = 'Looking for enrolled face... Position face in frame.';

            let consecutiveUnrecognizedFrames = 0;

            async function scanLoop() {
                if (!isScanning) return;

                if (video.readyState >= 2 && video.videoWidth > 0) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    try {
                        const results = await sdk.recognize(video);
                        sdk.drawHUD(canvas, results);

                        const match = results.find(r => r.isRecognized);
                        if (match) {
                            consecutiveUnrecognizedFrames = 0;
                            if (container) {
                                container.className = 'relative w-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-400 shadow-xl shadow-emerald-500/30 mb-4 transition-all duration-300';
                            }
                            if (statusEl) {
                                statusEl.className = 'text-xs font-bold text-emerald-400 mb-4 animate-pulse';
                                statusEl.textContent = `Welcome back, ${match.name}! Signing in...`;
                            }
                            if (window.soundEffects) window.soundEffects.playSuccess();

                            setTimeout(() => {
                                stop();
                                const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
                                const profile = {
                                    ...stored,
                                    name: match.name,
                                    photo: match.photo || stored.photo || ''
                                };
                                saveUserSession(profile, true);
                                showCloudToast(`Welcome back, ${match.name}! Signed in with Face ID.`, 'success');
                                setTimeout(() => {
                                    window.location.href = 'index.html';
                                }, 350);
                            }, 500);
                            return;
                        } else if (results.length > 0) {
                            // A face was detected in camera, but is NOT recognized
                            consecutiveUnrecognizedFrames++;
                            if (container) {
                                container.className = 'relative w-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-red-500 shadow-xl shadow-red-500/30 mb-4 transition-all duration-300';
                            }
                            if (statusEl) {
                                statusEl.className = 'text-xs font-semibold text-red-400 mb-4';
                                statusEl.textContent = `Face detected but not recognized in TruePass database.`;
                            }

                            if (consecutiveUnrecognizedFrames >= 4) {
                                isScanning = false;
                                if (sdk) sdk.stopCamera();
                                if (mismatchCard) mismatchCard.classList.remove('hidden');
                                if (retryBtn) retryBtn.classList.remove('hidden');
                                if (statusEl) {
                                    statusEl.className = 'text-xs font-bold text-red-400 mb-4';
                                    statusEl.textContent = `Identity Mismatch: Face not recognized.`;
                                }
                                if (window.soundEffects) window.soundEffects.playAlert();
                                return;
                            }
                        } else {
                            consecutiveUnrecognizedFrames = Math.max(0, consecutiveUnrecognizedFrames - 1);
                            if (statusEl) {
                                statusEl.className = 'text-xs text-gray-400 mb-4';
                                statusEl.textContent = 'Looking for enrolled face... Position face in frame.';
                            }
                        }
                    } catch (e) {}
                }
                loopId = requestAnimationFrame(scanLoop);
            }

            scanLoop();
        } catch (e) {
            if (statusEl) statusEl.textContent = `Camera error: ${e.message}`;
        }
    }

    // ========================================================
    // SIGN IN / LOGIN FLOW (LOCAL STORAGE + SUPABASE CLOUD)
    // ========================================================
    async function handleUserLogin(e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }

        const idInput = document.getElementById('loginIdentifier');
        const staySignedIn = document.getElementById('loginStaySignedIn')?.checked ?? true;
        const feedback = document.getElementById('loginFeedbackMsg');
        const btn = document.getElementById('submitLoginBtn');

        const identifier = (idInput ? idInput.value : '').trim();
        if (!identifier) {
            if (feedback) {
                feedback.className = 'p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-semibold block';
                feedback.textContent = 'Please enter your Full Legal Name or Email Address to sign in.';
            }
            if (idInput) idInput.focus();
            return false;
        }

        const originalBtnText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin w-4 h-4 text-white inline-block mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Checking Supabase & Account...</span>
            `;
        }

        let matchedProfile = null;

        // 1. Search local storage first (instant 0ms)
        try {
            const localSession = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
            const localProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
            const idLower = identifier.toLowerCase();

            if (localProfile.name && (localProfile.name.toLowerCase() === idLower || (localProfile.email && localProfile.email.toLowerCase() === idLower))) {
                matchedProfile = localProfile;
            } else if (localSession.name && (localSession.name.toLowerCase() === idLower || (localSession.email && localSession.email.toLowerCase() === idLower))) {
                matchedProfile = localSession;
            }
        } catch (e) {}

        // 2. Query Supabase Cloud public.profiles table
        if (!matchedProfile && window.supabaseSync && window.supabaseSync.client) {
            try {
                const clean = identifier.replace(/['"]/g, '').trim();
                const { data, error } = await window.supabaseSync.client
                    .from('profiles')
                    .select('*')
                    .or(`name.ilike.%${clean}%,email.ilike.%${clean}%`)
                    .limit(1);

                if (data && data.length > 0) {
                    const p = data[0];
                    matchedProfile = {
                        memberId: 'TP-' + (p.loyalty_tier || 'Standard').substring(0, 3).toUpperCase() + '-' + Math.floor(100000 + Math.random() * 900000),
                        name: p.name,
                        email: p.email || '',
                        phone: p.phone || '',
                        dob: p.dob || '',
                        idType: p.id_type || 'Passport',
                        idNumber: p.id_number || '',
                        loyaltyTier: p.loyalty_tier || 'Standard',
                        photo: p.photo_url || '',
                        descriptors: p.descriptors || [],
                        notes: p.notes || ''
                    };
                }
            } catch (err) {
                console.warn('[Supabase Cloud Login Search]', err);
            }
        }

        // 3. Fallback: Query Supabase public.faces table
        if (!matchedProfile && window.supabaseSync && window.supabaseSync.client) {
            try {
                const clean = identifier.replace(/['"]/g, '').trim();
                const { data: fData } = await window.supabaseSync.client
                    .from('faces')
                    .select('*')
                    .ilike('name', `%${clean}%`)
                    .limit(1);

                if (fData && fData.length > 0) {
                    const f = fData[0];
                    matchedProfile = {
                        memberId: 'TP-STA-' + Math.floor(100000 + Math.random() * 900000),
                        name: f.name,
                        email: clean.includes('@') ? clean : (f.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@truepass.io'),
                        phone: '+91 98765 43210',
                        dob: '1998-05-14',
                        idType: 'Passport',
                        idNumber: 'ID-' + Math.floor(100000 + Math.random() * 900000),
                        loyaltyTier: f.role && f.role.includes('VIP') ? 'VIP' : 'Standard',
                        photo: f.photo_url || '',
                        descriptors: f.descriptors || []
                    };
                }
            } catch (err) {}
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnText || '<span>Sign In & Open Pass</span>';
        }

        if (matchedProfile) {
            saveUserSession(matchedProfile, staySignedIn);

            if (feedback) {
                feedback.className = 'p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold block';
                feedback.innerHTML = `✓ Signed in as <strong>${matchedProfile.name}</strong>! Redirecting to home...`;
            }

            if (window.soundEffects) window.soundEffects.playSuccess();
            if (window.showToast) window.showToast(`Welcome back, ${matchedProfile.name}!`, 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 350);
            return true;
        } else {
            if (feedback) {
                feedback.className = 'p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-semibold block';
                feedback.innerHTML = `No account found for "<strong>${identifier}</strong>". <br><span class="text-white mt-1 inline-block">Please check spelling or click <strong class="underline cursor-pointer" onclick="showEnrollView()">Register New Account</strong>.</span>`;
            }
            return false;
        }
    }

    // ========================================================
    // ONBOARDING WIZARD (SAVING ALL DATA TO SUPABASE)
    // ========================================================
    async function saveAccountAndProceedToFace(e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }

        const nameInput = document.getElementById('onboardName');
        const emailInput = document.getElementById('onboardEmail');
        const phoneInput = document.getElementById('onboardPhone');
        const dobInput = document.getElementById('onboardDob');
        const idTypeInput = document.getElementById('onboardIdType');
        const idNumberInput = document.getElementById('onboardIdNumber');
        const errEl = document.getElementById('step1ErrorMsg');

        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            if (errEl) {
                errEl.textContent = 'Full Legal Name is required to continue.';
                errEl.classList.remove('hidden');
            }
            if (nameInput) {
                nameInput.classList.add('border-red-500', 'ring-2', 'ring-red-500/50');
                nameInput.focus();
            }
            if (window.showAlert) {
                window.showAlert({
                    title: 'Full Legal Name Required',
                    message: 'Please enter your Full Legal Name in Step 1 to create your TruePass account.',
                    type: 'warning'
                });
            } else {
                alert('Please enter your Full Legal Name in Step 1.');
            }
            return false;
        }

        if (errEl) errEl.classList.add('hidden');
        if (nameInput) {
            nameInput.classList.remove('border-red-500', 'ring-2', 'ring-red-500/50');
        }

        // Auto-fill fallback values if left empty
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = emailInput && emailInput.value.trim() ? emailInput.value.trim() : `${cleanName || 'fan'}@truepass.io`;
        const phone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : '+91 98765 43210';
        const dob = dobInput && dobInput.value ? dobInput.value : '1998-05-14';
        const idType = idTypeInput ? idTypeInput.value : 'Passport';
        const idNumber = idNumberInput && idNumberInput.value.trim() ? idNumberInput.value.trim() : 'ID-' + Math.floor(100000 + Math.random() * 900000);
        const loyaltyTier = document.querySelector('input[name="loyaltyTier"]:checked')?.value || 'Standard';
        const staySignedIn = document.getElementById('staySignedInCheckbox')?.checked ?? true;

        if (emailInput && !emailInput.value) emailInput.value = email;
        if (phoneInput && !phoneInput.value) phoneInput.value = phone;

        const memberId = 'TP-' + loyaltyTier.substring(0, 3).toUpperCase() + '-' + Math.floor(100000 + Math.random() * 900000);

        const initialProfile = {
            memberId,
            name,
            email,
            phone,
            dob,
            idType,
            idNumber,
            loyaltyTier,
            photo: '',
            descriptors: [],
            onboardedAt: new Date().toISOString()
        };

        // 1. Synchronously save session locally (instant 0ms)
        saveUserSession(initialProfile, staySignedIn);

        // 2. Update Step 2 live badge with saved account information
        const step2NameEl = document.getElementById('step2AccountName');
        const step2MemberIdEl = document.getElementById('step2MemberId');
        if (step2NameEl) step2NameEl.textContent = name;
        if (step2MemberIdEl) step2MemberIdEl.textContent = memberId;

        if (window.soundEffects) window.soundEffects.playSuccess();

        // 3. Move immediately to Step 2 (Face verification / photo capture)
        goToStep(2);
        startFaceCapture();
        window.scrollTo({ top: 250, behavior: 'smooth' });

        // 4. Asynchronously save account profile to Supabase Cloud public.profiles in background (non-blocking!)
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.saveProfileToCloud({
                name,
                email,
                phone,
                dob,
                idType,
                idNumber,
                loyaltyTier,
                photo: '',
                descriptors: [],
                notes: `Member ID: ${memberId} • Profile Created`
            }).then(cloudResult => {
                if (cloudResult && cloudResult.success) {
                    showCloudToast(`Account for ${name} saved to Supabase Cloud (${cloudResult.latencyMs}ms)!`, 'success');
                }
            }).catch(err => {
                console.warn('[Supabase Initial Profile Save Note]:', err);
            });
        }

        return true;
    }

    function setupListeners() {
        const step1Form = document.getElementById('onboardStep1') || document.getElementById('onboardingStep1Form');
        const continueBtn = document.getElementById('continueToStep2Btn');

        if (step1Form) {
            step1Form.addEventListener('submit', (e) => saveAccountAndProceedToFace(e));
        }
        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => saveAccountAndProceedToFace(e));
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => handleUserLogin(e));
        }

        const submitLoginBtn = document.getElementById('submitLoginBtn');
        if (submitLoginBtn) {
            submitLoginBtn.addEventListener('click', (e) => handleUserLogin(e));
        }

        const faceIdQuickLoginBtn = document.getElementById('faceIdQuickLoginBtn');
        if (faceIdQuickLoginBtn) {
            faceIdQuickLoginBtn.addEventListener('click', () => startFaceIdLogin());
        }

        const backToStep1Btn = document.getElementById('backToStep1Btn');
        if (backToStep1Btn) {
            backToStep1Btn.addEventListener('click', () => {
                stopFaceCapture();
                goToStep(1);
            });
        }

        // Manual photo snap button: takes snapshot immediately without getting stuck
        const snapBtn = document.getElementById('manualSnapBtn');
        if (snapBtn) {
            snapBtn.addEventListener('click', async () => {
                const video = document.getElementById('onboardVideo');
                if (video) {
                    let det = null;
                    if (sdk) {
                        try { det = await sdk.extractDescriptor(video); } catch (e) {}
                    }
                    if (!det) {
                        const vw = video.videoWidth || 400;
                        const vh = video.videoHeight || 400;
                        det = {
                            box: { x: vw * 0.15, y: vh * 0.1, width: vw * 0.7, height: vh * 0.8 },
                            descriptor: new Float32Array(128).map(() => (Math.random() - 0.5) * 0.1)
                        };
                    }
                    handleSuccessfulFaceDetection(video, det);
                }
            });
        }

        // File upload photo input: lets user pick any selfie if webcam is unavailable
        const fileUploadInp = document.getElementById('onboardPhotoUploadInput');
        if (fileUploadInp) {
            fileUploadInp.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    capturedPhotoDataUrl = ev.target.result;
                    stopFaceCapture();
                    const tempImg = new Image();
                    tempImg.src = capturedPhotoDataUrl;
                    tempImg.onload = async () => {
                        let det = null;
                        if (sdk) {
                            try { det = await sdk.extractDescriptor(tempImg); } catch (err) {}
                        }
                        extractedDescriptor = det && det.descriptor ? det.descriptor : new Float32Array(128).map(() => (Math.random() - 0.5) * 0.1);
                        goToStep(3);
                        const previewImg = document.getElementById('enrolledFacePreview');
                        if (previewImg) previewImg.src = capturedPhotoDataUrl;
                    };
                };
                reader.readAsDataURL(file);
            });
        }

        // Skip photo button: creates clean initials avatar and completes registration immediately
        const skipPhotoBtn = document.getElementById('skipFacePhotoBtn');
        if (skipPhotoBtn) {
            skipPhotoBtn.addEventListener('click', () => {
                stopFaceCapture();
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, 400, 400);
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 120px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const initials = (currentProfile?.name || 'TP').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                ctx.fillText(initials, 200, 200);

                capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                extractedDescriptor = new Float32Array(128).map(() => (Math.random() - 0.5) * 0.1);
                goToStep(3);
                const previewImg = document.getElementById('enrolledFacePreview');
                if (previewImg) previewImg.src = capturedPhotoDataUrl;
            });
        }

        const finishBtn = document.getElementById('finishOnboardingBtn');
        if (finishBtn) {
            finishBtn.addEventListener('click', completeOnboardingProcess);
        }

        const retakeBtn = document.getElementById('retakePhotoBtn');
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => {
                goToStep(2);
                startFaceCapture();
            });
        }

        const openOnboardCamBtn = document.getElementById('openOnboardCameraBtn');
        if (openOnboardCamBtn) {
            openOnboardCamBtn.addEventListener('click', () => {
                startFaceCapture();
            });
        }

        const onboardActivateCamBtn = document.getElementById('onboardActivateCamBtn');
        if (onboardActivateCamBtn) {
            onboardActivateCamBtn.addEventListener('click', () => {
                startFaceCapture();
            });
        }

        const openCloudModalBtn = document.getElementById('openCloudModalBtn');
        const supabaseStatusPill = document.getElementById('supabaseStatusPill');
        const cloudModal = document.getElementById('cloudSettingsModal');
        const closeCloudModalBtn = document.getElementById('closeCloudModalBtn');

        const openModal = () => cloudModal?.classList.remove('hidden');
        const closeModal = () => cloudModal?.classList.add('hidden');

        if (openCloudModalBtn) openCloudModalBtn.addEventListener('click', openModal);
        if (supabaseStatusPill) supabaseStatusPill.addEventListener('click', openModal);
        if (closeCloudModalBtn) closeCloudModalBtn.addEventListener('click', closeModal);

        const supabaseForm = document.getElementById('supabaseConfigForm');
        if (supabaseForm) {
            supabaseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const url = document.getElementById('supabaseUrlInput').value.trim();
                const key = document.getElementById('supabaseKeyInput').value.trim();
                const msgEl = document.getElementById('supabaseTestMsg');

                if (msgEl) msgEl.textContent = 'Testing connection...';

                if (window.supabaseSync) {
                    window.supabaseSync.initClient(url, key);
                    const test = await window.supabaseSync.testConnection();
                    if (msgEl) {
                        msgEl.textContent = test.message;
                        msgEl.className = test.success ? 'text-xs font-bold text-emerald-400 mt-2' : 'text-xs font-bold text-red-400 mt-2';
                    }
                    if (test.success) {
                        updateSupabaseConnectionStatusUI();
                        refreshCloudSyncOverview();
                        setTimeout(closeModal, 1200);
                    }
                }
            });
        }

        const openTurnstileBtn = document.getElementById('openTurnstileBtn');
        const turnstileModal = document.getElementById('turnstileModal');
        const closeTurnstileBtn = document.getElementById('closeTurnstileBtn');

        if (openTurnstileBtn) {
            openTurnstileBtn.addEventListener('click', () => {
                turnstileModal?.classList.remove('hidden');
                startTurnstileGate();
            });
        }
        if (closeTurnstileBtn) {
            closeTurnstileBtn.addEventListener('click', () => {
                stopTurnstileGate();
                turnstileModal?.classList.add('hidden');
            });
        }
    }

    function goToStep(stepNum) {
        currentStep = stepNum;
        document.querySelectorAll('.onboard-step-panel').forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById(`onboardStep${stepNum}`) || 
                      (stepNum === 1 ? (document.getElementById('onboardStep1') || document.getElementById('onboardingStep1Form')) : null);
        if (panel) panel.classList.remove('hidden');

        document.querySelectorAll('.onboard-step-dot').forEach((dot, idx) => {
            if (idx + 1 < stepNum) {
                dot.className = 'onboard-step-dot w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-500/30';
                dot.textContent = '✓';
            } else if (idx + 1 === stepNum) {
                dot.className = 'onboard-step-dot w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-red-600/30';
                dot.textContent = `${idx + 1}`;
            } else {
                dot.className = 'onboard-step-dot w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-bold border border-gray-700';
                dot.textContent = `${idx + 1}`;
            }
        });
    }

    async function startFaceCapture() {
        const video = document.getElementById('onboardVideo');
        const canvas = document.getElementById('onboardCanvas');
        const statusEl = document.getElementById('faceStatusText');
        const progressEl = document.getElementById('faceProgressBar');

        if (!video || !canvas) return;
        isCameraScanning = true;

        if (statusEl) {
            statusEl.textContent = 'Activating camera...';
            statusEl.className = 'text-xs font-semibold text-emerald-400 animate-pulse';
        }
        if (progressEl) progressEl.style.width = '30%';

        const standbyEl = document.getElementById('onboardCameraStandby');
        const errHelp = document.getElementById('onboardCamErrorHelp');

        try {
            if (!sdk) sdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });

            // Start camera stream first so viewfinder appears instantly!
            try {
                await sdk.startCamera(video);
                if (standbyEl) standbyEl.classList.add('hidden');
                if (errHelp) errHelp.classList.add('hidden');
            } catch (camErr) {
                console.warn('Camera start note:', camErr);
                if (standbyEl) standbyEl.classList.remove('hidden');
                if (errHelp) {
                    errHelp.classList.remove('hidden');
                    errHelp.textContent = camErr.message || 'Camera blocked or unavailable.';
                }
                if (statusEl) {
                    statusEl.textContent = 'Camera waiting. Click "Open Camera" to grant access.';
                    statusEl.className = 'text-xs font-semibold text-amber-400';
                }
            }

            // Ensure neural models are initialized
            sdk.init().catch(err => console.debug('Neural preload notice:', err));

            if (statusEl) statusEl.textContent = 'Position your face in the frame...';
            if (progressEl) progressEl.style.width = '55%';

            let stableCount = 0;
            const REQUIRED = 5;

            async function loop() {
                if (!isCameraScanning) return;

                if (video.readyState >= 2) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    try {
                        const det = await sdk.extractDescriptor(video);
                        if (det) {
                            stableCount++;
                            const pct = Math.min(95, 55 + (stableCount / REQUIRED) * 40);
                            if (progressEl) progressEl.style.width = `${pct}%`;
                            if (statusEl) statusEl.textContent = `Face locked! Extracting 128-d biometrics (${stableCount}/${REQUIRED})...`;

                            const box = det.box;
                            ctx.strokeStyle = '#10b981';
                            ctx.lineWidth = 3;
                            ctx.strokeRect(box.x, box.y, box.width, box.height);

                            if (stableCount >= REQUIRED) {
                                if (progressEl) progressEl.style.width = '100%';
                                if (statusEl) statusEl.textContent = 'Face verified! Snapping final account photo...';
                                handleSuccessfulFaceDetection(video, det);
                                return;
                            }
                        } else {
                            stableCount = Math.max(0, stableCount - 1);
                            if (statusEl) statusEl.textContent = 'Looking for face... Please look straight into camera.';
                        }
                    } catch (err) {}
                }
                cameraLoopId = requestAnimationFrame(loop);
            }

            loop();
        } catch (e) {
            console.warn('Face capture note:', e);
            if (statusEl) {
                statusEl.textContent = `Camera notice: ${e.message}. You can use "Snap Photo Now" or "Upload Photo".`;
                statusEl.className = 'text-xs font-semibold text-amber-400';
            }
        }
    }

    function stopFaceCapture() {
        isCameraScanning = false;
        if (cameraLoopId) cancelAnimationFrame(cameraLoopId);
        if (sdk) sdk.stopCamera();
    }

    function handleSuccessfulFaceDetection(video, detection) {
        // 1. Visual flash effect on camera viewport
        const videoContainer = video.parentElement;
        if (videoContainer) {
            const flash = document.createElement('div');
            flash.className = 'absolute inset-0 bg-white z-30 transition-opacity duration-300 pointer-events-none opacity-80';
            videoContainer.appendChild(flash);
            setTimeout(() => {
                flash.classList.add('opacity-0');
                setTimeout(() => flash.remove(), 350);
            }, 80);
        }

        // 2. FIRST snap active video frame to canvas while camera stream is running
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 400;
        snapCanvas.height = 400;
        const ctx = snapCanvas.getContext('2d');

        // Draw crisp dark slate background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 400);

        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            let cx = vw / 2;
            let cy = vh / 2;
            let cropSize = Math.min(vw, vh) * 0.75;

            if (detection && detection.box && detection.box.width > 0) {
                const b = detection.box;
                cx = b.x + b.width / 2;
                cy = b.y + b.height / 2;
                cropSize = Math.max(b.width, b.height) * 1.5;
            }

            cropSize = Math.min(cropSize, Math.min(vw, vh));
            const sx = Math.max(0, Math.min(vw - cropSize, cx - cropSize / 2));
            const sy = Math.max(0, Math.min(vh - cropSize, cy - cropSize / 2));

            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 400, 400);
            capturedPhotoDataUrl = snapCanvas.toDataURL('image/jpeg', 0.95);
        }

        // 3. ONLY AFTER snapshot is secured, stop the camera
        stopFaceCapture();

        extractedDescriptor = detection.descriptor;

        if (window.soundEffects) {
            window.soundEffects.playShutter();
            setTimeout(() => window.soundEffects.playSuccess(), 250);
        }

        const previewImg = document.getElementById('enrolledFacePreview');
        if (previewImg && capturedPhotoDataUrl) previewImg.src = capturedPhotoDataUrl;

        setTimeout(() => goToStep(3), 600);
    }

    // Complete Onboarding: Stores ALL input fields into Supabase Cloud
    async function completeOnboardingProcess() {
        const finishBtn = document.getElementById('finishOnboardingBtn');
        const name = document.getElementById('onboardName')?.value.trim();
        const email = document.getElementById('onboardEmail')?.value.trim();
        const phone = document.getElementById('onboardPhone')?.value.trim();
        const dob = document.getElementById('onboardDob')?.value.trim();
        const idType = document.getElementById('onboardIdType')?.value || 'Passport';
        const idNumber = document.getElementById('onboardIdNumber')?.value.trim() || '';
        const loyaltyTier = document.querySelector('input[name="loyaltyTier"]:checked')?.value || 'Standard';
        const staySignedIn = document.getElementById('staySignedInCheckbox')?.checked ?? true;

        if (!name) {
            if (window.showAlert) {
                window.showAlert({
                    title: 'Full Name Required',
                    message: 'Please enter your Full Legal Name in Step 1 before finalizing enrollment.',
                    type: 'warning'
                });
            } else {
                alert('Please enter your Full Legal Name in Step 1.');
            }
            goToStep(1);
            return;
        }

        if (!capturedPhotoDataUrl) {
            if (window.showAlert) {
                window.showAlert({
                    title: 'Biometric Face Scan Required',
                    message: 'Please complete your face camera scan in Step 2 before saving your profile.',
                    type: 'warning'
                });
            } else {
                alert('Please scan your face in Step 2.');
            }
            goToStep(2);
            startFaceCapture();
            return;
        }

        // Visual loading state on button
        const originalBtnHtml = finishBtn ? finishBtn.innerHTML : '';
        if (finishBtn) {
            finishBtn.disabled = true;
            finishBtn.innerHTML = `
                <svg class="animate-spin w-4 h-4 text-white inline-block mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Saving to Supabase Cloud & DB...</span>
            `;
        }

        const memberId = 'TP-' + loyaltyTier.substring(0, 3).toUpperCase() + '-' + Math.floor(100000 + Math.random() * 900000);

        const profileData = {
            memberId,
            name,
            email,
            phone,
            dob,
            idType,
            idNumber,
            loyaltyTier,
            photo: capturedPhotoDataUrl,
            descriptors: extractedDescriptor ? [Array.from(extractedDescriptor)] : [],
            onboardedAt: new Date().toISOString()
        };

        // 1. Save Session (Stay Signed In)
        saveUserSession(profileData, staySignedIn);

        // 2. Save into IndexedDB FaceDB (Offline turnstile speed)
        if (window.faceDB && extractedDescriptor) {
            try {
                await window.faceDB.init();
                await window.faceDB.savePerson({
                    name,
                    role: `FastTrack Member (${loyaltyTier})`,
                    photo: capturedPhotoDataUrl,
                    descriptors: [extractedDescriptor],
                    notes: `Member ID: ${memberId} • Email: ${email} • ${idType}: ${idNumber} • DOB: ${dob}`
                });
            } catch (e) {
                console.warn('FaceDB note:', e);
            }
        }

        // 3. Save ALL onboarding inputs to Supabase Cloud (profiles, faces, storage)
        let cloudResult = null;
        let cloudSaved = false;
        let cloudLatency = 0;
        if (window.supabaseSync && window.supabaseSync.isReady) {
            try {
                cloudResult = await window.supabaseSync.saveProfileToCloud({
                    name,
                    email,
                    phone,
                    dob,
                    idType,
                    idNumber,
                    loyaltyTier,
                    photo: capturedPhotoDataUrl,
                    descriptors: extractedDescriptor ? [extractedDescriptor] : [],
                    notes: `Member ID: ${memberId}`
                });

                if (cloudResult && cloudResult.success) {
                    cloudSaved = true;
                    cloudLatency = cloudResult.latencyMs;
                    if (cloudResult.photoUrl) {
                        profileData.photo = cloudResult.photoUrl;
                        saveUserSession(profileData, staySignedIn);
                    }
                    showCloudToast(`Profile for ${name} saved to Supabase Cloud (${cloudLatency}ms)`, 'success');
                }
            } catch (err) {
                console.warn('[Supabase Cloud] Error:', err);
            }
        }

        if (finishBtn) {
            finishBtn.disabled = false;
            finishBtn.innerHTML = originalBtnHtml;
        }

        if (window.soundEffects) window.soundEffects.playSuccess();
        if (window.showToast) window.showToast(`Account photo & profile saved for ${name}! Redirecting to tickets...`, 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    function renderMembershipCard(profile) {
        document.getElementById('cardMemberName').textContent = profile.name;
        document.getElementById('cardMemberId').textContent = profile.memberId || 'TP-VIP-000000';
        document.getElementById('cardMemberEmail').textContent = profile.email || 'Verified Biometric Fan';
        document.getElementById('cardLoyaltyBadge').textContent = `${profile.loyaltyTier || 'Standard'} Member`;
        document.getElementById('cardMemberPhoto').src = profile.photo || 'https://via.placeholder.com/150';
    }

    function initEventBookingCards() {
        const container = document.getElementById('onboardEventsList');
        if (!container) return;

        container.innerHTML = EVENTS_DATA.map(ev => `
            <div class="glass-surface p-4 rounded-2xl border ${ev.isPast ? 'border-amber-500/30' : 'border-gray-800'} flex items-center justify-between gap-4 hover:border-red-500/40 transition-all">
                <div class="flex items-center gap-3">
                    <img src="${ev.poster}" class="w-16 h-20 rounded-xl object-cover border border-gray-800 shrink-0">
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span class="text-[10px] font-bold text-red-400 uppercase tracking-wider">${ev.category}</span>
                            ${ev.isPast ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Past Event (Demo)</span>` : ''}
                        </div>
                        <h4 class="text-sm font-bold text-white">${ev.title}</h4>
                        <p class="text-xs text-gray-400 mt-0.5">${ev.venue}</p>
                        <p class="text-xs ${ev.isPast ? 'text-amber-400' : 'text-emerald-400'} font-semibold mt-0.5">${ev.date}</p>
                    </div>
                </div>

                <div class="text-right shrink-0">
                    <div class="text-sm font-black text-white mb-2">₹${ev.price}</div>
                    <button onclick="window.truePassOnboard.quickBook('${ev.id}')" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1">
                        <span>${ev.isPast ? 'Buy Past Pass' : '1-Click Buy'}</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async function updateSupabaseConnectionStatusUI() {
        const currentUrl = localStorage.getItem('supabase_url') || '';
        const currentKey = localStorage.getItem('supabase_key') || '';

        const urlInput = document.getElementById('supabaseUrlInput');
        const keyInput = document.getElementById('supabaseKeyInput');
        if (urlInput && currentUrl) urlInput.value = currentUrl;
        if (keyInput && currentKey) keyInput.value = currentKey;

        const badge = document.getElementById('supabaseStatusPill');
        const statusText = document.getElementById('supabaseStatusText');
        const latencyBadge = document.getElementById('supabaseLatencyBadge');
        const latencyMetric = document.getElementById('cloudLatencyMetric');

        if (!window.supabaseSync) return;

        try {
            const test = await window.supabaseSync.testConnection();

            if (badge) {
                badge.classList.remove('hidden');
                badge.style.display = 'flex';
                if (test.success) {
                    badge.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 hover:border-emerald-400 text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer';
                    if (statusText) statusText.textContent = 'Supabase Cloud: Connected';
                    if (latencyBadge) {
                        latencyBadge.textContent = `${test.latencyMs}ms`;
                        latencyBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-mono';
                    }
                } else {
                    badge.className = 'px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-xs font-bold text-amber-300 flex items-center gap-2 cursor-pointer';
                    if (statusText) statusText.textContent = 'Supabase Cloud: Connecting...';
                    if (latencyBadge) latencyBadge.textContent = 'Offline';
                }
            }

            if (latencyMetric) {
                if (test.success) {
                    latencyMetric.textContent = `Connected (ojrkqevmrfegabedamhz) • ${test.latencyMs}ms`;
                    latencyMetric.className = 'text-xs font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30';
                } else {
                    latencyMetric.textContent = 'Reconnecting to Supabase...';
                    latencyMetric.className = 'text-xs font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30';
                }
            }
        } catch (e) {
            console.warn('[Supabase Connection Test]', e);
        }
    }

    // ========================================================
    // TURNSTILE SIMULATOR (VALIDATES ACTIVE VS EXPIRED TICKETS)
    // ========================================================
    async function startTurnstileGate() {
        const video = document.getElementById('gateVideo');
        const canvas = document.getElementById('gateCanvas');
        const statusBadge = document.getElementById('gateStatusBadge');
        const statusText = document.getElementById('gateStatusText');
        const attendeeCard = document.getElementById('gateAttendeeCard');
        const ticketSummary = document.getElementById('gateTicketSummary');

        if (!video || !canvas) return;
        isTurnstileScanning = true;

        if (statusBadge) {
            statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse';
            statusBadge.textContent = 'TURNSTILE READY • WAITING FOR GUEST';
        }
        if (statusText) statusText.textContent = 'Look at the camera to verify your biometric ticket admission...';

        try {
            if (!turnstileSdk) {
                turnstileSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.54 });
            }
            await turnstileSdk.init();

            if (window.faceDB) {
                await window.faceDB.init();
                const people = await window.faceDB.getAllPeople();
                turnstileSdk.clearAllEnrolled();
                people.forEach(p => turnstileSdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
            }

            await turnstileSdk.startCamera(video);

            async function gateLoop() {
                if (!isTurnstileScanning) return;

                if (video.readyState >= 2) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    try {
                        const results = await turnstileSdk.recognize(video);
                        turnstileSdk.drawHUD(canvas, results);

                        const now = Date.now();
                        if (now - lastGateTrigger > 3500) {
                            const match = results.find(r => r.isRecognized);

                            if (match) {
                                lastGateTrigger = now;

                                const allTickets = getAllTickets();
                                const personTickets = allTickets.filter(t => (t.buyerName || '').toLowerCase() === match.name.toLowerCase());

                                const activeTickets = [];
                                const expiredTickets = [];
                                const refundedTickets = [];

                                personTickets.forEach(t => {
                                    const c = classifyTicket(t);
                                    if (c.status === 'ACTIVE') activeTickets.push(t);
                                    else if (c.status === 'EXPIRED') expiredTickets.push(t);
                                    else if (c.status === 'REFUNDED') refundedTickets.push(t);
                                });

                                if (activeTickets.length > 0) {
                                    const valid = activeTickets[0];
                                    if (window.soundEffects) window.soundEffects.playSuccess();

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
                                        statusBadge.textContent = 'ACCESS GRANTED • TURNSTILE UNLOCKED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `Welcome, <strong>${match.name}</strong>! Valid Ticket: <strong>${valid.eventTitle}</strong> (Seats: ${valid.seats.join(', ')})`;
                                    }
                                } else if (expiredTickets.length > 0 && activeTickets.length === 0) {
                                    if (window.soundEffects) window.soundEffects.playAlert();

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • TICKETS EXPIRED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `<span class="text-amber-400 font-bold">ALL TICKETS EXPIRED:</span> ${match.name} has ${expiredTickets.length} past ticket(s). Event has already concluded.`;
                                    }
                                } else if (refundedTickets.length > 0 && activeTickets.length === 0) {
                                    if (window.soundEffects) window.soundEffects.playAlert();

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • TICKET REFUNDED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `<span class="text-red-400 font-bold">TICKET REFUNDED:</span> Biometric association for ${match.name} was revoked upon refund.`;
                                    }
                                } else {
                                    if (window.soundEffects) window.soundEffects.playAlert();

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • NO TICKET PURCHASED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `Profile found for <strong>${match.name}</strong>, but no ticket has been purchased yet.`;
                                    }
                                }

                                if (attendeeCard) {
                                    attendeeCard.classList.remove('hidden');
                                    document.getElementById('gateGuestName').textContent = match.name;
                                    document.getElementById('gateGuestRole').textContent = match.role || 'FastTrack Member';

                                    const enrolled = turnstileSdk.enrolledPeople.get(match.name);
                                    if (enrolled && enrolled.photo) {
                                        document.getElementById('gateGuestPhoto').src = enrolled.photo;
                                    }

                                    if (ticketSummary) {
                                        ticketSummary.innerHTML = `
                                            <div class="text-[11px] space-y-1 mt-2 pt-2 border-t border-white/10">
                                                <div class="flex justify-between">
                                                    <span class="text-emerald-400 font-semibold">Active Valid Tickets:</span>
                                                    <strong class="text-white">${activeTickets.length}</strong>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-amber-400 font-semibold">Expired Tickets:</span>
                                                    <strong class="text-white">${expiredTickets.length}</strong>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-red-400 font-semibold">Refunded Tickets:</span>
                                                    <strong class="text-white">${refundedTickets.length}</strong>
                                                </div>
                                            </div>
                                        `;
                                    }
                                }

                                setTimeout(() => {
                                    if (statusBadge && isTurnstileScanning) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse';
                                        statusBadge.textContent = 'TURNSTILE READY • WAITING FOR GUEST';
                                    }
                                }, 3500);
                            }
                        }
                    } catch (e) {}
                }
                turnstileLoopId = requestAnimationFrame(gateLoop);
            }

            gateLoop();
        } catch (e) {
            if (statusText) statusText.textContent = `Turnstile error: ${e.message}`;
        }
    }

    function stopTurnstileGate() {
        isTurnstileScanning = false;
        if (turnstileLoopId) cancelAnimationFrame(turnstileLoopId);
        if (turnstileSdk) turnstileSdk.stopCamera();
    }

    // Direct Window Global Bindings
    window.saveAccountAndProceedToFace = saveAccountAndProceedToFace;
    window.goToStep = goToStep;
    window.showRegisterView = showEnrollView;
    window.showEnrollView = showEnrollView;
    window.showLoginView = showLoginView;
    window.showPassView = showPassView;
    window.handleUserLogin = handleUserLogin;
    window.signInWithFace = startFaceIdLogin;
    window.startFaceCapture = startFaceCapture;
    window.stopFaceCapture = stopFaceCapture;
    window.signOutUser = signOutUser;
    window.applyUserSignedInState = applyUserSignedInState;

})();
