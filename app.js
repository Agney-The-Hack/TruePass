/**
 * TruePass — BookMyShow Style Ticketing & Biometric Verification
 * Features:
 * 1. Onboarding first: Name, Mobile Number, City, Interests, then Face ID scan.
 * 2. 100% Indian Rupee (₹ INR) payments via Razorpay / UPI / Cards simulation.
 * 3. Blockchain used strictly for On-Chain TruePass ID issuance and Biometric Face Commitment anchoring.
 * 4. Authentic BookMyShow UI: City selection, category navigation, M-Ticket passes, and gate turnstile scanner.
 */

// Global Application State
const state = {
  user: {
    name: "",
    phone: "",
    city: "Bengaluru",
    interests: ["Concerts & Music", "Stand-up Comedy"],
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    isRegistered: false,
    isEnrolled: false,
    faceSnapshot: null,
    biometricHash: null,
    salt: null,
  },
  selectedCity: "Bengaluru",
  selectedCategory: "All",
  searchQuery: "",
  events: [
    {
      id: 1001,
      category: "Concerts & Music",
      title: "Coldplay: Music of the Spheres Tour",
      subtitle: "Live Stadium Performance & Synced Light Bands",
      date: "JAN 18, 2027 • 19:00 IST",
      venue: "D.Y. Patil Sports Stadium, Mumbai",
      city: "Mumbai",
      price: 3500,
      tier: "Lawn General Admission",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85",
      tags: ["Rock", "Stadium Tour", "16+"],
    },
    {
      id: 1002,
      category: "Concerts & Music",
      title: "Diljit Dosanjh: Dil-Luminati Tour",
      subtitle: "High-Energy Punjabi Arena Show & Visual Spectacle",
      date: "FEB 14, 2027 • 18:30 IST",
      venue: "Jawaharlal Nehru Stadium, Delhi-NCR",
      city: "Delhi-NCR",
      price: 4999,
      tier: "Fanpit Access",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=85",
      tags: ["Punjabi", "Bhangra", "Sold Fast"],
    },
    {
      id: 1003,
      category: "Stand-up Comedy",
      title: "Zakir Khan: Tathastu Live",
      subtitle: "An Intimate Evening of Poetic Storytelling & Stand-Up",
      date: "DEC 19, 2026 • 19:30 IST",
      venue: "Good Shepherd Auditorium, Bengaluru",
      city: "Bengaluru",
      price: 1499,
      tier: "Platinum Orchestra",
      image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=85",
      tags: ["Hindi Stand-up", "Family"],
    },
    {
      id: 1004,
      category: "Cricket & Live Sports",
      title: "India vs Australia: Pink Ball Test",
      subtitle: "Day 1 Twilight Session — North Pavilion Corporate Box",
      date: "FEB 22, 2027 • 14:00 IST",
      venue: "M. Chinnaswamy Stadium, Bengaluru",
      city: "Bengaluru",
      price: 6500,
      tier: "Pavilion Terrace Lounge",
      image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=85",
      tags: ["Cricket", "Twilight Test"],
    },
    {
      id: 1005,
      category: "Concerts & Music",
      title: "Afterlife: Echoes of Silence",
      subtitle: "Melodic Techno & Spatial 3D Sound Journey",
      date: "DEC 28, 2026 • 20:00 IST",
      venue: "Mahalaxmi Racecourse, Mumbai",
      city: "Mumbai",
      price: 4200,
      tier: "VIP Arena Standing",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=85",
      tags: ["Melodic Techno", "18+"],
    },
    {
      id: 1006,
      category: "Tech & Summits",
      title: "ETHIndia & Zero-Knowledge Summit",
      subtitle: "Global Cryptography, Scaling & AI Protocol Forum",
      date: "JAN 15, 2027 • 09:30 IST",
      venue: "Jio World Convention Centre, Mumbai",
      city: "Mumbai",
      price: 2999,
      tier: "All-Access Delegate Pass",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85",
      tags: ["Web3", "ZK-Proofs", "Hackathon"],
    },
    {
      id: 1007,
      category: "Concerts & Music",
      title: "Prateek Kuhad: Silhouettes Tour",
      subtitle: "Acoustic Sunset Performance & Full String Ensemble",
      date: "JAN 24, 2027 • 18:00 IST",
      venue: "Jayamahal Palace Grounds, Bengaluru",
      city: "Bengaluru",
      price: 1999,
      tier: "Front Lawn Reserved",
      image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85",
      tags: ["Indie", "Acoustic"],
    },
    {
      id: 1008,
      category: "Food & Nightlife",
      title: "Chef Gaggan Anand: 14-Course Residency",
      subtitle: "Progressive Indian Gastronomy & Natural Wine Flight",
      date: "JAN 08, 2027 • 20:30 IST",
      venue: "The Oberoi, Bengaluru",
      city: "Bengaluru",
      price: 14500,
      tier: "Chef Counter Exclusive",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85",
      tags: ["Fine Dining", "Limited 20 Seats"],
    },
    {
      id: 1009,
      category: "Plays & Theatre",
      title: "Mughal-E-Azam: The Musical Spectacular",
      subtitle: "Feroz Abbas Khan's Grand Stage Production",
      date: "FEB 05, 2027 • 19:30 IST",
      venue: "The Grand Theatre, NMACC Mumbai",
      city: "Mumbai",
      price: 3200,
      tier: "Royal Balcony",
      image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=85",
      tags: ["Broadway India", "Classic"],
    },
    {
      id: 1010,
      category: "Stand-up Comedy",
      title: "Vir Das: Mind Fool Tour",
      subtitle: "Brand New Unfiltered Global Stand-Up Hour",
      date: "JAN 30, 2027 • 20:00 IST",
      venue: "Shilpakala Vedika, Hyderabad",
      city: "Hyderabad",
      price: 1800,
      tier: "Executive Stalls",
      image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=900&q=85",
      tags: ["English Comedy", "16+"],
    },
    {
      id: 1011,
      category: "Cricket & Live Sports",
      title: "Hyderabad E-Prix Paddock Club",
      subtitle: "All-Electric Street Circuit Grand Prix & Pit Lane Walk",
      date: "MAR 06, 2027 • 13:00 IST",
      venue: "Hussain Sagar Circuit, Hyderabad",
      city: "Hyderabad",
      price: 8500,
      tier: "Hospitality Lounge",
      image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=85",
      tags: ["Motorsport", "VIP Access"],
    },
    {
      id: 1012,
      category: "Food & Nightlife",
      title: "Single Malt & Artisan Cask Tasting",
      subtitle: "Curated Flight of 6 Rare Expressions with Food Pairings",
      date: "FEB 12, 2027 • 20:00 IST",
      venue: "The Piano Man, CyberHub, Delhi-NCR",
      city: "Delhi-NCR",
      price: 4500,
      tier: "Connoisseur Seat",
      image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=85",
      tags: ["Spirits", "25+ Only"],
    },
  ],
  tickets: [],
  selectedEventForCheckout: null,
  cameraStream: null,
  gateCameraStream: null,
  selectedTicketForGate: null,
};

