class FileHandler {
    constructor(state, uiManager, dataProcessor) {
        this.state = state;
        this.uiManager = uiManager; // Inject UIManager
        this.dataProcessor = dataProcessor; // Inject DataProcessor
        this.state.subscribe(this.onStateChange.bind(this));
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    setDataProcessor(dataProcessor) {
        this.dataProcessor = dataProcessor;
    }

    onStateChange(newState) {
        // Handle state changes here
        console.log('FileHandler State changed:', newState);
    }

    loadFile() {
        const fileInput = document.getElementById('fileInputInternal');
        if (fileInput) fileInput.click();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileName = file.name.toLowerCase();

        // Detection Logic
        const isIFSFile = fileName.endsWith('.ifs');
        const isIFSRFile = fileName.endsWith('.ifsr');
        const isIFSPFile = fileName.endsWith('.ifsp');
        const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (!isIFSFile && !isIFSRFile && !isIFSPFile && !isExcelFile) {
            this.uiManager.showError('❌ Type de fichier non supporté !\n\n✅ Formats acceptés :\n• .ifs (nouveau dossier depuis NEO)\n• .ifsr (travail en cours)\n• .ifsp (package)\n• .xlsx (Plan d\'Actions)');
            return;
        }

        // Handle Excel Import specifically
        if (isExcelFile) {
            if (!this.state.get().auditData) {
                this.uiManager.showError("⚠️ Veuillez d'abord charger un dossier d'audit (.ifs) avant d'importer le plan d'actions.");
                event.target.value = null;
                return;
            }
            // Delegate to importActionPlanExcel BUT importActionPlanExcel expects an event with target.files
            // We can reuse the event, or call processExcel directly if we read it here.
            // Better to call importActionPlanExcel directly passing the event
            this.importActionPlanExcel(event);
            return;
        }

        this.uiManager.showLoading(true);
        this.uiManager.simulateProgress();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const data = JSON.parse(content);

                if (isIFSFile) {
                    this.processNewIFSFile(data);
                } else if (isIFSRFile) {
                    this.loadWorkInProgress(data);
                } else if (isIFSPFile) {
                    this.loadCollaborativePackage(data);
                }
            } catch (error) {
                console.error('Error during file processing:', error);
                this.uiManager.showError(`Erreur lors du traitement du fichier : ${error.message}`);
                this.uiManager.showLoading(false);
                this.uiManager.resetToUploadState();
            } finally {
                event.target.value = null;
            }
        };

        reader.onerror = (error) => {
            console.error('File reading error:', error);
            this.uiManager.showError('Erreur lors de la lecture du fichier');
            this.uiManager.showLoading(false);
            this.uiManager.resetToUploadState();
            event.target.value = null;
        };

