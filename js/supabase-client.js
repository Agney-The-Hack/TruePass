/**
 * SupabaseCloudSync (v3.0)
 * Connects the Facial Recognition App & TruePass Ticketing directly to Supabase Cloud Database & Storage.
 * Supports Onboarding Profiles, 128-d Biometric Embeddings, Ticket Sync, and Ticket Refunds.
 */
const DEFAULT_SUPABASE_URL = 'https://ojrkqevmrfegabedamhz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_DTcjF-ZIn2NPiBoTdhU7lw_sXC3GMVJ';

class SupabaseCloudSync {
    constructor() {
        this.client = null;
        this.url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
        this.key = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;
        this.bucketName = 'face-photos';

        if (this.url && this.key) {
            this.initClient(this.url, this.key);
        }
    }

    /**
     * Dynamic getter: true if client is initialized or can be initialized right now
     */
    get isReady() {
        return !!this.getClient();
    }

    /**
     * Safely resolve or lazy-initialize Supabase client
     */
    getClient() {
        if (this.client) return this.client;
        if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
            const url = (this.url || localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
            const key = (this.key || localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY).trim();
            if (url && key) {
                try {
                    this.url = url;
                    this.key = key;
                    this.client = window.supabase.createClient(this.url, this.key);
                    console.log('[Supabase] Dynamic client initialized for:', this.url);
                    return this.client;
                } catch (e) {
                    console.warn('[Supabase] Dynamic client init note:', e);
                }
            }
        }
        return null;
    }