const CLIENT_PEPPER = "TRUE_PASS_OFFCHAIN_SECRET_PEPPER_998877";

// -------------------------------------------------------------
// INITIALIZATION & ROUTING
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  loadStateFromStorage();
  updateUserHeaderUI();
  updateSupabasePill();
  setupGlobalSearch();

  // If Supabase is configured, load user profile & passes directly from Supabase!
  if (window.TruePassSupabase && window.TruePassSupabase.isConfigured()) {
    try {
      if (state.user.phone) {
        const dbProfile = await window.TruePassSupabase.fetchProfileFromSupabase(state.user.phone);
        if (dbProfile) {
          state.user.name = dbProfile.name;
          state.user.city = dbProfile.city || state.user.city;
          state.user.interests = dbProfile.interests || state.user.interests;
          state.user.biometricHash = dbProfile.biometric_hash;
          state.user.faceSnapshot = dbProfile.face_snapshot;
          state.user.isRegistered = true;
          state.user.isEnrolled = true;
          updateUserHeaderUI();
        }
      }

      // Fetch all tickets directly from Supabase
      const dbTickets = await window.TruePassSupabase.fetchTicketsFromSupabase(state.user.phone);
      if (dbTickets && dbTickets.length > 0) {
        state.tickets = dbTickets.map((row) => ({
          tokenId: row.token_id,
          eventId: row.event_id,
          eventTitle: row.event_title,
          eventDate: row.event_date,
          venue: row.venue,
          city: row.city,
          tier: row.tier,
          price: row.price,
          attendeeName: row.attendee_name,
          attendeePhone: row.attendee_phone,
          faceSnapshot: row.face_snapshot,
          biometricHash: row.biometric_hash,
          status: row.status,
          txHash: row.tx_hash,
          mintedAt: Math.floor(new Date(row.created_at).getTime() / 1000),
          redeemedAt: row.redeemed_at ? Math.floor(new Date(row.redeemed_at).getTime() / 1000) : null,
        }));
      }
    } catch (e) {
      console.warn("Could not sync initial state from Supabase:", e);
    }
  }

  // If user has not yet registered and enrolled their face, prompt onboarding first
  if (!state.user.isRegistered || !state.user.isEnrolled) {
    navigateTab("onboarding");
  } else {
    navigateTab("events");
  }

  renderEvents();
  renderTickets();
  setupGateTicketSelector();

  // Connect Realtime with Supabase (updates phone live when friend's turnstile scans!)
  if (window.TruePassSupabase) {
    window.TruePassSupabase.setupSupabaseRealtime((payload) => {
      const updated = payload.new;
      if (!updated) return;
      const match = state.tickets.find((t) => t.tokenId === updated.token_id);
      if (match) {
        match.status = updated.status;
        match.redeemedAt = updated.redeemed_at ? Math.floor(new Date(updated.redeemed_at).getTime() / 1000) : null;
        renderTickets();
        if (state.selectedTicketForGate && state.selectedTicketForGate.tokenId === match.tokenId) {
          selectTicketForGate(match.tokenId);
        }
      }
    });
  }
});

// -------------------------------------------------------------
// STORAGE PERSISTENCE
// -------------------------------------------------------------
function saveStateToStorage() {
  localStorage.setItem("truepass_bms_user", JSON.stringify(state.user));
  localStorage.setItem("truepass_bms_tickets", JSON.stringify(state.tickets));
  localStorage.setItem("truepass_bms_city", state.selectedCity);
}

function loadStateFromStorage() {
  try {
    const savedUser = localStorage.getItem("truepass_bms_user");
    const savedTickets = localStorage.getItem("truepass_bms_tickets");
    const savedCity = localStorage.getItem("truepass_bms_city");

    if (savedUser) state.user = { ...state.user, ...JSON.parse(savedUser) };
    if (savedTickets) state.tickets = JSON.parse(savedTickets);
    if (savedCity) {
      state.selectedCity = savedCity;
      const cityLabel = document.getElementById("selected-city-label");
      if (cityLabel) cityLabel.textContent = savedCity;
    }
  } catch (e) {
    console.warn("Storage load error:", e);
  }
}

