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
        // Example: Update file handling based on new state
    }

    loadFile() {
        const fileInput = document.getElementById('fileInputInternal');
        if (fileInput) fileInput.click();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileName = file.name.toLowerCase();
        const isIFSFile = fileName.endsWith('.ifs');
        const isIFSRFile = fileName.endsWith('.ifsr');
        const isIFSPFile = fileName.endsWith('.ifsp');
        if (!isIFSFile && !isIFSRFile && !isIFSPFile) {
            this.uiManager.showError('❌ Type de fichier non supporté !\n\n✅ Formats acceptés :\n• .ifs (nouveau dossier depuis NEO)\n• .ifsr (travail en cours sauvegardé)\n• .ifsp (package collaboratif)');
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

    processNewIFSFile(data) {
        console.log('🎯 PROCESSING NEW IFS FILE');
        
        this.state.setState({
            auditData: data,
            checklistData: [],
            companyProfileData: {},
            conversations: {},
            requirementNumberMapping: {},
            packageVersion: 1,
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
        this.dataProcessor.processAuditDataLogic(food8);
    }

    loadWorkInProgress(workData) {
        console.log('📂 LOADING WORK IN PROGRESS');
        
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
            
            this.finalizeDataLoad();
            
        } catch (error) {
            console.error('Error loading work in progress:', error);
            this.uiManager.showError('Erreur lors du chargement : ' + error.message);
            this.uiManager.resetToUploadState();
        }
    }

    migrateConversationKeys(conversations) {
        const newConversations = { ...conversations };
        let keysChanged = false;
        for (const key in newConversations) {
            if (key.startsWith('nc-')) {
                const newKey = key.replace('nc-', 'req-');
                if (!newConversations[newKey]) { // Avoid overwriting if a req- key already exists
                    newConversations[newKey] = newConversations[key];
                    delete newConversations[key];
                    keysChanged = true;
                }
            }
        }
        if (keysChanged) {
            console.log('Migrated old conversation keys to new format.');
        }
        return newConversations;
    }

    loadCollaborativePackage(packageData) {
        console.log('📦 LOADING COLLABORATIVE PACKAGE');
        
        try {
            if (!packageData.version || !packageData.packageType) {
                throw new Error('Format de package IFSP invalide');
            }
            
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
            });
            
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
            
            this.finalizeDataLoad();
            
        } catch (error) {
            console.error('Error loading collaborative package:', error);
            this.uiManager.showError('Erreur lors du chargement du package : ' + error.message);
            this.uiManager.resetToUploadState();
        }
    }

    mergeConversations(newConversations) {
        const currentConversations = { ...this.state.get().conversations };
        for (const fieldId in newConversations) {
            if (!currentConversations[fieldId]) {
                currentConversations[fieldId] = newConversations[fieldId];
            } else {
                const existingIds = new Set(currentConversations[fieldId].thread.map(msg => msg.id));
                const newMessages = newConversations[fieldId].thread.filter(msg => !existingIds.has(msg.id));
                
                currentConversations[fieldId].thread = [...currentConversations[fieldId].thread, ...newMessages];
                currentConversations[fieldId].thread.sort((a, b) => new Date(a.date) - new Date(b.date));
                currentConversations[fieldId].lastActivity = newConversations[fieldId].lastActivity;
            }
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

    finalizeDataLoad() {
        this.uiManager.showLoading(false);
        this.uiManager.showResults(true);
        
        setTimeout(() => {
            this.dataProcessor.renderCompanyProfile();
            this.dataProcessor.renderChecklistTable();
            this.dataProcessor.renderNonConformitiesTable();
            this.dataProcessor.refreshAllCounters();
        }, 100);
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

    createPackage() {
        try {
            const companyName = this.state.get().companyProfileData['Nom du site à auditer'] || 'Société inconnue';
            const coid = this.state.get().companyProfileData['N° COID du portail'] || 'COID-XXXX';
            
            const packageType = this.state.get().currentMode === 'reviewer' ? 'REVIEWER_TO_AUDITOR' : 'AUDITOR_TO_REVIEWER';
            this.state.setState({ packageVersion: this.state.get().packageVersion + 1 });
            
            const packageData = {
                version: '2.0',
                packageType: packageType,
                packageVersion: this.state.get().packageVersion,
                createdBy: this.state.get().currentMode,
                createdDate: new Date().toISOString(),
                companyName,
                coid,
                
                auditData: this.state.get().auditData,
                checklistData: this.state.get().checklistData,
                companyProfileData: this.state.get().companyProfileData,
                requirementNumberMapping: this.state.get().requirementNumberMapping,
                
                conversations: this.state.get().conversations,
                
                metadata: {
                    totalFields: Object.keys(this.state.get().conversations).length,
                    totalComments: this.dataProcessor.getTotalCommentsCount(),
                    lastExchangeDate: new Date().toISOString()
                }
            };
            
            const filename = `PACKAGE_${packageType}_${coid}_${this.sanitizeFileName(companyName)}_v${this.state.get().packageVersion}_${this.getDateStamp()}.ifsp`;
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
        
        if (!description) {
            this.uiManager.showError('Veuillez décrire les modifications apportées');
            return;
        }
        
        const neoUpdateComment = {
            id: generateUUID(),
            author: 'auditor',
            content: `🔄 MISE À JOUR NEO: ${description}`,
            date: new Date().toISOString(),
            status: 'pending',
            isNeoUpdate: true,
            version: this.state.get().packageVersion
        };
        
        const profileFieldId = 'profile-nom-du-site-à-auditer';
        this.dataProcessor.addCommentToConversation(profileFieldId, neoUpdateComment);
        
        this.uiManager.showSuccess('🔄 Mise à jour NEO ajoutée au package');
        this.uiManager.closeNeoUpdateModal();
        this.dataProcessor.refreshAllCounters();
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
        const summary = [
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

    exportPDF() {
        if (!this.state.get().auditData) {
            this.uiManager.showError('Aucune donnée à exporter en PDF.');
            return;
        }
        
        try {
            this.uiManager.showError('🚧 Export PDF en cours de développement. Utilisez l\'export Excel pour le moment.');
            
            // TODO: Implémenter l'export PDF avec jsPDF
            // const { jsPDF } = window.jspdf;
            // const doc = new jsPDF();
            // ... logique d'export PDF
            
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
}