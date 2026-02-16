class State {
    constructor(dbHandler) {
        console.log('State constructor - dbHandler:', dbHandler);
        this.dbHandler = dbHandler;

        const defaultFilters = {
            profil: { status: '', search: '' },
            checklist: { chapter: '', score: '', status: '', search: '', simpleFilter: null },
            nonconformites: { type: '', chapter: '', correction: '', search: '' },
            auditorTasks: { filter: 'pending' }
        };

        let persistedFilters = defaultFilters;
        try {
            const stored = localStorage.getItem('activeFilters');
            if (stored) {
                persistedFilters = JSON.parse(stored);
                console.log('✅ Filters loaded from localStorage:', persistedFilters);
            }
        } catch (e) {
            console.warn('Could not load filters from localStorage', e);
        }

        this.state = {
            conversations: {},
            checklistData: [],
            companyProfileData: {},
            fields: [],
            currentMode: localStorage.getItem('ifsMode') || 'reviewer',
            auditData: null,
            requirementNumberMapping: {},
            currentSession: { id: null, name: '', created: null, lastModified: null, data: null },
            packageVersion: 1,
            hasUnsavedChanges: false,
            dossierReviewState: {},
            certificationDecisionData: {},
            activeFilters: persistedFilters
        };
        this.subscribers = [];
        this.subscribe = this.subscribe.bind(this);
    }

    get() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState, hasUnsavedChanges: true };

        // Persist filters if they changed
        if (newState.activeFilters) {
            localStorage.setItem('activeFilters', JSON.stringify(this.state.activeFilters));
        }

        this.notifySubscribers();
    }

    setChecklistSimpleFilter(filterType) {
        const currentFilters = this.state.activeFilters;
        // When applying a quick simple filter, reset potentially conflicting detailed filters
        const newChecklistFilters = {
            ...currentFilters.checklist,
            score: '',
            chapter: '',
            status: '',
            search: '',
            simpleFilter: filterType === 'ALL' ? null : filterType
        };
        this.setState({ activeFilters: { ...currentFilters, checklist: newChecklistFilters } });
    }

    getFilteredChecklistData() {
        const { checklistData, conversations, activeFilters } = this.state;
        const filter = activeFilters.checklist.simpleFilter;

        if (!filter) {
            return checklistData;
        }

        return checklistData.filter(item => {
            switch (filter) {
                case 'NC':
                    // Non-conformities are scores B, C, D
                    return ['B', 'C', 'D'].includes(item.score);
                case 'NA':
                    return item.score === 'NA';
                case 'HAS_COMMENT':
                    const cklId = `ckl-${item.uuid}`;
                    const paId = `pa-${item.uuid}`;
                    const oldId = `req-${item.uuid}`;
                    const cklConv = conversations[cklId];
                    const paConv = conversations[paId];
                    const oldConv = conversations[oldId];

                    const hasCkl = cklConv && cklConv.thread && cklConv.thread.length > 0;
                    const hasPa = paConv && paConv.thread && paConv.thread.length > 0;
                    const hasOld = oldConv && oldConv.thread && oldConv.thread.length > 0;

                    return hasCkl || hasPa || hasOld;
                default:
                    return true;
            }
        });
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