// -------------------------------------------------------------
// NAVIGATION TABS
// -------------------------------------------------------------
function navigateTab(tabName) {
  document.querySelectorAll(".tab-section").forEach((sec) => sec.classList.add("hidden"));

  const targetSection = document.getElementById(`section-${tabName}`);
  if (targetSection) targetSection.classList.remove("hidden");

  // Camera triggers
  if (tabName === "onboarding") {
    // If on step 2, open camera
    const step2 = document.getElementById("onboarding-step-2");
    if (step2 && !step2.classList.contains("hidden") && !state.cameraStream) {
      startCamera();
    }
  } else if (state.cameraStream) {
    stopCamera();
  }

  if (tabName === "gate") {
    setupGateTicketSelector();
    startGateCamera();
  } else if (state.gateCameraStream) {
    stopGateCamera();
  }

  if (tabName === "tickets") {
    renderTickets();
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

// -------------------------------------------------------------
// USER HEADER & PROFILE STATUS
// -------------------------------------------------------------
function updateUserHeaderUI() {
  const container = document.getElementById("user-header-profile");
  const countBadge = document.getElementById("nav-ticket-count");

  if (countBadge) {
    countBadge.textContent = state.tickets.length.toString();
  }

  if (!container) return;

  if (state.user.isRegistered && state.user.isEnrolled) {
    container.innerHTML = `
      <div class="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
        <div class="relative w-6 h-6 rounded-full overflow-hidden bg-neutral-800 border border-[#f84464] flex-shrink-0">
          <img src="${state.user.faceSnapshot}" class="w-full h-full object-cover" />
        </div>
        <div class="hidden sm:block">
          <div class="font-bold text-white text-[11px] leading-tight">${state.user.name}</div>
          <div class="text-[9px] text-emerald-400 font-mono">Face ID Active</div>
        </div>
        <button onclick="resetAccount()" title="Switch Attendee Profile" class="text-neutral-400 hover:text-white p-1">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button onclick="navigateTab('onboarding')" class="btn-bms-primary px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
        <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
        <span>Register Face ID</span>
      </button>
    `;
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function resetAccount() {
  if (confirm("Reset current profile and register a new attendee?")) {
    state.user.isRegistered = false;
    state.user.isEnrolled = false;
    state.user.faceSnapshot = null;
    state.user.biometricHash = null;
    saveStateToStorage();
    updateUserHeaderUI();
    navigateTab("onboarding");
  }
}

// -------------------------------------------------------------
// ONBOARDING STEP 1: FORM & INTERESTS
// -------------------------------------------------------------
function toggleInterest(buttonEl, interestName) {
  const idx = state.user.interests.indexOf(interestName);
  if (idx > -1) {
    state.user.interests.splice(idx, 1);
    buttonEl.classList.remove("bg-[#f84464]", "text-white", "border-[#f84464]");
    buttonEl.classList.add("bg-white/5", "text-neutral-300", "border-[#2d3448]");
  } else {
    state.user.interests.push(interestName);
    buttonEl.classList.add("bg-[#f84464]", "text-white", "border-[#f84464]");
    buttonEl.classList.remove("bg-white/5", "text-neutral-300", "border-[#2d3448]");
  }
}

function handleProceedToFaceScan(e) {
  e.preventDefault();

  const nameInput = document.getElementById("input-name").value.trim();
  const phoneInput = document.getElementById("input-phone").value.trim();
  const cityInput = document.getElementById("input-city").value;

  if (!nameInput) {
    alert("Please enter your full name.");
    return;
  }
  if (!phoneInput || phoneInput.length !== 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }

  state.user.name = nameInput;
  state.user.phone = phoneInput;
  state.user.city = cityInput;
  state.selectedCity = cityInput;

  // Switch Stepper View
  document.getElementById("onboarding-step-1").classList.add("hidden");
  document.getElementById("onboarding-step-2").classList.remove("hidden");

  // Update Stepper Pills
  const pill1 = document.getElementById("step-pill-1");
  const pill2 = document.getElementById("step-pill-2");
  if (pill1 && pill2) {
    pill1.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30";
    pill1.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Step 1 Done</span>`;

    pill2.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#f84464] text-white text-xs font-bold";
    pill2.innerHTML = `<span class="w-4 h-4 rounded-full bg-white text-[#f84464] flex items-center justify-center text-[10px]">2</span><span>Biometric Face Scan</span>`;
  }

  startCamera();
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// -------------------------------------------------------------
// ONBOARDING STEP 2: FACE SCAN & BIOMETRIC COMMITMENT
// -------------------------------------------------------------
async function startCamera() {
  const video = document.getElementById("webcam-video");
  const hudStatus = document.getElementById("hud-status-text");

  try {
    if (state.cameraStream) stopCamera();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });

    state.cameraStream = stream;
    video.srcObject = stream;
    video.play();

    document.getElementById("snapshot-preview-container")?.classList.add("hidden");
    const captureBtn = document.getElementById("btn-capture-face");
    if (captureBtn) captureBtn.disabled = false;

    if (hudStatus) {
      hudStatus.textContent = "Face Centered • Ready to Scan";
      hudStatus.className = "text-xs font-mono uppercase font-bold text-white px-2 py-1 rounded bg-black/60 border border-white/20 tracking-wider";
    }

    startFaceHUDAnimation();
  } catch (err) {
    console.warn("Camera unavailable:", err);
    if (hudStatus) {
      hudStatus.textContent = "Webcam Unavailable (Use Demo Face Profile)";
      hudStatus.className = "text-xs font-mono uppercase font-bold text-amber-400 px-2 py-1 rounded bg-black/60 border border-amber-500/30 tracking-wider";
    }
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
  }
}

let hudAnimationId = null;
function startFaceHUDAnimation() {
  const canvas = document.getElementById("face-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  let angle = 0;
  function animate() {
    if (!state.cameraStream) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(248, 68, 100, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(centerX, centerY) * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    angle += 0.01;
    hudAnimationId = requestAnimationFrame(animate);
  }

  cancelAnimationFrame(hudAnimationId);
  animate();
}

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hashHex}`;
}

async function captureBiometricSnapshot() {
  const video = document.getElementById("webcam-video");
  const previewContainer = document.getElementById("snapshot-preview-container");
  const previewImg = document.getElementById("captured-snapshot-img");
  const previewHash = document.getElementById("preview-hash-display");

  const snapCanvas = document.createElement("canvas");
  snapCanvas.width = 400;
  snapCanvas.height = 400;
  const ctx = snapCanvas.getContext("2d");

  const minDim = Math.min(video.videoWidth || 400, video.videoHeight || 400);
  const startX = ((video.videoWidth || 400) - minDim) / 2;
  const startY = ((video.videoHeight || 400) - minDim) / 2;

  ctx.translate(400, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 400, 400);

  const snapshotDataUrl = snapCanvas.toDataURL("image/jpeg", 0.88);
  const attendeeSalt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const mockBiometricVector = `VEC_${snapshotDataUrl.slice(-100)}_${state.user.phone}`;
  const biometricCommitment = await sha256Hex(`${mockBiometricVector}:${attendeeSalt}:${CLIENT_PEPPER}`);

  state.user.isEnrolled = true;
  state.user.faceSnapshot = snapshotDataUrl;
  state.user.salt = attendeeSalt;
  state.user.biometricHash = biometricCommitment;

  if (previewImg) previewImg.src = snapshotDataUrl;
  if (previewHash) previewHash.textContent = biometricCommitment;
  previewContainer?.classList.remove("hidden");
  document.getElementById("onboarding-complete-container")?.classList.remove("hidden");

  stopCamera();
}

async function useMockBiometricProfile() {
  const syntheticAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85";
  const attendeeSalt = `salt_demo_${Math.random().toString(36).substring(2, 9)}`;
  const biometricCommitment = await sha256Hex(`FACE_SYNTH_VECTOR_${state.user.phone || "DEMO"}:${attendeeSalt}:${CLIENT_PEPPER}`);

  state.user.isEnrolled = true;
  state.user.faceSnapshot = syntheticAvatar;
  state.user.salt = attendeeSalt;
  state.user.biometricHash = biometricCommitment;

  const previewContainer = document.getElementById("snapshot-preview-container");
  const previewImg = document.getElementById("captured-snapshot-img");
  const previewHash = document.getElementById("preview-hash-display");

  if (previewImg) previewImg.src = syntheticAvatar;
  if (previewHash) previewHash.textContent = biometricCommitment;
  previewContainer?.classList.remove("hidden");
  document.getElementById("onboarding-complete-container")?.classList.remove("hidden");

  stopCamera();
}

function finishOnboardingAndExplore() {
  state.user.isRegistered = true;
  state.user.isEnrolled = true;
  saveStateToStorage();
  updateUserHeaderUI();

  // Sync profile to Supabase
  if (window.TruePassSupabase) {
    window.TruePassSupabase.syncProfileToSupabase(state.user);
  }

  navigateTab("events");

  alert(
    `✅ TruePass Profile Setup Complete!\n\n` +
    `Attendee: ${state.user.name} (+91 ${state.user.phone})\n` +
    `City: ${state.user.city}\n` +
    `On-Chain Biometric Hash: ${state.user.biometricHash.slice(0, 16)}...\n\n` +
    `You are ready to book events safely with BookMyShow anti-scalping protection!`
  );
}

// -------------------------------------------------------------
// CITY PICKER & SEARCH FILTERING
// -------------------------------------------------------------
function toggleCityDropdown() {
  const menu = document.getElementById("city-dropdown-menu");
  menu?.classList.toggle("hidden");
}

function selectCity(cityName) {
  state.selectedCity = cityName;
  state.user.city = cityName;

  const cityLabel = document.getElementById("selected-city-label");
  if (cityLabel) cityLabel.textContent = cityName;

  const heading = document.getElementById("marketplace-heading");
  if (heading) heading.textContent = `Top Events in ${cityName}`;

  toggleCityDropdown();
  saveStateToStorage();
  renderEvents();
}

function filterCategory(catName) {
  state.selectedCategory = catName;

  document.querySelectorAll(".cat-nav-link").forEach((link) => {
    if (link.getAttribute("data-category") === catName) {
      link.classList.add("text-white", "border-[#f84464]");
      link.classList.remove("text-neutral-300", "border-transparent");
    } else {
      link.classList.remove("text-white", "border-[#f84464]");
      link.classList.add("text-neutral-300", "border-transparent");
    }
  });

  renderEvents();
}

function setupGlobalSearch() {
  const searchInput = document.getElementById("global-search-input");
  searchInput?.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderEvents();
  });
}

// -------------------------------------------------------------
// EVENT MARKETPLACE RENDERING (BOOKMYSHOW STYLE)
// -------------------------------------------------------------
function renderEvents() {
  const container = document.getElementById("events-grid");
  if (!container) return;

  const filtered = state.events.filter((evt) => {
    const matchesCat = state.selectedCategory === "All" || evt.category === state.selectedCategory;
    const matchesSearch =
      !state.searchQuery ||
      evt.title.toLowerCase().includes(state.searchQuery) ||
      evt.venue.toLowerCase().includes(state.searchQuery) ||
      evt.city.toLowerCase().includes(state.searchQuery) ||
      evt.category.toLowerCase().includes(state.searchQuery);

    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bms-modal-card rounded-2xl border border-[#2d3448]">
        <p class="text-sm font-semibold text-white">No experiences found for your current filter.</p>
        <p class="text-xs text-neutral-400 mt-1">Try searching for other artists, cities or genres.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (evt) => `
      <article class="bms-event-card flex flex-col justify-between group">
        <div>
          <!-- Poster -->
          <div class="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-neutral-900">
            <img
              src="${evt.image}"
              alt="${evt.title}"
              class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#1e2333] via-transparent to-transparent"></div>

            <!-- Top Badges -->
            <div class="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
              <span class="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-black/70 backdrop-blur-md border border-white/10 uppercase">
                ${evt.category.split("&")[0].trim()}
              </span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#f84464] text-white flex items-center space-x-1">
                <i data-lucide="shield-check" class="w-3 h-3"></i>
                <span>Anti-Scalp</span>
              </span>
            </div>

            <!-- City Badge -->
            <div class="absolute bottom-3 left-3 text-[11px] font-medium text-white flex items-center space-x-1">
              <i data-lucide="map-pin" class="w-3 h-3 text-[#f84464]"></i>
              <span>${evt.city}</span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="p-4">
            <h3 class="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#f84464] transition">
              ${evt.title}
            </h3>
            <p class="text-xs text-neutral-400 mt-1 line-clamp-1">${evt.subtitle}</p>
            <div class="mt-2.5 pt-2.5 border-t border-[#2d3448] text-xs text-neutral-400 flex items-center space-x-1.5 font-mono">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#f84464] flex-shrink-0"></i>
              <span class="truncate">${evt.date.split("•")[0].trim()}</span>
            </div>
          </div>
        </div>

        <!-- Price & Booking CTA -->
        <div class="px-4 pb-4 pt-1 flex items-center justify-between border-t border-[#2d3448]/80">
          <div>
            <span class="text-[10px] font-mono text-neutral-400 uppercase block">${evt.tier}</span>
            <span class="text-lg font-black text-white">₹${evt.price.toLocaleString("en-IN")}</span>
          </div>
          <button
            onclick="handleInitiateBuyTicket(${evt.id})"
            class="btn-bms-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1"
          >
            <span>Book</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </article>
    `
    )
    .join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
}

// -------------------------------------------------------------
// CHECKOUT & RAZORPAY INR PAYMENT SIMULATION
// -------------------------------------------------------------
function handleInitiateBuyTicket(eventId) {
  // Step check: User must be registered & have Face ID
  if (!state.user.isRegistered || !state.user.isEnrolled) {
    alert("⚠️ Quick Step Required:\n\nPlease complete your name, phone number, and Face ID setup first!");
    navigateTab("onboarding");
    return;
  }

  const evt = state.events.find((e) => e.id === eventId);
  if (!evt) return;

  state.selectedEventForCheckout = evt;

  const fee = Math.round(evt.price * 0.06); // 6% convenience fee + GST
  const total = evt.price + fee;

  document.getElementById("modal-event-title").textContent = evt.title;
  document.getElementById("modal-event-tier").textContent = evt.tier;
  document.getElementById("modal-event-date").textContent = `${evt.venue} • ${evt.date}`;
  document.getElementById("modal-base-price").textContent = `₹${evt.price.toLocaleString("en-IN")}`;
  document.getElementById("modal-fee-price").textContent = `₹${fee.toLocaleString("en-IN")}`;
  document.getElementById("modal-event-price").textContent = `₹${total.toLocaleString("en-IN")}`;
  document.getElementById("btn-pay-label").textContent = `Pay ₹${total.toLocaleString("en-IN")} & Issue TruePass`;

  document.getElementById("modal-attendee-face").src = state.user.faceSnapshot;
  document.getElementById("modal-attendee-hash").textContent = state.user.biometricHash;

  document.getElementById("btn-confirm-payment")?.classList.remove("hidden");
  document.getElementById("payment-processing")?.classList.add("hidden");

  document.getElementById("checkout-modal")?.classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal")?.classList.add("hidden");
  state.selectedEventForCheckout = null;
}

async function executeRazorpayPayment() {
  const event = state.selectedEventForCheckout;
  if (!event) return;

  const confirmBtn = document.getElementById("btn-confirm-payment");
  const processingBox = document.getElementById("payment-processing");
  const statusText = document.getElementById("processing-status-text");

  confirmBtn?.classList.add("hidden");
  processingBox?.classList.remove("hidden");

  statusText.textContent = "Processing Razorpay / UPI Payment (INR)...";
  await new Promise((r) => setTimeout(r, 1200));

  statusText.textContent = "Payment Captured (INR)! Blockchain relayer generating unique TruePass ID...";
  await new Promise((r) => setTimeout(r, 1400));

  const nextTokenId = state.tickets.length + 1;
  const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  const newTicket = {
    tokenId: nextTokenId,
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.date,
    venue: event.venue,
    city: event.city,
    tier: event.tier,
    price: event.price,
    attendeeName: state.user.name,
    attendeePhone: state.user.phone,
    faceSnapshot: state.user.faceSnapshot,
    biometricHash: state.user.biometricHash,
    status: "ACTIVE", // ACTIVE | USED
    mintedAt: Math.floor(Date.now() / 1000),
    txHash: mockTxHash,
  };

  state.tickets.unshift(newTicket);
  saveStateToStorage();

  // Save ticket to Supabase so your friend's turnstile scanner can verify it
  if (window.TruePassSupabase) {
    window.TruePassSupabase.saveTicketToSupabase(newTicket);
  }

  closeCheckoutModal();
  updateUserHeaderUI();
  navigateTab("tickets");

  alert(
    `🎉 Booking Confirmed via Razorpay!\n\n` +
    `Event: ${event.title}\n` +
    `Unique On-Chain TruePass ID: #TPASS-${String(nextTokenId).padStart(4, "0")}\n` +
    `Bound Biometric Hash: ${newTicket.biometricHash.slice(0, 16)}...\n` +
    `Settlement: ₹${event.price.toLocaleString("en-IN")}\n\n` +
    `Your M-Ticket QR code has been cryptographically generated and is ready for gate entry!`
  );
}

// -------------------------------------------------------------
// MY PASSES (BOOKMYSHOW M-TICKET FORMAT)
// -------------------------------------------------------------
function renderTickets() {
  const container = document.getElementById("tickets-list");
  const emptyState = document.getElementById("tickets-empty");
  if (!container) return;

  if (state.tickets.length === 0) {
    container.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  container.innerHTML = state.tickets
    .map((t) => {
      const isUsed = t.status === "USED";
      const statusBadge = isUsed
        ? `<span class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-white/10 text-neutral-400 border border-white/15 flex items-center space-x-1">
             <span class="w-1.5 h-1.5 rounded-full bg-neutral-500"></span><span>REDEEMED AT GATE</span>
           </span>`
        : `<span class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>ACTIVE • ENTRY READY</span>
           </span>`;

      return `
      <div class="bms-mticket p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between ${isUsed ? "opacity-60" : ""}">
        <div class="bms-mticket-notch-left"></div>
        <div class="bms-mticket-notch-right"></div>
        <div class="bms-mticket-perforation"></div>

        <!-- Top Section -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-mono font-black bg-[#f84464] text-white">
                #TPASS-${String(t.tokenId).padStart(4, "0")}
              </span>
              <span class="text-xs text-neutral-300 font-semibold">${t.tier}</span>
            </div>
            ${statusBadge}
          </div>

          <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight">${t.eventTitle}</h3>
          
          <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-neutral-300 mt-2 font-mono">
            <span class="flex items-center space-x-1.5">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#f84464]"></i>
              <span>${t.eventDate}</span>
            </span>
            <span class="flex items-center space-x-1.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#f84464]"></i>
              <span>${t.venue}</span>
            </span>
          </div>
        </div>

        <!-- Middle Section: Verified Face ID -->
        <div class="my-6 pt-5 border-t border-[#2d3448]">
          <div class="bg-[#141824] border border-[#2d3448] rounded-2xl p-3.5 flex items-center space-x-3.5">
            <div class="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-[#f84464] flex-shrink-0 bg-black">
              <img src="${t.faceSnapshot}" alt="Bound Face" class="w-full h-full object-cover" />
              <div class="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] font-mono text-center text-white py-0.5">
                BOUND FACE
              </div>
            </div>

            <div class="overflow-hidden flex-1">
              <div class="text-[10px] font-mono text-neutral-400 uppercase">Registered Holder</div>
              <div class="text-sm font-bold text-white truncate">${t.attendeeName} (+91 ${t.attendeePhone})</div>
              
              <div class="mt-1 flex items-center space-x-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate">
                <i data-lucide="shield-check" class="w-3 h-3 text-emerald-400 flex-shrink-0"></i>
                <span class="truncate" title="${t.biometricHash}">${t.biometricHash}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Biometric QR Code -->
        <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-left">
            <span class="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">One-Time Entry M-Ticket</span>
            <span class="text-xs text-neutral-300 block mt-0.5 leading-relaxed">
              Scan at physical turnstile. Camera matches live face against on-chain biometric hash.
            </span>
            <span class="text-[10px] font-mono text-neutral-500 mt-2 block">Ledger Settlement: ${t.txHash.slice(0, 20)}...</span>
          </div>

          <div class="flex flex-col items-center gap-2 flex-shrink-0">
            <div class="bg-white p-2 rounded-xl shadow-2xl" id="ticket-qr-${t.tokenId}">
              <div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:11px;">Generating QR…</div>
            </div>
            <div class="flex gap-2">
              <button onclick="downloadTicketCard(${t.tokenId})" class="btn-bms-outline px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1 hover:border-[#f84464]">
                <i data-lucide="download" class="w-3 h-3 text-[#f84464]"></i>
                <span>Download</span>
              </button>
              <button onclick="shareTicketCard(${t.tokenId})" class="btn-bms-outline px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1 hover:border-[#f84464]">
                <i data-lucide="share-2" class="w-3 h-3 text-[#f84464]"></i>
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="mt-6 pt-4 border-t border-[#2d3448] flex items-center justify-end">
          ${
            !isUsed
              ? `<button onclick="sendTicketToGateScanner(${t.tokenId})" class="btn-bms-outline px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 hover:border-[#f84464]">
                   <i data-lucide="scan-face" class="w-3.5 h-3.5 text-[#f84464]"></i>
                   <span>Simulate Gate Check-In</span>
                 </button>`
              : `<span class="text-xs font-mono text-neutral-500">Checked in at venue turnstile</span>`
          }
        </div>

      </div>
    `;
    })
    .join("");

  state.tickets.forEach((t) => {
    const qrContainer = document.getElementById(`ticket-qr-${t.tokenId}`);
    if (!qrContainer) return;

    const qrPayload = JSON.stringify({
      id:  `#TPASS-${String(t.tokenId).padStart(4, "0")}`,
      tid: t.tokenId,
      ev:  t.eventTitle,
      dt:  t.eventDate,
      vn:  t.venue,
      tr:  t.tier,
      nm:  t.attendeeName,
      ph:  t.attendeePhone,
      bh:  t.biometricHash,
      st:  t.status,
      ts:  t.issuedAt || Math.floor(Date.now() / 1000),
    });

    // TruePassQR is embedded inline — works fully offline, no CDN needed
    TruePassQR.toDataURL(qrPayload, 200).then((dataURL) => {
      if (!dataURL) return;
      qrContainer.innerHTML = "";
      const img = document.createElement("img");
      img.src = dataURL;
      img.style.cssText = "width:200px;height:200px;display:block;border-radius:4px;";
      img.id = `ticket-qr-img-${t.tokenId}`;
      qrContainer.appendChild(img);
    });
  });

  if (typeof lucide !== "undefined") lucide.createIcons();
}

// -------------------------------------------------------------
// QR DOWNLOAD & SHARE
// -------------------------------------------------------------
// -------------------------------------------------------------
// TICKET CARD GENERATOR — creates a shareable boarding-pass image
// that includes face photo + all buyer credentials + QR code
// -------------------------------------------------------------

/**
 * Draws a full ticket card onto an offscreen canvas and returns it.
 * Layout: dark card, face photo circle, event + attendee info, QR.
 */
async function buildTicketCardCanvas(ticket) {
  const W = 760, H = 400;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // --- background gradient ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f1017");
  bg.addColorStop(1, "#1a1f2e");
  ctx.fillStyle = bg;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // --- red accent bar left ---
  ctx.fillStyle = "#f84464";
  ctx.beginPath();
  roundRect(ctx, 0, 0, 6, H, [20, 0, 0, 20]);
  ctx.fill();

  // --- dashed separator ---
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = "#2d3448";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W - 240, 30); ctx.lineTo(W - 240, H - 30);
  ctx.stroke();
  ctx.restore();

  // --- notch circles ---
  ctx.fillStyle = "#080b12";
  circle(ctx, W - 240, 0); circle(ctx, W - 240, H);

  // --- TPASS badge ---
  ctx.fillStyle = "#f84464";
  ctx.beginPath(); roundRect(ctx, 24, 24, 130, 26, 6); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  const tpassLabel = `#TPASS-${String(ticket.tokenId).padStart(4,"0")}`;
  ctx.fillText(tpassLabel, 34, 42);

  // --- status badge ---
  const isUsed = ticket.status === "USED";
  ctx.fillStyle = isUsed ? "#374151" : "#064e3b";
  ctx.beginPath(); roundRect(ctx, 164, 24, isUsed ? 120 : 110, 26, 6); ctx.fill();
  ctx.fillStyle = isUsed ? "#9ca3af" : "#6ee7b7";
  ctx.font = "bold 11px monospace";
  ctx.fillText(isUsed ? "⬤  REDEEMED" : "⬤  ACTIVE · ENTRY READY", 174, 42);

  // --- event title ---
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(truncate(ticket.eventTitle, 32), 24, 90);

  // --- date + venue ---
  ctx.fillStyle = "#f84464";
  ctx.font = "12px monospace";
  ctx.fillText("📅  " + ticket.eventDate, 24, 116);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px monospace";
  ctx.fillText("📍  " + truncate(ticket.venue, 48), 24, 136);

  // --- tier ---
  ctx.fillStyle = "#64748b";
  ctx.font = "11px monospace";
  ctx.fillText("🎟  " + ticket.tier, 24, 158);

  // --- separator line ---
  ctx.strokeStyle = "#2d3448"; ctx.lineWidth = 1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(24, 178); ctx.lineTo(W - 260, 178); ctx.stroke();

  // --- face photo circle ---
  const faceX = 65, faceY = 230, faceR = 44;
  await drawCircleImage(ctx, ticket.faceSnapshot, faceX, faceY, faceR);

  // ring
  ctx.strokeStyle = "#f84464"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(faceX, faceY, faceR + 3, 0, Math.PI * 2); ctx.stroke();

  // "BOUND FACE" label
  ctx.fillStyle = "#f84464";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("BOUND FACE", faceX, faceY + faceR + 16);

  // --- attendee info ---
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "10px monospace";
  ctx.fillText("REGISTERED HOLDER", 128, 198);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(ticket.attendeeName || "—", 128, 220);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px monospace";
  ctx.fillText("+91 " + ticket.attendeePhone, 128, 240);

  // --- biometric hash (truncated) ---
  ctx.fillStyle = "#10b981";
  ctx.font = "10px monospace";
  ctx.fillText("🛡  " + truncate(ticket.biometricHash, 36), 128, 262);

  // --- ledger / tx ---
  ctx.fillStyle = "#475569";
  ctx.font = "9px monospace";
  ctx.fillText("Ledger: " + (ticket.txHash || "").slice(0, 28) + "...", 24, H - 24);

  // --- branding ---
  ctx.textAlign = "right";
  ctx.fillStyle = "#f84464";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("TruePass", W - 250, H - 24);
  ctx.fillStyle = "#475569";
  ctx.font = "9px monospace";
  ctx.fillText("Blockchain-Verified M-Ticket", W - 250, H - 10);

  // --- QR code onto card — generate fresh from TruePassQR ---
  const qrSize = 190;
  const qrX = W - 225, qrY = (H - qrSize) / 2;

  // white bg for QR
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 10);
  ctx.fill();

  // Generate fresh QR data URL and draw onto card
  const qrPayload = JSON.stringify({
    id:  `#TPASS-${String(ticket.tokenId).padStart(4, "0")}`,
    tid: ticket.tokenId,
    ev:  ticket.eventTitle,
    dt:  ticket.eventDate,
    vn:  ticket.venue,
    tr:  ticket.tier,
    nm:  ticket.attendeeName,
    ph:  ticket.attendeePhone,
    bh:  ticket.biometricHash,
    st:  ticket.status,
    ts:  ticket.issuedAt || Math.floor(Date.now() / 1000),
  });

  const qrDataURL = await TruePassQR.toDataURL(qrPayload, qrSize);
  if (qrDataURL) {
    await new Promise((res) => {
      const qrImg = new Image();
      qrImg.onload = () => { ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize); res(); };
      qrImg.onerror = res;
      qrImg.src = qrDataURL;
    });
  }

  return c;
}

// helpers
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = [r, r, r, r];
  const [tl, tr, br, bl] = r;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); ctx.arcTo(x+w, y, x+w, y+tr, tr);
  ctx.lineTo(x + w, y + h - br); ctx.arcTo(x+w, y+h, x+w-br, y+h, br);
  ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y+h, x, y+h-bl, bl);
  ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x+tl, y, tl);
  ctx.closePath();
}
function circle(ctx, cx, cy) {
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
}
function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}
async function drawCircleImage(ctx, src, cx, cy, r) {
  if (!src) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function downloadTicketCard(tokenId) {
  const ticket = state.tickets.find((t) => t.tokenId === tokenId);
  if (!ticket) return;
  try {
    const card = await buildTicketCardCanvas(ticket);
    const link = document.createElement("a");
    link.download = `TruePass-TPASS-${String(tokenId).padStart(4, "0")}.png`;
    link.href = card.toDataURL("image/png");
    link.click();
  } catch (e) {
    console.error("Download failed:", e);
    alert("Could not generate ticket image. Try again.");
  }
}

async function shareTicketCard(tokenId) {
  const ticket = state.tickets.find((t) => t.tokenId === tokenId);
  if (!ticket) return;
  const tpassLabel = `#TPASS-${String(tokenId).padStart(4, "0")}`;

  try {
    const card = await buildTicketCardCanvas(ticket);

    // Try sharing as image file first (mobile), fallback to text
    card.toBlob(async (blob) => {
      const file = new File([blob], `TruePass-${tpassLabel}.png`, { type: "image/png" });
      const shareText =
        `🎫 TruePass M-Ticket ${tpassLabel}\n` +
        `${ticket.eventTitle}\n` +
        `${ticket.eventDate} · ${ticket.venue}\n` +
        `Holder: ${ticket.attendeeName} (+91 ${ticket.attendeePhone})\n` +
        `Status: ${ticket.status}`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `TruePass: ${ticket.eventTitle}`, files: [file], text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: `TruePass: ${ticket.eventTitle}`, text: shareText, url: window.location.href });
      } else {
        // Desktop fallback: download the image
        const link = document.createElement("a");
        link.download = `TruePass-${tpassLabel}.png`;
        link.href = card.toDataURL("image/png");
        link.click();
        alert("Ticket card saved! Share the image from your Downloads folder.");
      }
    }, "image/png");
  } catch (e) {
    if (e.name !== "AbortError") {
      console.error("Share failed:", e);
      alert("Share not supported on this browser. Use Download instead.");
    }
  }
}

