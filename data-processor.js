class DataProcessor {
    constructor(state, uiManager) {
        this.state = state;
        this.uiManager = uiManager;
        this.state.subscribe(this.onStateChange.bind(this));
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    onStateChange(newState) {
        // Handle state changes here if needed
        console.log('DataProcessor State changed:', newState);
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            // console.error(`Element with id ${elementId} not found`); // Suppress for now, many elements are dynamic
        }
    }

    processAuditDataLogic(food8) {
        console.log('🎯 PROCESSING NEW IFS FILE');
        
        const auditData = this.state.get().auditData;
        let checklistData = [];
        let companyProfileData = {};
        let conversations = {};
        let requirementNumberMapping = {};

        const matrixResult = food8.matrixResult;
        const overallResult = food8.result.overall;
        
        let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalNA = 0;
        matrixResult.forEach(item => {
            if (item.type === 'scoreCount') {
                switch(item.scoreId) {
                    case 'A': totalA += item.count; break;
                    case 'B': totalB += item.count; break;
                    case 'C': totalC += item.count; break;
                    case 'D': totalD += item.count; break;
                    case 'NA': totalNA += item.count; break;
                }
            }
        });
        
        const totalRequirements = totalA + totalB + totalC + totalD + totalNA;
        
        this.uiManager.updateElementText('totalRequirements', totalRequirements);
        this.uiManager.updateElementText('conformCount', totalA);
        this.uiManager.updateElementText('nonConformCount', totalB + totalC + totalD);
        this.uiManager.updateElementText('overallScore', overallResult.percent.toFixed(1) + '%');
        
        companyProfileData = this.extractCompanyProfile(food8.questions);
        this.processChecklistData(food8.checklists).then(processedChecklist => {
            checklistData = processedChecklist.checklistData;
            requirementNumberMapping = processedChecklist.requirementNumberMapping;

            const companyName = food8.questions.companyName?.answer || 'Société inconnue';
            const coid = food8.questions.companyCoid?.answer || 'COID-XXXX';
            
            this.state.setState({
                auditData: auditData,
                checklistData: checklistData,
                companyProfileData: companyProfileData,
                conversations: conversations,
                requirementNumberMapping: requirementNumberMapping,
                currentSession: { 
                    ...this.state.get().currentSession,
                    id: `IFS-${coid}-${new Date().getTime()}`,
                    name: `Audit ${companyName}`,
                    data: auditData
                }
            });

            this.uiManager.updateCurrentAuditName(`IFS Reviewer V2 - ${companyName}`);
            this.uiManager.updateSessionInfo(coid);
            
            this.uiManager.showSuccess(`✅ Nouveau dossier créé : ${companyName} (${totalRequirements} exigences)`);
            this.uiManager.finalizeDataLoad(); // Call uiManager to finalize
        }).catch(error => {
            console.error('Error processing checklist data:', error);
            this.uiManager.showError(`Erreur lors du traitement de la checklist : ${error.message}`);
            this.uiManager.resetToUploadState();
        });
    }

    extractCompanyProfile(questions) {
        if (!questions) {
            return {};
        }
        
        return {
            'Nom du site à auditer': questions.companyName?.answer || '',
            'N° COID du portail': questions.companyCoid?.answer || '',
            'Code GLN': questions.companyGln?.[0]?.rootQuestions?.companyGlnNumber?.answer || '',
            'Rue': questions.companyStreetNo?.answer || '',
            'Code postal': questions.companyZip?.answer || '',
            'Nom de la ville': questions.companyCity?.answer || '',
            'Pays': questions.companyCountry?.answer || '',
            'Téléphone': questions.companyTelephone?.answer || '',
            'Email': questions.companyEmail?.answer || '',
            'Latitude': questions.companyGpsLatitude?.answer || '',
            'Longitude': questions.companyGpsLongitude?.answer || '',
            'Nom du siège social': questions.headquartersName?.answer || '',
            'Rue (siège social)': questions.headquartersStreetNo?.answer || '',
            'Nom de la ville (siège social)': questions.headquartersCity?.answer || '',
            'Code postal (siège social)': questions.headquartersZip?.answer || '',
            'Pays (siège social)': questions.headquartersCountry?.answer || '',
            'Téléphone (siège social)': questions.headquartersTelephone?.answer || '',
            'Surface couverte de l\'entreprise (m²)': questions.productionAreaSize?.answer || '',
            'Nombre de bâtiments': questions.numberOfBuildings?.answer || '',
            'Nombre de lignes de production': questions.numberOfProductionLines?.answer || '',
            'Nombre d\'étages': questions.numberOfFloors?.answer || '',
            'Nombre maximum d\'employés dans l\'année, au pic de production': questions.numberOfEmployeesForTimeCalculation?.answer || '',
            'Commentaires employés': questions.numberOfEmployeesDescription?.answer || '',
            'Structures décentralisées': questions.companyStructureDecentralisedDescription?.answer || '',
            'Fonctions centralisées': questions.companyStructureMultiLocationProductionDescription?.answer || '',
            'Langue parlée et écrite sur le site': questions.workingLanguage?.answer || '',
            'Langue du système qualité': questions.qmsLanguage?.answer?.[0] || '',
            'Audit scope EN': questions.scopeCertificateScopeDescription_en?.answer || '',
            'Périmètre de l\'audit FR': questions.scopeAuditScopeDescription?.answer || '',
            'Process et activités': questions.scopeProductGroupsDescription?.answer || '',
            'Activité saisonnière ? (O/N)': questions.seasonalProduction?.answer || '',
            'Une partie du procédé de fabrication est-elle sous traitée? (OUI/NON)': questions.partlyOutsourcedProcesses?.answer || '',
            'Si oui lister les procédés sous-traités': questions.partlyOutsourcedProcessesDescription?.answer || '',
            'Avez-vous des produits totalement sous-traités? (OUI/NON)': questions.fullyOutsourcedProducts?.answer || '',
            'Si oui, lister les produits totalement sous-traités': questions.fullyOutsourcedProductsDescription?.answer || '',
            'Avez-vous des produits de négoce? (OUI/NON)': questions.tradedProductsBrokerActivity?.answer || '',
            'Si oui, lister les produits de négoce': questions.tradedProductsBrokerActivityDescription?.answer || ''
        };
    }

    async processChecklistData(checklists) {
        if (!checklists?.checklistFood8?.resultScorings) {
            return { checklistData: [], requirementNumberMapping: {} };
        }
        
        const resultScorings = checklists.checklistFood8.resultScorings;
        console.log('🎯 MAPPING UUID → NUMÉROS IFS OFFICIELS');
        console.log(`📊 ${Object.keys(resultScorings).length} UUIDs détectés`);
        
        try {
            const response = await fetch('https://raw.githubusercontent.com/M00N69/Gemini-Knowledge/refs/heads/main/IFSV8listUUID.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            console.log('✅ CSV chargé depuis GitHub');
            
            const uuidToInfo = this.validateAndProcessCSV(csvText);
            const ifsUUIDs = Object.keys(resultScorings);
            const matchedUUIDs = ifsUUIDs.filter(uuid => uuidToInfo[uuid]);
            const unmatchedUUIDs = ifsUUIDs.filter(uuid => !uuidToInfo[uuid]);
            
            console.log(`✅ UUIDs MATCHÉS : ${matchedUUIDs.length}/${ifsUUIDs.length} (${((matchedUUIDs.length/ifsUUIDs.length)*100).toFixed(1)}%)`);
            
            if (unmatchedUUIDs.length > 0) {
                console.error(`❌ ${unmatchedUUIDs.length} UUID(s) non mappé(s)`);
                const errorMessage = `❌ MAPPING INCOMPLET : ${unmatchedUUIDs.length} exigence(s) non mappée(s) sur ${ifsUUIDs.length}`;
                this.uiManager.showError(errorMessage);
                this.uiManager.resetToUploadState();
                return { checklistData: [], requirementNumberMapping: {} };
            }
            
            console.log(`🎯 MAPPING RÉUSSI À 100% : ${matchedUUIDs.length}/${ifsUUIDs.length} exigences`);
            
            const tempData = [];
            for (const uuid in resultScorings) {
                const scoring = resultScorings[uuid];
                const mappedInfo = uuidToInfo[uuid];
                
                tempData.push({
                    uuid,
                    requirementNumber: mappedInfo.num,
                    chapter: mappedInfo.chapitre,
                    theme: mappedInfo.theme,
                    sstheme: mappedInfo.sstheme,
                    scoring
                });
            }
            
            tempData.sort((a, b) => {
                if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                
                const aParts = a.requirementNumber.split('.').map(n => parseInt(n) || 0);
                const bParts = b.requirementNumber.split('.').map(n => parseInt(n) || 0);
                
                for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    const aVal = aParts[i] || 0;
                    const bVal = bParts[i] || 0;
                    if (aVal !== bVal) return aVal - bVal;
                }
                return 0;
            });
            
            let newChecklistData = [];
            let newRequirementNumberMapping = {};
            tempData.forEach(item => {
                newRequirementNumberMapping[item.uuid] = item.requirementNumber;
                
                newChecklistData.push({
                    uuid: item.uuid,
                    requirementNumber: item.requirementNumber,
                    chapter: item.chapter,
                    theme: item.theme,
                    sstheme: item.sstheme,
                    score: item.scoring.score?.label || 'N/D',
                    scoreValue: item.scoring.score?.value,
                    explanation: item.scoring.answers?.explanationText || '',
                    detailedExplanation: item.scoring.answers?.englishExplanationText || '',
                    needsCorrection: item.scoring.isCorrectionRequired || false
                });
            });
            
            console.log(`✅ ${newChecklistData.length} exigences traitées avec mapping UUID complet`);
            return { checklistData: newChecklistData, requirementNumberMapping: newRequirementNumberMapping };
            
        } catch (error) {
            console.error('❌ ERREUR CRITIQUE lors du chargement du CSV de mapping:', error);
            const errorMessage = `❌ ERREUR DE CHARGEMENT CSV\n\nImpossible de charger le CSV de mapping des exigences IFS.`;
            this.uiManager.showError(errorMessage);
            this.uiManager.resetToUploadState();
            return { checklistData: [], requirementNumberMapping: {} };
        }
    }

    validateAndProcessCSV(csvText) {
        const rows = this.parseCSVWithMultilineSupport(csvText);
        
        if (rows.length < 2) {
            throw new Error('CSV doit contenir au moins un header et une ligne de données');
        }
        
        const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
        const requiredColumns = ['UUID', 'Num', 'Chapitre', 'Theme', 'SSTheme'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            throw new Error(`Colonnes requises manquantes dans le CSV: ${missingColumns.join(', ')}`);
        }
        
        const columnIndices = {
            uuid: headers.indexOf('UUID'),
            num: headers.indexOf('Num'),
            chapitre: headers.indexOf('Chapitre'),
            theme: headers.indexOf('Theme'),
            sstheme: headers.indexOf('SSTheme')
        };
        
        const validMappings = {};
        
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length === 0 || cols.every(col => !col.trim())) continue;
            
            const uuid = cols[columnIndices.uuid]?.trim();
            let num = cols[columnIndices.num]?.trim();
            const chapitre = cols[columnIndices.chapitre]?.trim();
            const theme = cols[columnIndices.theme]?.trim();
            const sstheme = cols[columnIndices.sstheme]?.trim();
            
            if (!uuid || uuid.length < 10 || !num) continue;
            
            num = num.replace(/[\r\n]/g, ' ')
                    .replace(/\s*(KO|NEW|\*)\s*/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            
            if (!num) continue;
            
            let chapitreNum;
            if (chapitre && chapitre.includes('-')) {
                chapitreNum = parseInt(chapitre.split('-')[0]);
            } else {
                chapitreNum = parseInt(chapitre);
            }
            
            if (isNaN(chapitreNum) || chapitreNum < 1 || chapitreNum > 5) continue;
            if (validMappings[uuid]) continue;
            
            validMappings[uuid] = {
                num: num,
                chapitre: chapitreNum,
                theme: theme || 'N/A',
                sstheme: sstheme || 'N/A'
            };
        }
        
        return validMappings;
    }

    parseCSVWithMultilineSupport(csvText) {
        const lines = csvText.split('\n');
        const result = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            let j = 0;
            
            while (j < line.length) {
                const char = line[j];
                const nextChar = line[j + 1];
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        currentField += '"';
                        j += 2;
                        continue;
                    }
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
                j++;
            }
            
            if (inQuotes) {
                currentField += '\n';
            } else {
                currentRow.push(currentField.trim());
                result.push(currentRow);
                currentRow = [];
                currentField = '';
            }
            i++;
        }
        
        if (currentRow.length > 0 || currentField) {
            currentRow.push(currentField.trim());
            result.push(currentRow);
        }
        
        return result;
    }

    renderCompanyProfile() {
        const container = document.getElementById('companyProfileTable');
        if (!container) return;
        
        const companyProfileData = this.state.get().companyProfileData;
        const conversations = this.state.get().conversations;

        if (!companyProfileData || Object.keys(companyProfileData).length === 0) {
            container.innerHTML = '<p class="text-center p-10 text-gray-500">Aucune donnée de profil. Chargez un fichier.</p>';
            return;
        }
        
        const categories = {
            'Informations générales': ['Nom du site à auditer', 'N° COID du portail', 'Code GLN'],
            'Adresse du site': ['Rue', 'Code postal', 'Nom de la ville', 'Pays', 'Téléphone', 'Email', 'Latitude', 'Longitude'],
            'Siège social': ['Nom du siège social', 'Rue (siège social)', 'Nom de la ville (siège social)', 'Code postal (siège social)', 'Pays (siège social)', 'Téléphone (siège social)'],
            'Informations techniques': ['Surface couverte de l\'entreprise (m²)', 'Nombre de bâtiments', 'Nombre de lignes de production', 'Nombre d\'étages', 'Nombre maximum d\'employés dans l\'année, au pic de production', 'Commentaires employés'],
            'Structure organisationnelle': ['Structures décentralisées', 'Fonctions centralisées'],
            'Langues': ['Langue parlée et écrite sur le site', 'Langue du système qualité'],
            'Périmètres d\'audit': ['Audit scope EN', 'Périmètre de l\'audit FR', 'Process et activités'],
            'Activités spécifiques': ['Activité saisonnière ? (O/N)', 'Une partie du procédé de fabrication est-elle sous traitée? (OUI/NON)', 'Si oui lister les procédés sous-traités', 'Avez-vous des produits totalement sous-traités? (OUI/NON)', 'Si oui, lister les produits totalement sous-traités', 'Avez-vous des produits de négoce? (OUI/NON)', 'Si oui, lister les produits de négoce'],
            'Exclusions': ['Produits à exclure du champ d\'audit (OUI/NON)', 'Préciser les produits à exclure']
        };
        
        let html = '';
        Object.entries(categories).forEach(([categoryName, fields]) => {
            html += `<div class="category-header">${categoryName}</div>
                     <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Information</th><th>Valeur</th><th>Commentaires</th></tr></thead>
                            <tbody>`;
            
            fields.forEach(field => {
                if (companyProfileData.hasOwnProperty(field)) {
                    const value = companyProfileData[field];
                    const fieldId = `profile-${this.sanitizeFieldId(field)}`;
                    const conversation = conversations[fieldId];
                    const commentStatus = this.getConversationStatus(conversation);
                    const commentCount = conversation?.thread?.length || 0;
                    
                    const isLongText = ['Périmètre de l\'audit FR', 'Audit scope EN', 'Process et activités'].includes(field);
                    const displayValue = isLongText && value && value.length > 100 ? 
                        `<div class="field-display">${value || 'N/A'}</div>` : 
                        `<span>${value || 'N/A'}</span>`;
                    
                    html += `<tr class="table-row-clickable" data-field-id="${fieldId}" onclick="openCommentModal(this)">
                                <td class="font-medium">${field}</td>
                                <td>${displayValue}</td>
                                <td class="comment-status-cell">
                                    <div class="comment-indicators">
                                        ${commentCount > 0 ? `<span class="comment-count-badge">${commentCount}</span>` : ''}
                                        <span class="status-indicator ${commentStatus}"></span>
                                        <button class="quick-comment-btn" onclick="event.stopPropagation(); openCommentModal(this.closest('tr'))">
                                            <i class="fas fa-comment"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>`;
                }
            });
            html += `</tbody></table></div>`;
        });
        
        container.innerHTML = html;
    }

    renderChecklistTable() {
        const tbody = document.getElementById('checklistTableBody');
        if (!tbody) return;
        
        const checklistData = this.state.get().checklistData;
        const conversations = this.state.get().conversations;

        if (!checklistData || checklistData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-10">Aucune donnée de checklist.</td></tr>';
            return;
        }
        
        let html = '';
        checklistData.forEach(item => {
            const fieldId = `req-${item.uuid}`;
            const conversation = conversations[fieldId];
            const commentStatus = this.getConversationStatus(conversation);
            const commentCount = conversation?.thread?.length || 0;
            
            html += `<tr class="table-row-clickable" data-field-id="${fieldId}" data-chapter="${item.chapter}" data-score="${item.score}" data-comment-status="${commentStatus}" onclick="openCommentModal(this)">
                        <td class="font-medium">${item.requirementNumber}</td>
                        <td><span class="score-badge score-${item.score}">${item.score}</span></td>
                        <td class="max-w-xs">${item.explanation || ''}</td>
                        <td class="max-w-xs">${item.detailedExplanation || ''}</td>
                        <td class="comment-status-cell">
                            <div class="comment-indicators">
                                ${commentCount > 0 ? `<span class="comment-count-badge">${commentCount}</span>` : ''}
                                <span class="status-indicator ${commentStatus}"></span>
                                <button class="quick-comment-btn" onclick="event.stopPropagation(); openCommentModal(this.closest('tr'))">
                                    <i class="fas fa-comment"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
        });
        
        tbody.innerHTML = html;
        this.setupTableFilters();
    }

    renderNonConformitiesTable() {
        const tbody = document.getElementById('nonConformitiesTableBody');
        if (!tbody) return;
        
        const checklistData = this.state.get().checklistData;
        const conversations = this.state.get().conversations;

        if (!checklistData || checklistData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-10">Aucune donnée de NC/NA.</td></tr>';
            return;
        }
        
        const nonConformItems = checklistData.filter(item => ['B', 'C', 'D', 'NA'].includes(item.score));
        
        if (nonConformItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-10 text-green-500">🎉 Aucune NC/NA trouvée !</td></tr>';
            return;
        }
        
        let html = '';
        nonConformItems.forEach(item => {
            const fieldId = `nc-${item.uuid}`;
            const conversation = conversations[fieldId];
            const commentStatus = this.getConversationStatus(conversation);
            const commentCount = conversation?.thread?.length || 0;
            
            html += `<tr class="table-row-clickable" data-field-id="${fieldId}" data-chapter="${item.chapter}" data-score="${item.score}" data-comment-status="${commentStatus}" onclick="openCommentModal(this)">
                        <td class="font-medium">${item.requirementNumber}</td>
                        <td><span class="score-badge score-${item.score}">${item.score}</span></td>
                        <td class="whitespace-pre-wrap max-w-xs">${item.explanation || '-'}</td>
                        <td class="whitespace-pre-wrap max-w-xs">${item.detailedExplanation || '-'}</td>
                        <td class="comment-status-cell">
                            <div class="comment-indicators">
                                ${commentCount > 0 ? `<span class="comment-count-badge">${commentCount}</span>` : ''}
                                <span class="status-indicator ${commentStatus}"></span>
                                <button class="quick-comment-btn" onclick="event.stopPropagation(); openCommentModal(this.closest('tr'))">
                                    <i class="fas fa-comment"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
        });
        
        tbody.innerHTML = html;
        this.updateNonConformitiesStats();
    }

    getFieldInfo(fieldId) {
        const companyProfileData = this.state.get().companyProfileData;
        const checklistData = this.state.get().checklistData;

        if (fieldId.startsWith('profile-')) {
            const fieldName = this.unsanitizeFieldId(fieldId.replace('profile-', ''));
            return {
                name: fieldName,
                content: companyProfileData[fieldName] || 'N/A',
                type: 'profile'
            };
        } else if (fieldId.startsWith('req-') || fieldId.startsWith('nc-')) {
            const uuid = fieldId.replace(/^(req-|nc-)/, '');
            const item = checklistData.find(r => r.uuid === uuid);
            if (item) {
                return {
                    name: `Exigence ${item.requirementNumber}`,
                    content: `<strong>Score:</strong> ${item.score}<br><strong>Explication:</strong> ${item.explanation || 'N/A'}<br><strong>Détail:</strong> ${item.detailedExplanation || 'N/A'}`,
                    type: 'requirement'
                };
            }
        }
        
        return {
            name: 'Champ inconnu',
            content: 'Contenu non disponible',
            type: 'unknown'
        };
    }

    addCommentToConversation(fieldId, comment) {
        const currentConversations = this.state.get().conversations;
        const oldConversation = currentConversations[fieldId];

        // Create a new thread with the new comment and update statuses immutably.
        const newThreadWithComment = oldConversation ? [...oldConversation.thread, comment] : [comment];
        const updatedThread = newThreadWithComment.map((msg, index) => {
            if (index < newThreadWithComment.length - 1 && msg.status === 'pending') {
                return { ...msg, status: 'read' };
            }
            return msg;
        });

        // Create new history array, safely handling cases where history might not exist.
        const newHistory = oldConversation?.history ? [...oldConversation.history] : [];
        if (!oldConversation) {
            newHistory.push({
                type: 'conversation_created',
                date: new Date().toISOString(),
                actor: comment.author,
                details: 'Conversation initiée'
            });
        }
        newHistory.push({
            type: 'comment_added',
            date: comment.date,
            actor: comment.author,
            details: `Commentaire ajouté par ${comment.author}`
        });

        const newConversation = {
            ...(oldConversation || {}),
            thread: updatedThread,
            lastActivity: comment.date,
            status: oldConversation?.status === 'resolved' ? 'active' : (oldConversation?.status || 'active'),
            priority: oldConversation?.priority || 'normal',
            history: newHistory
        };

        const newConversations = {
            ...currentConversations,
            [fieldId]: newConversation
        };

        this.state.setState({ conversations: newConversations });
    }

    getConversationStatus(conversation) {
        if (!conversation || !conversation.thread || conversation.thread.length === 0) {
            return 'none';
        }

        if (conversation.status === 'resolved') {
            return 'resolved';
        }

        const lastMessage = conversation.thread[conversation.thread.length - 1];
        const currentUser = this.state.get().currentMode;

        if (lastMessage.author !== currentUser) {
            return 'pending';
        }

        return 'read';
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'read': 'Lu',
            'resolved': 'Résolu',
            'none': 'Aucun'
        };
        return labels[status] || status;
    }

    addHistoryEntry(fieldId, type, actor, details) {
        const conversations = { ...this.state.get().conversations };
        if (conversations[fieldId]) {
            conversations[fieldId].history.push({
                type,
                date: new Date().toISOString(),
                actor,
                details
            });
            conversations[fieldId].lastActivity = new Date().toISOString();
            this.state.setState({ conversations });
        }
    }

    sanitizeFieldId(fieldName) {
        return fieldName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    }

    unsanitizeFieldId(fieldId) {
        const mapping = {
            'nom-du-site-à-auditer': 'Nom du site à auditer',
            'n-coid-du-portail': 'N° COID du portail',
        };
        return mapping[fieldId] || fieldId.replace(/-/g, ' ');
    }

    getCommentsText(fieldId) {
        const conversation = this.state.get().conversations[fieldId];
        if (!conversation || !conversation.thread.length) return '-';
        
        return conversation.thread.map(comment => 
            `[${comment.author}] ${comment.content}`
        ).join(' | ');
    }

    refreshAllCounters() {
        this.refreshCountersForTab('profil');
        this.refreshCountersForTab('checklist');
        this.refreshCountersForTab('nonconformites');
        this.updateProgressStats();
    }

    refreshCountersForTab(tabId) {
        let pending = 0, resolved = 0, total = 0;
        const conversations = this.state.get().conversations;
        
        Object.values(conversations).forEach(conversation => {
            if (!conversation || !conversation.thread || conversation.thread.length === 0) return;
            
            const fieldId = Object.keys(conversations).find(key => conversations[key] === conversation);
            const isTabRelevant = this.isFieldRelevantForTab(fieldId, tabId);
            
            if (!isTabRelevant) return;
            
            total++;
            const status = this.getConversationStatus(conversation);
            
            if (status === 'resolved') {
                resolved++;
            } else if (status === 'pending') {
                pending++;
            }
        });
        
        this.updateElementText(`${tabId}PendingCount`, pending);
        this.updateElementText(`${tabId}ResolvedCount`, resolved);
        this.updateElementText(`${tabId}TotalCount`, total);
        
        this.updateElementText(`${tabId}CommentCounter`, total > 0 ? total : '');
    }

    isFieldRelevantForTab(fieldId, tabId) {
        switch (tabId) {
            case 'profil':
                return fieldId.startsWith('profile-');
            case 'checklist':
                return fieldId.startsWith('req-');
            case 'nonconformites':
                return fieldId.startsWith('nc-');
            default:
                return false;
        }
    }

    updateProgressStats() {
        const totalComments = this.getTotalCommentsCount();
        this.updateElementText('commentsCount', totalComments);
        
        const progressPercentage = this.calculateProgressPercentage();
        this.updateElementText('progressPercentage', progressPercentage + '%');
    }

    updateNonConformitiesStats() {
        const checklistData = this.state.get().checklistData;
        const conversations = this.state.get().conversations;

        if (!checklistData) return;
        
        const ncNaItems = checklistData.filter(i => ['B', 'C', 'D', 'NA'].includes(i.score));
        
        this.updateElementText('totalNC', ncNaItems.length);
        this.updateElementText('scoreB', checklistData.filter(i => i.score === 'B').length);
        this.updateElementText('scoreC', checklistData.filter(i => i.score === 'C').length);
        this.updateElementText('scoreD', checklistData.filter(i => i.score === 'D').length);
        this.updateElementText('naCount', checklistData.filter(i => i.score === 'NA').length);
        
        const ncComments = ncNaItems.filter(item => {
            const fieldId = `nc-${item.uuid}`;
            return conversations[fieldId]?.thread?.length > 0;
        }).length;
        
        this.updateElementText('commentsNCCount', ncComments);
    }

    getTotalCommentsCount() {
        const conversations = this.state.get().conversations;
        return Object.keys(conversations).filter(key => 
            conversations[key]?.thread?.length > 0
        ).length;
    }

    calculateProgressPercentage() {
        const companyProfileData = this.state.get().companyProfileData;
        const checklistData = this.state.get().checklistData;

        const totalFields = Object.keys(companyProfileData).length + checklistData.length;
        const fieldsWithComments = this.getTotalCommentsCount();
        return totalFields > 0 ? Math.round((fieldsWithComments / totalFields) * 100) : 0;
    }

    setupTableFilters() {
        const filterChecklistDebounced = debounce(() => this.filterChecklist(), 300);
        const filterNonConformitiesDebounced = debounce(() => this.filterNonConformities(), 300);

        ['chapterFilter', 'scoreFilter', 'commentStatusFilter', 'searchInput'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = id === 'searchInput' ? 'keyup' : 'change';
                element.removeEventListener(eventType, filterChecklistDebounced);
                element.addEventListener(eventType, filterChecklistDebounced);
            }
        });
        
        ['ncTypeFilter', 'ncChapterFilter', 'correctionFilter', 'ncSearchInput'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = id === 'ncSearchInput' ? 'keyup' : 'change';
                element.removeEventListener(eventType, filterNonConformitiesDebounced);
                element.addEventListener(eventType, filterNonConformitiesDebounced);
            }
        });
        
        window.showAll = () => this.showAll();
        window.showOnlyWithComments = () => this.showOnlyWithComments();
    }

    filterChecklist() {
        const chapter = document.getElementById('chapterFilter')?.value;
        const score = document.getElementById('scoreFilter')?.value;
        const commentStatus = document.getElementById('commentStatusFilter')?.value;
        const search = document.getElementById('searchInput')?.value.toLowerCase();
        
        const rows = document.querySelectorAll('#checklistTableBody tr');
        
        rows.forEach(row => {
            if (row.cells.length <= 1) return; 
            
            let show = true;
            
            if (chapter && row.dataset.chapter !== chapter) show = false;
            if (score && row.dataset.score !== score) show = false;
            if (commentStatus && commentStatus !== '' && row.dataset.commentStatus !== commentStatus) show = false;
            if (search && !row.textContent.toLowerCase().includes(search)) show = false;
            
            row.style.display = show ? '' : 'none';
        });
    }

    filterNonConformities() {
        const type = document.getElementById('ncTypeFilter')?.value;
        const chapter = document.getElementById('ncChapterFilter')?.value;
        const correction = document.getElementById('correctionFilter')?.value;
        const search = document.getElementById('ncSearchInput')?.value.toLowerCase();
        
        const rows = document.querySelectorAll('#nonConformitiesTableBody tr');
        
        rows.forEach(row => {
            if (row.cells.length <= 1) return; 
            
            let show = true;
            
            if (type) {
                const scores = type.split(',');
                if (!scores.includes(row.dataset.score)) show = false;
            }
            if (chapter && row.dataset.chapter !== chapter) show = false;
            if (correction) {
                const hasComments = row.dataset.commentStatus !== 'none';
                if (correction === 'with' && !hasComments) show = false;
                if (correction === 'without' && hasComments) show = false;
                if (correction === 'pending' && row.dataset.commentStatus !== 'pending') show = false;
            }
            if (search && !row.textContent.toLowerCase().includes(search)) show = false;
            
            row.style.display = show ? '' : 'none';
        });
    }

    showAll() {
        const filters = ['chapterFilter', 'scoreFilter', 'commentStatusFilter', 'searchInput'];
        filters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        this.filterChecklist();
    }

    showOnlyWithComments() {
        const commentStatusFilter = document.getElementById('commentStatusFilter');
        if (commentStatusFilter) {
            commentStatusFilter.value = 'pending';
        }
        this.filterChecklist();
    }
}