        reader.readAsText(file);
    }

    validateAuditData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Format de fichier invalide (JSON attendu)');
        }

        // Basic check for IFS structure
        const hasCompanyName = data.companyName || (data.questions && data.questions.companyName);
        if (!hasCompanyName) {
            throw new Error('Nom de l\'entreprise manquant. Est-ce un fichier IFS valide ?');
        }

        // Check for checklist data if it's supposed to be a full audit
        // (Note: collaborative packages might structure this differently, so this is mainly for .ifs)
        // We can make this less strict or return warnings.

        return true;
    }

    processNewIFSFile(data) {
        console.log('🎯 PROCESSING NEW IFS FILE');

        try {
            this.validateAuditData(data);
        } catch (e) {
            this.uiManager.showError(`Fichier invalide : ${e.message}`);
            return;
        }

        this.uiManager.setPartialView(false); // Ensure full view

        this.state.setState({
            auditData: data,
            checklistData: [],
            companyProfileData: {},
            conversations: {},
            requirementNumberMapping: {},
            packageVersion: 1,
            certificationDecisionData: {},
            dossierReviewState: {},
            currentSession: {
                id: `IFS-${Date.now()}`,
                name: 'Nouvel Audit',
                created: new Date(),
                lastModified: new Date(),
                data: data
            }
        });

        if (!data?.data?.modules?.food_8) {
            this.uiManager.showError('Format de fichier IFS non valide.');
            this.uiManager.resetToUploadState();
            return;
        }

        const food8 = data.data.modules.food_8;
        console.log('✅ Found food_8 module. Starting processing logic...');
        this.dataProcessor.processAuditDataLogic(food8);
    }

    loadWorkInProgress(workData) {
        console.log('📂 LOADING WORK IN PROGRESS');
        this.uiManager.setPartialView(false); // Ensure full view

        try {
            if (!workData.auditData || !workData.version) {
                throw new Error('Format de fichier IFSR invalide');
            }

            const conversations = this.migrateConversationKeys(workData.conversations || {});

            this.state.setState({
                auditData: workData.auditData,
                checklistData: workData.checklistData || [],
                companyProfileData: workData.companyProfileData || {},
                conversations: conversations,
                requirementNumberMapping: workData.requirementNumberMapping || {},
                packageVersion: workData.packageVersion || 1,
                certificationDecisionData: workData.certificationDecisionData || {},
                dossierReviewState: workData.dossierReviewState || {}
            });

            if (workData.currentMode && workData.currentMode !== this.state.get().currentMode) {
                this.uiManager.selectMode(workData.currentMode, false);
            }

            const companyName = workData.companyName || 'Société inconnue';
            const coid = workData.coid || 'COID-XXXX';

            this.state.setState({
                currentSession: {
                    id: workData.sessionId || `IFS-Loaded-${Date.now()}`,
                    name: `Audit ${companyName} (rechargé)`,
                    created: workData.savedDate ? new Date(workData.savedDate) : new Date(),
                    lastModified: new Date(),
                    data: workData.auditData
                }
            });

            this.uiManager.updateCurrentAuditName(`IFS Reviewer - ${companyName}`);
            this.uiManager.updateSessionInfo(coid);

            if (this.state.get().auditData?.data?.modules?.food_8?.result?.overall) {
                const overallResult = this.state.get().auditData.data.modules.food_8.result.overall;
                this.uiManager.updateElementText('overallScore', overallResult.percent.toFixed(1) + '%');
            }

            this.uiManager.updateElementText('totalRequirements', this.state.get().checklistData.length);
            this.uiManager.updateElementText('conformCount', this.state.get().checklistData.filter(item => item.score === 'A').length);
            this.uiManager.updateElementText('nonConformCount', this.state.get().checklistData.filter(item => ['B', 'C', 'D'].includes(item.score)).length);

            const totalComments = this.dataProcessor.getTotalCommentsCount();
            this.uiManager.showSuccess(`📂 Travail rechargé : ${companyName} (${totalComments} commentaires sauvegardés)`);

            this.state.saveState();
            this.uiManager.finalizeDataLoad();

        } catch (error) {
            console.error('Error loading work in progress:', error);
            this.uiManager.showError('Erreur lors du chargement : ' + error.message);
            this.uiManager.resetToUploadState();
        }
    }

    migrateConversationKeys(conversations) {
        if (!conversations) return {};
        const newConversations = { ...conversations };
        let keysChanged = false;

        for (const key in newConversations) {
            // Migrer les anciennes clés 'req-' ou 'nc-' vers 'ckl-' (Canal Constat)
            if (key.startsWith('req-') || key.startsWith('nc-')) {
                const uuid = key.startsWith('req-') ? key.replace('req-', '') : key.replace('nc-', '');
                const newKey = `ckl-${uuid}`;
                if (!newConversations[newKey]) {
                    newConversations[newKey] = newConversations[key];
                    delete newConversations[key];
                    keysChanged = true;
                }
            }
        }

        if (keysChanged) {
            console.log('✅ Migrated old conversation keys to the new dual-channel format (ckl-).');
        }
        return newConversations;
    }

    loadCollaborativePackage(packageData) {
        console.log('📦 LOADING COLLABORATIVE PACKAGE');

        try {
            if (!packageData.version || !packageData.packageType) {
                throw new Error('Format de package IFSP invalide');
            }

            this.uiManager.setPartialView(packageData.isPartial || false);

            const expectedMode = packageData.packageType === 'REVIEWER_TO_AUDITOR' ? 'auditor' : 'reviewer';
            if (this.state.get().currentMode !== expectedMode) {
                if (confirm(`Ce package est destiné au mode ${expectedMode === 'auditor' ? 'Auditeur' : 'Reviewer'}. Voulez-vous changer de mode ?`)) {
                    this.uiManager.selectMode(expectedMode, false);
                }
            }

            this.state.setState({
                auditData: packageData.auditData,
                checklistData: packageData.checklistData || [],
                companyProfileData: packageData.companyProfileData || {},
                requirementNumberMapping: packageData.requirementNumberMapping || {},
                // dossierReviewState: packageData.dossierReviewState || {}, // OLD
                certificationDecisionData: packageData.certificationDecisionData || {}
            });

            // Merge Dossier State (important for round trip if Auditor updates status)
            if (packageData.dossierReviewState) {
                const currentDossierState = this.state.get().dossierReviewState || {};
                const newDossierState = { ...currentDossierState, ...packageData.dossierReviewState };
                this.state.setState({ dossierReviewState: newDossierState });
            }

            if (packageData.conversations) {
                const migratedConversations = this.migrateConversationKeys(packageData.conversations);
                this.mergeConversations(migratedConversations);
            }

            this.state.setState({
                packageVersion: packageData.packageVersion || 1,
            });

            const companyName = packageData.companyName || 'Société inconnue';
            const coid = packageData.coid || 'COID-XXXX';

            this.state.setState({
                currentSession: {
                    id: `IFSP-${coid}-v${this.state.get().packageVersion}`,
                    name: `Package ${companyName} v${this.state.get().packageVersion}`,
                    created: new Date(packageData.createdDate),
                    lastModified: new Date(),
                    data: packageData.auditData
                }
            });

            this.uiManager.updateCurrentAuditName(`IFS Reviewer - ${companyName} (Package v${this.state.get().packageVersion})`);
            this.uiManager.updateSessionInfo(coid);

            this.uiManager.updateElementText('totalRequirements', this.state.get().checklistData.length);
            this.uiManager.updateElementText('conformCount', this.state.get().checklistData.filter(item => item.score === 'A').length);
            this.uiManager.updateElementText('nonConformCount', this.state.get().checklistData.filter(item => ['B', 'C', 'D'].includes(item.score)).length);

            if (this.state.get().auditData?.data?.modules?.food_8?.result?.overall) {
                const overallResult = this.state.get().auditData.data.modules.food_8.result.overall;
                this.uiManager.updateElementText('overallScore', overallResult.percent.toFixed(1) + '%');
            }

            const newComments = this.countNewComments(packageData);
            this.uiManager.showSuccess(`📦 Package collaboratif chargé : ${companyName} v${this.state.get().packageVersion} (${newComments} nouveaux commentaires)`);

            this.state.saveState();
            this.uiManager.finalizeDataLoad();

        } catch (error) {
            console.error('Error loading collaborative package:', error);
            this.uiManager.showError('Erreur lors du chargement du package : ' + error.message);
            this.uiManager.resetToUploadState();
        }
    }

    mergeConversations(newConversations) {
        const currentConversations = { ...this.state.get().conversations };
        let updatedCount = 0;

        for (const fieldId in newConversations) {
            const newConv = newConversations[fieldId];

            if (!currentConversations[fieldId]) {
                // New conversation entirely
                currentConversations[fieldId] = newConv;
                updatedCount++;
            } else {
                const currentConv = currentConversations[fieldId];
                const currentThread = currentConv.thread || [];
                const newThread = newConv.thread || [];

                // Map existing messages by ID for easy lookup and status update
                const messageMap = new Map();
                currentThread.forEach(msg => messageMap.set(msg.id, msg));

                let threadChanged = false;

                // Merge new messages or update status of existing ones
                newThread.forEach(newMsg => {
                    if (messageMap.has(newMsg.id)) {
                        // Message exists. Check if status changed (e.g. 'pending' -> 'read')
                        const existingMsg = messageMap.get(newMsg.id);
                        if (existingMsg.status !== newMsg.status) {
                            // If local is 'read' and incoming is 'pending', keep 'read' (local user read it)
                            // If local is 'pending' and incoming is 'read', update to 'read' (remote user read it)
                            // Actually, logic depends on who is author.
                            // Simplified: specific status updates from remote take precedence if valid transition.
                            if (newMsg.status === 'read' && existingMsg.status === 'pending') {
                                existingMsg.status = 'read';
                                threadChanged = true;
                            }
                        }
                    } else {
                        // New message
                        messageMap.set(newMsg.id, newMsg);
                        threadChanged = true;
                        updatedCount++;
                    }
                });

                if (threadChanged) {
                    // Reconstruct thread from map values and sort
                    currentConversations[fieldId].thread = Array.from(messageMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

                    // Update header info if newer
                    if (new Date(newConv.lastActivity) > new Date(currentConv.lastActivity)) {
                        currentConversations[fieldId].lastActivity = newConv.lastActivity;
                        currentConversations[fieldId].status = newConv.status; // Take status from latest package interaction
                    }
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`✅ ${updatedCount} conversations updated or added.`);
        }

        this.state.setState({ conversations: currentConversations });
    }

    countNewComments(packageData) {
        let newCount = 0;
        const otherMode = this.state.get().currentMode === 'reviewer' ? 'auditor' : 'reviewer';

        for (const fieldId in packageData.conversations) {
            const conversation = packageData.conversations[fieldId];
            conversation.thread.forEach(message => {
                if (message.author === otherMode && message.status === 'pending') {
                    newCount++;
                }
            });
        }
        return newCount;
    }



    createNewSession() {
        if (this.state.get().auditData && !confirm("⚠️ Créer un nouveau dossier ? Le travail non sauvegardé sera perdu.")) {
            return;
        }

        this.state.setState({
            auditData: null,
            checklistData: [],
            companyProfileData: {},
            conversations: {},
            requirementNumberMapping: {},
            packageVersion: 1,
            certificationDecisionData: {},
            dossierReviewState: {},
            currentSession: {
                id: null,
                name: 'Nouveau Dossier',
                created: new Date(),
                lastModified: new Date(),
                data: null
            }
        });

        this.uiManager.resetToUploadState();
        this.uiManager.resetUI();
        this.uiManager.switchTab('profil');

        this.uiManager.showSuccess('✅ Nouveau dossier prêt. Chargez un fichier .ifs, .ifsr ou .ifsp.');
    }

    saveWorkInProgress() {
        if (!this.state.get().auditData) {
            this.uiManager.showError('❌ Aucune donnée à sauvegarder. Chargez un fichier .ifs d\'abord.');
            return;
        }

        try {
            const companyName = this.state.get().companyProfileData['Nom du site à auditer'] || 'Société inconnue';
            const coid = this.state.get().companyProfileData['N° COID du portail'] || 'COID-XXXX';

            const workPackage = {
                version: '2.0',
                packageType: 'WORK_IN_PROGRESS',
                savedDate: new Date().toISOString(),
                companyName,
                coid,
                currentMode: this.state.get().currentMode,

                auditData: this.state.get().auditData,
                checklistData: this.state.get().checklistData,
                companyProfileData: this.state.get().companyProfileData,
                conversations: this.state.get().conversations,
                requirementNumberMapping: this.state.get().requirementNumberMapping,
                packageVersion: this.state.get().packageVersion,
                certificationDecisionData: this.state.get().certificationDecisionData,
                dossierReviewState: this.state.get().dossierReviewState,

                stats: {
                    totalComments: this.dataProcessor.getTotalCommentsCount(),
                    totalRequirements: this.state.get().checklistData.length,
                    progressPercentage: this.dataProcessor.calculateProgressPercentage()
                }
            };

            this.downloadFile(workPackage, `TRAVAIL_${coid}_${this.sanitizeFileName(companyName)}_${this.getDateStamp()}.ifsr`);
            this.state.setState({ hasUnsavedChanges: false });
            this.uiManager.showSuccess(`✅ Travail sauvegardé`);

        } catch (error) {
            console.error('Error saving work:', error);
            this.uiManager.showError('❌ Erreur sauvegarde : ' + error.message);
        }
    }

    checkPackageHealth() {
        const conversations = this.state.get().conversations;
        const currentMode = this.state.get().currentMode;
        const otherMode = currentMode === 'reviewer' ? 'auditor' : 'reviewer';

        let pending = 0;
        let waiting = 0;
        let resolved = 0;
        let total = 0;

        Object.values(conversations).forEach(conv => {
            if (conv.thread && conv.thread.length > 0) {
                total++;
                const status = this.dataProcessor.getConversationStatus(conv);
                if (status === 'pending') pending++;
                else if (status === 'waiting') waiting++;
                else if (status === 'resolved') resolved++;
            }
        });

        const checklistData = this.state.get().checklistData;
        const dossierState = this.state.get().dossierReviewState || {};
        const checklistStructure = this.dataProcessor.constructor.REVIEW_CHECKLIST_STRUCTURE || {}; // Access via constructor or instance property if available

        let incompleteDossier = 0;
        // Basic check for dossier completeness (Reviewer -> Auditor direction)
        if (currentMode === 'reviewer') {
            // We need access to the structure. Assuming it's available globally or via DataProcessor class
            // If not available, we skip this check or use a simplified one based on keys
            // For now, let's just count keys in dossierState vs expected (if we had the count)
            // Simplified: Check if any item in state is 'écart' but has no comment? 
            // Or just report stats.
        }

        return {
            pending,
            waiting,
            resolved,
            total,
            mode: currentMode
        };
    }

    createPackage() {
        try {
            // --- HEALTH CHECK ---
            const health = this.checkPackageHealth();
            let confirmMsg = `📦 RÉSUMÉ DU PACKAGE (${health.mode === 'reviewer' ? 'Reviewer ➔ Auditeur' : 'Auditeur ➔ Reviewer'})\n\n`;

            if (health.mode === 'reviewer') {
                confirmMsg += `• Points en attente de réponse (Waiting): ${health.waiting}\n`;
                confirmMsg += `• Points à traiter par vous (Pending): ${health.pending}\n`;
                confirmMsg += `• Points résolus: ${health.resolved}\n`;

                if (health.pending > 0) {
                    confirmMsg += `\n⚠️ ATTENTION: Il vous reste ${health.pending} points à traiter avant l'envoi !\n`;
                }
            } else {
                // Auditor
                confirmMsg += `• Points traités (répondus): ${health.waiting} (en attente valid. reviewer)\n`;
                confirmMsg += `• Points restant à traiter: ${health.pending}\n`;

                if (health.pending > 0) {
                    confirmMsg += `\n⚠️ ATTENTION: Vous n'avez pas répondu à ${health.pending} questions !\n`;
                }
            }

            confirmMsg += `\nConfirmer la création du package ?`;

            if (!confirm(confirmMsg)) {
                return;
            }
            // --------------------

            const {
                companyProfileData,
                conversations,
                checklistData,
                auditData,
                requirementNumberMapping,
                currentMode,
                dossierReviewState // Added
            } = this.state.get();

            const companyName = companyProfileData['Nom du site à auditer'] || 'Société inconnue';
            const coid = companyProfileData['N° COID du portail'] || 'COID-XXXX';

            const packageType = currentMode === 'reviewer' ? 'REVIEWER_TO_AUDITOR' : 'AUDITOR_TO_REVIEWER';
            const newPackageVersion = this.state.get().packageVersion + 1;
            this.state.setState({ packageVersion: newPackageVersion });

            const packageData = {
                version: '2.1', // Version updated
                packageType: packageType,
                packageVersion: newPackageVersion,
                isPartial: false,
                createdBy: currentMode,
                createdDate: new Date().toISOString(),
                companyName,
                coid,

                auditData: auditData,
                checklistData: checklistData,
                companyProfileData: companyProfileData,
                requirementNumberMapping: requirementNumberMapping,
                dossierReviewState: dossierReviewState || {}, // Added to package

                conversations: conversations,

                metadata: {
                    totalFields: Object.keys(conversations).length,
                    totalComments: this.dataProcessor.getTotalCommentsCount(),
                    lastExchangeDate: new Date().toISOString()
                }
            };

            const filename = `PACKAGE_${packageType}_${coid}_${this.sanitizeFileName(companyName)}_v${newPackageVersion}_${this.getDateStamp()}.ifsp`;
            this.downloadFile(packageData, filename);
            this.state.setState({ hasUnsavedChanges: false });

            this.uiManager.showSuccess(`📦 Package créé : ${filename}`);
            this.uiManager.closePackageModal();

        } catch (error) {
            console.error('Error creating package:', error);
            this.uiManager.showError('❌ Erreur création package : ' + error.message);
        }
    }

    addNeoUpdateToPackage() {
        const description = document.getElementById('neoUpdateDescription').value.trim();
        const fileInput = document.getElementById('newNeoFile');
        const file = fileInput?.files?.[0];

        if (!description && !file) {
            this.uiManager.showError('Veuillez décrire les modifications ou joindre un fichier.');
            return;
        }

        const createComment = (fileData = null) => {
            const neoUpdateComment = {
                id: generateUUID(),
                author: 'auditor',
                content: `🔄 MISE À JOUR NEO: ${description}`,
                date: new Date().toISOString(),
                status: 'pending',
                isNeoUpdate: true,
                version: this.state.get().packageVersion,
                file: fileData // { name: '...', content: '...' }
            };

            const profileFieldId = 'profile-nom-du-site-à-auditer';
            this.dataProcessor.addCommentToConversation(profileFieldId, neoUpdateComment);

            this.uiManager.showSuccess('🔄 Mise à jour NEO ajoutée au package');
            this.uiManager.closeNeoUpdateModal();
            this.dataProcessor.refreshAllCounters();
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                createComment({
                    name: file.name,
                    content: e.target.result
                });
            };
            reader.readAsText(file);
        } else {
            createComment();
        }
    }

    exportExcel() {
        if (!this.state.get().auditData) {
            this.uiManager.showError('Aucune donnée à exporter.');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            this.addSummarySheet(wb);
            this.addProfileSheet(wb);
            this.addNCSheet(wb);
            this.addChecklistSheet(wb);
            this.addCommentsSheet(wb);

            const companyName = this.state.get().companyProfileData['Nom du site à auditer'] || 'audit';
            const coid = this.state.get().companyProfileData['N° COID du portail'] || 'COID';
            const filename = `RAPPORT_IFS_${coid}_${this.sanitizeFileName(companyName)}_${this.getDateStamp()}.xlsx`;

            XLSX.writeFile(wb, filename);
            this.state.setState({ hasUnsavedChanges: false });
            this.uiManager.showSuccess(`📊 Rapport Excel généré : ${filename}`);

        } catch (error) {
            console.error('Error exporting Excel:', error);
            this.uiManager.showError('❌ Erreur export Excel : ' + error.message);
        }
    }

    addSummarySheet(wb) {
        const certData = this.state.get().certificationDecisionData || {};

        const summary = [
            ['Rapport Importé depuis IFS Reviewer', ''],
            ['', ''],
            ['DÉCISION DE CERTIFICATION', ''],
            ['Date de décision', certData.date || 'Non renseignée'],
            ['Responsable', certData.maker || 'Non renseigné'],
            ['Résultat', certData.result || 'Non renseigné'],
            ['Synthèse / Commentaire', certData.comments || 'Aucun'],
            ['', ''],
            ['RÉSUMÉ AUDIT', ''],
            ['Information Clé', 'Valeur'],
            ['Entreprise', this.state.get().companyProfileData['Nom du site à auditer'] || 'N/A'],
            ['COID', this.state.get().companyProfileData['N° COID du portail'] || 'N/A'],
            ['Score global IFS', document.getElementById('overallScore')?.textContent || '0%'],
            ['Total exigences', this.state.get().checklistData.length],
            ['Conformités (A)', this.state.get().checklistData.filter(i => i.score === 'A').length],
            ['Score B', this.state.get().checklistData.filter(i => i.score === 'B').length],
            ['Score C', this.state.get().checklistData.filter(i => i.score === 'C').length],
            ['Score D', this.state.get().checklistData.filter(i => i.score === 'D').length],
            ['Total commentaires', this.dataProcessor.getTotalCommentsCount()],
            ['Mode de travail', this.state.get().currentMode],
            ['Version package', this.state.get().packageVersion]
        ];

        const ws = XLSX.utils.aoa_to_sheet(summary);
        ws['!cols'] = [{ width: 30 }, { width: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, "RÉSUMÉ");
    }

    addProfileSheet(wb) {
        const profileData = [['Champ', 'Valeur', 'Commentaires']];

        Object.entries(this.state.get().companyProfileData).forEach(([field, value]) => {
            const fieldId = `profile-${this.dataProcessor.sanitizeFieldId(field)}`;
            const comments = this.dataProcessor.getCommentsText(fieldId);
            profileData.push([field, value || 'N/A', comments]);
        });

        const ws = XLSX.utils.aoa_to_sheet(profileData);
        ws['!cols'] = [{ width: 40 }, { width: 40 }, { width: 60 }];
        XLSX.utils.book_append_sheet(wb, ws, "PROFIL ENTREPRISE");
    }

    addNCSheet(wb) {
        const ncData = [['N° Exigence', 'Score', 'Explication', 'Détail', 'Commentaires']];

        this.state.get().checklistData
            .filter(item => ['B', 'C', 'D', 'NA'].includes(item.score))
            .forEach(item => {
                const fieldId = `nc-${item.uuid}`;
                const comments = this.dataProcessor.getCommentsText(fieldId);
                ncData.push([
                    item.requirementNumber,
                    item.score,
                    item.explanation || '-',
                    item.detailedExplanation || '-',
                    comments
                ]);
            });

        const ws = XLSX.utils.aoa_to_sheet(ncData);
        ws['!cols'] = [{ width: 15 }, { width: 15 }, { width: 45 }, { width: 45 }, { width: 60 }];
        XLSX.utils.book_append_sheet(wb, ws, "NON-CONFORMITÉS");
    }

    addChecklistSheet(wb) {
        const checklistSheetData = [['N° Exigence', 'Chapitre', 'Score', 'Explication', 'Détail', 'Commentaires']];

        this.state.get().checklistData.forEach(item => {
            const fieldId = `req-${item.uuid}`;
            const comments = this.dataProcessor.getCommentsText(fieldId);
            checklistSheetData.push([
                item.requirementNumber,
                item.chapter,
                item.score,
                item.explanation || '-',
                item.detailedExplanation || '-',
                comments
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(checklistSheetData);
        ws['!cols'] = [{ width: 15 }, { width: 10 }, { width: 15 }, { width: 40 }, { width: 40 }, { width: 60 }];
        XLSX.utils.book_append_sheet(wb, ws, "CHECKLIST COMPLÈTE");
    }

    addCommentsSheet(wb) {
        const commentsData = [['Champ', 'Auteur', 'Date', 'Contenu', 'Statut']];

        Object.entries(this.state.get().conversations).forEach(([fieldId, conversation]) => {
            const fieldName = this.dataProcessor.getFieldInfo(fieldId).name;
            conversation.thread.forEach(comment => {
                commentsData.push([
                    fieldName,
                    comment.author,
                    formatDate(comment.date),
                    comment.content,
                    this.dataProcessor.getStatusLabel(comment.status)
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(commentsData);
        ws['!cols'] = [{ width: 30 }, { width: 15 }, { width: 20 }, { width: 60 }, { width: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, "COMMENTAIRES");
    }

    exportActionPlanForSite() {
        if (!this.state.get().auditData) {
            this.uiManager.showError('Aucune donnée à exporter.');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const conversations = this.state.get().conversations;
            const checklistData = this.state.get().checklistData;

            const paData = [['N° Exigence', 'Score', 'Constat (Rappel d\'audit)', 'Questions Reviewer / Corrections demandées', 'Statut']];

            Object.entries(conversations).forEach(([fieldId, conv]) => {
                if (fieldId.startsWith('pa-')) {
                    const uuid = fieldId.replace('pa-', '');
                    const item = checklistData.find(i => i.uuid === uuid);
                    if (!item) return;

                    const commentsText = conv.thread.map(m => `[${m.author === 'reviewer' ? 'REVIEWER' : 'AUDITEUR'}] ${m.content}`).join('\n---\n');
                    paData.push([
                        item.requirementNumber,
                        item.score,
                        item.explanation || '-',
                        commentsText,
                        this.dataProcessor.getConversationStatus(conv) === 'resolved' ? 'VALIDÉ' : 'EN ATTENTE'
                    ]);
                }
            });

            if (paData.length === 1) {
                this.uiManager.showError("Aucune question sur le plan d'actions (canal spécifique) n'a été identifiée.");
                return;
            }

            const ws = XLSX.utils.aoa_to_sheet(paData);
            ws['!cols'] = [{ width: 15 }, { width: 10 }, { width: 40 }, { width: 60 }, { width: 15 }];
            XLSX.utils.book_append_sheet(wb, ws, "QUESTIONS SITE P.A.");

            const companyName = this.state.get().companyProfileData['Nom du site à auditer'] || 'audit';
            const filename = `QUESTIONS_PA_SITE_${this.sanitizeFileName(companyName)}_${this.getDateStamp()}.xlsx`;
            XLSX.writeFile(wb, filename);

            this.uiManager.showSuccess(`📑 Fichier pour le site généré : ${filename}`);

        } catch (error) {
            console.error('Error exporting PA for site:', error);
            this.uiManager.showError("Erreur lors de l'exportation : " + error.message);
        }
    }

    async exportPDF() {
        if (!this.state.get().auditData) {
            this.uiManager.showError('Aucune donnée à exporter.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            const state = this.state.get();
            const profile = state.companyProfileData || {};
            const decision = state.certificationDecisionData || {};
            const dossierState = state.dossierReviewState || {};
            const conversations = state.conversations || {};
            const checklistStructure = this.dataProcessor.constructor.REVIEW_CHECKLIST_STRUCTURE;

            const findVal = (keywords) => {
                const lowerKeywords = keywords.map(k => k.toLowerCase());
                for (const [key, val] of Object.entries(profile)) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKeywords.some(k => lowerKey.includes(k))) return val;
                }
                return null;
            };



            // --- STATUS CHECK (DRAFT OR FINAL) ---
            let unresolvedDossierPixels = 0;
            Object.values(checklistStructure).forEach(cat => {
                cat.items.forEach(i => {
                    if (!dossierState[i.id]) unresolvedDossierPixels++;
                });
            });
            const isDecisionMade = decision.date && decision.result;
            const isDraft = !isDecisionMade || unresolvedDossierPixels > 0;
            const watermarkText = "DOCUMENT PROVISOIRE - NON VALIDÉ";

            // --- STYLING CONSTANTS ---
            const COLOR_PRIMARY = [15, 23, 42]; // Slate 900
            const COLOR_ACCENT = [59, 130, 246]; // Blue 500
            const COLOR_SUCCESS = [16, 185, 129]; // Emerald 500
            const COLOR_DANGER = [239, 68, 68]; // Red 500
            const COLOR_GRAY = [148, 163, 184]; // Slate 400

            // --- HELPER FUNCTIONS ---
            const drawHeader = (title) => {
                doc.setFillColor(...COLOR_PRIMARY);
                doc.rect(0, 0, pageWidth, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text("IFS NEO REVIEWER", 15, 17);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(title, pageWidth - 15, 17, { align: 'right' });

                if (isDraft) {
                    doc.setTextColor(200, 200, 200);
                    doc.setFontSize(50);
                    doc.text("PROVISOIRE", pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45, renderingMode: 'fill' });
                }
            };

            const drawFooter = (pageNo) => {
                doc.setTextColor(150);
                doc.setFontSize(8);
                const str = `Page ${pageNo}`;
                doc.text(str, pageWidth - 20, pageHeight - 10, { align: 'right' });
                doc.text(`Généré le ${new Date().toLocaleDateString()} - IFS Review Tool`, 20, pageHeight - 10);
            };

            // ================= PAGE 1: COVER & SYNTHESIS =================
            drawHeader("SYNTHÈSE DE CERTIFICATION");

            // Company Info Box - Structured & Filtered
            doc.setDrawColor(200);
            doc.setFillColor(255, 255, 255); // White background

            // 1. Extract specific fields using smart search
            const val = (keys) => findVal(keys) || '-';

            const siteName = val(['nom du site', 'site name', 'société', 'company']);
            const coidCode = val(['coid']);
            const auditDateVal = val(['date audit', 'dates audit', 'période']);
            const reviewerName = val(['reviewer', 'review par', 'nom du reviewer']) || profile['Reviewer'] || "Non spécifié";
            const auditorName = val(['auditeur', 'auditor', 'nom de l\'auditeur']) || profile['Auditeur'] || "Non spécifié";
            const reviewDate = new Date().toLocaleDateString();

            const scopeEn = val(['scope en', 'audit scope', 'scope english']) || "N/A";
            const scopeFr = val(['périmètre', 'scope fr', 'libellé fr']) || "N/A";

            // 2. Content Layoutextract
            const startY = 40;
            let currentY = startY + 15;
            const leftCol = 20;
            const rightCol = 110;

            doc.setFontSize(14);
            doc.setTextColor(...COLOR_PRIMARY);
            doc.setFont('helvetica', 'bold');
            doc.text("INFORMATIONS CLÉS", 20, 50);

            doc.setFontSize(10);
            doc.setTextColor(50);

            // Row 1: Site & COID
            doc.setFont('helvetica', 'bold'); doc.text("Site / Société:", leftCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(siteName), leftCol, currentY + 5);

            doc.setFont('helvetica', 'bold'); doc.text("COID:", rightCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(coidCode), rightCol, currentY + 5);
            currentY += 15;

            // Row 2: Dates
            doc.setFont('helvetica', 'bold'); doc.text("Date de l'audit:", leftCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(auditDateVal), leftCol, currentY + 5);

            doc.setFont('helvetica', 'bold'); doc.text("Date de la revue:", rightCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(reviewDate, rightCol, currentY + 5);
            currentY += 15;

            // Nouvelle ligne pour la durée
            const auditDuration = val(['durée audit', 'duration audit', 'durée']);
            doc.setFont('helvetica', 'bold'); doc.text("Durée d'audit:", leftCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(auditDuration), leftCol + 28, currentY);
            currentY += 10;

            // Row 3: People
            doc.setFont('helvetica', 'bold'); doc.text("Auditeur:", leftCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(auditorName), leftCol, currentY + 5);

            doc.setFont('helvetica', 'bold'); doc.text("Reviewer:", rightCol, currentY);
            doc.setFont('helvetica', 'normal'); doc.text(String(reviewerName), rightCol, currentY + 5);
            currentY += 20;

            // Row 4: Scopes (Full Width)
            doc.setFont('helvetica', 'bold'); doc.text("Audit Scope (EN):", leftCol, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            const splitScopeEn = doc.splitTextToSize(String(scopeEn), pageWidth - 40);
            doc.text(splitScopeEn, leftCol, currentY);
            currentY += (splitScopeEn.length * 5) + 8;

            doc.setFont('helvetica', 'bold'); doc.text("Périmètre (FR):", leftCol, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            const splitScopeFr = doc.splitTextToSize(String(scopeFr), pageWidth - 40);
            doc.text(splitScopeFr, leftCol, currentY);
            currentY += (splitScopeFr.length * 5) + 15;

            // Draw Border around the dynamic section
            const boxHeight = currentY - startY;
            doc.setDrawColor(200);
            doc.roundedRect(14, startY, pageWidth - 28, boxHeight, 2, 2, 'S'); // S for Stroke only

            // Adjust Y for next section (Decision)




            // Adjust Y for next section
            const nextSectionY = currentY + 15;

            // Decision Block
            const decisionY = nextSectionY;
            doc.setFontSize(14);
            doc.setTextColor(...COLOR_PRIMARY);
            doc.text("DÉCISION DE CERTIFICATION", 14, decisionY - 5);

            if (isDecisionMade) {
                const isSuccess = ['foundation', 'higher'].includes(decision.result);
                const boxColor = isSuccess ? [240, 253, 244] : [254, 242, 242]; // Light green or light red
                const borderColor = isSuccess ? COLOR_SUCCESS : COLOR_DANGER;
                const textColor = isSuccess ? [21, 128, 61] : [185, 28, 28];
                const resultText = decision.result === 'higher' ? "NIVEAU SUPÉRIEUR" : (decision.result === 'foundation' ? "NIVEAU DE BASE" : "NON CERTIFIÉ");

                doc.setDrawColor(...borderColor);
                doc.setFillColor(...boxColor);
                doc.rect(14, decisionY, pageWidth - 28, 40, 'FD');

                doc.setFontSize(16);
                doc.setTextColor(...textColor);
                doc.setFont('helvetica', 'bold');
                doc.text(resultText, pageWidth / 2, decisionY + 15, { align: 'center' });

                doc.setFontSize(10);
                doc.setTextColor(50);
                doc.setFont('helvetica', 'normal');
                doc.text(`Décision prise par: ${decision.maker || 'N/A'}`, pageWidth / 2, decisionY + 25, { align: 'center' });
                doc.text(`Date: ${decision.date || 'N/A'}`, pageWidth / 2, decisionY + 32, { align: 'center' });
            } else {
                doc.setDrawColor(200);
                doc.setFillColor(245, 245, 245);
                doc.rect(14, decisionY, pageWidth - 28, 30, 'FD');
                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text("Aucune décision de certification n'a encore été enregistrée.", pageWidth / 2, decisionY + 18, { align: 'center' });
            }

            // Synthesis Comment
            if (decision.comments) {
                const synthesisY = decision.result ? decisionY + 50 : decisionY + 40;
                doc.setFontSize(12);
                doc.setTextColor(...COLOR_PRIMARY);
                doc.text("Synthèse du Reviewer", 14, synthesisY);

                doc.setFontSize(10);
                doc.setTextColor(60);
                const splitText = doc.splitTextToSize(decision.comments, pageWidth - 30);
                doc.text(splitText, 14, synthesisY + 8);
            }

            drawFooter(1);


            // ================= PAGE 2: DOSSIER REVIEW TABLE =================
            doc.addPage();
            drawHeader("REVUE DU DOSSIER");

            let dossierRows = [];
            Object.keys(checklistStructure).sort().forEach(key => {
                const cat = checklistStructure[key];
                // Category Header Row - styled differently in autotable
                dossierRows.push([{ content: cat.titre.toUpperCase(), colSpan: 3, styles: { fillColor: [248, 250, 252], fontStyle: 'bold', textColor: [71, 85, 105] } }]);

                cat.items.forEach(item => {
                    const status = dossierState[item.id];
                    let statusLabel = "À TRAITER";
                    let comments = "";

                    // Get conversation preview
                    const fieldId = `dossier-${item.id}`;
                    if (conversations[fieldId]?.thread?.length > 0) {
                        comments = `${conversations[fieldId].thread.length} message(s)`;
                    }

                    if (status === 'ok') statusLabel = "CONFORME";
                    if (status === 'nok') statusLabel = "NON CONFORME";
                    if (status === 'na') statusLabel = "N/A";

                    dossierRows.push([
                        item.nom,
                        statusLabel,
                        comments
                    ]);
                });
            });

            doc.autoTable({
                startY: 35,
                head: [['Point de contrôle', 'Statut', 'Observations']],
                body: dossierRows,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240] },
                headStyles: { fillColor: COLOR_PRIMARY, textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 40, fontStyle: 'bold', halign: 'center' },
                    2: { cellWidth: 40, fontStyle: 'italic' }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 1) {
                        const s = data.cell.raw;
                        if (s === 'CONFORME') data.cell.styles.textColor = COLOR_SUCCESS;
                        if (s === 'NON CONFORME') data.cell.styles.textColor = COLOR_DANGER;
                        if (s === 'N/A') data.cell.styles.textColor = COLOR_GRAY;
                        if (s === 'À TRAITER') data.cell.styles.textColor = [234, 88, 12]; // Orange
                    }
                }
            });
            drawFooter(2);


            // ================= PAGE 3: CONVERSATION LOGS =================
            doc.addPage();
            drawHeader("JOURNAL DES ÉCHANGES");

            let activeThreads = [];
            // Collect all relevant conversations
            Object.keys(conversations).forEach(fieldId => {
                const thread = conversations[fieldId].thread;
                if (thread && thread.length > 0) {
                    const info = this.dataProcessor.getFieldInfo(fieldId);
                    activeThreads.push({
                        name: info.name,
                        thread: thread,
                        type: info.type
                    });
                }
            });

            if (activeThreads.length === 0) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text("Aucun échange commentaire/réponse enregistré.", 14, 40);
            } else {
                let yOffset = 40;

                activeThreads.forEach((item, index) => {
                    // Check page break
                    if (yOffset > pageHeight - 40) {
                        doc.addPage();
                        drawHeader("JOURNAL DES ÉCHANGES (Suite)");
                        yOffset = 40;
                    }

                    doc.setFontSize(11);
                    doc.setTextColor(...COLOR_ACCENT);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${item.name}`, 14, yOffset);
                    yOffset += 7;

                    const msgRows = item.thread.map(msg => [
                        `${msg.author === 'reviewer' ? 'Reviewer' : 'Auditeur'} (${formatDate(msg.date)})`,
                        msg.content
                    ]);

                    doc.autoTable({
                        startY: yOffset,
                        body: msgRows,
                        theme: 'plain',
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: {
                            0: { cellWidth: 40, fontStyle: 'bold', textColor: [100, 100, 100] },
                            1: { cellWidth: 'auto' }
                        },
                        didDrawPage: function (data) {
                            // Don't draw header
                        }
                    });

                    yOffset = doc.lastAutoTable.finalY + 10;
                });
            }
            drawFooter(3);

            // SAVE
            // Try to find COID for filename safely
            let safeCoid = "Draft";
            const foundCoid = findVal ? findVal(['coid']) : null;
            if (foundCoid) safeCoid = this.sanitizeFileName(foundCoid);
            else if (profile['COID']) safeCoid = this.sanitizeFileName(profile['COID']);

            const filename = `Rapport_Certification_${safeCoid}.pdf`;
            doc.save(filename);
            this.uiManager.showError(`✅ Export PDF réussi : ${filename}`, 3000); // Using showError for generic toast if nice toast not avail

        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.uiManager.showError('❌ Erreur export PDF : ' + error.message);
        }
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_');
    }

    getDateStamp() {
        return new Date().toISOString().split('T')[0].replace(/-/g, '');
    }

    downloadFile(data, filename) {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    importActionPlanExcel(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.uiManager.showLoading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellNF: true, cellText: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

                this.processExcelActionPlan(jsonData);

            } catch (error) {
                console.error('Error importing Excel:', error);
                this.uiManager.showError('❌ Erreur importation Excel : ' + error.message);
                this.uiManager.showLoading(false);
            } finally {
                event.target.value = null; // Reset input
            }
        };

        reader.onerror = (error) => {
            console.error('File reading error:', error);
            this.uiManager.showError('Erreur lors de la lecture du fichier');
            this.uiManager.showLoading(false);
            event.target.value = null;
        };

        reader.readAsArrayBuffer(file);
    }

    processExcelActionPlan(rows) {
        if (!rows || rows.length < 15) { // Need at least header row (12) + data rows
            console.warn("Fichier Excel court, tentative de lecture...");
        }

        console.log("🔍 Analyse du fichier Excel...");
        console.log("Nombre de lignes:", rows.length);

        let dataStartIndex = 13; // User said Row 14 (Index 13) is data. Row 12 (Index 11) is Header. 
        let colMapping = { num: 0, correction: 4, correctionDate: 6, evidence: 8, action: 9, actionDate: 11 };

        // Verification des headers à la ligne 11 (Row 12)
        const headerRowIndex = 11;
        const detectMapping = (row, mapping) => {
            row.forEach((cell, idx) => {
                const val = String(cell).trim(); // Keep case for strict check first

                // --- DETECTION STRICTE PAR CLÉS TECHNIQUES UNIQUEMENT ---
                if (val === 'requirementNo') mapping.num = idx;
                else if (val === 'correctionDescription') mapping.correction = idx;
                else if (val === 'correctionDueDate') mapping.correctionDate = idx;
                else if (val === 'correctionEvidence') mapping.evidence = idx;
                else if (val === 'correctiveActionDescription') mapping.action = idx;
                else if (val === 'correctiveActionDueDate') mapping.actionDate = idx;
            });
        };

        if (rows.length > headerRowIndex) {
            const headerRow = rows[headerRowIndex].map(c => String(c || '').toLowerCase().trim());
            console.log("Header candidat (Row 12):", headerRow);

            if (headerRow.some(h => h.includes('numéro') || h.includes('numero') || h.includes('requirementno'))) {
                console.log("✅ Header confirmé à la ligne 12.");
                detectMapping(headerRow, colMapping);
            } else {
                console.warn("⚠️ Header non trouvé à la ligne 12, utilisation des indices par défaut et détection auto.");
                // Fallback auto detection logic
                for (let i = 0; i < Math.min(rows.length, 25); i++) {
                    const row = rows[i].map(c => String(c || '').toLowerCase().trim());
                    if (row.some(h => h.includes('numéro') || h.includes('numero') || h.includes('requirementno'))) {
                        dataStartIndex = i + 1; // Start right after header
                        detectMapping(row, colMapping);
                        break;
                    }
                }
            }
        }

        console.log("📊 Mapping colonnes utilisé:", colMapping);
        console.log("🚀 Début lecture données ligne:", dataStartIndex + 1);

        let updatedCount = 0;
        const currentChecklist = [...this.state.get().checklistData]; // Shallow copy of array
        const numToUUID = {};

        currentChecklist.forEach(item => {
            if (item.requirementNumber) {
                numToUUID[item.requirementNumber] = item.uuid;
            }
        });

        for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            const numCell = row[colMapping.num];
            if (!numCell) continue;

            const num = String(numCell).replace(/[\r\n\t]/g, '').trim();
            const uuid = numToUUID[num];

            if (uuid) {
                let correctionText = row[colMapping.correction];
                let correctionDate = row[colMapping.correctionDate];
                let evidenceText = row[colMapping.evidence];
                let actionText = row[colMapping.action];
                let actionDate = row[colMapping.actionDate];

                // Helper ultra-simple : texte pur uniquement
                const clean = (val) => {
                    if (val === undefined || val === null) return '';
                    return String(val).trim();
                };

                correctionText = clean(correctionText);
                correctionDate = clean(correctionDate);
                evidenceText = clean(evidenceText);
                actionText = clean(actionText);
                actionDate = clean(actionDate);

                if (correctionText || actionText || evidenceText || correctionDate || actionDate) {
                    const itemIndex = currentChecklist.findIndex(item => item.uuid === uuid);
                    if (itemIndex !== -1) {
                        let modified = false;
                        const item = { ...currentChecklist[itemIndex] }; // Copy object to avoid direct mutation

                        if (correctionText.length > 2) { item.correction = correctionText; modified = true; }
                        if (correctionDate) { item.correctionDueDate = correctionDate; modified = true; } // Update Date

                        if (evidenceText.length > 2) { item.evidence = evidenceText; modified = true; }

                        if (actionText.length > 2) { item.correctiveAction = actionText; modified = true; }
                        if (actionDate) { item.correctiveActionDueDate = actionDate; modified = true; } // Update Date

                        if (modified) {
                            currentChecklist[itemIndex] = item;
                            updatedCount++;
                        }
                    }
                }
            }
        }

        if (updatedCount > 0) {
            this.state.setState({
                checklistData: currentChecklist,
                hasUnsavedChanges: true
            });
            this.uiManager.showSuccess(`✅ Plan d'Actions importé : ${updatedCount} exigences mises à jour.`);
            this.dataProcessor.renderChecklistTable();
            this.dataProcessor.renderNonConformitiesTable();
            this.uiManager.showResults(true); // Ensure results are visible
        } else {
            this.uiManager.showError("Aucune donnée valide n'a été importée. Vérifiez le format du fichier.");
            this.uiManager.showResults(true); // Restore visibility even if no updates
        }

        this.uiManager.showLoading(false);
    }

    exportActionPlanForSite() {
        const state = this.state.get();
        const conversations = state.conversations || {};
        const checklistData = state.checklistData || [];
        const companyProfileData = state.companyProfileData || {};

        // On cherche les conversations qui commencent par 'pa-' (Plan d'Actions)
        const paEntries = Object.entries(conversations).filter(([key, conv]) =>
            key.startsWith('pa-') && conv.thread && conv.thread.length > 0
        );

        if (paEntries.length === 0) {
            this.uiManager.showError("Aucune question sur le Plan d'Actions (canal spécifique) n'a été trouvée.");
            return;
        }

        const header = [
            "N° Exigence",
            "Score",
            "Constat (Audit)",
            "Échanges / Questions (Reviewer)",
            "Réponse Site (Correction)",
            "Preuves",
            "Action Corrective",
            "Statut"
        ];

        const rows = paEntries.map(([fieldId, conv]) => {
            const uuid = fieldId.replace('pa-', '');
            const item = checklistData.find(i => i.uuid === uuid);

            // On compile le fil de discussion pour l'affichage
            const discussion = conv.thread.map(m =>
                `[${m.author === 'reviewer' ? 'REVIEWER' : 'AUDITEUR'} ${new Date(m.date).toLocaleDateString()}] : ${m.content}`
            ).join('\n\n');

            return [
                item ? item.requirementNumber : '?',
                item ? item.score : '?',
                item ? (item.explanation || '-') : '-',
                discussion,
                item ? (item.correction || '') : '',
                item ? (item.evidence || '') : '',
                item ? (item.correctiveAction || '') : '',
                conv.status === 'resolved' ? 'VALIDÉ' : 'EN ATTENTE'
            ];
        });

        try {
            const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

            // Style de base pour les colonnes
            worksheet['!cols'] = [
                { width: 12 }, // N°
                { width: 8 },  // Score
                { width: 40 }, // Constat
                { width: 60 }, // Discussion
                { width: 30 }, // Correction
                { width: 30 }, // Preuves
                { width: 30 }, // AC
                { width: 15 }  // Statut
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Questions Plan Actions");

            // Nom de fichier propre
            const companyName = companyProfileData['Nom du site à auditer'] || 'Site';
            const coid = companyProfileData['N° COID du portail'] || 'COID';
            const dateStamp = this.getDateStamp();
            const filename = `QUESTIONS_PA_${this.sanitizeFileName(coid)}_${this.sanitizeFileName(companyName)}_${dateStamp}.xlsx`;

            XLSX.writeFile(workbook, filename);
            this.uiManager.showSuccess(`✅ Export réussi : ${filename}`);

        } catch (error) {
            console.error('Error exporting PA for site:', error);
            this.uiManager.showError("Erreur lors de l'exportation Excel : " + error.message);
        }
    }

    generateActionPlanPrintView() {
        const state = this.state.get();
        const conversations = state.conversations || {};
        const checklistData = state.checklistData || [];
        const profile = state.companyProfileData || {};

        const paEntries = Object.entries(conversations).filter(([key, conv]) =>
            key.startsWith('pa-') && conv.thread && conv.thread.length > 0
        );

        if (paEntries.length === 0) {
            this.uiManager.showError("Aucune question sur le Plan d'Actions n'a été trouvée.");
            return;
        }

        const siteName = profile['Nom du site à auditer'] || 'Site';
        const coid = profile['N° COID du portail'] || 'N/A';

        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Plan d'Actions - ${siteName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 40px auto; padding: 20px; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #1e3a8a; }
        .header p { margin: 5px 0; color: #64748b; font-weight: bold; }
        .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; page-break-inside: avoid; }
        .item-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
        .req-num { font-size: 1.25rem; font-weight: 800; color: #2563eb; }
        .score-badge { background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .section-title { font-size: 0.85rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 15px; margin-bottom: 5px; }
        .content-box { background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #cbd5e1; white-space: pre-wrap; margin-bottom: 10px; }
        .question-box { background: #fff7ed; padding: 15px; border-radius: 6px; border: 1px solid #ffedd5; border-left: 4px solid #f59e0b; margin-top: 20px; }
        .question-label { color: #c2410c; font-weight: 800; display: block; margin-bottom: 10px; font-size: 1.1rem; }
        .comment-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #fed7aa; }
        .comment-item:last-child { border-bottom: none; margin-bottom: 0; }
        .comment-meta { font-size: 0.75rem; color: #9a3412; font-weight: bold; }
        .no-print { margin-bottom: 20px; display: flex; gap: 10px; }
        button { padding: 10px 20px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 5px; font-weight: bold; }
        @media print { .no-print { display: none; } body { margin: 0; padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">Imprimer en PDF / Papier</button>
        <button onclick="window.close()" style="background: #64748b;">Fermer</button>
    </div>

    <div class="header">
        <h1>Questions sur le Plan d'Actions</h1>
        <p>Site : ${siteName} (COID: ${coid})</p>
        <p>Date : ${new Date().toLocaleDateString()}</p>
    </div>
`;

        paEntries.forEach(([fieldId, conv]) => {
            const uuid = fieldId.replace('pa-', '');
            const item = checklistData.find(i => i.uuid === uuid);
            if (!item) return;

            html += `
    <div class="item">
        <div class="item-header">
            <span class="req-num">Exigence ${item.requirementNumber}</span>
            <span class="score-badge">Score: ${item.score}</span>
        </div>

        <div class="section-title">Constat d'audit (Rappel)</div>
        <div class="content-box">${item.explanation || '-'}</div>

        <div class="section-title">Correction (saisie)</div>
        <div class="content-box">${item.correction || 'Non renseigné'}</div>

        <div class="section-title">Action Corrective (saisie)</div>
        <div class="content-box">${item.correctiveAction || 'Non renseigné'}</div>

        <div class="question-box">
            <span class="question-label">❓ QUESTION(S) DU REVIEWER :</span>
            ${conv.thread.map(m => `
                <div class="comment-item">
                    <div class="comment-meta">${m.author === 'reviewer' ? 'REVIEWER' : 'AUDITEUR'} - ${new Date(m.date).toLocaleString()}</div>
                    <div class="comment-content">${m.content}</div>
                </div>
            `).join('')}
        </div>
    </div>
`;
        });

        html += `
    <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
        Document généré le ${new Date().toLocaleString()} via IFS Review Tool
    </div>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
    }

    generateShortActionPlanPrintView() {
        const state = this.state.get();
        const conversations = state.conversations || {};
        const checklistData = state.checklistData || [];
        const profile = state.companyProfileData || {};

        const paEntries = Object.entries(conversations).filter(([key, conv]) =>
            key.startsWith('pa-') && conv.thread && conv.thread.length > 0
        );

        if (paEntries.length === 0) {
            this.uiManager.showError("Aucune question sur le Plan d'Actions n'a été trouvée.");
            return;
        }

        const siteName = profile['Nom du site à auditer'] || 'Site';

        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Liste Questions Reviewer - ${siteName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
        .no-print { margin-bottom: 20px; }
        h1 { font-size: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
        .q-item { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #f1f5f9; }
        .q-header { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
        .q-num { font-weight: 800; color: #2563eb; font-size: 1.1rem; }
        .q-score { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
        .q-text { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 10px 15px; font-style: italic; }
        .q-label { font-size: 0.75rem; text-transform: uppercase; color: #9a3412; font-weight: bold; margin-bottom: 4px; display: block; }
        button { padding: 8px 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 4px; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">Imprimer la liste</button>
    </div>
    <h1>Questions Reviewer - P.A. (Format court)</h1>
    <p style="margin-bottom: 30px;"><strong>Site :</strong> ${siteName}</p>
`;

        paEntries.forEach(([fieldId, conv]) => {
            const uuid = fieldId.replace('pa-', '');
            const item = checklistData.find(i => i.uuid === uuid);
            if (!item) return;

            // Only get the latest reviewer comment for the "ultra simple" view
            const reviewerComments = conv.thread.filter(m => m.author === 'reviewer');
            const lastQuestion = reviewerComments.length > 0 ? reviewerComments[reviewerComments.length - 1].content : "Voir fil de discussion";

            html += `
    <div class="q-item">
        <div class="q-header">
            <span class="q-num">Exigence ${item.requirementNumber}</span>
            <span class="q-score">Score: ${item.score}</span>
        </div>
        <div class="q-text">
            <span class="q-label">Question du Reviewer :</span>
            ${lastQuestion}
        </div>
    </div>
`;
        });

        html += `</body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
    }
}