function sendTicketToGateScanner(tokenId) {
  navigateTab("gate");
  selectTicketForGate(tokenId);
}

// -------------------------------------------------------------
// GATE SCANNER (VENUE ENTRY DEMO)
// -------------------------------------------------------------
function setupGateTicketSelector() {
  const container = document.getElementById("gate-ticket-selector");
  if (!container) return;

  if (state.tickets.length === 0) {
    container.innerHTML = `<div class="text-xs text-neutral-400 font-mono">No tickets purchased yet. Buy a ticket first to test gate redemption.</div>`;
    return;
  }

  container.innerHTML = state.tickets
    .map((t) => {
      const isSelected = state.selectedTicketForGate && state.selectedTicketForGate.tokenId === t.tokenId;
      return `
      <div onclick="selectTicketForGate(${t.tokenId})" class="p-3 rounded-2xl border ${
        isSelected ? "border-[#f84464] bg-[#f84464]/10" : "border-[#2d3448] bg-[#151924]"
      } cursor-pointer hover:border-neutral-500 transition flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl overflow-hidden border border-[#2d3448] bg-black flex-shrink-0">
            <img src="${t.faceSnapshot}" class="w-full h-full object-cover" />
          </div>
          <div>
            <div class="text-xs font-bold text-white">#TPASS-${t.tokenId}: ${t.eventTitle}</div>
            <div class="text-[10px] text-neutral-400 font-mono">${t.attendeeName} • ${t.status}</div>
          </div>
        </div>
        <span class="text-[10px] font-mono ${t.status === "ACTIVE" ? "text-emerald-400" : "text-neutral-500"} font-bold">
          ${t.status}
        </span>
      </div>
    `;
    })
    .join("");

  if (!state.selectedTicketForGate && state.tickets.length > 0) {
    selectTicketForGate(state.tickets[0].tokenId);
  }
}

