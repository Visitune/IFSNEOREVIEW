class UIManager {
    // Codes d'accès définis ici
    static REVIEWER_CODE = "CDOECO2025";
    static AUDITOR_CODE = "moldu2025";

    constructor(state, dataProcessor, fileHandler) {
        this.state = state;
        this.dataProcessor = dataProcessor;
        this.fileHandler = fileHandler;
        this.state.subscribe(this.onStateChange.bind(this));
        this.currentFieldId = null;
        this.draftSaveInterval = null;
        this.autoSaveInterval = null; // New AutoSave
        this.pendingModeChange = null;
        console.log('UIManager Constructor: Initial currentMode from state:', this.state.get().currentMode);
        console.log('UIManager Constructor: Initial ifsMode from localStorage:', localStorage.getItem('ifsMode'));
    }

    onStateChange(newState) {
        console.log('UIManager State changed:', newState);

        // Always refresh all table views
        this.dataProcessor.renderCompanyProfile();
        this.dataProcessor.renderChecklistTable();
        this.dataProcessor.renderNonConformitiesTable();

        // Update Auditor Task List if needed
        if (newState.currentMode === 'auditor') {
            this.dataProcessor.renderAuditorTaskList();
        }

        // If a comment modal is open, refresh its content
        if (this.currentFieldId) {
            this.loadConversationHistory(this.currentFieldId);
            this.renderHistoryTimeline(this.currentFieldId);
            this.setupModalForCurrentMode(this.currentFieldId);
        }

        // Always refresh counters (this will also be called by render functions, but good to ensure)
        this.dataProcessor.refreshAllCounters();

        // Show/hide unsaved changes warning
        const warningElement = document.getElementById('unsavedChangesWarning');
        if (warningElement) {
            warningElement.classList.toggle('hidden', !newState.hasUnsavedChanges);
        }
    }

    initUI() {
        console.log('initUI: Initializing UI components.');
        this.setupEventListeners();
        this.setupDarkMode();
        this.setupSidebar();
        this.setupTabs();
        this.setupFileUIEventListeners();
        this.setupAccordionEventListeners();
        console.log('initUI: Current mode from state:', this.state.get().currentMode);
        this.showInitialModeSelection();

        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (this.state.get().hasUnsavedChanges) {
                console.log('🔄 Auto-saving state...');
                // We rely on IndexedDB via state manager for persistence
                // But for now, let's just trigger a "local save" via StateManager if needed
                // Currently StateManager handles persistence on setState? No, it has saveState method.
                this.state.saveState();

                // Optional: visual feedback
                const warningElement = document.getElementById('unsavedChangesWarning');
                if (warningElement) {
                    warningElement.innerHTML = '<i class="fas fa-save"></i> Sauvegarde auto...';
                    setTimeout(() => {
                        this.state.setState({ hasUnsavedChanges: false }); // Reset flag after save
                        warningElement.classList.add('hidden');
                        warningElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Modifs non enregistrées';
                    }, 1000);
                }
            }
        }, 30000);
    }

    showInitialModeSelection() {
        // Cache le contenu principal de l'application jusqu'à ce que le mode soit sélectionné
        document.getElementById('mainAppContent').classList.add('hidden');
        this.showAccessCodeModal(true); // Passe un flag pour indiquer que c'est l'appel initial
    }

    setupEventListeners() {
        // Mode selector buttons event listeners removed as per user request

        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', () => this.handleModeToggleChange());
        }

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                const icon = darkModeToggle.querySelector('i');
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
                localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
            });
        }

        // Checklist filter buttons handled in DataProcessor.setupTableFilters()


        this.setupKeyboardShortcuts();

        window.selectMode = (mode) => this.selectMode(mode);
        window.openCommentModal = (rowElementOrId) => this.openCommentModal(rowElementOrId);
        window.openCommentModalFromCell = (cellElement, fieldId) => this.openCommentModalFromCell(cellElement, fieldId);
        window.closeCommentModal = () => this.closeCommentModal();
        window.saveComment = () => this.saveComment();
        window.markAsResolved = () => this.markAsResolved();
        window.clearCommentInput = () => this.clearCommentInput();
        window.insertTemplate = (type) => this.insertTemplate(type);
        window.editComment = (commentId) => this.editComment(commentId);
        window.deleteComment = (commentId) => this.deleteComment(commentId);
        window.showPackageModal = () => this.showPackageModal();
        window.closePackageModal = () => this.closePackageModal();
        window.createPackage = () => this.fileHandler.createPackage(); // Delegate to FileHandler
        window.continueWorking = () => this.closePackageModal();
        window.showNeoUpdateModal = () => this.showNeoUpdateModal();
        window.closeNeoUpdateModal = () => this.closeNeoUpdateModal();
        window.addNeoUpdateToPackage = () => this.fileHandler.addNeoUpdateToPackage(); // Delegate to FileHandler
        window.cancelNeoUpdate = () => this.closeNeoUpdateModal();
        window.triggerImageUpload = () => this.triggerImageUpload();
        window.handleImageUpload = (input) => this.handleImageUpload(input);
        window.toggleAccordion = (element) => this.toggleAccordion(element);
        // Nouvelles fonctions pour la modale de code d'accès
        window.closeAccessCodeModal = () => this.closeAccessCodeModal();
        window.verifyAccessCode = () => this.verifyAccessCode();
        window.toggleAccessCodeVisibility = () => this.toggleAccessCodeVisibility();
        window.openHelpModal = () => this.openHelpModal();
        window.closeHelpModal = () => this.closeHelpModal();
        window.startOnboardingTutorial = () => this.startOnboardingTutorial();
        window.startOnboardingTutorial = () => this.startOnboardingTutorial();
        window.downloadAttachedFile = (id) => this.downloadAttachedFile(id);
        window.openResetModal = () => this.openResetModal();
        window.closeResetModal = () => this.closeResetModal();
        window.confirmAppReset = () => this.confirmAppReset();
        window.openImageViewer = (src) => this.openImageViewer(src);
        window.closeImageViewer = () => this.closeImageViewer();
        window.exportActionPlanForSite = () => this.fileHandler.exportActionPlanForSite();
        window.printActionPlan = () => this.fileHandler.generateActionPlanPrintView();
        window.printShortActionPlan = () => this.fileHandler.generateShortActionPlanPrintView();

        window.addEventListener('beforeunload', function (event) {
            console.log('beforeunload triggered. Unsaved changes:', this.state.get().hasUnsavedChanges);
            if (this.state.get().hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = ''; // For Chrome/Firefox
            }
        }.bind(this));

        const toggleAccessCodeVisibilityBtn = document.getElementById('toggleAccessCodeVisibility');
        if (toggleAccessCodeVisibilityBtn) {
            toggleAccessCodeVisibilityBtn.addEventListener('click', () => this.toggleAccessCodeVisibility());
        }
    }

    setupFileUIEventListeners() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const fileInputInternal = document.getElementById('fileInputInternal');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('drag-over');
            });
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.fileHandler.handleFileUpload({ target: { files: files } });
                }
            });
            fileInput.addEventListener('change', (e) => this.fileHandler.handleFileUpload(e));
        }

        if (fileInputInternal) {
            fileInputInternal.addEventListener('change', (e) => this.fileHandler.handleFileUpload(e));
        }

        const newAuditBtn = document.getElementById('newAuditBtn');
        const loadAuditBtn = document.getElementById('loadAuditBtn');
        const saveAuditBtn = document.getElementById('saveAuditBtn');
        const saveAuditBtnAuditor = document.getElementById('saveAuditBtnAuditor');
        const createPackageBtn = document.getElementById('createPackageBtn');
        const respondPackageBtn = document.getElementById('respondPackageBtn');
        const neoUpdateBtn = document.getElementById('neoUpdateBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const exportPDFBtn = document.getElementById('exportPDFBtn');

        if (newAuditBtn) newAuditBtn.addEventListener('click', () => this.fileHandler.createNewSession());
        if (loadAuditBtn) loadAuditBtn.addEventListener('click', () => this.fileHandler.loadFile());
        if (saveAuditBtn) saveAuditBtn.addEventListener('click', () => this.fileHandler.saveWorkInProgress());
        if (saveAuditBtnAuditor) saveAuditBtnAuditor.addEventListener('click', () => this.fileHandler.saveWorkInProgress());
        if (createPackageBtn) createPackageBtn.addEventListener('click', () => this.showPackageModal());
        if (respondPackageBtn) respondPackageBtn.addEventListener('click', () => {
            this.fileHandler.saveWorkInProgress();
            this.showPackageModal();
        });
        if (neoUpdateBtn) neoUpdateBtn.addEventListener('click', () => this.showNeoUpdateModal());
        if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.fileHandler.exportExcel());
        if (exportPDFBtn) exportPDFBtn.addEventListener('click', () => this.fileHandler.exportPDF());
        if (exportPDFBtn) exportPDFBtn.addEventListener('click', () => this.fileHandler.exportPDF());

        // Setup Import Excel
        const importExcelBtn = document.getElementById('importExcelBtn');
        const importExcelInput = document.getElementById('importExcelInput');

        if (importExcelBtn && importExcelInput) {
            importExcelBtn.addEventListener('click', () => importExcelInput.click());
            importExcelInput.addEventListener('change', (e) => this.fileHandler.importActionPlanExcel(e));
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.switchMode();
            }

            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.state.get().currentMode === 'reviewer') {
                    this.fileHandler.saveWorkInProgress();
                }
            }
        });
    }

    showModeSelector() {
        const overlay = document.getElementById('modeSelectorOverlay');
        const savedMode = this.state.get().currentMode;

        // Always hide the overlay and apply the mode directly
        this.selectMode(savedMode, false);
        if (overlay) overlay.style.display = 'none';
    }

    selectMode(mode, showSelector = true) {
        console.log(`selectMode: Attempting to set mode to ${mode}`);
        this.state.setState({ currentMode: mode });
        localStorage.setItem('ifsMode', mode);

        if (showSelector) {
            const overlay = document.getElementById('modeSelectorOverlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            }
        }

        this.applyModeTheme();
        this.updateUIForMode();
        this.dataProcessor.refreshAllCounters(); // Call dataProcessor for indicators

        console.log(`selectMode: Mode sélectionné: ${mode}`);
    }

    applyModeTheme() {
        document.body.className = document.body.className.replace(/mode-\w+/g, '');
        document.body.classList.add(`mode-${this.state.get().currentMode}`);
    }

    updateUIForMode() {
        const modeToggle = document.getElementById('modeToggle');
        const currentModeInState = this.state.get().currentMode;
        console.log(`updateUIForMode: currentModeInState=${currentModeInState}, modeToggle.checked before update=${modeToggle?.checked}`);
        if (modeToggle) {
            modeToggle.checked = currentModeInState === 'auditor';
            console.log(`updateUIForMode: modeToggle.checked after update=${modeToggle.checked}`);
        }

        const modeLabel = document.getElementById('currentModeLabel');
        const modeDescription = document.getElementById('currentModeDescription');
        const headerMode = document.getElementById('headerMode');

        if (this.state.get().currentMode === 'reviewer') {
            if (modeLabel) modeLabel.textContent = 'Mode Reviewer';
            if (modeDescription) modeDescription.textContent = 'Analyser et commenter';
            if (headerMode) headerMode.textContent = 'Reviewer';
        } else {
            if (modeLabel) modeLabel.textContent = 'Mode Auditeur';
            if (modeDescription) modeDescription.textContent = 'Répondre aux commentaires';
            if (headerMode) headerMode.textContent = 'Auditeur';
        }

        this.toggleModeSpecificElements();

        // LOGIQUE DE BASCULE D'ONGLET
        if (this.state.get().currentMode === 'auditor') {
            // En mode auditeur, on force l'affichage de l'onglet "Tâches"
            this.switchTab('auditor-tasks');
            // On s'assure que les données sont à jour
            this.dataProcessor.renderAuditorTaskList();
        } else {
            // En mode reviewer, on revient au profil par défaut si on était sur l'onglet tâches
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'auditor-tasks') {
                this.switchTab('profil');
            }
        }
    }

    toggleModeSpecificElements() {
        const reviewerElements = document.querySelectorAll('.reviewer-only');
        const auditorElements = document.querySelectorAll('.auditor-only');

        reviewerElements.forEach(el => {
            el.style.display = this.state.get().currentMode === 'reviewer' ? '' : 'none';
        });

        auditorElements.forEach(el => {
            el.style.display = this.state.get().currentMode === 'auditor' ? '' : 'none';
        });
    }

    handleModeToggleChange() {
        const currentMode = this.state.get().currentMode;
        const targetMode = currentMode === 'reviewer' ? 'auditor' : 'reviewer';
        this.pendingModeChange = targetMode; // Stocke le mode vers lequel on veut basculer
        console.log(`handleModeToggleChange: currentMode=${currentMode}, targetMode=${targetMode}, pendingModeChange=${this.pendingModeChange}`);
        this.showAccessCodeModal();
    }

    showAccessCodeModal(isInitialCall = false) {
        const modal = document.getElementById('accessCodeModal');
        const input = document.getElementById('accessCodeInput');
        const error = document.getElementById('accessCodeError');
        const modeSelectionContainer = document.getElementById('initialModeSelection');
        const modalTitle = document.getElementById('accessCodeModalTitle');

        if (isInitialCall) {
            if (modeSelectionContainer) modeSelectionContainer.classList.remove('hidden');
            if (modalTitle) modalTitle.textContent = 'Sélectionnez votre mode et entrez le code';
            // Réinitialise pendingModeChange pour que l'utilisateur choisisse
            this.pendingModeChange = null;
        } else {
            if (modeSelectionContainer) modeSelectionContainer.classList.add('hidden');
            if (modalTitle) modalTitle.textContent = 'Entrez le code d\'accès';
        }

        if (modal) modal.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (error) error.classList.add('hidden');
    }

    closeAccessCodeModal() {
        const modal = document.getElementById('accessCodeModal');
        if (modal) modal.classList.add('hidden');
        this.pendingModeChange = null; // Réinitialise le mode en attente
        // Réinitialise le toggle si l'utilisateur annule le changement de mode
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.checked = this.state.get().currentMode === 'auditor';
        }
        // Affiche le contenu principal de l'application après la fermeture de la modale
        document.getElementById('mainAppContent').classList.remove('hidden');
    }

    verifyAccessCode() {
        const input = document.getElementById('accessCodeInput');
        const error = document.getElementById('accessCodeError');
        const enteredCode = input?.value;

        console.log(`verifyAccessCode: enteredCode=${enteredCode}, pendingModeChange=${this.pendingModeChange}`);

        if (!enteredCode) {
            if (error) error.textContent = 'Veuillez entrer un code.';
            if (error) error.classList.remove('hidden');
            return;
        }

        let codeCorrect = false;
        let targetMode = this.pendingModeChange;

        // Si pendingModeChange n'est pas défini (appel initial), récupère le mode sélectionné par l'utilisateur
        if (!targetMode) {
            const reviewerRadio = document.getElementById('modeSelectReviewer');
            const auditorRadio = document.getElementById('modeSelectAuditor');
            if (reviewerRadio?.checked) {
                targetMode = 'reviewer';
            } else if (auditorRadio?.checked) {
                targetMode = 'auditor';
            } else {
                if (error) error.textContent = 'Veuillez sélectionner un mode.';
                if (error) error.classList.remove('hidden');
                return;
            }
            this.pendingModeChange = targetMode; // Définit le mode en attente pour la vérification
        }

        if (targetMode === 'reviewer' && enteredCode === UIManager.REVIEWER_CODE) {
            codeCorrect = true;
        } else if (targetMode === 'auditor' && enteredCode === UIManager.AUDITOR_CODE) {
            codeCorrect = true;
        }

        if (codeCorrect) {
            this.selectMode(this.pendingModeChange, false);
            this.closeAccessCodeModal();
            document.body.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        } else {
            if (error) error.textContent = 'Code incorrect. Veuillez réessayer.';
            if (error) error.classList.remove('hidden');
        }
    }

    toggleAccessCodeVisibility() {
        const input = document.getElementById('accessCodeInput');
        const icon = document.getElementById('toggleAccessCodeVisibility')?.querySelector('i');
        if (input && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }
    }

    setupDarkMode() {
        if (localStorage.getItem('darkMode') === 'true' ||
            (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            const darkModeToggle = document.getElementById('darkModeToggle');
            const icon = darkModeToggle?.querySelector('i');
            if (icon) {
                icon.classList.replace('fa-moon', 'fa-sun');
            }
        }
    }

    setupSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
        const mobileSidebarToggleHeader = document.getElementById('mobileSidebarToggleHeader');
        const mainContent = document.querySelector('.main-content');

        if (sidebarCollapse) {
            sidebarCollapse.addEventListener('click', () => {
                sidebar?.classList.toggle('sidebar-collapsed');
                mainContent?.classList.toggle('main-content-collapsed');
            });
        }

        const toggleMobileSidebar = () => {
            sidebar?.classList.toggle('active');
        };

        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', toggleMobileSidebar);
        }
        if (mobileSidebarToggleHeader) {
            mobileSidebarToggleHeader.addEventListener('click', toggleMobileSidebar);
        }
    }

    setupAccordionEventListeners() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                this.toggleAccordion(e.currentTarget);
            });
        });
    }

    toggleAccordion(headerElement) {
        const item = headerElement.closest('.accordion-item');
        if (!item) return;

        const content = item.querySelector('.accordion-content');
        if (!content) return;

        headerElement.classList.toggle('active');
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
        }
    }

    setupTabs() {
        const navLinks = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTabId = link.dataset.tabTarget;

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                tabContents.forEach(content => content.classList.remove('active'));
                const targetContent = document.getElementById(targetTabId);
                if (targetContent) {
                    targetContent.classList.add('active');
                    this.refreshTabContent(targetTabId);
                }

                const sidebar = document.querySelector('.sidebar');
                if (sidebar?.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            });
        });

        this.setDefaultTab();
    }

    setDefaultTab() {
        const defaultLink = document.querySelector('.nav-link[data-tab-target="profil"]');
        const defaultContent = document.getElementById('profil');

        if (defaultLink) defaultLink.classList.add('active');
        if (defaultContent) defaultContent.classList.add('active');
    }

    refreshTabContent(tabId) {
        switch (tabId) {
            case 'profil':
                this.dataProcessor.renderCompanyProfile();
                break;
            case 'checklist':
                this.dataProcessor.renderChecklistTable();
                break;
            case 'nonconformites':
                this.dataProcessor.renderNonConformitiesTable();
                break;
            case 'auditor-tasks':
                this.dataProcessor.renderAuditorTaskList();
                break;
            case 'dossier':
                this.dataProcessor.renderDossierTable();
                break;
            case 'decision':
                this.dataProcessor.renderCertificationDecision();
                break;
        }
        this.dataProcessor.refreshCountersForTab(tabId);
    }

    openCommentModalFromCell(cellElement, fieldId) {
        if (!fieldId) return;
        this.currentFieldId = fieldId;
        this.openCommentModal(fieldId);
    }

    openCommentModal(rowElementOrId) {
        let fieldId = '';
        if (typeof rowElementOrId === 'string') {
            fieldId = rowElementOrId;
        } else if (rowElementOrId && rowElementOrId.dataset) {
            fieldId = rowElementOrId.dataset.fieldId;
        }

        if (!fieldId) return;

        this.currentFieldId = fieldId;
        const fieldInfo = this.dataProcessor.getFieldInfo(fieldId);

        // Update Modal Title and Content
        const modalTitle = document.getElementById('modalFieldName');
        const fieldDisplay = document.getElementById('fieldDisplayContent');

        if (modalTitle) modalTitle.textContent = `Commentaires - ${fieldInfo.name}`;
        if (fieldDisplay) fieldDisplay.innerHTML = fieldInfo.content;

        // Load Conversation History
        this.loadConversationHistory(fieldId);

        // Render History Timeline
        this.renderHistoryTimeline(fieldId);

        // Mode specific setup (placeholder, read-only, etc.)
        this.setupModalForCurrentMode(fieldId);

        // Start Draft Auto-save for this specific field
        this.setupDraftAutoSave(fieldId);

        // Show Modal
        document.getElementById('commentModal').classList.remove('hidden');

        // Focus on textarea (slightly delayed for visibility)
        setTimeout(() => {
            const textarea = document.getElementById('newCommentInput');
            if (textarea) textarea.focus();
        }, 100);

        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        if (toggleHistoryBtn) {
            toggleHistoryBtn.onclick = () => {
                const historyTimeline = document.getElementById('historyTimeline');
                const icon = toggleHistoryBtn.querySelector('i');
                if (historyTimeline.classList.contains('hidden')) {
                    historyTimeline.classList.remove('hidden');
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                    toggleHistoryBtn.innerHTML = `<i class="fas fa-eye-slash"></i> Masquer`;
                } else {
                    historyTimeline.classList.add('hidden');
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                    toggleHistoryBtn.innerHTML = `<i class="fas fa-eye"></i> Afficher`;
                }
            };
        }
    }

    setupDraftAutoSave(fieldId) {
        const textarea = document.getElementById('newCommentInput');
        const draftStatus = document.getElementById('draftStatus');
        const draftKey = `draft_${fieldId}`;

        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            textarea.value = savedDraft;
            draftStatus.textContent = 'Brouillon restauré.';
        } else {
            draftStatus.textContent = '';
        }

        if (this.draftSaveInterval) {
            clearInterval(this.draftSaveInterval);
        }

        this.draftSaveInterval = setInterval(() => {
            const content = textarea.value;
            if (content.trim().length > 0) {
                localStorage.setItem(draftKey, content);
                const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                draftStatus.textContent = `Brouillon sauvegardé à ${time}`;
            } else {
                localStorage.removeItem(draftKey);
                draftStatus.textContent = '';
            }
        }, 30000);
    }

    closeCommentModal() {
        document.getElementById('commentModal').classList.add('hidden');
        this.currentFieldId = null;

        if (this.draftSaveInterval) {
            clearInterval(this.draftSaveInterval);
            this.draftSaveInterval = null;
        }
        const draftStatus = document.getElementById('draftStatus');
        if (draftStatus) draftStatus.textContent = '';

        this.clearCommentInput();
    }

    loadConversationHistory(fieldId) {
        const historyContainer = document.getElementById('conversationHistory');
        const conversations = this.state.get().conversations;
        const conversation = conversations[fieldId];

        if (!conversation || !conversation.thread || conversation.thread.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comments"></i>
                    <p>Aucun commentaire pour ce champ. Commencez la conversation !</p>
                </div>
            `;
            document.getElementById('conversationStats').textContent = '0 message(s)';
            return;
        }

        let html = '';
        conversation.thread.forEach(comment => {
            html += this.createChatBubble(comment);
        });

        historyContainer.innerHTML = html;
        historyContainer.scrollTop = historyContainer.scrollHeight;

        document.getElementById('conversationStats').textContent = `${conversation.thread.length} message(s)`;

        const status = this.dataProcessor.getConversationStatus(conversation);
        document.getElementById('modalStatusBadge').textContent = this.dataProcessor.getStatusLabel(status);
        document.getElementById('modalStatusBadge').className = `status-badge ${status}`;
    }

    renderHistoryTimeline(fieldId) {
        const historyContainer = document.getElementById('historyTimeline');
        const conversations = this.state.get().conversations;
        const conversation = conversations[fieldId];

        if (!conversation || !conversation.history || conversation.history.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-history">
                    <i class="fas fa-history"></i>
                    <p>Aucun historique pour ce champ.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="timeline">';
        let previousDate = null;

        conversation.history.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(entry => {
            const currentDate = new Date(entry.date);
            let daysDiff = '';
            if (previousDate) {
                const diffTime = Math.abs(currentDate - previousDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    daysDiff = `<span class="timeline-days-diff">+${diffDays} jours</span>`;
                }
            }
            previousDate = currentDate;

            let icon = '';
            let colorClass = '';
            let title = '';

            switch (entry.type) {
                case 'conversation_created':
                    icon = 'fas fa-plus-circle';
                    colorClass = 'timeline-event-created';
                    title = 'Conversation créée';
                    break;
                case 'comment_added':
                    icon = 'fas fa-comment-dots';
                    colorClass = 'timeline-event-comment';
                    title = 'Commentaire ajouté';
                    break;
                case 'comment_edited':
                    icon = 'fas fa-edit';
                    colorClass = 'timeline-event-edited';
                    title = 'Commentaire modifié';
                    break;
                case 'comment_deleted':
                    icon = 'fas fa-trash-alt';
                    colorClass = 'timeline-event-deleted';
                    title = 'Commentaire supprimé';
                    break;
                case 'status_changed':
                    icon = 'fas fa-info-circle';
                    colorClass = 'timeline-event-status';
                    title = 'Statut modifié';
                    break;
                default:
                    icon = 'fas fa-info-circle';
                    colorClass = 'timeline-event-default';
                    title = 'Événement';
            }

            html += `
                <div class="timeline-event ${colorClass}">
                    <div class="timeline-icon"><i class="${icon}"></i></div>
                    <div class="timeline-content">
                        <div class="timeline-meta">
                            <span class="timeline-date">${formatDate(entry.date)}</span>
                            ${daysDiff}
                        </div>
                        <div class="timeline-title">${title} par ${entry.actor}</div>
                        <div class="timeline-details">${entry.details}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        historyContainer.innerHTML = html;
        historyContainer.classList.add('hidden'); // Masquer par défaut
    }

    createChatBubble(comment) {
        const isNeoUpdate = comment.isNeoUpdate ? 'neo-update' : '';
        const bubbleClass = `chat-bubble ${comment.author} ${isNeoUpdate}`;
        const avatarText = comment.author === 'reviewer' ? 'R' : 'A';
        const canEdit = comment.author === this.state.get().currentMode && this.isWithin5Minutes(comment.date);

        const editDeleteButtons = canEdit ? `
            <div class="bubble-actions">
                <button onclick="editComment('${comment.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteComment('${comment.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : '';

        const editedBadge = comment.isEdited ? `<span class="bubble-edited">(modifié)</span>` : '';


        let attachmentHtml = '';
        if (comment.file) {
            attachmentHtml = `
                <div class="attachment-box" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.05); border-radius: 4px; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-file-code"></i>
                    <span class="attachment-name" style="font-weight: bold; flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${comment.file.name}</span>
                    <button onclick="downloadAttachedFile('${comment.id}')" class="btn btn-sm btn-primary" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" title="Télécharger">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        }

        return `
            <div class="${bubbleClass}">
                <div class="chat-avatar">${avatarText}</div>
                <div class="bubble-content ${comment.author}">
                    ${editDeleteButtons}
                    <div class="bubble-text">
                        ${this.formatCommentContent(comment.content)}
                        ${attachmentHtml}
                    </div>
                    <div class="bubble-meta">
                        ${formatDate(comment.date)}
                        ${editedBadge}
                        ${comment.correctionInNeo ? '<span class="status-badge resolved" style="background-color: #10b981; color: white;"><i class="fas fa-check-circle"></i> Corrigé dans NEO</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    formatCommentContent(content) {
        if (!content) return '';

        // Détection des images Markdown (Base64 inséré par handleImageUpload)
        // Format: ![Image](data:image/png;base64,...)
        const imgRegex = /!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g;
        content = content.replace(imgRegex, '<img src="$1" class="comment-inline-image" onclick="openImageViewer(\'$1\')">');

        // Simpler URL replacement
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');

        return content.replace(/\n/g, '<br>');
    }

    downloadAttachedFile(commentId) {
        const conversations = this.state.get().conversations;
        for (const key in conversations) {
            const thread = conversations[key].thread;
            const comment = thread.find(c => c.id === commentId);
            if (comment && comment.file) {
                const blob = new Blob([comment.file.content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = comment.file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return;
            }
        }
        this.uiManager.showError('Fichier introuvable.');
    }

    setupModalForCurrentMode(fieldId) {
        const conversations = this.state.get().conversations;
        const conversation = conversations[fieldId];
        const hasThread = conversation && conversation.thread && conversation.thread.length > 0;

        // Filter out deleted messages to get a clear view of the conversation
        const visibleMessages = hasThread ? conversation.thread.filter(m => !m.isDeleted) : [];
        const hasVisibleMessages = visibleMessages.length > 0;
        const lastMessage = hasVisibleMessages ? visibleMessages[visibleMessages.length - 1] : null;

        const currentMode = this.state.get().currentMode;
        // The "Resolve" button should appear if the last VISIBLE message is from the auditor
        const canResolve = currentMode === 'reviewer' && hasVisibleMessages && lastMessage?.author === 'auditor';

        const resolveBtn = document.getElementById('resolveBtn');
        if (resolveBtn) {
            resolveBtn.style.display = canResolve ? 'block' : 'none';
        }

        const textarea = document.getElementById('newCommentInput');
        if (textarea) {
            textarea.placeholder = currentMode === 'reviewer' ?
                'Tapez votre commentaire reviewer...' :
                'Tapez votre réponse...';
        }

        // AUDITOR RESTRICTION: Cannot initiate a conversation.
        const inputSection = document.querySelector('.comment-input-section');
        if (inputSection) {
            // Hide input if auditor AND there are no visible messages.
            if (currentMode === 'auditor' && !hasVisibleMessages) {
                inputSection.style.display = 'none';

                let infoMsg = document.getElementById('auditorRestrictionMsg');
                if (!infoMsg) {
                    infoMsg = document.createElement('div');
                    infoMsg.id = 'auditorRestrictionMsg';
                    infoMsg.className = 'p-4 text-center text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded-lg mt-4 border border-gray-200 dark:border-gray-700';
                    infoMsg.innerHTML = '<i class="fas fa-lock mr-2"></i> Seul le Reviewer peut initier une discussion sur ce point.';
                    inputSection.parentNode.insertBefore(infoMsg, inputSection);
                } else {
                    infoMsg.style.display = 'block';
                }
            } else {
                inputSection.style.display = 'block';
                const infoMsg = document.getElementById('auditorRestrictionMsg');
                if (infoMsg) infoMsg.style.display = 'none';
            }
        }
    }

    saveComment() {
        const textarea = document.getElementById('newCommentInput');
        const content = textarea.value.trim();
        const neoCorrectionCheckbox = document.getElementById('neoCorrectionCheckbox');
        const isNeoCorrection = neoCorrectionCheckbox && !neoCorrectionCheckbox.closest('.auditor-only').hidden ? neoCorrectionCheckbox.checked : false;

        if (!content) {
            this.showError('Veuillez saisir un commentaire');
            return;
        }

        if (!this.currentFieldId) {
            this.showError('Erreur: aucun champ sélectionné');
            return;
        }

        const newComment = {
            id: generateUUID(),
            author: this.state.get().currentMode,
            content: content,
            date: new Date().toISOString(),
            status: 'pending',
            status: 'pending',
            version: this.state.get().packageVersion,
            correctionInNeo: isNeoCorrection
        };

        // This will trigger onStateChange, which will update the UI
        this.dataProcessor.addCommentToConversation(this.currentFieldId, newComment);

        const draftKey = `draft_${this.currentFieldId}`;
        localStorage.removeItem(draftKey);
        const draftStatus = document.getElementById('draftStatus');
        if (draftStatus) draftStatus.textContent = '';

        this.clearCommentInput();

        this.showSuccess('💬 Commentaire ajouté');
    }

    markAsResolved() {
        if (!this.currentFieldId) return;

        const conversations = { ...this.state.get().conversations };
        const conversation = conversations[this.currentFieldId];
        if (!conversation) return;

        conversation.status = 'resolved';
        conversation.thread.forEach(msg => {
            if (msg.status === 'pending') {
                msg.status = 'resolved';
            }
        });
        this.state.setState({ conversations });

        this.dataProcessor.addHistoryEntry(
            this.currentFieldId,
            'status_changed',
            this.state.get().currentMode,
            `Statut de la conversation changé en "résolu"`
        );

        this.loadConversationHistory(this.currentFieldId);
        this.dataProcessor.refreshAllCounters();
        this.showSuccess('✅ Marqué comme résolu');
    }

    clearCommentInput() {
        const textarea = document.getElementById('newCommentInput');
        if (textarea) {
            textarea.value = '';
        }
        const neoCorrectionCheckbox = document.getElementById('neoCorrectionCheckbox');
        if (neoCorrectionCheckbox) {
            neoCorrectionCheckbox.checked = false;
        }
    }

    insertTemplate(type) {
        const textarea = document.getElementById('newCommentInput');
        if (!textarea) return;

        let template = '';
        switch (type) {
            case 'quality':
                template = '🔍 Point qualité à vérifier :\n- \n\nRecommandation :\n- ';
                break;
            case 'correction':
                template = '⚠️ Correction requise :\n- \n\nActions attendues :\n- ';
                break;
        }

        textarea.value = template;
        textarea.focus();
    }

    triggerImageUpload() {
        document.getElementById('commentImageInput').click();
    }

    handleImageUpload(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                const base64Image = e.target.result;
                const textarea = document.getElementById('newCommentInput');
                // Insert markdown image at cursor position or end
                const imageMarkdown = `\n![Image](${base64Image})\n`;

                if (textarea.selectionStart || textarea.selectionStart == '0') {
                    const startPos = textarea.selectionStart;
                    const endPos = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, startPos)
                        + imageMarkdown
                        + textarea.value.substring(endPos, textarea.value.length);
                } else {
                    textarea.value += imageMarkdown;
                }

                // Clear input
                input.value = '';
                this.showSuccess('Image ajoutée au commentaire');
                textarea.focus();
            };

            reader.readAsDataURL(file);
        }
    }

    isWithin5Minutes(commentDate) {
        const now = new Date();
        const commentTime = new Date(commentDate);
        const diffMinutes = (now - commentTime) / (1000 * 60);
        return diffMinutes <= 5;
    }

    editComment(commentId) {
        if (!this.currentFieldId) return;
        const conversations = { ...this.state.get().conversations };
        const conversation = conversations[this.currentFieldId];
        if (!conversation) return;

        const commentIndex = conversation.thread.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return;

        const comment = conversation.thread[commentIndex];

        const newContent = prompt("Modifier le commentaire :", comment.content);

        if (newContent && newContent.trim() !== '' && newContent.trim() !== comment.content) {
            const oldContent = comment.content;
            comment.content = newContent.trim();
            comment.isEdited = true;
            comment.editedDate = new Date().toISOString();
            this.state.setState({ conversations });

            this.dataProcessor.addHistoryEntry(
                this.currentFieldId,
                'comment_edited',
                this.state.get().currentMode,
                `Commentaire modifié (ancien: "${oldContent}", nouveau: "${comment.content}")`
            );

            this.loadConversationHistory(this.currentFieldId);
            this.showSuccess('Commentaire modifié.');
        }
    }

    deleteComment(commentId) {
        if (!this.currentFieldId) return;
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.")) {
            return;
        }

        const conversations = { ...this.state.get().conversations };
        const conversation = conversations[this.currentFieldId];
        if (!conversation) return;

        const commentIndex = conversation.thread.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return;

        const comment = conversation.thread[commentIndex];
        const deletedContent = comment.content;
        comment.content = '[Message supprimé par l\'auteur]';
        comment.isDeleted = true;
        comment.isEdited = false;
        this.state.setState({ conversations });

        this.dataProcessor.addHistoryEntry(
            this.currentFieldId,
            'comment_deleted',
            this.state.get().currentMode,
            `Commentaire supprimé (contenu: "${deletedContent}")`
        );

        this.loadConversationHistory(this.currentFieldId);
        this.showSuccess('Commentaire supprimé.');
    }

    showPackageModal() {
        const validation = this.validatePackageCompletion();

        document.getElementById('packageCompletionRate').textContent = validation.completionRate + '%';
        // JS sets the NUMBER, the label is in HTML. I will check HTML next. 
        document.getElementById('packagePendingFields').textContent = validation.pendingFields;
        document.getElementById('packageTotalComments').textContent = validation.totalComments;

        const messageElement = document.getElementById('validationMessage');
        const createBtn = document.getElementById('createPackageConfirm');

        if (validation.isComplete) {
            messageElement.textContent = '✅ Tous les commentaires ont reçu une réponse. Le package peut être créé.';
            messageElement.className = 'validation-message complete';
            createBtn.disabled = false;
        } else {
            messageElement.textContent = `⚠️ ${validation.pendingFields} question(s) sans réponse. Vous pouvez créer un package partiel.`;
            messageElement.className = 'validation-message incomplete';
            createBtn.disabled = false;
        }

        const title = this.state.get().currentMode === 'reviewer' ? 'Créer un package pour auditeur' : 'Créer une réponse pour reviewer';
        document.getElementById('packageModalTitle').textContent = title;

        document.getElementById('packageModal').classList.remove('hidden');
    }

    closePackageModal() {
        document.getElementById('packageModal').classList.add('hidden');
    }

    validatePackageCompletion() {
        const conversations = this.state.get().conversations;
        const allFieldsWithComments = Object.keys(conversations);
        const totalComments = allFieldsWithComments.length;

        let respondedFields = 0;
        let pendingFields = 0;

        allFieldsWithComments.forEach(fieldId => {
            const conversation = conversations[fieldId];
            if (!conversation || !conversation.thread.length) return;

            const lastComment = conversation.thread[conversation.thread.length - 1];
            const otherMode = this.state.get().currentMode === 'reviewer' ? 'auditor' : 'reviewer';

            if (lastComment.author === this.state.get().currentMode) {
                respondedFields++;
            } else {
                pendingFields++;
            }
        });

        const completionRate = totalComments > 0 ? Math.round((respondedFields / totalComments) * 100) : 100;

        return {
            isComplete: completionRate === 100,
            completionRate,
            totalComments,
            respondedFields,
            pendingFields
        };
    }

    showNeoUpdateModal() {
        document.getElementById('neoUpdateModal').classList.remove('hidden');
    }

    closeNeoUpdateModal() {
        document.getElementById('neoUpdateModal').classList.add('hidden');
        document.getElementById('neoUpdateDescription').value = '';
        document.getElementById('newNeoFile').value = '';
    }

    showLoading(show = true) {
        const loading = document.getElementById('loading');
        const uploadZone = document.getElementById('uploadZone');
        const results = document.getElementById('profilResults');

        if (show) {
            loading?.classList.remove('hidden');
            uploadZone?.classList.add('hidden');
            results?.classList.add('hidden');
        } else {
            loading?.classList.add('hidden');
            // Restore results if we have data, otherwise restore upload zone
            const state = this.state.get();
            const hasData = state.companyProfileData && Object.keys(state.companyProfileData).length > 0;
            if (hasData) {
                this.showResults(true);
            } else if (!state.checklistData || state.checklistData.length === 0) {
                uploadZone?.classList.remove('hidden');
            }
        }
    }

    simulateProgress() {
        let progress = 0;
        const progressFill = document.getElementById('progressFill');

        if (!progressFill) {
            setTimeout(() => this.showLoading(false), 1000);
            return;
        }

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    progressFill.style.width = '0%';
                    this.showLoading(false);
                    this.showResults(true);
                }, 500);
            }
            progressFill.style.width = progress + '%';
        }, 200);
    }

    showResults(show = true) {
        const results = document.getElementById('profilResults');
        if (results) {
            if (show) {
                results.classList.remove('hidden');
            } else {
                results.classList.add('hidden');
            }
        }
    }

    resetToUploadState() {
        this.showLoading(false);
        this.showResults(false);

        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.remove('hidden');

        this.updateCurrentAuditName("Aucun audit chargé");
        this.updateSessionInfo("----");
    }

    resetUI() {
        ['totalRequirements', 'conformCount', 'nonConformCount', 'overallScore', 'progressPercentage', 'commentsCount']
            .forEach(id => this.updateElementText(id, id.includes('Percentage') || id.includes('Score') ? '0%' : '0'));

        this.dataProcessor.renderCompanyProfile();
        this.dataProcessor.renderChecklistTable();
        this.dataProcessor.renderNonConformitiesTable();
        this.dataProcessor.renderAuditorTaskList();

        const alert = document.getElementById('successAlert');
        if (alert) {
            alert.textContent = '';
            alert.classList.add('hidden');
        }
    }

    updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateCurrentAuditName(name) {
        const element = document.getElementById('currentAuditName');
        if (element) {
            element.textContent = name;
        }
    }

    updateSessionInfo(coid) {
        const element = document.getElementById('sessionIdTop');
        if (element) {
            element.textContent = `COID: ${coid}`;
        }

        const versionElement = document.getElementById('packageVersionInfo');
        if (versionElement) {
            versionElement.textContent = `v${this.state.get().packageVersion}`;
        }
    }

    setPartialView(isPartial) {
        const globalStats = [
            'totalRequirements',
            'conformCount',
            'nonConformCount',
            'overallScore'
        ];

        globalStats.forEach(id => {
            const card = document.getElementById(id)?.closest('.stat-card');
            if (card) {
                card.classList.toggle('hidden', isPartial);
            }
        });
    }

    showSuccess(message) {
        const alert = document.getElementById('successAlert');
        if (alert) {
            alert.textContent = message;
            alert.className = 'alert alert-success';
            alert.classList.remove('hidden');

            setTimeout(() => {
                alert.classList.add('hidden');
            }, 5000);
        }
    }

    showError(message) {
        console.error('App Error:', message);
        const alert = document.getElementById('successAlert');
        if (alert) {
            alert.textContent = `❌ ${message}`;
            alert.className = 'alert alert-error';
            alert.classList.remove('hidden');

            alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            alert(message);
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.comment-modal, .package-modal, .neo-update-modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
        this.currentFieldId = null;
    }

    finalizeDataLoad() {
        this.showLoading(false);
        this.showResults(true);

        setTimeout(() => {
            this.dataProcessor.renderCompanyProfile();
            this.dataProcessor.renderChecklistTable();
            this.dataProcessor.renderNonConformitiesTable();
            this.dataProcessor.refreshAllCounters();
        }, 100);
    }

    openImageViewer(src) {
        const modal = document.getElementById('imageViewerModal');
        const img = document.getElementById('viewerImage');
        if (modal && img) {
            img.src = src;
            modal.classList.remove('hidden');
        }
    }

    closeImageViewer() {
        const modal = document.getElementById('imageViewerModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    switchTab(tabId) {
        const tabContents = document.querySelectorAll('.tab-content');
        const navLinks = document.querySelectorAll('.nav-link');

        tabContents.forEach(content => content.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        const targetContent = document.getElementById(tabId);
        const targetLink = document.querySelector(`[data-tab-target="${tabId}"]`);

        if (targetContent) targetContent.classList.add('active');
        if (targetLink) targetLink.classList.add('active');

        this.refreshTabContent(tabId);
    }
    startOnboardingTutorial() {
        const steps = [
            {
                element: '.mode-switch-section',
                title: 'Choix du Mode',
                content: 'Basculez entre le mode "Reviewer" (pour analyser) et "Auditeur" (pour répondre).'
            },
            {
                element: '.upload-zone',
                title: 'Chargement des Données',
                content: 'Déposez ici vos fichiers .ifs (export NEO), .ifsr (reprise) ou .ifsp (package collaboratif).'
            },
            {
                element: '.nav-section',
                title: 'Navigation',
                content: 'Accédez aux différentes sections (Profil, Checklist, Tâches) depuis ce menu.'
            },
            {
                element: '#newAuditBtn',
                title: 'Nouveau Dossier',
                content: 'Commencez un nouvel audit vide si nécessaire.'
            }
        ];

        let currentStep = 0;

        // Remove existing tutorial elements if any
        document.querySelectorAll('.tutorial-overlay, .tutorial-tooltip').forEach(el => el.remove());

        const showStep = (index) => {
            if (index >= steps.length) {
                // End tutorial
                document.querySelectorAll('.tutorial-overlay, .tutorial-tooltip').forEach(el => el.remove());
                this.showSuccess('Tutoriel terminé !');
                return;
            }

            const step = steps[index];
            const target = document.querySelector(step.element);

            if (!target || target.offsetParent === null) {
                // Skip if element not visible
                showStep(index + 1);
                return;
            }

            // Create overlay highlight
            const rect = target.getBoundingClientRect();
            let overlay = document.querySelector('.tutorial-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'tutorial-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.zIndex = '9998';
                overlay.style.pointerEvents = 'none'; // Allow clicks? maybe not
                // We simulate a "hole" using borders or multiple divs, or just strict positioning
                // Simplified: Just use a tooltip pointing to it, with a full screen dimmer
                overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
                document.body.appendChild(overlay);
            }

            // Create Tooltip
            let tooltip = document.querySelector('.tutorial-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'tutorial-tooltip content-card';
                tooltip.style.position = 'fixed';
                tooltip.style.zIndex = '9999';
                tooltip.style.maxWidth = '300px';
                tooltip.style.padding = '1.5rem';
                document.body.appendChild(tooltip);
            }

            tooltip.innerHTML = `
                <h3 style="margin-top:0; color:var(--color-theme-600)">${step.title}</h3>
                <p>${step.content}</p>
                <div style="display:flex; justify-content:space-between; margin-top:1rem;">
                    <button class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('.tutorial-overlay, .tutorial-tooltip').forEach(el => el.remove())">Fermer</button>
                    <button class="btn btn-sm btn-primary" id="nextTutorialStep">Suivant <i class="fas fa-arrow-right"></i></button>
                </div>
            `;

            // Position tooltip near target
            const tooltipRect = tooltip.getBoundingClientRect();
            // Default: bottom center
            let top = rect.bottom + 10;
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

            // Bounds check
            if (top + tooltipRect.height > window.innerHeight) top = rect.top - tooltipRect.height - 10;
            if (left < 10) left = 10;

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;

            // Highlight effect on target (optional styling)
            target.style.position = 'relative';
            target.style.zIndex = '9999';
            target.style.boxShadow = '0 0 0 4px var(--color-warning)';

            // Cleanup old highlight on next step
            tooltip.querySelector('#nextTutorialStep').onclick = () => {
                target.style.zIndex = '';
                target.style.boxShadow = '';
                showStep(index + 1);
            };
        };

        showStep(0);
    }
    openHelpModal() {
        const modal = document.getElementById('helpModal');
        const overlay = document.querySelector('.help-overlay');
        if (modal && overlay) {
            modal.classList.add('active'); // Use active class for display flex
            overlay.classList.add('active'); // Use active class for display block
            modal.style.display = 'flex'; // Ensure flex
            overlay.style.display = 'block'; // Ensure block
            // Small timeout to allow display:block to apply before opacity transition
            setTimeout(() => {
                modal.style.opacity = '1';
                overlay.style.opacity = '1';
            }, 10);
        }
    }

    closeHelpModal() {
        const modal = document.getElementById('helpModal');
        const overlay = document.querySelector('.help-overlay');
        if (modal && overlay) {
            modal.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                modal.style.display = 'none';
                overlay.style.display = 'none';
            }, 300);
        }
    }

    openResetModal() {
        document.getElementById('resetConfirmationInput').value = '';
        const confirmBtn = document.getElementById('confirmResetBtn');
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        document.getElementById('resetModal').classList.remove('hidden');
    }

    closeResetModal() {
        document.getElementById('resetModal').classList.add('hidden');
    }

    async confirmAppReset() {
        const input = document.getElementById('resetConfirmationInput').value;
        if (input !== 'SUPPRIMER') return;

        try {
            // Tentative de fermeture de la connexion courante pour éviter le blocage
            if (this.state && this.state.dbHandler && this.state.dbHandler.db) {
                this.state.dbHandler.db.close();
                console.log("Connexion DB fermée avant suppression.");
            }

            // Delete DB
            const req = indexedDB.deleteDatabase('IFSDB');
            req.onsuccess = () => {
                console.log('Database deleted successfully');
                localStorage.clear();
                window.location.reload();
            };
            req.onerror = () => {
                console.error("Error deleting DB");
                alert("Erreur lors de la suppression de la base de données. Essayez de vider le cache du navigateur manuellement.");
            };
            req.onblocked = () => {
                console.warn("Delete blocked");
                alert("⚠️ Suppression bloquée par le navigateur.\n\nFermez TOUS les autres onglets ouverts de cette application et réessayez.");
            };

        } catch (e) {
            console.error("Reset failed", e);
            alert("Erreur critique lors de la réinitialisation.");
        }
    }
}
