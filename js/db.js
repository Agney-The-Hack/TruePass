/**
 * FaceDB - IndexedDB Face & Event Database with Automatic Cloud Sync
 * Stores enrolled identities, 128-d biometric vectors, photos, and recognition logs.
 */
class FaceDB {
    constructor(dbName = 'FacialRecognitionDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this._initPromise = null;
    }

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Store 1: Enrolled People
                if (!db.objectStoreNames.contains('people')) {
                    const peopleStore = db.createObjectStore('people', { keyPath: 'name' });
                    peopleStore.createIndex('role', 'role', { unique: false });
                    peopleStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                // Store 2: Recognition Event Logs
                if (!db.objectStoreNames.contains('logs')) {
                    const logsStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logsStore.createIndex('name', 'name', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
        return this._initPromise;
    }

    async _tx(storeName, mode = 'readonly') {
        await this.init();
        const tx = this.db.transaction(storeName, mode);
        return { tx, store: tx.objectStore(storeName) };
    }

    // Save or update person (Local IndexedDB + Supabase Cloud if configured)
    async savePerson({ name, role = '', descriptors = [], photo = '', notes = '' }) {
        const { store } = await this._tx('people', 'readwrite');
        const serializableDescriptors = descriptors.map(d => Array.from(d));
        const record = {
            name: name.trim(),
            role: role.trim(),
            descriptors: serializableDescriptors,
            photo,
            notes,
            updatedAt: Date.now()
        };

        const localSavePromise = new Promise((resolve, reject) => {
            const req = store.put(record);
            req.onsuccess = () => resolve(record);
            req.onerror = () => reject(req.error);
        });

        const savedRecord = await localSavePromise;

        // Auto-sync to Supabase Cloud if connected
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.savePersonToCloud({
                name,
                role,
                descriptors,
                photo,
                notes
            }).catch(e => console.warn('[Cloud Sync Error]', e.message));
        }

        return savedRecord;
    }

    // Append a new descriptor sample to an existing person
    async addSample(name, descriptor, newPhoto = null) {
        const person = await this.getPerson(name);
        if (!person) {
            throw new Error(`Person "${name}" not found.`);
        }
        const descArray = Array.from(descriptor);
        person.descriptors.push(descArray);
        if (newPhoto) person.photo = newPhoto;
        person.updatedAt = Date.now();

        const { store } = await this._tx('people', 'readwrite');
        const result = await new Promise((resolve, reject) => {
            const req = store.put(person);
            req.onsuccess = () => resolve(person);
            req.onerror = () => reject(req.error);
        });

        // Sync to Cloud
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.savePersonToCloud({
                name: person.name,
                role: person.role,
                descriptors: person.descriptors.map(d => new Float32Array(d)),
                photo: person.photo,
                notes: person.notes
            }).catch(e => console.warn('[Cloud Sync Error]', e.message));
        }

        return result;
    }

    async getPerson(name) {
        const { store } = await this._tx('people', 'readonly');
        return new Promise((resolve, reject) => {
            const req = store.get(name);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async getAllPeople() {
        const { store } = await this._tx('people', 'readonly');
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => {
                const list = (req.result || []).map(item => ({
                    ...item,
                    descriptors: item.descriptors.map(d => new Float32Array(d))
                }));
                resolve(list);
            };
            req.onerror = () => reject(req.error);
        });
    }

    async deletePerson(name) {
        const { store } = await this._tx('people', 'readwrite');
        const result = await new Promise((resolve, reject) => {
            const req = store.delete(name);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });

        // Remove from Supabase Cloud if connected
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.deletePersonFromCloud(name)
                .catch(e => console.warn('[Cloud Delete Error]', e.message));
        }

        return result;
    }

    async clearAllPeople() {
        const { store } = await this._tx('people', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    // Add a recognition event log
    async logEvent({ name, confidence, distance, photo = '' }) {
        const { store } = await this._tx('logs', 'readwrite');
        const record = {
            name,
            confidence: Math.round(confidence),
            distance: parseFloat(distance.toFixed(4)),
            timestamp: Date.now(),
            photo
        };

        const localPromise = new Promise((resolve, reject) => {
            const req = store.add(record);
            req.onsuccess = () => resolve(record);
            req.onerror = () => reject(req.error);
        });

        const savedLog = await localPromise;

        // Auto-sync event to Supabase Cloud
        if (window.supabaseSync && window.supabaseSync.isReady) {
            window.supabaseSync.logEventToCloud({
                name,
                confidence,
                distance,
                photo
            }).catch(e => console.warn('[Cloud Log Warning]', e.message));
        }

        return savedLog;
    }

    async getLogs(limit = 100) {
        const { store } = await this._tx('logs', 'readonly');
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => {
                const logs = req.result || [];
                logs.sort((a, b) => b.timestamp - a.timestamp);
                resolve(logs.slice(0, limit));
            };
            req.onerror = () => reject(req.error);
        });
    }

    async clearLogs() {
        const { store } = await this._tx('logs', 'readwrite');
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    // Export database as JSON
    async exportJSON() {
        const people = await this.getAllPeople();
        const exportable = people.map(p => ({
            name: p.name,
            role: p.role,
            photo: p.photo,
            notes: p.notes,
            descriptors: p.descriptors.map(d => Array.from(d)),
            updatedAt: p.updatedAt
        }));
        return JSON.stringify({
            version: 1,
            exportedAt: new Date().toISOString(),
            count: exportable.length,
            people: exportable
        }, null, 2);
    }

    // Import database from JSON
    async importJSON(jsonStr) {
        const data = JSON.parse(jsonStr);
        if (!data || !Array.isArray(data.people)) {
            throw new Error('Invalid backup file format.');
        }
        for (const p of data.people) {
            await this.savePerson({
                name: p.name,
                role: p.role || '',
                photo: p.photo || '',
                notes: p.notes || '',
                descriptors: p.descriptors.map(d => new Float32Array(d))
            });
        }
        return data.people.length;
    }
}

window.faceDB = new FaceDB();
