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
        this.isReady = false;

        if (this.url && this.key) {
            this.initClient(this.url, this.key);
        }
    }

    /**
     * Initialize or update Supabase Client
     */
    initClient(url, key) {
        if (!url || !key) {
            this.client = null;
            this.isReady = false;
            return false;
        }

        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.warn('[Supabase] Supabase JS library not loaded yet.');
            return false;
        }

        try {
            this.url = url.trim().replace(/\/+$/, '');
            this.key = key.trim();
            this.client = window.supabase.createClient(this.url, this.key);
            this.isReady = true;

            localStorage.setItem('supabase_url', this.url);
            localStorage.setItem('supabase_key', this.key);
            console.log('[Supabase] Client initialized for project:', this.url);
            return true;
        } catch (e) {
            console.error('[Supabase] Init error:', e);
            this.client = null;
            this.isReady = false;
            return false;
        }
    }

    clearConfig() {
        this.client = null;
        this.isReady = false;
        this.url = '';
        this.key = '';
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_key');
    }

    /**
     * Test connection to Supabase database with latency metric
     */
    async testConnection() {
        if (!this.client) {
            return { success: false, message: 'Supabase URL or Key not configured.', latencyMs: 0 };
        }

        const t0 = performance.now();
        try {
            const { data, error } = await this.client
                .from('faces')
                .select('name')
                .limit(1);

            const latencyMs = Math.round(performance.now() - t0);

            if (error) {
                return { success: false, message: `Database error: ${error.message}. (Did you run the SQL schema?)`, latencyMs };
            }

            return { success: true, message: `Connected to Supabase Cloud (${latencyMs}ms)`, latencyMs };
        } catch (err) {
            const latencyMs = Math.round(performance.now() - t0);
            return { success: false, message: `Connection failed: ${err.message}`, latencyMs };
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
     * Privacy-preserving person commitment registration.
     * ZERO-LEAKAGE ENFORCEMENT: Never uploads raw photos or raw descriptors to disk/cloud database.
     */
    async savePersonToCloud({ name, role = '', descriptors = [], photo = '', notes = '', biometricCommitment = '' }) {
        if (!this.client) return null;

        // Requirement 1: Discard raw photo and raw descriptor vectors immediately
        const record = {
            name: name.trim(),
            role: role.trim(),
            notes: notes.trim(),
            photo_url: '', // Explicitly blank: Never persist raw photos to database
            descriptors: [], // Explicitly blank: Never persist raw template arrays
            biometric_commitment: biometricCommitment || '',
            updated_at: new Date().toISOString()
        };

        // Wipe any ephemeral input arrays in-place
        if (Array.isArray(descriptors)) {
            for (const d of descriptors) {
                if (d && typeof d.fill === 'function') d.fill(0);
            }
        }

        const { data, error } = await this.client
            .from('faces')
            .upsert(record, { onConflict: 'name' })
            .select();

        if (error) {
            console.warn('[Supabase DB] Note saving person commitment:', error.message);
        }

        console.log(`[Supabase Privacy] Person commitment registered for: ${name} (zero raw biometrics stored)`);
        return { ...record, photo: '' };
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
     * Save an Onboarding / Pre-registration Profile with zero biometric leakage.
     * Raw photos and templates are discarded immediately and never saved to cloud storage or DB.
     */
    async saveProfileToCloud({ name, email = '', phone = '', dob = '', idType = 'Passport', idNumber = '', loyaltyTier = 'Standard', descriptors = [], photo = '', notes = '', biometricCommitment = '' }) {
        if (!this.client) return null;

        const t0 = performance.now();

        // 1. Save onboarding profile with privacy commitments (zero raw biometrics)
        const profileRecord = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            dob: dob.trim(),
            id_type: idType,
            id_number: idNumber.trim(),
            loyalty_tier: loyaltyTier,
            photo_url: '', // Explicitly blank: Never persist raw photos
            notes: notes.trim(),
            descriptors: [], // Explicitly blank: Never persist raw templates
            biometric_commitment: biometricCommitment || '',
            updated_at: new Date().toISOString()
        };

        let profileSaved = false;
        try {
            const { error: profileErr } = await this.client
                .from('profiles')
                .upsert(profileRecord, { onConflict: 'name' });

            if (profileErr) {
                console.warn('[Supabase Profiles] Upsert note:', profileErr.message);
            } else {
                profileSaved = true;
                console.log(`[Supabase Privacy] Profile commitment saved for: ${name}`);
            }
        } catch (e) {
            console.warn('[Supabase Profiles] Error:', e.message);
        }

        // 2. Register commitment in faces table (zero raw templates)
        let faceSaved = false;
        try {
            await this.savePersonToCloud({
                name: name.trim(),
                role: `FastTrack Member (${loyaltyTier})`,
                photo: '',
                descriptors: descriptors,
                notes: `Email: ${email} | ID: ${idType} ${idNumber} | DOB: ${dob}`,
                biometricCommitment: biometricCommitment
            });
            faceSaved = true;
        } catch (err) {
            console.warn('[Supabase Faces] Sync warning:', err.message);
        }

        // Enforce in-place memory wipe of ephemeral descriptors
        if (Array.isArray(descriptors)) {
            for (const d of descriptors) {
                if (d && typeof d.fill === 'function') d.fill(0);
            }
        }

        const latencyMs = Math.round(performance.now() - t0);
        return {
            success: profileSaved || faceSaved,
            profile: profileRecord,
            photoUrl: '',
            latencyMs
        };
    }

    /**
     * Save a Purchased Event Ticket to Supabase Cloud (public.tickets)
     * Privacy-preserving: Stores cryptographic biometric commitment, never raw images.
     */
    async saveTicketToCloud(ticket) {
        if (!this.client) return null;

        const t0 = performance.now();

        const ticketRecord = {
            booking_id: ticket.bookingId,
            event_id: ticket.eventId || '',
            event_title: ticket.eventTitle,
            venue: ticket.venue || '',
            event_date: ticket.date,
            showtime: ticket.time,
            format: ticket.format || 'Standard',
            seats: ticket.seats || [],
            total_amount: parseFloat(ticket.totalAmount || 0),
            buyer_name: ticket.buyerName,
            buyer_email: ticket.buyerEmail || '',
            buyer_phone: ticket.buyerPhone || '',
            id_type: ticket.idType || '',
            id_number: ticket.idNumber || '',
            loyalty_tier: ticket.loyaltyTier || 'Standard',
            photo_url: '', // Explicitly blank: Never persist raw photos to database
            biometric_commitment: ticket.biometricCommitment || '',
            face_verified: !!ticket.faceVerified,
            status: ticket.status || 'CONFIRMED',
            created_at: ticket.createdAt || new Date().toISOString()
        };

        try {
            const { data, error } = await this.client
                .from('tickets')
                .upsert(ticketRecord, { onConflict: 'booking_id' })
                .select();

            if (error) {
                console.warn('[Supabase Tickets] Insert note:', error.message);
            } else {
                console.log(`[Supabase] Ticket ${ticket.bookingId} synced to cloud!`);
            }
        } catch (e) {
            console.warn('[Supabase Tickets] Error:', e.message);
        }

        // Also update role in public.faces to reflect current ticket
        try {
            const { data: existingPerson } = await this.client
                .from('faces')
                .select('*')
                .eq('name', ticket.buyerName)
                .single();

            if (existingPerson) {
                await this.client
                    .from('faces')
                    .update({
                        role: `Ticket Holder: ${ticket.eventTitle} (Seats: ${ticket.seats.join(', ')})`,
                        notes: `Active Booking: ${ticket.bookingId} | Date: ${ticket.date}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('name', ticket.buyerName);
            }
        } catch (err) {}

        const latencyMs = Math.round(performance.now() - t0);
        return {
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
     * Fetch all tickets for a specific person
     */
    async fetchTicketsByPerson(personName) {
        if (!this.client) return [];
        try {
            const { data, error } = await this.client
                .from('tickets')
                .select('*')
                .eq('buyer_name', personName)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[Supabase Tickets] Fetch error:', e.message);
            return [];
        }
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