    /**
     * Wait for Supabase CDN or client to become ready (with timeout)
     */
    async ensureClientReady(maxWaitMs = 3500) {
        if (this.getClient()) return this.client;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            if (this.getClient()) return this.client;
            await new Promise(r => setTimeout(r, 60));
        }
        return this.getClient();
    }

    /**
     * Native REST fallback: Direct fetch to Supabase PostgREST API
     * Guarantees persistence even if the client CDN library was delayed or blocked.
     */
    async _restRequest(path, options = {}) {
        const url = `${this.url.replace(/\/+$/, '')}/rest/v1/${path.replace(/^\/+/, '')}`;
        const headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        return fetch(url, { ...options, headers });
    }

    /**
     * Initialize or update Supabase Client
     */
    init(url, key) {
        return this.initClient(url, key);
    }

    initClient(url, key) {
        if (!url || !key) {
            this.client = null;
            return false;
        }

        this.url = url.trim().replace(/\/+$/, '');
        this.key = key.trim();
        localStorage.setItem('supabase_url', this.url);
        localStorage.setItem('supabase_key', this.key);

        if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                this.client = window.supabase.createClient(this.url, this.key);
                console.log('[Supabase] Client initialized for project:', this.url);
                return true;
            } catch (e) {
                console.error('[Supabase] Init error:', e);
                this.client = null;
                return false;
            }
        }
        return false;
    }

    clearConfig() {
        this.client = null;
        this.url = '';
        this.key = '';
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
    }

    /**
     * Test connection to Supabase database with latency metric
     */
    async testConnection() {
        await this.ensureClientReady();
        const t0 = performance.now();

        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from('faces')
                    .select('name')
                    .limit(1);

                const latencyMs = Math.round(performance.now() - t0);
                if (error) {
                    return { success: false, message: `Database error: ${error.message}`, latencyMs };
                }
                return { success: true, message: `Connected to Supabase Cloud (${latencyMs}ms)`, latencyMs };
            } catch (err) {
                // fall through to REST test
            }
        }

        // Direct REST fallback test
        try {
            const res = await this._restRequest('faces?select=name&limit=1');
            const latencyMs = Math.round(performance.now() - t0);
            if (res.ok) {
                return { success: true, message: `Connected to Supabase Cloud (${latencyMs}ms)`, latencyMs };
            }
            return { success: false, message: `HTTP ${res.status}: Failed to reach Supabase`, latencyMs };
        } catch (netErr) {
            const latencyMs = Math.round(performance.now() - t0);
            return { success: false, message: `Connection failed: ${netErr.message}`, latencyMs };
        }
    }

    /**
     * Convert Data URL (base64) to Blob
     */
    _dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    /**
     * Upload photo to Supabase Storage bucket ('face-photos')
     * Returns public HTTPS URL
     */
    async uploadPhoto(photoData, personName = 'face') {
        if (!this.client) throw new Error('Supabase client not connected.');

        if (typeof photoData === 'string' && (photoData.startsWith('http://') || photoData.startsWith('https://'))) {
            return photoData;
        }

        try {
            const blob = typeof photoData === 'string' ? this._dataURItoBlob(photoData) : photoData;
            const safeName = personName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            const filePath = `profiles/${safeName}_${Date.now()}.jpg`;

            const { data, error } = await this.client.storage
                .from(this.bucketName)
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) {
                console.warn('[Supabase Storage] Upload warning:', error.message);
                return photoData;
            }

            const { data: urlData } = this.client.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (err) {
            console.warn('[Supabase Storage] Upload fallback:', err.message);
            return photoData;
        }
    }

    /**
     * Save an enrolled person / face vector to Supabase
     */
    async savePersonToCloud({ name, role = '', descriptors = [], photo = '', notes = '' }) {
        if (!this.client) return null;

        let cloudPhotoUrl = photo;
        if (photo && photo.startsWith('data:image')) {
            cloudPhotoUrl = await this.uploadPhoto(photo, name);
        }

        const serializedDescriptors = descriptors.map(d => Array.from(d));

        const record = {
            name: name.trim(),
            role: role.trim(),
            notes: notes.trim(),
            photo_url: cloudPhotoUrl,
            descriptors: serializedDescriptors,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this.client
            .from('faces')
            .upsert(record, { onConflict: 'name' })
            .select();

        if (error) {
            console.error('[Supabase DB] Error saving person:', error);
            throw error;
        }

        console.log(`[Supabase] Cloud face record saved for: ${name}`);
        return { ...record, photo: cloudPhotoUrl };
    }

    /**
     * Fetch all enrolled people from Supabase
     */
    async fetchPeopleFromCloud() {
        if (!this.client) return [];

        const { data, error } = await this.client
            .from('faces')
            .select('*')
            .order('name');

        if (error) {
            console.error('[Supabase DB] Fetch error:', error);
            throw error;
        }

        return (data || []).map(row => ({
            name: row.name,
            role: row.role || '',
            notes: row.notes || '',
            photo: row.photo_url || '',
            descriptors: (row.descriptors || []).map(d => new Float32Array(d)),
            updatedAt: new Date(row.updated_at).getTime()
        }));
    }

    /**
     * Save an Onboarding / Pre-registration Profile with ALL input fields to Supabase Cloud
     */
    async saveProfileToCloud({ name, email = '', phone = '', dob = '', idType = 'Passport', idNumber = '', loyaltyTier = 'Standard', descriptors = [], photo = '', notes = '' }) {
        if (!name || !name.trim()) return null;

        await this.ensureClientReady();

        const t0 = performance.now();
        let cloudPhotoUrl = photo || '';
        if (photo && photo.startsWith('data:image') && this.client) {
            try {
                cloudPhotoUrl = await this.uploadPhoto(photo, `profile_${name}`);
            } catch (pErr) {
                console.warn('[Supabase Photo Upload]', pErr);
            }
        }

        const serializedDescriptors = (descriptors || []).map(d => Array.isArray(d) ? d : Array.from(d));

        // 1. Save all onboarding intake fields into public.profiles
        const profileRecord = {
            name: name.trim(),
            email: (email || '').trim(),
            phone: (phone || '').trim(),
            dob: (dob || '').trim(),
            id_type: idType || 'Passport',
            id_number: (idNumber || '').trim(),
            loyalty_tier: loyaltyTier || 'Standard',
            photo_url: cloudPhotoUrl,
            notes: (notes || '').trim(),
            descriptors: serializedDescriptors,
            updated_at: new Date().toISOString()
        };

        let profileSaved = false;
        if (this.client) {
            try {
                const { error: profileErr } = await this.client
                    .from('profiles')
                    .upsert(profileRecord, { onConflict: 'name' });

                if (!profileErr) {
                    profileSaved = true;
                    console.log(`[Supabase Profiles] Onboarding profile saved for: ${name}`);
                } else {
                    console.warn('[Supabase Profiles] Client upsert note:', profileErr.message);
                }
            } catch (e) {
                console.warn('[Supabase Profiles] Error:', e.message);
            }
        }

        // Direct REST fallback if client was not available or upsert failed
        if (!profileSaved) {
            try {
                const res = await this._restRequest('profiles', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
                    body: JSON.stringify(profileRecord)
                });
                if (res.ok) {
                    profileSaved = true;
                    console.log(`[Supabase Profiles] Profile saved via direct REST for: ${name}`);
                } else {
                    const text = await res.text();
                    console.warn('[Supabase Profiles] REST fallback note:', res.status, text);
                }
            } catch (restErr) {
                console.warn('[Supabase Profiles] REST network error:', restErr);
            }
        }

        // 2. Only register face biometric vector in public.faces if biometric descriptors were actually captured!
        let faceSaved = false;
        if (descriptors && descriptors.length > 0) {
            try {
                await this.savePersonToCloud({
                    name: name.trim(),
                    role: `FastTrack Member (${loyaltyTier})`,
                    photo: cloudPhotoUrl,
                    descriptors: descriptors,
                    notes: `Email: ${email} | ID: ${idType} ${idNumber} | DOB: ${dob}`
                });
                faceSaved = true;
            } catch (err) {
                console.warn('[Supabase Faces] Sync warning:', err.message);
            }
        }

        const latencyMs = Math.round(performance.now() - t0);
        return {
            success: profileSaved || faceSaved,
            profile: profileRecord,
            photoUrl: cloudPhotoUrl,
            latencyMs
        };
    }

    /**
     * Find a profile in Supabase Cloud by Name or Email
     */
    async findProfileInCloud(identifier) {
        if (!identifier || !identifier.trim()) return null;
        const clean = identifier.replace(/['"]/g, '').trim();

        await this.ensureClientReady();

        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from('profiles')
                    .select('*')
                    .or(`name.ilike.%${clean}%,email.ilike.%${clean}%`)
                    .limit(1);

                if (data && data.length > 0) return data[0];
            } catch (e) {
                console.warn('[Supabase findProfile client]', e);
            }
        }

        // REST fallback
        try {
            const res = await this._restRequest(`profiles?or=(name.ilike.*${encodeURIComponent(clean)}*,email.ilike.*${encodeURIComponent(clean)}*)&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) return data[0];
            }
        } catch (restErr) {}

        return null;
    }

    /**
     * Save a Purchased Event Ticket to Supabase Cloud (public.tickets)
     */
    async saveTicketToCloud(ticket) {
        if (!ticket) return null;

        await this.ensureClientReady();

        const t0 = performance.now();
        let cloudPhotoUrl = ticket.photoDataUrl || ticket.photo || '';
        if (cloudPhotoUrl && cloudPhotoUrl.startsWith('data:image') && this.client) {
            try {
                cloudPhotoUrl = await this.uploadPhoto(cloudPhotoUrl, `ticket_${ticket.bookingId || ticket.buyerName}`);
            } catch (pErr) {
                console.warn('[Supabase Ticket Photo Upload]', pErr);
            }
        }

        const bookingId = ticket.bookingId || ticket.booking_id || ('TP-' + Math.floor(100000 + Math.random() * 900000));
        const ticketRecord = {
            booking_id: bookingId,
            event_id: ticket.eventId || ticket.event_id || '',
            event_title: ticket.eventTitle || ticket.event_title || 'TruePass Event',
            venue: ticket.venue || '',
            event_date: ticket.date || ticket.event_date || '',
            showtime: ticket.time || ticket.showtime || '',
            format: ticket.format || 'Standard',
            seats: Array.isArray(ticket.seats) ? ticket.seats : (ticket.seats ? [ticket.seats] : []),
            total_amount: parseFloat(ticket.totalAmount || ticket.total_amount || 0),
            buyer_name: ticket.buyerName || ticket.buyer_name || 'Guest',
            buyer_email: ticket.buyerEmail || ticket.buyer_email || '',
            buyer_phone: ticket.buyerPhone || ticket.buyer_phone || '',
            id_type: ticket.idType || ticket.id_type || '',
            id_number: ticket.idNumber || ticket.id_number || '',
            loyalty_tier: ticket.loyaltyTier || ticket.loyalty_tier || 'Standard',
            photo_url: cloudPhotoUrl,
            face_verified: !!(ticket.faceVerified || ticket.face_verified),
            status: ticket.status || 'CONFIRMED',
            created_at: ticket.createdAt || ticket.created_at || new Date().toISOString()
        };

        let ticketSaved = false;
        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from('tickets')
                    .upsert(ticketRecord, { onConflict: 'booking_id' })
                    .select();

                if (!error) {
                    ticketSaved = true;
                    console.log(`[Supabase] Ticket ${bookingId} synced to cloud via client!`);
                } else {
                    console.warn('[Supabase Tickets] Insert note:', error.message);
                }
            } catch (e) {
                console.warn('[Supabase Tickets] Error:', e.message);
            }
        }

        // Direct REST fallback if client was not available or upsert failed
        if (!ticketSaved) {
            try {
                const res = await this._restRequest('tickets', {
                    method: 'POST',
                    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
                    body: JSON.stringify(ticketRecord)
                });
                if (res.ok) {
                    ticketSaved = true;
                    console.log(`[Supabase] Ticket ${bookingId} synced to cloud via direct REST!`);
                } else {
                    const text = await res.text();
                    console.warn('[Supabase Tickets] REST fallback note:', res.status, text);
                }
            } catch (restErr) {
                console.warn('[Supabase Tickets] REST network error:', restErr);
            }
        }

        // Also update role in public.faces to reflect current ticket
        if (this.client && ticketRecord.buyer_name) {
            try {
                const { data: existingPerson } = await this.client
                    .from('faces')
                    .select('*')
                    .eq('name', ticketRecord.buyer_name)
                    .single();

                if (existingPerson) {
                    await this.client
                        .from('faces')
                        .update({
                            role: `Ticket Holder: ${ticketRecord.event_title} (Seats: ${ticketRecord.seats.join(', ')})`,
                            notes: `Active Booking: ${ticketRecord.booking_id} | Date: ${ticketRecord.event_date}`,
                            updated_at: new Date().toISOString()
                        })
                        .eq('name', ticketRecord.buyer_name);
                }
            } catch (err) {}
        }

        const latencyMs = Math.round(performance.now() - t0);
        return {
            success: ticketSaved,
            ticket: ticketRecord,
            latencyMs
        };
    }

    /**
     * Refund a Ticket: Updates Supabase tickets table to 'REFUNDED'
     * and removes ticket association from the attendee's facial profile in faces table!
     */
    async refundTicketInCloud(bookingId, personName) {
        if (!this.client) return null;

        const t0 = performance.now();
        const refundTime = new Date().toISOString();

        // 1. Mark ticket as REFUNDED in public.tickets
        try {
            await this.client
                .from('tickets')
                .update({
                    status: 'REFUNDED',
                    refunded_at: refundTime
                })
                .eq('booking_id', bookingId);

            console.log(`[Supabase] Ticket ${bookingId} marked REFUNDED in cloud!`);
        } catch (e) {
            console.warn('[Supabase Refund] Ticket update note:', e.message);
        }

        // 2. Remove ticket association from facial profile in public.faces
        try {
            // Check if user has other active tickets
            const { data: remainingTickets } = await this.client
                .from('tickets')
                .select('*')
                .eq('buyer_name', personName)
                .eq('status', 'CONFIRMED');

            let updatedRole = 'FastTrack Member (No Active Tickets)';
            let updatedNotes = `Ticket ${bookingId} refunded on ${new Date().toLocaleDateString()}`;

            if (remainingTickets && remainingTickets.length > 0) {
                const nextTicket = remainingTickets[0];
                updatedRole = `Ticket Holder: ${nextTicket.event_title} (Seats: ${nextTicket.seats.join(', ')})`;
                updatedNotes = `Active Booking: ${nextTicket.booking_id} • Previous ticket ${bookingId} was refunded.`;
            }

            await this.client
                .from('faces')
                .update({
                    role: updatedRole,
                    notes: updatedNotes,
                    updated_at: refundTime
                })
                .eq('name', personName);

            console.log(`[Supabase] Face association updated for ${personName}: ${updatedRole}`);
        } catch (err) {
            console.warn('[Supabase Refund] Face association update note:', err.message);
        }

        const latencyMs = Math.round(performance.now() - t0);
        return {
            success: true,
            bookingId,
            personName,
            refundedAt: refundTime,
            latencyMs
        };
    }

    /**
     * Fetch all tickets for a specific person by Name and/or Email (Supports Remote Cloud Sync)
     */
    async fetchTicketsByPerson(personName, email = '') {
        if (!personName && !email) return [];
        await this.ensureClientReady();

        const cleanName = (personName || '').trim();
        const cleanEmail = (email || (cleanName.includes('@') ? cleanName : '')).trim();

        if (this.client) {
            try {
                let query = this.client.from('tickets').select('*');
                if (cleanName && cleanEmail) {
                    query = query.or(`buyer_name.eq.${cleanName},buyer_email.eq.${cleanEmail}`);
                } else if (cleanEmail) {
                    query = query.eq('buyer_email', cleanEmail);
                } else {
                    query = query.eq('buyer_name', cleanName);
                }

                const { data, error } = await query.order('created_at', { ascending: false });
                if (!error && Array.isArray(data)) return data;
            } catch (e) {
                console.warn('[Supabase Tickets] Fetch error:', e.message);
            }
        }

        // Direct REST fallback
        try {
            let filter = '';
            if (cleanName && cleanEmail) {
                filter = `or=(buyer_name.eq.${encodeURIComponent(cleanName)},buyer_email.eq.${encodeURIComponent(cleanEmail)})`;
            } else if (cleanEmail) {
                filter = `buyer_email=eq.${encodeURIComponent(cleanEmail)}`;
            } else {
                filter = `buyer_name=eq.${encodeURIComponent(cleanName)}`;
            }
            const res = await this._restRequest(`tickets?${filter}&order=created_at.desc`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) return data;
            }
        } catch (restErr) {}

        return [];
    }

    /**
     * Fetch clean dashboard metrics for Cloud Sync Dashboard
     */
    async fetchCloudSyncOverview() {
        if (!this.client) {
            return { isConnected: false, latencyMs: 0, profilesCount: 0, facesCount: 0, ticketsCount: 0, activeTicketsCount: 0 };
        }

        const t0 = performance.now();
        try {
            const [pRes, fRes, tRes] = await Promise.allSettled([
                this.client.from('profiles').select('name', { count: 'exact', head: true }),
                this.client.from('faces').select('name', { count: 'exact', head: true }),
                this.client.from('tickets').select('status')
            ]);

            const latencyMs = Math.round(performance.now() - t0);

            const profilesCount = (pRes.status === 'fulfilled' && pRes.value.count !== null) ? pRes.value.count : 0;
            const facesCount = (fRes.status === 'fulfilled' && fRes.value.count !== null) ? fRes.value.count : 0;
            
            const tickets = (tRes.status === 'fulfilled' && tRes.value.data) ? tRes.value.data : [];
            const ticketsCount = tickets.length;
            const activeTicketsCount = tickets.filter(t => t.status === 'CONFIRMED').length;

            return {
                isConnected: true,
                url: this.url,
                latencyMs,
                profilesCount,
                facesCount,
                ticketsCount,
                activeTicketsCount
            };
        } catch (err) {
            return { isConnected: false, latencyMs: 0, profilesCount: 0, facesCount: 0, ticketsCount: 0, activeTicketsCount: 0 };
        }
    }
}

window.supabaseSync = new SupabaseCloudSync();
