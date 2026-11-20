/**
 * TruePass — Supabase Database Client
 * Fully replaces local storage with Supabase PostgreSQL & Realtime:
 * 1. Attendee Profiles & Biometric Commitments table ('profiles')
 * 2. Booked Passes & TruePass IDs table ('tickets')
 * 3. Realtime Turnstile Gate Check-ins for your friend's scanner
 */

// Default configuration constants (can also be configured from the UI modal)
let SUPABASE_URL = localStorage.getItem("truepass_supabase_url") || "https://YOUR_PROJECT_ID.supabase.co";
let SUPABASE_ANON_KEY = localStorage.getItem("truepass_supabase_anon_key") || "YOUR_SUPABASE_ANON_PUBLIC_KEY";

let supabaseClient = null;

function isConfigured() {
  return (
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON")
  );
}

function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (typeof supabase !== "undefined" && isConfigured()) {
    try {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("✅ Supabase client initialized connected to:", SUPABASE_URL);
    } catch (e) {
      console.warn("Could not initialize Supabase client:", e);
    }
  }
  return supabaseClient;
}

function setCredentials(url, key) {
  if (!url || !key) return false;
  SUPABASE_URL = url.trim();
  SUPABASE_ANON_KEY = key.trim();
  localStorage.setItem("truepass_supabase_url", SUPABASE_URL);
  localStorage.setItem("truepass_supabase_anon_key", SUPABASE_ANON_KEY);
  supabaseClient = null;
  const sb = getSupabase();
  return !!sb;
}

/**
 * 1. Save or Update Attendee Profile in Supabase
 */
async function syncProfileToSupabase(user) {
  const sb = getSupabase();
  if (!sb) {
    console.warn("Supabase not connected. Please enter your Supabase Project URL & Anon Key.");
    return null;
  }

  try {
    const payload = {
      name: user.name,
      phone: user.phone,
      city: user.city || "Bengaluru",
      interests: user.interests || [],
      biometric_hash: user.biometricHash,
      face_snapshot: user.faceSnapshot,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("profiles")
      .upsert(payload, { onConflict: "phone" })
      .select();

    if (error) throw error;
    console.log("✅ Profile successfully stored in Supabase:", data);
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ Failed to store profile in Supabase:", err);
    throw err;
  }
}

/**
 * 2. Fetch Attendee Profile from Supabase by Phone
 */
async function fetchProfileFromSupabase(phone) {
  const sb = getSupabase();
  if (!sb || !phone) return null;

  try {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ Failed to fetch profile from Supabase:", err);
    return null;
  }
}

/**
 * 3. Insert Newly Minted Ticket into Supabase 'tickets' Table
 */
async function saveTicketToSupabase(ticket) {
  const sb = getSupabase();
  if (!sb) {
    console.warn("Supabase not connected. Pass not saved to database.");
    return null;
  }

  try {
    const payload = {
      token_id: ticket.tokenId,
      event_id: ticket.eventId,
      event_title: ticket.eventTitle,
      event_date: ticket.eventDate,
      venue: ticket.venue,
      city: ticket.city || "Bengaluru",
      tier: ticket.tier,
      price: ticket.price,
      attendee_name: ticket.attendeeName,
      attendee_phone: ticket.attendeePhone,
      biometric_hash: ticket.biometricHash,
      face_snapshot: ticket.faceSnapshot,
      status: ticket.status || "ACTIVE",
      tx_hash: ticket.txHash || `0x${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("tickets")
      .insert([payload])
      .select();

    if (error) throw error;
    console.log("✅ Pass saved to Supabase (Friend can scan it now!):", data);
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ Failed to save ticket to Supabase:", err);
    throw err;
  }
}

/**
 * 4. Fetch All Tickets for Current Attendee from Supabase
 */
async function fetchTicketsFromSupabase(phone) {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    let query = sb.from("tickets").select("*").order("token_id", { ascending: false });
    if (phone) {
      query = query.eq("attendee_phone", phone);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ Failed to fetch tickets from Supabase:", err);
    return [];
  }
}

/**
 * 5. Turnstile Gate: Mark Ticket as REDEEMED in Supabase
 */
async function redeemTicketInSupabase(tokenId) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from("tickets")
      .update({
        status: "USED",
        redeemed_at: new Date().toISOString(),
      })
      .eq("token_id", tokenId)
      .select();

    if (error) throw error;
    console.log(`✅ Token #TPASS-${tokenId} marked REDEEMED in Supabase:`, data);
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ Failed to update redemption status in Supabase:", err);
    return null;
  }
}

/**
 * 6. Setup Supabase Realtime Subscription on 'tickets' table
 */
let realtimeChannel = null;
function setupSupabaseRealtime(onTicketUpdate) {
  const sb = getSupabase();
  if (!sb) return;

  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
  }

  realtimeChannel = sb
    .channel("public:tickets:realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tickets" },
      (payload) => {
        console.log("🔔 Supabase Realtime Event Received:", payload);
        if (typeof onTicketUpdate === "function") {
          onTicketUpdate(payload);
        }
      }
    )
    .subscribe((status) => {
      console.log("Supabase Realtime Channel Status:", status);
    });
}

/**
 * 7. Quick Connection Test
 */
async function testConnection() {
  const sb = getSupabase();
  if (!sb) return { connected: false, message: "Credentials missing" };

  try {
    const { data, error } = await sb.from("profiles").select("count", { count: "exact", head: true });
    if (error) throw error;
    return { connected: true, message: "Connected to Supabase successfully" };
  } catch (err) {
    return { connected: false, message: err.message || "Failed to reach Supabase" };
  }
}

window.TruePassSupabase = {
  isConfigured,
  getSupabase,
  setCredentials,
  syncProfileToSupabase,
  fetchProfileFromSupabase,
  saveTicketToSupabase,
  fetchTicketsFromSupabase,
  redeemTicketInSupabase,
  setupSupabaseRealtime,
  testConnection,
  getUrl: () => SUPABASE_URL,
  getKey: () => SUPABASE_ANON_KEY,
};