function selectTicketForGate(tokenId) {
  const ticket = state.tickets.find((t) => t.tokenId === tokenId);
  if (!ticket) return;

  state.selectedTicketForGate = ticket;

  document.getElementById("gate-preview-title").textContent = ticket.eventTitle;
  document.getElementById("gate-preview-token").textContent = `#TPASS-${String(ticket.tokenId).padStart(4, "0")}`;
  document.getElementById("gate-preview-hash").textContent = ticket.biometricHash;

  const statusEl = document.getElementById("gate-preview-status");
  statusEl.textContent = ticket.status;
  statusEl.className =
    ticket.status === "ACTIVE"
      ? "px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono"
      : "px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono";

  setupGateTicketSelector();
  document.getElementById("gate-result-box")?.classList.add("hidden");
}

async function startGateCamera() {
  const video = document.getElementById("gate-webcam");
  if (!video) return;

  try {
    if (state.gateCameraStream) stopGateCamera();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    state.gateCameraStream = stream;
    video.srcObject = stream;
    video.play();
  } catch (e) {
    console.warn("Gate camera not accessible", e);
  }
}

function stopGateCamera() {
  if (state.gateCameraStream) {
    state.gateCameraStream.getTracks().forEach((t) => t.stop());
    state.gateCameraStream = null;
  }
}

