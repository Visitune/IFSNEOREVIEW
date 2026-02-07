class IndexedDBHandler {
    constructor() {
        this.db = null;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('IFSDB', 2);

            request.onerror = (event) => {
                console.error('Database error:', event.target.errorCode);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains('conversations')) {
                    this.db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
                }
                if (!this.db.objectStoreNames.contains('appState')) {
                    this.db.createObjectStore('appState'); // No keyPath needed for a single object
                }
                console.log('Database upgraded');
            };
        });
    }

    async saveState(state) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appState'], 'readwrite');
            const objectStore = transaction.objectStore('appState');
            const request = objectStore.put(state, 'currentAppState'); // Store with a fixed key

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async loadState() {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appState'], 'readonly');
            const objectStore = transaction.objectStore('appState');
            const request = objectStore.get('currentAppState');

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getConversations() {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readonly');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async saveConversation(conversation) {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readwrite');
            const objectStore = transaction.objectStore('conversations');
            const request = objectStore.add(conversation);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}
