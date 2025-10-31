class State {
    constructor(dbHandler) {
        console.log('State constructor - dbHandler:', dbHandler);
        this.dbHandler = dbHandler;
        this.state = {
            conversations: {},
            checklistData: [],
            companyProfileData: {},
            fields: [], // This might be replaced by checklistData and companyProfileData fields
            currentMode: localStorage.getItem('ifsMode') || 'reviewer',
            auditData: null,
            requirementNumberMapping: {},
            currentSession: { id: null, name: '', created: null, lastModified: null, data: null },
            packageVersion: 1,
            hasUnsavedChanges: false,
        };
        this.subscribers = [];
        this.subscribe = this.subscribe.bind(this); // Explicitly bind subscribe
    }

    get() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    async loadInitialData() {
        try {
            // Load all relevant data from IndexedDB
            const storedState = await this.dbHandler.loadState(); // Assuming dbHandler has a loadState method
            if (storedState) {
                this.state = { ...this.state, ...storedState };
            }
            this.notifySubscribers();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async saveState() {
        try {
            await this.dbHandler.saveState(this.state);
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    // Add other state management methods as needed
}