function handleTurnstileCheckIn(isLegitimateMatch) {
  const ticket = state.selectedTicketForGate;
  const resultBox = document.getElementById("gate-result-box");
  if (!ticket || !resultBox) return;

  resultBox.classList.remove("hidden");

  // Case 1: Already used
  if (ticket.status === "USED") {
    resultBox.className =
      "mt-6 p-6 rounded-3xl border border-rose-500/40 bg-rose-500/10 text-center animate-scale-up";
    resultBox.innerHTML = `
      <div class="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
        <i data-lucide="shield-alert" class="w-6 h-6"></i>
      </div>
      <h3 class="text-lg font-black text-rose-400">ENTRY DENIED — PASS ALREADY REDEEMED</h3>
      <p class="text-xs text-slate-300 mt-1 max-w-md mx-auto">
        Token #TPASS-${ticket.tokenId} has already been checked in at the turnstiles. Duplicate entries are blocked by contract state.
      </p>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  // Case 2: Biometric Imposter
  if (!isLegitimateMatch) {
    resultBox.className =
      "mt-6 p-6 rounded-3xl border border-amber-500/40 bg-amber-500/10 text-center animate-scale-up";
    resultBox.innerHTML = `
      <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
        <i data-lucide="user-x" class="w-6 h-6"></i>
      </div>
      <h3 class="text-lg font-black text-amber-400">ENTRY REJECTED — BIOMETRIC MISMATCH</h3>
      <p class="text-xs text-slate-300 mt-1 max-w-md mx-auto">
        Live camera face does not match the on-chain biometric commitment (<code class="text-amber-300 font-mono">${ticket.biometricHash.slice(0, 14)}...</code>) bound to this ticket. Scalping attempt blocked.
      </p>
    `;
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  // Case 3: Match Success
  ticket.status = "USED";
  ticket.redeemedAt = Math.floor(Date.now() / 1000);
  saveStateToStorage();
  selectTicketForGate(ticket.tokenId);

  // Sync redemption status to Supabase in real-time
  if (window.TruePassSupabase) {
    window.TruePassSupabase.redeemTicketInSupabase(ticket.tokenId);
  }

  resultBox.className =
    "mt-6 p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 text-center animate-scale-up";
  resultBox.innerHTML = `
    <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
      <i data-lucide="check-circle" class="w-6 h-6"></i>
    </div>
    <h3 class="text-lg font-black text-emerald-400">ACCESS GRANTED — WELCOME TO THE EVENT</h3>
    <p class="text-xs text-slate-300 mt-1 max-w-md mx-auto">
      Face recognized & validated against on-chain hash! Smart contract executed <code class="text-emerald-300 font-mono">redeemTicket(${ticket.tokenId})</code>. State transitioned: <strong class="text-white">Active → Used</strong>. Turnstile unlocked.
    </p>
  `;
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// -------------------------------------------------------------
// SUPABASE DATABASE MODAL & CONFIGURATION
// -------------------------------------------------------------
function updateSupabasePill() {
  const dot = document.getElementById("sb-status-dot");
  const label = document.getElementById("sb-status-label");
  if (!dot || !label) return;

  const isConn = window.TruePassSupabase && window.TruePassSupabase.isConfigured();
  if (isConn) {
    dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    label.textContent = "Supabase Synced";
    label.className = "text-emerald-300 text-[11px] font-sans font-semibold";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    label.textContent = "Setup Supabase DB";
    label.className = "text-amber-300 text-[11px] font-sans font-semibold";
  }
}

function openSupabaseModal() {
  const modal = document.getElementById("supabase-modal");
  const urlInput = document.getElementById("sb-input-url");
  const keyInput = document.getElementById("sb-input-key");

  if (urlInput && window.TruePassSupabase) {
    const currUrl = window.TruePassSupabase.getUrl();
    if (!currUrl.includes("YOUR_PROJECT_ID")) urlInput.value = currUrl;
  }
  if (keyInput && window.TruePassSupabase) {
    const currKey = window.TruePassSupabase.getKey();
    if (!currKey.includes("YOUR_SUPABASE_ANON")) keyInput.value = currKey;
  }

  modal?.classList.remove("hidden");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function closeSupabaseModal() {
  document.getElementById("supabase-modal")?.classList.add("hidden");
}

async function handleSaveSupabaseConfig() {
  const url = document.getElementById("sb-input-url").value.trim();
  const key = document.getElementById("sb-input-key").value.trim();

  if (!url || !key) {
    alert("Please provide both Supabase Project URL and Anon Public Key.");
    return;
  }

  const success = window.TruePassSupabase.setCredentials(url, key);
  if (success) {
    updateSupabasePill();
    closeSupabaseModal();

    alert("✅ Supabase credentials saved! Syncing profiles & tickets directly to the cloud database.");
    
    // Auto-sync current user if already registered
    if (state.user.isRegistered && state.user.isEnrolled) {
      await window.TruePassSupabase.syncProfileToSupabase(state.user);
    }
    // Refresh tickets from Supabase
    const dbTickets = await window.TruePassSupabase.fetchTicketsFromSupabase(state.user.phone);
    if (dbTickets && dbTickets.length > 0) {
      state.tickets = dbTickets.map((row) => ({
        tokenId: row.token_id,
        eventId: row.event_id,
        eventTitle: row.event_title,
        eventDate: row.event_date,
        venue: row.venue,
        city: row.city,
        tier: row.tier,
        price: row.price,
        attendeeName: row.attendee_name,
        attendeePhone: row.attendee_phone,
        faceSnapshot: row.face_snapshot,
        biometricHash: row.biometric_hash,
        status: row.status,
        txHash: row.tx_hash,
      }));
      renderTickets();
    }
  }
}

async function handleTestSupabaseConnection() {
  const url = document.getElementById("sb-input-url").value.trim();
  const key = document.getElementById("sb-input-key").value.trim();
  const statusBox = document.getElementById("sb-test-status");

  if (!url || !key) {
    alert("Please enter your URL and Key first.");
    return;
  }

  window.TruePassSupabase.setCredentials(url, key);
  statusBox.classList.remove("hidden");
  statusBox.className = "p-3 rounded-xl text-xs font-mono bg-white/5 border border-white/10 text-neutral-300";
  statusBox.textContent = "Testing connection to Supabase...";

  const res = await window.TruePassSupabase.testConnection();
  if (res.connected) {
    statusBox.className = "p-3 rounded-xl text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300";
    statusBox.textContent = "✅ Success: Connected to Supabase tables!";
  } else {
    statusBox.className = "p-3 rounded-xl text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-300";
    statusBox.textContent = `❌ Error: ${res.message}`;
  }
}
