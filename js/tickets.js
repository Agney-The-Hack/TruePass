/**
 * TruePass Tickets (v3.0)
 * Cohesive Ticketing & Turnstile Platform
 * Powered by FacialRecognitionSDK, IndexedDB FaceDB & Supabase Cloud
 */

(function () {
    'use strict';

    // Curated Event Catalog
    const EVENTS_DATA = [
        {
            id: 'taylor-swift-eras',
            title: 'Taylor Swift | The Eras Tour',
            category: 'concerts',
            rating: 9.9,
            votes: '142K',
            duration: '3h 15m',
            genres: ['Pop', 'Live Concert', 'Stadium Tour'],
            languages: ['English'],
            venue: 'SoFi Stadium & Wembley Arena',
            city: 'All Cities',
            formats: ['VIP Club Lounge', 'Golden Circle Standing', 'Standard Reserve'],
            poster: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=80',
            dates: ['Sat, 23 Nov 2026', 'Sun, 24 Nov 2026', 'Fri, 29 Nov 2026'],
            times: ['18:30', '19:45', '20:30'],
            description: 'The monumental world tour celebrating 17 years of music. Experience all 10 eras live in an electrifying 3-hour stadium extravaganza with state-of-the-art visuals and pyrotechnics.',
            isPast: false
        },
        {
            id: 'dune-part-two',
            title: 'Dune: Part Two (IMAX 70mm)',
            category: 'movies',
            rating: 9.5,
            votes: '98K',
            duration: '2h 46m',
            genres: ['Sci-Fi', 'Adventure', 'Action'],
            languages: ['English', 'Hindi', 'Spanish'],
            venue: 'PVR Superplex & AMC Lincoln Square IMAX',
            city: 'All Cities',
            formats: ['IMAX 70mm', 'Dolby Cinema', '4DX 3D'],
            poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
            dates: ['Thu, 26 Nov 2026', 'Fri, 27 Nov 2026', 'Sat, 28 Nov 2026'],
            times: ['13:15', '16:45', '20:15', '22:45'],
            description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Captured with custom IMAX 70mm cameras.',
            isPast: false
        },
        {
            id: 'coldplay-spheres',
            title: 'Coldplay - Music of the Spheres Tour',
            category: 'concerts',
            rating: 9.8,
            votes: '89K',
            duration: '2h 30m',
            genres: ['Alternative Rock', 'Live Spectacle'],
            languages: ['English'],
            venue: 'DY Patil Stadium & MetLife Stadium',
            city: 'All Cities',
            formats: ['Lounge VIP Pass', 'Floor Standing', 'Grandstand Tier 1'],
            poster: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
            dates: ['Sun, 30 Nov 2026', 'Mon, 01 Dec 2026'],
            times: ['19:00', '20:15'],
            description: 'An ethereal night of kinetic dancefloors, sustainable energy shows, and LED wristbands lighting up 80,000 fans in unison with anthems like Yellow and Viva La Vida.',
            isPast: false
        },
        {
            id: 'icc-champions-final',
            title: 'World Champions Trophy - Grand Final',
            category: 'sports',
            rating: 9.7,
            votes: '210K',
            duration: '7h 30m',
            genres: ['Cricket', 'International Sports', 'Finals'],
            languages: ['English', 'Hindi'],
            venue: 'Wankhede Stadium / MCG Grand Arena',
            city: 'All Cities',
            formats: ['Corporate Hospitality Box', 'Pavilion Terrace', 'East Stand'],
            poster: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80',
            dates: ['Sun, 08 Dec 2026'],
            times: ['14:00'],
            description: 'The highest-stakes championship decider in world sports. Two titans battle for eternal glory before 65,000 screaming fans.',
            isPast: false
        },
        {
            id: 'trevor-noah-comedy',
            title: 'Trevor Noah: Where Was I? World Tour',
            category: 'comedy',
            rating: 9.6,
            votes: '42K',
            duration: '1h 45m',
            genres: ['Standup Comedy', 'Satire'],
            languages: ['English'],
            venue: 'Royal Albert Hall & Beacon Theatre',
            city: 'All Cities',
            formats: ['Front Row VIP', 'Stalls', 'Balcony'],
            poster: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80',
            dates: ['Thu, 28 Nov 2026', 'Fri, 29 Nov 2026'],
            times: ['19:30', '21:45'],
            description: 'Emmy-award winning comedian Trevor Noah returns with all-new razor-sharp observations on global politics, multicultural misadventures, and accents.',
            isPast: false
        },
        {
            id: 'oppenheimer-imax-past',
            title: 'Oppenheimer (IMAX 70mm Special)',
            category: 'movies',
            rating: 9.8,
            votes: '190K',
            duration: '3h 00m',
            genres: ['Epic Biography', 'Drama', 'IMAX'],
            languages: ['English'],
            venue: 'BFI London IMAX',
            city: 'All Cities',
            formats: ['IMAX 70mm', 'Dolby Cinema'],
            poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
            banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
            dates: ['Sun, 15 Nov 2026'],
            times: ['17:00'],
            description: 'Past Event Demo: Christopher Nolan’s historical masterpiece in full 70mm format. Used to demonstrate Expired Ticket detection at turnstile gates.',
            isPast: true
        }
    ];

    // Seating Tier Definitions (Indian Rupee - INR)
    const SEAT_TIERS = {
        'vip': { name: 'VIP Recliner', price: 750, class: 'tier-vip' },
        'prime': { name: 'Prime Club', price: 450, class: 'tier-prime' },
        'classic': { name: 'Classic Tier', price: 250, class: 'tier-classic' }
    };

    const SEAT_LAYOUT = [
        { row: 'A', tier: 'vip' },
        { row: 'B', tier: 'vip' },
        { row: 'C', tier: 'prime' },
        { row: 'D', tier: 'prime' },
        { row: 'E', tier: 'prime' },
        { row: 'F', tier: 'classic' },
        { row: 'G', tier: 'classic' },
        { row: 'H', tier: 'classic' },
        { row: 'J', tier: 'classic' }
    ];

    // App State
    let currentCategory = 'all';
    let searchQuery = '';
    let selectedEvent = null;
    let selectedDate = null;
    let selectedTime = null;
    let selectedFormat = null;
    let selectedSeats = new Set();
    let bookedSeatsMap = new Map();
    let currentStep = 1;
    let currentBooking = null;

    // Active User Session (Cohesive with onboarding.html)
    let currentProfile = null;

    // Face Recognition SDK instances
    let checkoutSdk = null;
    let isFaceScanning = false;
    let faceScanLoopId = null;

    // Turnstile Simulator State
    let turnstileSdk = null;
    let isTurnstileRunning = false;
    let turnstileLoopId = null;
    let lastGateTriggerTime = 0;

    const STORAGE_KEY = 'truepass_biometric_tickets';
    const SESSION_KEY = 'truepass_active_session';
    const PROFILE_KEY = 'truepass_onboarded_profile';

    // Account-isolated bookings: Returns ONLY the tickets belonging to the current signed-in user!
    function getSavedBookings() {
        if (!currentProfile || !currentProfile.name) {
            return [];
        }
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const myEmail = (currentProfile.email || '').toLowerCase().trim();
            const myName = (currentProfile.name || '').toLowerCase().trim();
            return all.filter(b => {
                const bEmail = (b.buyerEmail || '').toLowerCase().trim();
                const bName = (b.buyerName || '').toLowerCase().trim();
                if (myEmail && bEmail) return bEmail === myEmail;
                return bName === myName;
            });
        } catch (e) {
            return [];
        }
    }

    // Save Booking: registers to local cache and binds directly to current user account in Supabase Cloud
    function saveBookingToStorage(booking) {
        if (currentProfile) {
            booking.buyerEmail = booking.buyerEmail || currentProfile.email || '';
            booking.buyerName = booking.buyerName || currentProfile.name || '';
            booking.userId = currentProfile.memberId || currentProfile.id || currentProfile.email || '';
            booking.loyaltyTier = currentProfile.loyaltyTier || 'Standard';
        }

        let all = [];
        try {
            all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            all = [];
        }

        const idx = all.findIndex(b => b.bookingId === booking.bookingId);
        if (idx >= 0) {
            all[idx] = booking;
        } else {
            all.unshift(booking);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

        // Auto-sync ticket directly to user's account on Supabase Cloud
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.saveTicketToCloud(booking)
                .then(res => {
                    const latency = res ? res.latencyMs : 0;
                    if (window.showToast) {
                        window.showToast(`Ticket #${booking.bookingId} registered to ${booking.buyerName} in Cloud (${latency}ms)`, 'success');
                    }
                })
                .catch(err => console.warn('[Supabase Cloud] Ticket sync note:', err));
        }
    }

    // Fetch and sync user-specific tickets from Supabase Cloud
    async function syncCloudBookingsForUser(profile) {
        if (!profile || !profile.name || !window.supabaseSync || !window.supabaseSync.isReady) return;
        try {
            const cloudRows = await window.supabaseSync.fetchTicketsByPerson(profile.name);
            if (cloudRows && cloudRows.length > 0) {
                let local = [];
                try {
                    local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                } catch (e) {
                    local = [];
                }

                let changed = false;
                cloudRows.forEach(row => {
                    const match = local.find(l => l.bookingId === row.booking_id);
                    if (!match) {
                        local.unshift({
                            bookingId: row.booking_id,
                            eventId: row.event_id,
                            eventTitle: row.event_title,
                            venue: row.venue,
                            date: row.event_date,
                            time: row.showtime,
                            format: row.format,
                            seats: Array.isArray(row.seats) ? row.seats : JSON.parse(row.seats || '[]'),
                            totalAmount: parseFloat(row.total_amount || 0),
                            buyerName: row.buyer_name,
                            buyerEmail: row.buyer_email,
                            buyerPhone: row.buyer_phone,
                            photoDataUrl: row.photo_url,
                            status: row.status,
                            createdAt: row.created_at,
                            faceVerified: row.face_verified,
                            isCloudSynced: true
                        });
                        changed = true;
                    } else if (match.status !== row.status) {
                        match.status = row.status;
                        changed = true;
                    }
                });

                if (changed) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
                    updateBookingsBadge();
                    const bookingsModal = document.getElementById('bookingsModal');
                    if (bookingsModal && !bookingsModal.classList.contains('hidden')) {
                        renderMyBookingsList();
                    }
                }
            }
        } catch (err) {
            console.debug('Cloud tickets sync note:', err);
        }
    }

    // ========================================================
    // TICKET CLASSIFICATION (ACTIVE VS EXPIRED VS REFUNDED)
    // ========================================================
    function classifyTicket(t) {
        if (t.status === 'REFUNDED') {
            return {
                status: 'REFUNDED',
                label: 'REFUNDED (Face Revoked)',
                badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
                canEnter: false
            };
        }

        const now = new Date();
        let isPast = false;

        if (t.isPast === true) {
            isPast = true;
        } else if (t.date) {
            const parsed = new Date(t.date);
            if (!isNaN(parsed.getTime())) {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                isPast = parsed < today;
            } else if (t.date.toLowerCase().includes('past') || t.date.includes('15 Nov 2026')) {
                isPast = true;
            }
        }

        if (isPast) {
            return {
                status: 'EXPIRED',
                label: 'EXPIRED (Event Past)',
                badgeClass: 'bg-gray-800 text-gray-400 border-gray-700',
                canEnter: false
            };
        }

        return {
            status: 'ACTIVE',
            label: 'ACTIVE (Valid for Entry)',
            badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
            canEnter: true
        };
    }

    // Initialize DOM
    document.addEventListener('DOMContentLoaded', async () => {
        checkPersistentSession();
        updateSupabaseStatusPill();
        initEventsGrid();
        setupFilterListeners();
        setupModalHandlers();
        updateBookingsBadge();

        setTimeout(() => {
            if (window.FacialRecognitionSDK) {
                checkoutSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });
                checkoutSdk.init().catch(err => console.debug('Preload notice:', err));
            }
        }, 1000);
    });

    async function updateSupabaseStatusPill() {
        const badge = document.getElementById('supabaseStatusPill');
        const statusText = document.getElementById('supabaseStatusText');
        const latencyBadge = document.getElementById('supabaseLatencyBadge');
        if (!badge || !window.supabaseSync) return;

        try {
            const test = await window.supabaseSync.testConnection();
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
        } catch (e) {
            console.debug('Supabase status pill note:', e);
        }
    }

    // Check shared session across pages
    function checkPersistentSession() {
        let session = null;
        try {
            const localRaw = localStorage.getItem(SESSION_KEY);
            const sessionRaw = sessionStorage.getItem(SESSION_KEY);
            session = localRaw ? JSON.parse(localRaw) : (sessionRaw ? JSON.parse(sessionRaw) : null);
        } catch (e) {}

        const navSession = document.getElementById('userSessionNav');
        const navAuth = document.getElementById('authNavActions');
        const userAvatar = document.getElementById('navUserAvatar');
        const userName = document.getElementById('navUserName');
        const userTier = document.getElementById('navUserTier');
        const myBookingsBtn = document.getElementById('myBookingsBtn');
        const myBookingsBadge = document.getElementById('myBookingsCountBadge');

        if (session && session.name) {
            currentProfile = session;
            if (navSession) navSession.classList.remove('hidden');
            if (navAuth) navAuth.classList.add('hidden');
            if (myBookingsBtn) myBookingsBtn.classList.remove('hidden');
            if (userAvatar) userAvatar.src = session.photo || 'https://via.placeholder.com/80';
            if (userName) userName.textContent = session.name;
            if (userTier) userTier.textContent = `${session.loyaltyTier || 'Standard'} Member`;

            // Auto-sync cloud tickets for this logged-in account
            syncCloudBookingsForUser(session);
        } else {
            currentProfile = null;
            if (navSession) navSession.classList.add('hidden');
            if (navAuth) navAuth.classList.remove('hidden');
            if (myBookingsBtn) myBookingsBtn.classList.add('hidden');
            if (myBookingsBadge) myBookingsBadge.classList.add('hidden');
        }

        updateBookingsBadge();
        if (window.truePassWeb3) {
            window.truePassWeb3.updateNavbarUI();
        }
    }

    // Render Events in Grid
    function initEventsGrid() {
        const grid = document.getElementById('eventsGrid');
        if (!grid) return;

        const filtered = EVENTS_DATA.filter(ev => {
            const matchesCat = currentCategory === 'all' || ev.category === currentCategory;
            const matchesSearch = !searchQuery || 
                ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ev.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
                ev.venue.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 text-center text-gray-400">
                    <p class="text-base font-semibold text-gray-300">No events found matching your criteria</p>
                    <p class="text-xs text-gray-500 mt-1">Try resetting search filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(ev => {
            const minPrice = ev.price || 250;
            return `
                <div class="group glass-surface rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl flex flex-col cursor-pointer" onclick="window.truePass.openBooking('${ev.id}')">
                    <div class="relative aspect-[16/10] overflow-hidden bg-gray-900">
                        <img src="${ev.poster}" alt="${ev.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent"></div>
                        
                        <div class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1 text-xs font-mono font-medium text-neutral-300">
                            <svg class="w-3 h-3 text-neutral-300 stroke-[1.5]" fill="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                            <span>${ev.rating}</span>
                        </div>

                        ${ev.isPast ? `
                            <div class="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-amber-500/30 backdrop-blur-md border border-amber-400/50 text-[10px] font-bold text-amber-300">
                                Past Event (Demo)
                            </div>
                        ` : `
                            <div class="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-[10px] font-semibold text-emerald-400">
                                FacePass™
                            </div>
                        `}

                        <div class="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                            ${ev.formats.slice(0, 2).map(f => `<span class="px-2 py-0.5 rounded bg-gray-900/90 text-[10px] font-semibold text-gray-200 border border-gray-700/60">${f}</span>`).join('')}
                        </div>
                    </div>

                    <div class="p-5 flex-1 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                                <span class="capitalize text-red-400 font-semibold">${ev.category}</span>
                                <span>•</span>
                                <span>${ev.duration}</span>
                            </div>
                            <h3 class="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">${ev.title}</h3>
                            <p class="text-xs text-gray-400 mt-1 line-clamp-1">${ev.venue}</p>
                        </div>

                        <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                            <div>
                                <span class="text-[11px] text-gray-400">Tickets from</span>
                                <div class="text-base font-extrabold text-white">₹${minPrice}</div>
                            </div>
                            <button class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 group-hover:scale-105 transition-all">
                                ${ev.isPast ? 'Buy Past Pass' : 'Book Tickets'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setupFilterListeners() {
        const pills = document.querySelectorAll('.category-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active', 'bg-red-600', 'text-white'));
                pills.forEach(p => p.classList.add('bg-gray-900', 'text-gray-300'));
                pill.classList.add('active', 'bg-red-600', 'text-white');
                pill.classList.remove('bg-gray-900', 'text-gray-300');
                currentCategory = pill.dataset.category || 'all';
                initEventsGrid();
            });
        });

        const searchInput = document.getElementById('eventSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                initEventsGrid();
            });
        }
    }

    function setupModalHandlers() {
        const modal = document.getElementById('bookingModal');
        const closeModalBtn = document.getElementById('closeBookingModalBtn');
        if (closeModalBtn && modal) {
            closeModalBtn.addEventListener('click', () => {
                if (isFaceScanning) stopFaceScan();
                modal.classList.add('hidden');
            });
        }

        const backToStep1Btn = document.getElementById('backToStep1Btn');
        if (backToStep1Btn) backToStep1Btn.addEventListener('click', () => switchStep(1));

        const backToStep2Btn = document.getElementById('backToStep2Btn');
        if (backToStep2Btn) backToStep2Btn.addEventListener('click', () => switchStep(2));

        const proceedToSeatsBtn = document.getElementById('proceedToSeatsBtn');
        if (proceedToSeatsBtn) {
            proceedToSeatsBtn.addEventListener('click', () => {
                if (!selectedDate || !selectedTime) {
                    if (window.showAlert) {
                        window.showAlert({ title: 'Select Showtime', message: 'Please select a performance date and showtime to continue.', type: 'warning' });
                    }
                    return;
                }
                renderSeatMap();
                switchStep(2);
            });
        }

        const proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');
        if (proceedToCheckoutBtn) {
            proceedToCheckoutBtn.addEventListener('click', () => {
                if (selectedSeats.size === 0) {
                    if (window.showAlert) {
                        window.showAlert({ title: 'Select Seats', message: 'Please select at least one seat to proceed to checkout.', type: 'warning' });
                    }
                    return;
                }
                renderCheckoutSummary();
                switchStep(3);
            });
        }

        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('buyerName').value.trim();
                const email = document.getElementById('buyerEmail').value.trim();
                const phone = document.getElementById('buyerPhone').value.trim();
                const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';

                if (!name) {
                    if (window.showAlert) {
                        window.showAlert({ title: 'Name Required', message: 'Please enter your full legal name matching your photo ID.', type: 'error' });
                    }
                    return;
                }

                currentBooking = {
                    bookingId: 'TP-' + Math.floor(100000 + Math.random() * 900000),
                    eventId: selectedEvent.id,
                    eventTitle: selectedEvent.title,
                    venue: selectedEvent.venue,
                    date: selectedDate,
                    time: selectedTime,
                    format: selectedFormat,
                    seats: Array.from(selectedSeats),
                    totalAmount: calculateTotal(),
                    buyerName: name,
                    buyerEmail: email,
                    buyerPhone: phone,
                    paymentMethod: paymentMethod,
                    isPast: selectedEvent.isPast || false,
                    createdAt: new Date().toISOString(),
                    faceVerified: false,
                    photoDataUrl: ''
                };

                switchStep(4);
                startFaceScan();
            });
        }

        const openTurnstileBtn = document.getElementById('openTurnstileBtn');
        const turnstileModal = document.getElementById('turnstileModal');
        const closeTurnstileBtn = document.getElementById('closeTurnstileBtn');

        if (openTurnstileBtn && turnstileModal) {
            openTurnstileBtn.addEventListener('click', () => {
                turnstileModal.classList.remove('hidden');
                startTurnstileGate();
            });
        }
        if (closeTurnstileBtn && turnstileModal) {
            closeTurnstileBtn.addEventListener('click', () => {
                stopTurnstileGate();
                turnstileModal.classList.add('hidden');
            });
        }

        const myBookingsBtn = document.getElementById('myBookingsBtn');
        const bookingsModal = document.getElementById('bookingsModal');
        const closeBookingsModalBtn = document.getElementById('closeBookingsModalBtn');

        if (myBookingsBtn && bookingsModal) {
            myBookingsBtn.addEventListener('click', () => {
                renderMyBookingsList();
                bookingsModal.classList.remove('hidden');
            });
        }
        if (closeBookingsModalBtn && bookingsModal) {
            closeBookingsModalBtn.addEventListener('click', () => {
                bookingsModal.classList.add('hidden');
            });
        }
    }

    // Open Booking Flow for an Event (REQUIRES SIGNED-IN USER ACCOUNT)
    window.truePass = {
        openBooking: function (eventId) {
            if (!currentProfile) {
                if (window.showConfirm) {
                    window.showConfirm({
                        title: 'Sign In Required',
                        message: 'To protect tickets with facial biometrics and bind passes directly to your verified account on the cloud, please sign in or register first.',
                        confirmText: 'Face ID Sign In',
                        cancelText: 'Pre-Register / Sign Up'
                    }).then(useFaceId => {
                        if (useFaceId) {
                            window.truePass.openFaceLoginModal();
                        } else {
                            window.location.href = 'onboarding.html';
                        }
                    });
                } else {
                    window.location.href = 'onboarding.html';
                }
                return;
            }

            selectedEvent = EVENTS_DATA.find(e => e.id === eventId);
            if (!selectedEvent) return;

            selectedDate = selectedEvent.dates[0];
            selectedTime = selectedEvent.times[0];
            selectedFormat = selectedEvent.formats[0];
            selectedSeats.clear();

            document.getElementById('modalEventPoster').src = selectedEvent.poster;
            document.getElementById('modalEventTitle').textContent = selectedEvent.title;
            document.getElementById('modalEventVenue').textContent = selectedEvent.venue;
            document.getElementById('modalEventMeta').textContent = `${selectedEvent.duration} • ${selectedEvent.genres.join(', ')} • Rating ${selectedEvent.rating}/10`;
            document.getElementById('modalEventDesc').textContent = selectedEvent.description;

            // Date pills
            const dateContainer = document.getElementById('datePillsContainer');
            dateContainer.innerHTML = selectedEvent.dates.map((d, idx) => `
                <button type="button" class="date-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${idx === 0 ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'}" data-date="${d}">
                    ${d}
                </button>
            `).join('');

            dateContainer.querySelectorAll('.date-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    dateContainer.querySelectorAll('.date-pill').forEach(b => {
                        b.className = 'date-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500';
                    });
                    btn.className = 'date-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30';
                    selectedDate = btn.dataset.date;
                });
            });

            // Format pills
            const formatContainer = document.getElementById('formatPillsContainer');
            formatContainer.innerHTML = selectedEvent.formats.map((f, idx) => `
                <button type="button" class="format-pill px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${idx === 0 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-900 text-gray-400 border-gray-800'}" data-format="${f}">
                    ${f}
                </button>
            `).join('');

            formatContainer.querySelectorAll('.format-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    formatContainer.querySelectorAll('.format-pill').forEach(b => {
                        b.className = 'format-pill px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-gray-900 text-gray-400 border-gray-800';
                    });
                    btn.className = 'format-pill px-3 py-1.5 rounded-lg border text-xs font-medium transition-all bg-indigo-600 text-white border-indigo-500';
                    selectedFormat = btn.dataset.format;
                });
            });

            // Showtime pills
            const timeContainer = document.getElementById('timePillsContainer');
            timeContainer.innerHTML = selectedEvent.times.map((t, idx) => `
                <button type="button" class="time-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${idx === 0 ? 'bg-red-600 text-white border-red-500' : 'bg-gray-900 text-gray-300 border-gray-800'}" data-time="${t}">
                    ${t}
                </button>
            `).join('');

            timeContainer.querySelectorAll('.time-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    timeContainer.querySelectorAll('.time-pill').forEach(b => {
                        b.className = 'time-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all bg-gray-900 text-gray-300 border-gray-800';
                    });
                    btn.className = 'time-pill px-4 py-2 rounded-xl border text-xs font-semibold transition-all bg-red-600 text-white border-red-500';
                    selectedTime = btn.dataset.time;
                });
            });

            switchStep(1);
            document.getElementById('bookingModal').classList.remove('hidden');
        },

        openMemberPassModal: function () {
            if (!currentProfile) {
                window.location.href = 'onboarding.html?mode=login';
                return;
            }
            renderMemberPass();
            const modal = document.getElementById('memberPassModal');
            if (modal) modal.classList.remove('hidden');
        },

        closeMemberPassModal: function () {
            const modal = document.getElementById('memberPassModal');
            if (modal) modal.classList.add('hidden');
        },

        openBookingsModal: function () {
            renderMyBookingsList();
            const modal = document.getElementById('bookingsModal');
            if (modal) modal.classList.remove('hidden');
        },

        openTurnstileModal: function () {
            document.getElementById('turnstileModal').classList.remove('hidden');
            startTurnstileGate();
        },

        openFaceLoginModal: function () {
            startFaceIdLogin();
        },

        // Clean In-Website Refund Method
        refundTicket: async function (bookingId) {
            const bookings = getSavedBookings();
            const b = bookings.find(x => x.bookingId === bookingId);
            if (!b) return;

            const confirmed = await window.showConfirm({
                title: 'Refund Ticket?',
                message: `Are you sure you want to refund booking #${bookingId} for ${b.eventTitle}?`,
                detail: `Seats: ${b.seats.join(', ')} • Amount: ₹${b.totalAmount}\nNote: Biometric entry will be revoked at turnstiles.`,
                confirmText: 'Yes, Refund Ticket',
                cancelText: 'Keep Ticket',
                confirmColor: 'red'
            });

            if (!confirmed) return;

            b.status = 'REFUNDED';
            b.refundedAt = new Date().toISOString();

            // Update in global storage
            let all = [];
            try { all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) {}
            const aIdx = all.findIndex(x => x.bookingId === bookingId);
            if (aIdx >= 0) {
                all[aIdx].status = 'REFUNDED';
                all[aIdx].refundedAt = b.refundedAt;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            }

            // Sync refund to Supabase Cloud
            if (window.supabaseSync && window.supabaseSync.isReady) {
                try {
                    await window.supabaseSync.refundTicketInCloud(bookingId, b.buyerName);
                } catch (e) {}
            }

            // Update local FaceDB role
            if (window.faceDB) {
                try {
                    const activeRem = getSavedBookings().filter(x => x.status !== 'REFUNDED');
                    let newRole = activeRem.length > 0 
                        ? `Ticket Holder: ${activeRem[0].eventTitle} (Seats: ${activeRem[0].seats.join(', ')})`
                        : 'FastTrack Member (No Active Tickets)';
                    await window.faceDB.savePerson({
                        name: b.buyerName,
                        role: newRole,
                        photo: b.photoDataUrl || '',
                        notes: `Ticket ${bookingId} was refunded.`
                    });
                } catch (e) {}
            }

            if (window.soundEffects) window.soundEffects.playAlert();
            renderMyBookingsList();
            renderMemberPass();
            updateBookingsBadge();

            window.showAlert({
                title: 'Ticket Refunded',
                message: `Ticket #${bookingId} has been cancelled and refunded.\nFacial biometric admission has been revoked.`,
                type: 'success'
            });
        },

        signOut: function () {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(PROFILE_KEY);
            sessionStorage.clear();
            currentProfile = null;
            if (window.showToast) window.showToast('Signed out of TruePass session', 'info');
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                window.location.reload();
            } else {
                window.location.href = 'index.html';
            }
        }
    };

    function renderMemberPass() {
        if (!currentProfile) return;
        const nameEl = document.getElementById('passMemberName');
        const idEl = document.getElementById('passMemberId');
        const emailEl = document.getElementById('passMemberEmail');
        const phoneEl = document.getElementById('passMemberPhone');
        const photoEl = document.getElementById('passMemberPhoto');
        const badgeEl = document.getElementById('passLoyaltyBadge');
        const ticketsList = document.getElementById('passTicketsList');

        if (nameEl) nameEl.textContent = currentProfile.name || 'Member';
        if (idEl) idEl.textContent = currentProfile.memberId || 'TP-STA-000000';
        if (emailEl) emailEl.textContent = currentProfile.email || 'fan@truepass.io';
        if (phoneEl) phoneEl.textContent = currentProfile.phone || '+91 98765 43210';
        if (photoEl) photoEl.src = currentProfile.photo || 'https://via.placeholder.com/150';
        if (badgeEl) badgeEl.textContent = `${currentProfile.loyaltyTier || 'Standard'} Member`;

        if (ticketsList) {
            const bookings = getSavedBookings();
            if (bookings.length === 0) {
                ticketsList.innerHTML = `
                    <div class="p-3 rounded-xl bg-gray-900 border border-gray-800 text-center text-xs text-gray-400">
                        No tickets booked yet. Browse events below to book with 1-click FacePass!
                    </div>
                `;
            } else {
                ticketsList.innerHTML = bookings.map(b => {
                    const c = classifyTicket(b);
                    return `
                        <div class="p-2.5 rounded-xl bg-gray-900 border ${c.status === 'ACTIVE' ? 'border-emerald-500/30' : 'border-gray-800'} flex items-center justify-between gap-3 text-xs">
                            <div>
                                <div class="font-bold text-white">${b.eventTitle}</div>
                                <div class="text-[11px] text-gray-400">${b.date} • Seats: <strong class="text-white">${b.seats.join(', ')}</strong> • ₹${b.totalAmount}</div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${c.badgeClass}">${c.label}</span>
                                ${c.status === 'ACTIVE' ? `
                                    <button onclick="window.truePass.refundTicket('${b.bookingId}')" class="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-[10px] text-red-300 font-bold transition-all">
                                        Refund
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // ========================================================
    // FACE ID INSTANT SIGN IN
    // ========================================================
    let faceIdSdk = null;
    let isFaceIdScanning = false;
    let faceIdLoopId = null;

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

        if (!modal || !video || !canvas) return;
        modal.classList.remove('hidden');

        // Reset UI State
        isFaceIdScanning = true;
        if (mismatchCard) mismatchCard.classList.add('hidden');
        if (retryBtn) retryBtn.classList.add('hidden');
        if (container) {
            container.className = 'relative w-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/50 mb-4 shadow-xl shadow-emerald-500/10 transition-all duration-300';
        }
        if (statusEl) {
            statusEl.className = 'text-xs text-gray-400 mb-4';
            statusEl.textContent = 'Starting camera for Instant Face ID sign in...';
        }

        const stop = () => {
            isFaceIdScanning = false;
            if (faceIdLoopId) cancelAnimationFrame(faceIdLoopId);
            if (faceIdSdk) faceIdSdk.stopCamera();
            modal.classList.add('hidden');
        };

        if (closeBtn) closeBtn.onclick = stop;
        if (cancelBtn) cancelBtn.onclick = stop;
        if (retryBtn) retryBtn.onclick = () => startFaceIdLogin();
        const openFaceIdCamBtn = document.getElementById('openFaceIdCamBtn');
        if (openFaceIdCamBtn) openFaceIdCamBtn.onclick = () => startFaceIdLogin();

        try {
            if (!faceIdSdk) faceIdSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });
            await faceIdSdk.init();

            // Load enrolled faces from local FaceDB & Supabase Cloud
            if (window.faceDB) {
                await window.faceDB.init();
                const people = await window.faceDB.getAllPeople();
                faceIdSdk.clearAllEnrolled();
                people.forEach(p => faceIdSdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
            }

            if (window.supabaseSync && window.supabaseSync.isReady) {
                try {
                    const cloudPeople = await window.supabaseSync.fetchPeopleFromCloud();
                    cloudPeople.forEach(cp => {
                        if (!faceIdSdk.enrolledPeople.has(cp.name)) {
                            faceIdSdk.enrollPerson(cp.name, cp.descriptors, { role: cp.role, photo: cp.photo });
                        }
                    });
                } catch(e) {}
            }

            await faceIdSdk.startCamera(video);
            if (statusEl) statusEl.textContent = 'Looking for enrolled face... Position face in frame.';

            let consecutiveUnrecognizedFrames = 0;

            async function scanLoop() {
                if (!isFaceIdScanning) return;

                if (video.readyState >= 2 && video.videoWidth > 0) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    try {
                        const results = await faceIdSdk.recognize(video);
                        faceIdSdk.drawHUD(canvas, results);

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
                                    photo: match.photo || stored.photo || '',
                                    loyaltyTier: match.role ? match.role.replace(/FastTrack Member \((.*?)\)/, '$1') : 'Standard',
                                    lastLogin: Date.now()
                                };
                                localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
                                localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
                                if (window.showToast) {
                                    window.showToast(`Welcome back, ${match.name}! Refreshing session...`, 'success');
                                }
                                setTimeout(() => {
                                    window.location.reload();
                                }, 300);
                            }, 500);
                            return;
                        } else if (results.length > 0) {
                            // A face was detected, but does NOT match any enrolled profile
                            consecutiveUnrecognizedFrames++;
                            if (container) {
                                container.className = 'relative w-64 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-red-500 shadow-xl shadow-red-500/30 mb-4 transition-all duration-300';
                            }
                            if (statusEl) {
                                statusEl.className = 'text-xs font-semibold text-red-400 mb-4';
                                statusEl.textContent = `Face detected but not recognized in TruePass database.`;
                            }

                            if (consecutiveUnrecognizedFrames >= 4) {
                                isFaceIdScanning = false;
                                if (faceIdSdk) faceIdSdk.stopCamera();
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
                faceIdLoopId = requestAnimationFrame(scanLoop);
            }

            scanLoop();
        } catch (e) {
            if (statusEl) statusEl.textContent = `Camera error: ${e.message}`;
        }
    }

    function switchStep(stepNumber) {
        currentStep = stepNumber;
        document.querySelectorAll('.step-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(`stepPanel${stepNumber}`)?.classList.remove('hidden');

        document.querySelectorAll('.step-indicator-dot').forEach((dot, idx) => {
            if (idx + 1 < stepNumber) {
                dot.className = 'step-indicator-dot w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-emerald-500/30';
                dot.innerHTML = '✓';
            } else if (idx + 1 === stepNumber) {
                dot.className = 'step-indicator-dot w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-red-600/30';
                dot.innerHTML = `${idx + 1}`;
            } else {
                dot.className = 'step-indicator-dot w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-bold border border-gray-700';
                dot.innerHTML = `${idx + 1}`;
            }
        });
    }

    function getReservedSeatsForShow(eventId, date, time) {
        const key = `${eventId}_${date}_${time}`;
        if (!bookedSeatsMap.has(key)) {
            const seed = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const reserved = new Set();
            const sampleList = ['A3', 'A4', 'B6', 'B7', 'C5', 'C6', 'D2', 'D10', 'F4', 'G6'];
            sampleList.forEach((s, idx) => {
                if ((seed + idx) % 2 === 0) reserved.add(s);
            });
            bookedSeatsMap.set(key, reserved);
        }
        return bookedSeatsMap.get(key);
    }

    function renderSeatMap() {
        const container = document.getElementById('seatGridContainer');
        if (!container) return;

        const reserved = getReservedSeatsForShow(selectedEvent.id, selectedDate, selectedTime);
        let html = '';
        let currentTier = null;

        SEAT_LAYOUT.forEach(rowDef => {
            if (currentTier !== rowDef.tier) {
                currentTier = rowDef.tier;
                const tierInfo = SEAT_TIERS[currentTier];
                html += `
                    <div class="w-full flex items-center justify-between py-2 mt-4 mb-2 border-b border-gray-800">
                        <span class="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full ${currentTier === 'vip' ? 'bg-purple-500' : (currentTier === 'prime' ? 'bg-blue-500' : 'bg-slate-400')}"></span>
                            ${tierInfo.name}
                        </span>
                        <span class="text-xs font-bold text-white">₹${tierInfo.price}</span>
                    </div>
                `;
            }

            html += `<div class="flex items-center justify-center gap-1.5 my-1.5">`;
            html += `<div class="w-5 text-center text-xs font-bold text-gray-500 select-none">${rowDef.row}</div>`;

            for (let num = 1; num <= 12; num++) {
                const seatKey = `${rowDef.row}${num}`;
                const isReserved = reserved.has(seatKey);
                const isSelected = selectedSeats.has(seatKey);

                let seatClasses = `theater-seat ${SEAT_TIERS[rowDef.tier].class}`;
                if (isReserved) seatClasses += ' reserved';
                if (isSelected) seatClasses += ' selected';

                html += `
                    <button type="button" class="${seatClasses}" data-seat="${seatKey}" data-tier="${rowDef.tier}" ${isReserved ? 'disabled title="Booked"' : `title="${seatKey}"`}>
                        ${num}
                    </button>
                `;

                if (num === 4 || num === 8) html += `<div class="w-4 select-none"></div>`;
            }

            html += `<div class="w-5 text-center text-xs font-bold text-gray-500 select-none">${rowDef.row}</div>`;
            html += `</div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.theater-seat:not(.reserved)').forEach(seatBtn => {
            seatBtn.addEventListener('click', () => {
                const seatKey = seatBtn.dataset.seat;
                if (selectedSeats.has(seatKey)) {
                    selectedSeats.delete(seatKey);
                    seatBtn.classList.remove('selected');
                } else {
                    if (selectedSeats.size >= 6) {
                        window.showAlert({ title: 'Limit Reached', message: 'You can select a maximum of 6 tickets per booking.', type: 'warning' });
                        return;
                    }
                    selectedSeats.add(seatKey);
                    seatBtn.classList.add('selected');
                }
                updateSeatSelectionBar();
            });
        });

        updateSeatSelectionBar();
    }

    function updateSeatSelectionBar() {
        const count = selectedSeats.size;
        document.getElementById('selectedSeatCount').textContent = count;
        document.getElementById('selectedSeatList').textContent = count === 0 ? 'None selected' : Array.from(selectedSeats).join(', ');
        document.getElementById('selectedSeatsSubtotal').textContent = `₹${calculateTotal()}`;

        const nextBtn = document.getElementById('proceedToCheckoutBtn');
        if (nextBtn) {
            nextBtn.disabled = count === 0;
            nextBtn.classList.toggle('opacity-50', count === 0);
            nextBtn.classList.toggle('cursor-not-allowed', count === 0);
        }
    }

    function calculateTotal() {
        let sum = 0;
        selectedSeats.forEach(seatKey => {
            const row = seatKey.charAt(0);
            const rowDef = SEAT_LAYOUT.find(r => r.row === row);
            if (rowDef) sum += SEAT_TIERS[rowDef.tier].price;
        });
        return sum;
    }

    function renderCheckoutSummary() {
        // Auto-fill from active session if logged in
        if (currentProfile) {
            const nameInput = document.getElementById('buyerName');
            const emailInput = document.getElementById('buyerEmail');
            const phoneInput = document.getElementById('buyerPhone');
            if (nameInput) {
                nameInput.value = currentProfile.name || '';
                nameInput.readOnly = true;
                nameInput.classList.add('bg-gray-800/80', 'text-gray-300', 'cursor-not-allowed');
                nameInput.title = 'Ticket holder name is bound to your verified biometric account';
            }
            if (emailInput && !emailInput.value) emailInput.value = currentProfile.email || '';
            if (phoneInput && !phoneInput.value) phoneInput.value = currentProfile.phone || '';
        }

        const subtotal = calculateTotal();
        const fees = Math.round(subtotal * 0.08 * 100) / 100;
        const grandTotal = subtotal + fees;

        document.getElementById('checkoutEventTitle').textContent = selectedEvent.title;
        document.getElementById('checkoutEventDetails').textContent = `${selectedDate} at ${selectedTime} • ${selectedFormat} • ${selectedEvent.venue}`;
        document.getElementById('checkoutSeatsList').textContent = Array.from(selectedSeats).join(', ');
        document.getElementById('checkoutSubtotal').textContent = `₹${subtotal}`;
        document.getElementById('checkoutFees').textContent = `₹${fees}`;
        document.getElementById('checkoutGrandTotal').textContent = `₹${grandTotal}`;
    }

    // ----------------------------------------------------
    // BIOMETRIC 1-TO-1 FACE MATCHING UTILITIES
    // ----------------------------------------------------
    function calculateEuclideanDistance(descA, descB) {
        if (!descA || !descB) return 1.0;
        const a = descA instanceof Float32Array ? descA : Object.values(descA);
        const b = descB instanceof Float32Array ? descB : Object.values(descB);
        const len = Math.min(a.length, b.length);
        if (len === 0) return 1.0;
        let sum = 0;
        for (let i = 0; i < len; i++) {
            const diff = Number(a[i]) - Number(b[i]);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    async function getProfileEnrolledDescriptors(profile) {
        if (!profile) return [];
        let descriptors = [];

        // 1. Check profile in active session
        if (profile.descriptors && Array.isArray(profile.descriptors) && profile.descriptors.length > 0) {
            try {
                descriptors = profile.descriptors.map(d => new Float32Array(Object.values(d)));
                return descriptors;
            } catch (e) {}
        }

        // 2. Check IndexedDB FaceDB (local fast lookup)
        if (window.faceDB && profile.name) {
            try {
                await window.faceDB.init();
                const person = await window.faceDB.getPerson(profile.name);
                if (person && person.descriptors && person.descriptors.length > 0) {
                    descriptors = person.descriptors.map(d => new Float32Array(Object.values(d)));
                    profile.descriptors = descriptors.map(d => Array.from(d));
                    return descriptors;
                }
            } catch (e) {
                console.debug('FaceDB person check note:', e);
            }
        }

        // 3. Check Supabase Cloud profiles table or faces table
        if (window.supabaseSync && window.supabaseSync.client && profile.name) {
            try {
                const { data } = await window.supabaseSync.client
                    .from('profiles')
                    .select('descriptors, photo_url')
                    .ilike('name', profile.name.trim())
                    .limit(1);

                if (data && data.length > 0 && data[0].descriptors && data[0].descriptors.length > 0) {
                    descriptors = data[0].descriptors.map(d => new Float32Array(Object.values(d)));
                    profile.descriptors = descriptors.map(d => Array.from(d));
                    return descriptors;
                }

                const { data: fData } = await window.supabaseSync.client
                    .from('faces')
                    .select('descriptors, photo_url')
                    .ilike('name', profile.name.trim())
                    .limit(1);

                if (fData && fData.length > 0 && fData[0].descriptors && fData[0].descriptors.length > 0) {
                    descriptors = fData[0].descriptors.map(d => new Float32Array(Object.values(d)));
                    profile.descriptors = descriptors.map(d => Array.from(d));
                    return descriptors;
                }
            } catch (e) {
                console.debug('Supabase cloud fetch descriptors note:', e);
            }
        }

        // 4. Extract from enrolled profile photo if available
        if (profile.photo && checkoutSdk) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = profile.photo;
                await new Promise((res, rej) => {
                    img.onload = res;
                    img.onerror = rej;
                    setTimeout(rej, 3500);
                });
                const det = await checkoutSdk.extractDescriptor(img);
                if (det && det.descriptor) {
                    descriptors = [det.descriptor];
                    profile.descriptors = [Array.from(det.descriptor)];
                    return descriptors;
                }
            } catch (e) {
                console.debug('Profile photo descriptor extraction note:', e);
            }
        }

        return descriptors;
    }

    // Step 4: Face-Scan Biometric Gate (STRICT: ONLY ACCEPTS PROFILE USER'S FACE WITH RETRY & CANCEL)
    async function startFaceScan() {
        const video = document.getElementById('faceScanVideo');
        const canvas = document.getElementById('faceScanCanvas');
        const statusText = document.getElementById('faceScanStatusText');
        const progressBar = document.getElementById('faceScanProgressBar');
        const captureBtn = document.getElementById('triggerManualCaptureBtn');
        const retryBtn = document.getElementById('retryFaceScanBtn');
        const cancelBtn = document.getElementById('cancelFaceScanBtn');
        const mismatchBox = document.getElementById('faceScanMismatchBox');
        const noEnrollmentBox = document.getElementById('faceScanNoEnrollmentBox');
        const container = document.getElementById('faceScanContainer');
        const targetAvatar = document.getElementById('faceVerifyTargetAvatar');
        const targetName = document.getElementById('faceVerifyTargetName');

        if (!video || !canvas) return;

        // Reset UI State
        isFaceScanning = true;
        if (mismatchBox) mismatchBox.classList.add('hidden');
        if (noEnrollmentBox) noEnrollmentBox.classList.add('hidden');
        if (retryBtn) retryBtn.classList.add('hidden');
        if (captureBtn) captureBtn.classList.remove('hidden');
        if (container) {
            container.className = 'relative w-72 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/20 transition-all duration-300';
        }

        const profileOwnerName = currentProfile ? (currentProfile.name || 'Account Owner') : 'Account Owner';
        if (targetName) targetName.textContent = profileOwnerName;
        if (targetAvatar) targetAvatar.src = (currentProfile && currentProfile.photo) ? currentProfile.photo : 'https://via.placeholder.com/40';

        if (statusText) {
            statusText.className = 'text-xs font-semibold text-emerald-400 animate-pulse';
            statusText.textContent = `Verifying identity for ${profileOwnerName}...`;
        }
        if (progressBar) {
            progressBar.style.width = '20%';
            progressBar.className = 'bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300';
        }

        // Cancel Button Action: Returns to Step 3
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                stopFaceScan();
                switchStep(3);
                if (window.showToast) window.showToast('Face verification cancelled. Returned to checkout details.', 'info');
            };
        }

        // Retry Button Action: Re-triggers face scan
        if (retryBtn) {
            retryBtn.onclick = () => {
                startFaceScan();
            };
        }

        const openBookingCamBtn = document.getElementById('openBookingCameraBtn');
        if (openBookingCamBtn) {
            openBookingCamBtn.onclick = () => {
                startFaceScan();
            };
        }

        try {
            if (!checkoutSdk) checkoutSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.52 });
            await checkoutSdk.init();

            // Load enrolled reference biometrics of the account owner
            if (statusText) statusText.textContent = `Loading enrolled biometric profile for ${profileOwnerName}...`;
            const referenceDescriptors = await getProfileEnrolledDescriptors(currentProfile);

            if (!referenceDescriptors || referenceDescriptors.length === 0) {
                isFaceScanning = false;
                if (noEnrollmentBox) noEnrollmentBox.classList.remove('hidden');
                const noEnrollName = document.getElementById('noEnrollmentOwnerName');
                if (noEnrollName) noEnrollName.textContent = profileOwnerName;
                if (statusText) {
                    statusText.className = 'text-xs font-semibold text-amber-400';
                    statusText.textContent = `No enrolled biometric profile found for ${profileOwnerName}`;
                }
                if (captureBtn) captureBtn.classList.add('hidden');
                return;
            }

            if (progressBar) progressBar.style.width = '45%';
            if (statusText) statusText.textContent = `Starting camera. Please look directly at the lens...`;

            await checkoutSdk.startCamera(video);
            if (progressBar) progressBar.style.width = '65%';
            if (statusText) statusText.textContent = `Position your face in frame. Authenticating ${profileOwnerName}...`;

            let stableMatchFrames = 0;
            let consecutiveMismatchFrames = 0;
            const REQUIRED_MATCH_FRAMES = 3;
            let isProcessingFrame = false;

            async function scanLoop() {
                if (!isFaceScanning) return;

                if (!isProcessingFrame && video.readyState >= 2 && video.videoWidth > 0) {
                    isProcessingFrame = true;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    try {
                        const detection = await checkoutSdk.extractDescriptor(video);
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        if (detection && detection.box && detection.descriptor) {
                            // Calculate minimum Euclidean distance to all enrolled descriptors for this user
                            let minDistance = 999;
                            for (const ref of referenceDescriptors) {
                                const dist = calculateEuclideanDistance(detection.descriptor, ref);
                                if (dist < minDistance) minDistance = dist;
                            }

                            const isMatch = minDistance <= 0.52;
                            const similarity = Math.max(0, Math.min(100, Math.round((1 - (minDistance / 1.1)) * 100)));
                            const box = detection.box;

                            if (isMatch) {
                                // MATCH: Authorized account owner detected
                                consecutiveMismatchFrames = 0;
                                stableMatchFrames++;

                                if (container) {
                                    container.className = 'relative w-72 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-400 shadow-2xl shadow-emerald-500/40 transition-all duration-300';
                                }

                                // Draw Emerald Bounding Box & Identity HUD
                                ctx.strokeStyle = '#10b981';
                                ctx.lineWidth = 3;
                                ctx.strokeRect(box.x, box.y, box.width, box.height);

                                ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
                                ctx.fillRect(box.x, Math.max(0, box.y - 24), Math.min(box.width, 220), 22);
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 12px sans-serif';
                                ctx.fillText(`✓ ${profileOwnerName} (${similarity}%)`, box.x + 6, Math.max(16, box.y - 8));

                                const progress = Math.min(95, 65 + (stableMatchFrames / REQUIRED_MATCH_FRAMES) * 30);
                                if (progressBar) {
                                    progressBar.style.width = `${progress}%`;
                                    progressBar.className = 'bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300';
                                }
                                if (statusText) {
                                    statusText.className = 'text-xs font-semibold text-emerald-400 animate-pulse';
                                    statusText.textContent = `Identity verified (${stableMatchFrames}/${REQUIRED_MATCH_FRAMES}): ${profileOwnerName} (${similarity}% match)...`;
                                }

                                if (stableMatchFrames >= REQUIRED_MATCH_FRAMES) {
                                    isFaceScanning = false;
                                    await finalizeFaceEnrollment(video, detection);
                                    return;
                                }

                            } else {
                                // MISMATCH: An unauthorized person's face was detected!
                                stableMatchFrames = 0;
                                consecutiveMismatchFrames++;

                                if (container) {
                                    container.className = 'relative w-72 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-red-500 shadow-2xl shadow-red-500/40 transition-all duration-300';
                                }

                                // Draw Red Warning Box on HUD
                                ctx.strokeStyle = '#ef4444';
                                ctx.lineWidth = 3;
                                ctx.strokeRect(box.x, box.y, box.width, box.height);

                                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                                ctx.fillRect(box.x, Math.max(0, box.y - 24), Math.min(box.width, 220), 22);
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 12px sans-serif';
                                ctx.fillText(`[MISMATCH] (Not ${profileOwnerName})`, box.x + 6, Math.max(16, box.y - 8));

                                if (statusText) {
                                    statusText.className = 'text-xs font-semibold text-red-400';
                                    statusText.textContent = `Face mismatch: Detected face does not match profile for ${profileOwnerName}`;
                                }
                                if (progressBar) {
                                    progressBar.style.width = '25%';
                                    progressBar.className = 'bg-red-500 h-full transition-all duration-300';
                                }

                                // If mismatch persists for 4 consecutive frames, pause and show Retry & Cancel UI
                                if (consecutiveMismatchFrames >= 4) {
                                    isFaceScanning = false;
                                    handleFaceMismatch(profileOwnerName, minDistance, similarity);
                                    return;
                                }
                            }

                        } else {
                            // No face detected in frame
                            stableMatchFrames = Math.max(0, stableMatchFrames - 1);
                            if (statusText) {
                                statusText.className = 'text-xs font-semibold text-emerald-400';
                                statusText.textContent = `Looking for ${profileOwnerName}'s face... Please face camera directly`;
                            }
                        }
                    } catch (err) {
                        console.debug('Scan frame warning:', err);
                    } finally {
                        isProcessingFrame = false;
                    }
                }

                if (isFaceScanning) {
                    faceScanLoopId = requestAnimationFrame(scanLoop);
                }
            }

            scanLoop();

            // Manual Snap Button: Strictly validates face against profile
            if (captureBtn) {
                captureBtn.onclick = async () => {
                    if (!checkoutSdk || !video) return;
                    try {
                        const detection = await checkoutSdk.extractDescriptor(video);
                        if (!detection || !detection.descriptor) {
                            if (window.showAlert) {
                                window.showAlert({
                                    title: 'No Face Detected',
                                    message: 'Could not detect a clear face in frame. Please adjust lighting and face the camera directly.',
                                    type: 'warning'
                                });
                            }
                            return;
                        }

                        // Compare against profile owner
                        let minDistance = 999;
                        for (const ref of referenceDescriptors) {
                            const dist = calculateEuclideanDistance(detection.descriptor, ref);
                            if (dist < minDistance) minDistance = dist;
                        }

                        const isMatch = minDistance <= 0.52;
                        const similarity = Math.max(0, Math.min(100, Math.round((1 - (minDistance / 1.1)) * 100)));

                        if (isMatch) {
                            isFaceScanning = false;
                            await finalizeFaceEnrollment(video, detection);
                        } else {
                            // Strict Rejection on Manual Snap
                            isFaceScanning = false;
                            handleFaceMismatch(profileOwnerName, minDistance, similarity);
                        }
                    } catch (snapErr) {
                        console.warn('Manual snap error:', snapErr);
                    }
                };
            }

        } catch (e) {
            if (statusText) statusText.textContent = `Camera error: ${e.message}`;
        }
    }

    // Handles Face Mismatch UI State
    function handleFaceMismatch(ownerName, distance, similarity) {
        if (faceScanLoopId) cancelAnimationFrame(faceScanLoopId);
        if (checkoutSdk) checkoutSdk.stopCamera();

        const mismatchBox = document.getElementById('faceScanMismatchBox');
        const mismatchOwner = document.getElementById('mismatchOwnerName');
        const mismatchScore = document.getElementById('mismatchSimilarityScore');
        const retryBtn = document.getElementById('retryFaceScanBtn');
        const captureBtn = document.getElementById('triggerManualCaptureBtn');
        const statusText = document.getElementById('faceScanStatusText');
        const progressBar = document.getElementById('faceScanProgressBar');
        const container = document.getElementById('faceScanContainer');

        if (mismatchBox) mismatchBox.classList.remove('hidden');
        if (mismatchOwner) mismatchOwner.textContent = ownerName;
        if (mismatchScore) mismatchScore.textContent = `${similarity}% (Distance: ${distance.toFixed(2)})`;
        if (retryBtn) retryBtn.classList.remove('hidden');
        if (captureBtn) captureBtn.classList.add('hidden');

        if (container) {
            container.className = 'relative w-72 aspect-square mx-auto rounded-3xl overflow-hidden bg-black border-2 border-red-500 shadow-2xl shadow-red-500/50 transition-all duration-300';
        }

        if (statusText) {
            statusText.className = 'text-xs font-bold text-red-400';
            statusText.textContent = `Face mismatch: Access denied for unauthorized user.`;
        }
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.className = 'bg-red-600 h-full';
        }

        if (window.soundEffects) {
            window.soundEffects.playAlert();
        }
    }

    // FINALIZE FACE ENROLLMENT: SNAPS CLEAN FRAME, BINDS TO TICKET & CONFIRMS
    async function finalizeFaceEnrollment(video, detection) {
        try {
            // 1. Shutter Flash Effect
            const container = document.getElementById('faceScanContainer') || (video ? video.parentElement : null);
            if (container) {
                const flash = document.createElement('div');
                flash.className = 'absolute inset-0 bg-white z-30 transition-opacity duration-300 pointer-events-none opacity-80';
                container.appendChild(flash);
                setTimeout(() => {
                    flash.classList.add('opacity-0');
                    setTimeout(() => flash.remove(), 350);
                }, 80);
            }

            // 2. Freeze the last frame onto faceScanCanvas so it NEVER turns black
            const canvas = document.getElementById('faceScanCanvas');
            if (canvas && video && video.videoWidth > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const cctx = canvas.getContext('2d');
                cctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            // 3. Capture clean square headshot while video is active
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = 320;
            captureCanvas.height = 320;
            const ctx = captureCanvas.getContext('2d');

            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
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

            // Fill background
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, 320, 320);

            // Draw active video crop
            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 320, 320);
            const photoDataUrl = captureCanvas.toDataURL('image/jpeg', 0.95);

            // Update UI status
            const statusText = document.getElementById('faceScanStatusText');
            const progressBar = document.getElementById('faceScanProgressBar');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.className = 'bg-emerald-500 h-full transition-all duration-300';
            }
            if (statusText) {
                statusText.className = 'text-xs font-bold text-emerald-400';
                statusText.textContent = `✓ Biometric signature verified & bound to ticket!`;
            }

            if (window.soundEffects) {
                window.soundEffects.playShutter();
                setTimeout(() => window.soundEffects.playSuccess(), 250);
            }

            // Save into FaceDB
            if (window.faceDB && currentBooking) {
                try {
                    await window.faceDB.init();
                    await window.faceDB.savePerson({
                        name: currentBooking.buyerName,
                        role: `Ticket Holder: ${currentBooking.eventTitle} (Seats: ${(currentBooking.seats || []).join(', ')})`,
                        descriptors: [detection.descriptor],
                        photo: photoDataUrl,
                        notes: `Booking ID: ${currentBooking.bookingId} • Venue: ${currentBooking.venue}`
                    });
                } catch (err) {
                    console.debug('FaceDB save note:', err);
                }
            }

            if (selectedEvent && selectedDate && selectedTime) {
                const reserved = getReservedSeatsForShow(selectedEvent.id, selectedDate, selectedTime);
                (selectedSeats || []).forEach(s => reserved.add(s));
            }

            if (currentBooking) {
                currentBooking.faceVerified = true;
                currentBooking.photoDataUrl = photoDataUrl;
                currentBooking.status = 'CONFIRMED';

                // Mint Soulbound Biometric Ticket NFT on Blockchain
                if (window.truePassWeb3) {
                    try {
                        const nft = await window.truePassWeb3.mintBiometricTicketNFT(currentBooking, detection.descriptor);
                        currentBooking.nft = nft;
                        if (window.showToast) {
                            window.showToast(`Soulbound NFT Minted: Token #${nft.tokenId} (Polygon)`, 'success');
                        }
                    } catch (wErr) {
                        console.warn('Web3 NFT mint note:', wErr);
                    }
                }

                saveBookingToStorage(currentBooking);
                updateBookingsBadge();
            }

            // Transition smoothly to Step 5 (Ticket Pass) and stop camera ONLY AFTER switchStep(5)
            setTimeout(() => {
                try {
                    renderTicketPass(currentBooking);
                } catch (rErr) {
                    console.error('renderTicketPass note:', rErr);
                }
                switchStep(5);
                stopFaceScan();
            }, 600);

        } catch (fatalErr) {
            console.error('Fatal face enrollment error:', fatalErr);
            if (window.showAlert) {
                window.showAlert({
                    title: 'Biometric Binding Error',
                    message: 'An error occurred while finalizing ticket biometrics: ' + fatalErr.message,
                    type: 'error'
                });
            }
        }
    }

    function stopFaceScan() {
        isFaceScanning = false;
        if (faceScanLoopId) cancelAnimationFrame(faceScanLoopId);
        if (checkoutSdk) checkoutSdk.stopCamera();
    }

    function renderTicketPass(booking) {
        if (!booking) return;

        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '';
        };

        safeSet('ticketEventTitle', booking.eventTitle);
        safeSet('ticketEventVenue', booking.venue);
        safeSet('ticketEventDateTime', `${booking.date} • ${booking.time}`);
        safeSet('ticketEventFormat', booking.format || 'Standard');
        safeSet('ticketSeatsList', (booking.seats || []).join(', '));
        safeSet('ticketBookingId', booking.bookingId);
        safeSet('ticketHolderName', booking.buyerName);
        safeSet('ticketTotalPaid', `₹${booking.totalAmount || 0}`);

        const faceImg = document.getElementById('ticketFacePhoto');
        if (faceImg && booking.photoDataUrl) {
            faceImg.src = booking.photoDataUrl;
        }

        // On-chain Soulbound NFT Badge Update
        const nftBadge = document.getElementById('ticketNftBadge');
        const nftTokenId = document.getElementById('ticketNftTokenId');
        const nftLink = document.getElementById('ticketNftExplorerLink');

        if (booking.nft && nftBadge) {
            nftBadge.classList.remove('hidden');
            if (nftTokenId) nftTokenId.textContent = `Token #${booking.nft.tokenId} • Contract: ${booking.nft.contractAddress.substring(0, 10)}... • ${booking.nft.network}`;
            if (nftLink) nftLink.href = booking.nft.explorerUrl;
        } else if (nftBadge) {
            nftBadge.classList.add('hidden');
        }

        const testTurnstileBtn = document.getElementById('ticketTestTurnstileBtn');
        if (testTurnstileBtn) {
            testTurnstileBtn.onclick = () => {
                document.getElementById('bookingModal').classList.add('hidden');
                document.getElementById('turnstileModal').classList.remove('hidden');
                startTurnstileGate();
            };
        }
    }

    // My Bookings Drawer (With Active vs Expired vs Refunded and Refund Action)
    function renderMyBookingsList() {
        const container = document.getElementById('myBookingsList');
        if (!container) return;

        if (!currentProfile || !currentProfile.name) {
            container.innerHTML = `
                <div class="py-12 text-center text-gray-500">
                    <div class="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m7-7A5 5 0 115 10a5 5 0 0110 0z"/></svg>
                    </div>
                    <p class="text-sm font-semibold text-gray-300">Sign In Required</p>
                    <p class="text-xs text-gray-500 mt-1 mb-4">Please sign in to view your biometric tickets and wallet passes.</p>
                    <button onclick="window.truePass.openFaceLoginModal(); document.getElementById('bookingsModal').classList.add('hidden');" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30">
                        Face ID Sign In
                    </button>
                </div>
            `;
            return;
        }

        const bookings = getSavedBookings();
        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-gray-500">
                    <p class="text-sm font-semibold text-gray-400">No tickets found for ${currentProfile.name}</p>
                    <p class="text-xs text-gray-500 mt-1">Book an event to register your biometric passes directly on Supabase Cloud.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bookings.map(b => {
            const c = classifyTicket(b);
            return `
                <div class="p-4 rounded-xl glass-surface border ${c.status === 'ACTIVE' ? 'border-emerald-500/40' : (c.status === 'REFUNDED' ? 'border-red-500/30 opacity-70' : 'border-gray-800 opacity-80')} flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        ${b.photoDataUrl ? `<img src="${b.photoDataUrl}" class="w-14 h-14 rounded-xl object-cover border-2 ${c.status === 'ACTIVE' ? 'border-emerald-400' : 'border-gray-700'} shadow-md">` : `<div class="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-gray-500">TP</div>`}
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-red-400 font-mono">${b.bookingId}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full border ${c.badgeClass}">${c.label}</span>
                            </div>
                            <h4 class="text-sm font-bold text-white mt-0.5">${b.eventTitle}</h4>
                            <p class="text-xs text-gray-400">${b.date} • ${b.time} • Seats: <strong class="text-gray-200">${b.seats.join(', ')}</strong> • ₹${b.totalAmount}</p>
                            ${b.nft ? `
                                <div class="mt-1 flex items-center gap-1.5 text-[10px] text-purple-300 font-mono">
                                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                                    <span>Soulbound NFT #${b.nft.tokenId}</span>
                                    <a href="${b.nft.explorerUrl}" target="_blank" class="text-purple-400 hover:text-purple-300 underline font-sans ml-1">Polygonscan &nearr;</a>
                                </div>
                            ` : ''}
                            ${b.refundedAt ? `<p class="text-[10px] text-red-400 mt-0.5">Refunded on ${new Date(b.refundedAt).toLocaleDateString()}</p>` : ''}
                        </div>
                    </div>

                    <div class="flex items-center gap-2 self-end md:self-center">
                        ${c.status === 'ACTIVE' ? (
                            b.isListedForResale ? `
                                <span class="px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/15 text-[11px] text-neutral-300 font-mono font-medium flex items-center">
                                    <svg class="w-3.5 h-3.5 mr-1 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                                    Listed (${b.resalePrice || '10'} QUAI)
                                </span>
                                <button class="btn-glass px-2.5 py-1 rounded-lg text-xs text-neutral-300 font-semibold transition-all" onclick="window.truePass.cancelResaleListingDirect('${b.bookingId}')">
                                    Delist
                                </button>
                            ` : `
                                <a href="resale.html?action=sell&bookingId=${b.bookingId}" class="btn-glass px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
                                    <svg class="w-3.5 h-3.5 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                                    <span>Resell on Quai</span>
                                </a>
                            `
                        ) : ''}
                        ${c.status === 'ACTIVE' && !b.isListedForResale ? `
                            <button class="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition-all" onclick="window.truePass.refundTicket('${b.bookingId}')">
                                Refund
                            </button>
                        ` : ''}
                        <button class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors" onclick="window.truePass.viewTicket('${b.bookingId}')">
                            View Pass
                        </button>
                        ${c.status === 'ACTIVE' ? `
                            <button class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1" onclick="window.truePass.openTurnstileModal()">
                                Test Turnstile
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.truePass.viewTicket = function (bookingId) {
        const bookings = getSavedBookings();
        const found = bookings.find(b => b.bookingId === bookingId);
        if (!found) return;
        document.getElementById('bookingsModal').classList.add('hidden');
        renderTicketPass(found);
        switchStep(5);
        document.getElementById('bookingModal').classList.remove('hidden');
    };

    window.truePass.cancelResaleListingDirect = async function (bookingId) {
        if (!confirm('Are you sure you want to delist this ticket from the Quai Resale Marketplace?')) return;
        const bookings = getSavedBookings();
        const b = bookings.find(item => item.bookingId === bookingId);
        if (!b) return;

        if (window.quaiResale && b.resaleListingId) {
            try {
                await window.quaiResale.cancelResaleListing(b.resaleListingId);
            } catch (err) {
                console.warn('[Quai Cancel Resale]', err);
            }
        }

        b.isListedForResale = false;
        delete b.resaleListingId;
        delete b.resalePrice;
        localStorage.setItem('truepass_user_bookings', JSON.stringify(bookings));
        renderMyBookingsList();
        if (window.showToast) window.showToast(`Ticket ${bookingId} delisted from Quai Network.`, 'info');
    };

    function updateBookingsBadge() {
        const btn = document.getElementById('myBookingsBtn');
        const badge = document.getElementById('myBookingsCountBadge');
        if (!currentProfile || !currentProfile.name) {
            if (btn) btn.classList.add('hidden');
            if (badge) badge.classList.add('hidden');
            return;
        }

        if (btn) btn.classList.remove('hidden');
        if (badge) {
            const count = getSavedBookings().length;
            badge.textContent = count;
            badge.classList.toggle('hidden', count === 0);
        }
    }

    // Turnstile Simulator: Validates Active vs Expired vs Refunded
    async function startTurnstileGate() {
        const video = document.getElementById('turnstileVideo');
        const canvas = document.getElementById('turnstileCanvas');
        const statusBadge = document.getElementById('turnstileStatusBadge');
        const statusText = document.getElementById('turnstileStatusText');
        const turnstileBox = document.getElementById('turnstileGateBox');
        const attendeeCard = document.getElementById('turnstileAttendeeCard');

        if (!video || !canvas) return;
        isTurnstileRunning = true;

        if (statusBadge) {
            statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse';
            statusBadge.textContent = 'TURNSTILE READY • WAITING FOR GUEST';
        }
        if (statusText) statusText.textContent = 'Look directly at the overhead camera at Gate 4 to unlock turnstile...';

        try {
            if (!turnstileSdk) turnstileSdk = new window.FacialRecognitionSDK({ distanceThreshold: 0.54 });
            await turnstileSdk.init();

            if (window.faceDB) {
                await window.faceDB.init();
                const people = await window.faceDB.getAllPeople();
                turnstileSdk.clearAllEnrolled();
                people.forEach(p => turnstileSdk.enrollPerson(p.name, p.descriptors, { role: p.role, photo: p.photo }));
            }

            await turnstileSdk.startCamera(video);

            async function turnstileLoop() {
                if (!isTurnstileRunning) return;

                if (video.readyState >= 2 && video.videoWidth > 0) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    try {
                        const results = await turnstileSdk.recognize(video);
                        turnstileSdk.drawHUD(canvas, results, { mirrored: false });

                        const now = Date.now();
                        if (now - lastGateTriggerTime > 3500) {
                            const match = results.find(r => r.isRecognized);

                            if (match) {
                                lastGateTriggerTime = now;

                                const allTickets = getSavedBookings();
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

                                    if (turnstileBox) turnstileBox.classList.add('turnstile-open', 'border-emerald-500');
                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
                                        statusBadge.textContent = 'ACCESS GRANTED • TURNSTILE UNLOCKED';
                                    }
                                    if (statusText) {
                                        const nftNote = valid.nft ? ` • <span class="text-purple-300 font-mono text-xs">Soulbound NFT #${valid.nft.tokenId} Verified</span>` : '';
                                        statusText.innerHTML = `<span class="text-emerald-400 font-bold">VALID TICKET VERIFIED!</span> Welcome, <strong>${match.name}</strong>. Event: ${valid.eventTitle} (Seat: ${valid.seats.join(', ')})${nftNote}`;
                                    }
                                } else if (expiredTickets.length > 0 && activeTickets.length === 0) {
                                    if (window.soundEffects) window.soundEffects.playAlert();
                                    if (turnstileBox) turnstileBox.classList.remove('turnstile-open');

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • TICKETS EXPIRED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `<span class="text-amber-400 font-bold">ALL TICKETS EXPIRED:</span> ${match.name} has ${expiredTickets.length} past ticket(s). Event has concluded.`;
                                    }
                                } else if (refundedTickets.length > 0 && activeTickets.length === 0) {
                                    if (window.soundEffects) window.soundEffects.playAlert();
                                    if (turnstileBox) turnstileBox.classList.remove('turnstile-open');

                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • TICKET REFUNDED';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `<span class="text-red-400 font-bold">TICKET REFUNDED:</span> Biometric admission revoked upon ticket refund.`;
                                    }
                                } else {
                                    if (window.soundEffects) window.soundEffects.playAlert();
                                    if (statusBadge) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40';
                                        statusBadge.textContent = 'ACCESS DENIED • NO TICKET FOUND';
                                    }
                                    if (statusText) {
                                        statusText.innerHTML = `Face profile found for <strong>${match.name}</strong>, but no valid ticket has been purchased.`;
                                    }
                                }

                                if (attendeeCard) {
                                    attendeeCard.classList.remove('hidden');
                                    document.getElementById('gateAttendeeName').textContent = match.name;
                                    document.getElementById('gateAttendeeRole').textContent = match.role || 'FastTrack Member';
                                    const enrolled = turnstileSdk.enrolledPeople.get(match.name);
                                    if (enrolled && enrolled.photo) {
                                        document.getElementById('gateAttendeePhoto').src = enrolled.photo;
                                    }
                                }

                                setTimeout(() => {
                                    if (turnstileBox) turnstileBox.classList.remove('turnstile-open');
                                    if (statusBadge && isTurnstileRunning) {
                                        statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse';
                                        statusBadge.textContent = 'TURNSTILE READY • WAITING FOR GUEST';
                                    }
                                }, 3500);
                            }
                        }
                    } catch (e) {}
                }
                turnstileLoopId = requestAnimationFrame(turnstileLoop);
            }

            turnstileLoop();
        } catch (e) {
            if (statusText) statusText.textContent = `Turnstile camera error: ${e.message}`;
        }
    }

    function stopTurnstileGate() {
        isTurnstileRunning = false;
        if (turnstileLoopId) cancelAnimationFrame(turnstileLoopId);
        if (turnstileSdk) turnstileSdk.stopCamera();
    }

})();
