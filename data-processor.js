class DataProcessor {
    constructor(state, uiManager) {
        this.state = state;
        this.uiManager = uiManager;
        this.state.subscribe(this.onStateChange.bind(this));
    }

    static REVIEW_CHECKLIST_STRUCTURE = {
        "1_documents_et_dossier": {
            "titre": "Réception et complétude des documents",
            "items": [
                { "id": "doc_001", "nom": "Mandat d'audit" },
                { "id": "doc_002", "nom": "Plan d'audit" },
                { "id": "doc_003", "nom": "Bilan de clôture" },
                { "id": "doc_004", "nom": "Éléments obligatoires complétés" },
                { "id": "doc_005", "nom": "Synthèse" },
                { "id": "doc_006", "nom": "Rapport AXP" },
                { "id": "doc_007", "nom": "Plan d'actions complété" },
                { "id": "doc_008", "nom": "Preuves de correction" },
                { "id": "doc_009", "nom": "Notes d'audit" }
            ]
        },
        "2_audits_a_distance": {
            "titre": "Spécificités audits à distance",
            "sous_titres": "Applicable pour : audits IFS Broker à distance + audits siège à distance",
            "items": [
                { "id": "dist_001", "nom": "Captures d'écran début d'audit", "description": "Participants, date et heure visibles" },
                { "id": "dist_002", "nom": "Captures d'écran fin d'audit", "description": "Participants, date et heure visibles" },
                { "id": "dist_003", "nom": "Enregistrement historique de conservation", "description": "Si applicable selon l'outil utilisé" },
                { "id": "dist_004", "nom": "Preuve test de connexion", "description": "Capture d'écran + date/résultat complétés dans le mandat" },
                { "id": "dist_005", "nom": "Analyse de risques CRO", "description": "Complétée par le Coordinateur Responsable de l'Organisme" }
            ]
        },
        "3_coherence_durees": {
            "titre": "Cohérence des durées d'audit",
            "items": [
                { "id": "dur_001", "nom": "Cohérence mandat ↔ plan d'audit", "description": "Durée identique entre les deux documents" },
                { "id": "dur_002", "nom": "Cohérence mandat ↔ synthèse", "description": "Durée mandat = durée réellement passée (synthèse)" },
                { "id": "dur_003", "nom": "Cohérence rapport ↔ calculateur IFS", "description": "Joindre l'outil de calcul", "justification": "" },
                { "id": "dur_004", "nom": "Temps passé en usine", "description": "Temps effectif en site ou justification documentée", "justification": "" }
            ]
        },
        "4_statut_rapport": {
            "titre": "Statut et complétude du rapport",
            "items": [
                { "id": "rap_001", "nom": "Version du rapport", "description": "Statut 'non périmé' et version finalisée" },
                { "id": "rap_002", "nom": "Données manquantes", "description": "Absence de données manquantes (sauf nom/prénom CDO et date décision à compléter)", "exceptions": ["CDO nom/prénom", "Date de décision"] }
            ]
        },
        "5_donnees_entreprise": {
            "titre": "Informations de l'entreprise - Profil",
            "items": [
                { "id": "prof_001", "nom": "Nombre maximum d'employés", "description": "Au pic de l'activité" },
                { "id": "prof_002", "nom": "Surface totale du site", "description": "Production + stockage (m²)" },
                { "id": "prof_003", "nom": "Activité saisonnière", "description": "Renseignée si applicable" },
                { "id": "prof_004", "nom": "Produits totalement sous-traités", "description": "Nom entreprise, localisation, certification IFS, COID si applicable" },
                { "id": "prof_005", "nom": "Produits de négoce", "description": "Nom entreprise, localisation, certification IFS, COID si applicable" },
                { "id": "prof_006", "nom": "Procédés partiellement sous-traités", "description": "Nom entreprise, localisation, certification IFS, COID si applicable" },
                { "id": "prof_007", "nom": "Usage du logo IFS", "description": "Conforme à la réglementation" }
            ]
        },
        "6_donnees_audit": {
            "titre": "Données de l'audit / Évaluation",
            "items": [
                { "id": "eval_001", "nom": "Produits et procédés audités", "description": "Liste des produits et procédés vus lors de l'audit sur site" },
                { "id": "eval_002", "nom": "Option d'audit", "description": "Annoncée ou non annoncée" },
                { "id": "eval_003", "nom": "Certification IFS précédente", "description": "Date et fin de validité du certificat antérieur" },
                { "id": "eval_004", "nom": "Personne en charge de la revue", "description": "Identifiée et documentée" },
                { "id": "eval_005", "nom": "Horaires d'audit", "description": "Sans les pauses + justification en cas de dépassement/réduction", "justification": "" },
                { "id": "eval_006", "nom": "Auditeurs et participants", "description": "Direction, RQ, traducteur et observateur éventuels (optionnel hors Direction/RQ)" }
            ]
        },
        "7_secteurs_scope": {
            "titre": "Secteurs / Scope Data",
            "items": [
                { "id": "scope_001", "nom": "Description complète des procédés", "description": "Vue complète + secteurs technologiques" },
                { "id": "scope_002", "nom": "Périmètre d'audit", "description": "Libellé + traduction anglaise" },
                { "id": "scope_003", "nom": "Exclusions", "description": "Documentées pour le certificat avec justification dans 'informations additionnelles'" },
                { "id": "scope_004", "nom": "Outils calcul durée", "description": "Secteurs technologiques sélectionnés pour chaque secteur produit" },
                { "id": "scope_005", "nom": "Sous-catégories de produits", "description": "Exhaustivité et conformité vérifiées" }
            ]
        },
        "8_audits_multisites": {
            "titre": "Organisation de l'audit en multi-sites",
            "items": [
                { "id": "multi_001", "nom": "Plan d'audit adapté", "description": "Identification des chapitres audités une seule fois pour tous les sites" },
                { "id": "multi_002", "nom": "Description des autres sites", "description": "Nom, localisation, statut certification IFS, COID si applicable" },
                { "id": "multi_003", "nom": "Organisation audit multisites", "description": "Activités communes auditées une fois + services centraux (date/lieu)" },
                { "id": "multi_004", "nom": "Répercution écarts siège", "description": "Plan d'actions et rapport complétés" },
                { "id": "multi_005", "nom": "Onglet multisites synthèse", "description": "Cas des audits multi-sites complété" }
            ]
        },
        "9_pertinence_deviations": {
            "titre": "Pertinence des déviations",
            "items": [
                { "id": "dev_001", "nom": "Justification des déviations", "description": "Notes et justification documentées" },
                { "id": "dev_002", "nom": "Suivi actions correctives précédentes", "description": "Suivi des NC/déviations de l'audit antérieur" }
            ]
        },
        "10_plan_actions": {
            "titre": "Plan d'actions",
            "items": [
                { "id": "pa_001", "nom": "Pertinence corrections", "description": "Actions correctives proposées par l'entreprise pertinentes et efficaces" },
                { "id": "pa_002", "nom": "Délais corrections", "description": "Antérieurs à envoi PA à OC ou certification du dossier" },
                { "id": "pa_003", "nom": "Délais actions correctives", "description": "Avant ouverture prochaine fenêtre audit selon gravité NC/déviation" },
                { "id": "pa_004", "nom": "Statuts mise en place", "description": "Corrections et actions correctives renseignées" },
                { "id": "pa_005", "nom": "Validation auditeur", "description": "Statut 'OK-Libéré-Validé-Approuvé', nom auditeur, date validation" }
            ]
        },
        "11_preuves_corrections": {
            "titre": "Preuves de corrections",
            "items": [
                { "id": "prev_001", "nom": "Pertinence des preuves", "description": "Preuves documentées et pertinentes pour chaque correction" }
            ]
        },
        "12_checklist": {
            "titre": "Check-list audit",
            "items": [
                { "id": "ckl_001", "nom": "Champs obligatoires complétés", "description": "Tous les champs obligatoires renseignés" },
                { "id": "ckl_002", "nom": "NA justifiés", "description": "Non Applicable justifiés et documentés" }
            ]
        },
        "13_traductions_anglais": {
            "titre": "Traduction en anglais",
            "items": [
                { "id": "tra_001", "nom": "Traduction rapport", "description": "Tout traduit sauf les NA" },
                { "id": "tra_002", "nom": "Champs obligatoires", "description": "Seule version anglaise requise pour export rapport" },
                { "id": "tra_003", "nom": "Déviations et NC", "description": "Langue audit + traduction anglaise" },
                { "id": "tra_004", "nom": "Plan d'actions", "description": "Traduction déviations, NC, corrections, actions correctives" }
            ]
        }
    };

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    onStateChange(newState) {
        // Handle state changes here if needed
        console.log('DataProcessor State changed:', newState);
        if (newState.currentMode === 'auditor') {
            this.renderAuditorTaskList();
        }

        // Re-apply filters whenever the state changes.
        // This is called after the UIManager has re-rendered the tables.
        this.filterProfileTable();
        this.filterChecklist();
        this.filterNonConformities();
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

        try {
            // 1. Extraction Immédiate des Infos de Base et du Profil
            // On le fait AVANT la checklist pour afficher les infos même si la checklist échoue
            const companyName = food8.questions?.companyName?.answer ||
                food8.companyName?.answer ||
                food8.companyName ||
                'Société inconnue';

            const coid = food8.questions?.companyCoid?.answer ||
                food8.companyCoid?.answer ||
                food8.companyCoid ||
                'COID-XXXX';

            // Mise à jour de l'interface
            this.uiManager.updateCurrentAuditName(`IFS Reviewer - ${companyName}`);
            this.uiManager.updateSessionInfo(coid);

            // CHANGEMENT : On passe TOUT l'objet food8 pour extraire aussi les infos hors 'questions'
            const companyProfileData = this.extractCompanyProfile(food8);
            console.log('📊 Profile extraction result:', Object.keys(companyProfileData).length, 'fields');
            const conversations = {};

            // Mise à jour du State partiel (Profil)
            this.state.setState({
                // On conserve l'auditData (objet racine) défini par FileHandler
                companyProfileData: companyProfileData,
                conversations: { ...this.state.get().conversations, ...conversations },
                currentSession: {
                    ...this.state.get().currentSession,
                    id: `IFS-${coid}-${new Date().getTime()}`,
                    name: `Audit ${companyName}`,
                    data: food8
                }
            });

            // Rendu du Profil Immédiat avec les données fraîches du state
            this.renderCompanyProfile();

            // Calcul des Scores (si disponibles)
            if (food8.matrixResult) {
                let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalNA = 0;
                food8.matrixResult.forEach(item => {
                    if (item.type === 'scoreCount') {
                        switch (item.scoreId) {
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
                if (food8.result?.overall?.percent) {
                    this.uiManager.updateElementText('overallScore', food8.result.overall.percent.toFixed(1) + '%');
                }
            }

            // 2. Traitement Asynchrone de la Checklist
            this.processChecklistData(food8.checklists).then(processedChecklist => {
                const checklistData = processedChecklist.checklistData;
                const requirementNumberMapping = processedChecklist.requirementNumberMapping;

                this.state.setState({
                    checklistData: checklistData,
                    requirementNumberMapping: requirementNumberMapping
                });

                // Finalisation
                this.uiManager.showSuccess(`✅ Dossier chargé : ${companyName}`);
                this.state.saveState(); // Crucial pour persister le profil extrait
                this.uiManager.finalizeDataLoad();

            }).catch(error => {
                console.error('Warning processing checklist:', error);
                this.uiManager.showError(`Attention : Le profil a été chargé, mais la checklist a rencontré une erreur : ${error.message}`);
                // On NE reset PAS car le profil est visible
                this.uiManager.showLoading(false);
                this.uiManager.showResults(true);
            });

        } catch (error) {
            console.error('Critical Error in processAuditDataLogic:', error);
            this.uiManager.showError(`Erreur critique lors du chargement : ${error.message}`);
            this.uiManager.resetToUploadState();
        }
    }

    extractCompanyProfile(food8) {
        if (!food8) return {};

        const profile = {};
        // Support de l'ancien appel (juste questions) ou du nouveau (objet complet)
        // Si food8.questions existe, on l'utilise. Sinon on vérifie si food8 lui-même contient des clés de questions.
        const targetQuestions = food8.questions || (food8.companyName ? food8 : {});

        console.log('🔍 Extracting profile from:', Object.keys(targetQuestions).length, 'questions');

        // 1. Extraction des QUESTIONS (metadata riche)
        const priorities = {
            'companyName': 'Nom du site à auditer',
            'companyCoid': 'N° COID du portail',
            // companyGln géré spécifiquement
            'companyStreetNo': 'Rue',
            'companyZip': 'Code postal',
            'companyCity': 'Nom de la ville',
            'companyCountry': 'Pays',
            'companyTelephone': 'Téléphone',
            'companyEmail': 'Email',
            'companyGpsLatitude': 'Latitude',
            'companyGpsLongitude': 'Longitude',
            'headquartersName': 'Nom du siège social',
            'headquartersStreetNo': 'Rue (siège social)',
            'headquartersCity': 'Nom de la ville (siège social)',
            'headquartersZip': 'Code postal (siège social)',
            'headquartersCountry': 'Pays (siège social)',
            'headquartersTelephone': 'Téléphone (siège social)',
            'productionAreaSize': 'Surface couverte de l\'entreprise (m²)',
            'numberOfBuildings': 'Nombre de bâtiments',
            'numberOfProductionLines': 'Nombre de lignes de production',
            'numberOfFloors': 'Nombre d\'étages',
            'numberOfEmployeesForTimeCalculation': 'Nombre maximum d\'employés',
            'numberOfEmployeesDescription': 'Commentaires employés',
            'companyStructureDecentralisedDescription': 'Structures décentralisées',
            'companyStructureMultiLocationProductionDescription': 'Fonctions centralisées',
            'workingLanguage': 'Langue parlée et écrite sur le site',
            'qmsLanguage': 'Langue du système qualité',
            'scopeCertificateScopeDescription_en': 'Audit scope EN',
            'scopeAuditScopeDescription': 'Périmètre de l\'audit FR',
            'scopeProductGroupsDescription': 'Process et activités',
            'seasonalProduction': 'Activité saisonnière ? (O/N)',
            'partlyOutsourcedProcesses': 'Partie du procédé sous-traitée ?',
            'partlyOutsourcedProcessesDescription': 'Procédés sous-traités',
            'fullyOutsourcedProducts': 'Produits totalement sous-traités ?',
            'fullyOutsourcedProductsDescription': 'Liste produits sous-traités',
            'tradedProductsBrokerActivity': 'Produits de négoce ?',
            'tradedProductsBrokerActivityDescription': 'Liste produits de négoce'
        };

        // A. Traitement des QUESTIONS
        Object.entries(targetQuestions).forEach(([key, data]) => {
            if (!data) return;

            // Détection du format : riche (objet avec .answer) ou plat (valeur directe)
            const isRich = typeof data === 'object' && data !== null && 'answer' in data;
            let value = isRich ? data.answer : data;

            if (value === undefined || value === '' || value === null) return;

            let label = priorities[key];
            if (!label) {
                label = (isRich && data.text) ? data.text : key;
            }

            // --- GESTION DES CHAMPS COMPLEXES SPÉCIFIQUES ---

            // 1. GLN (déjà traité)
            if (key === 'companyGln' && Array.isArray(value) && value[0]?.rootQuestions?.companyGlnNumber?.answer) {
                value = value[0].rootQuestions.companyGlnNumber.answer;
            }
            // 2. Langues (tableau simple)
            else if ((key === 'qmsLanguage' || key === 'workingLanguage' || key === 'auditLanguage') && Array.isArray(value)) {
                value = value.join(', ');
            }
            // 3. Codes Emballeur et Agrément Sanitaire (Tableaux d'objets imbriqués)
            else if ((key === 'companyLegalRegistrationNumbers' || key === 'companySanitaryLegalAuthorisationNumbers') && Array.isArray(value)) {
                // Structure: [{ rootQuestions: { keyText: { answer: "VALEUR" } } }]
                const codes = value.map(item => {
                    const rootQ = item.rootQuestions;
                    if (!rootQ) return null;
                    // On cherche la clé qui contient "Text" ou "Number"
                    // ex: companyLegalRegistrationNumbersText ou companySanitaryLegalAuthorisationNumbersText
                    const textKey = Object.keys(rootQ).find(k => k.includes('Text') || k.includes('Number'));
                    return textKey ? rootQ[textKey].answer : null;
                }).filter(Boolean).join(', ');

                if (codes) value = codes;
                else return;
            }
            // 4. Claims / Autres listes complexes similaires
            else if (key === 'companyClaimsOtherList' && Array.isArray(value)) {
                const claims = value.map(item => item.rootQuestions?.companyClaimsOtherListText?.answer).filter(Boolean).join(', ');
                if (claims) value = claims;
                else return;
            }
            // 5. Statuts Certification (Sous-traitance) - Tentative d'extraction si complexe
            else if ((key.includes('CertificationStatus') || key.includes('Coid')) && Array.isArray(value)) {
                // Souvent vide ou complexe. On tente le join si simple, sinon JSON stringify pour debug
                if (value.length > 0 && typeof value[0] !== 'object') value = value.join(', ');
                else if (value.length > 0) return; // On ignore pour l'instant si trop complexe
                else return; // Vide
            }
            // 6. Tableaux simples génériques
            else if (Array.isArray(value)) {
                if (value.length > 0 && typeof value[0] !== 'object') {
                    value = value.join(', ');
                } else { return; }
            }
            // 7. Objets (on ignore sauf si géré plus haut)
            else if (typeof value === 'object') {
                return;
            }

            // Mappages de labels manquants spécifiques demandés
            if (key === 'companyLegalRegistrationNumbersDescription') label = 'Description Code Emballeur';
            if (key === 'companyLegalRegistrationNumbers') label = 'Code Emballeur / Agrément'; // Sera écrasé ou ajouté
            if (key === 'companySanitaryLegalAuthorisationNumbers') label = 'N° Agrément Sanitaire';

            if (key === 'fullyOutsourcedProducts') label = 'Produits totalement sous-traités ?';
            if (key === 'tradedProductsBrokerActivity') label = 'Activité de négoce ?';

            if (key === 'productsProducedProcessesRunning') label = 'Procédés observés (Audit)';
            if (key === 'exclusions') label = 'Exclusions ?';
            if (key === 'exclusionsDescription') label = 'Justification Exclusions';

            if (key === 'followupSummary') label = 'Vérification des AC N-1 (Suivi)';
            if (key === 'koSummary') label = 'Résumé KO';

            if (value) profile[label] = value;
        });

        // B. Extraction des propriétés RACINES utiles (hors checklists, questions, resultats, objets complexes traités après)
        const ignoredRoots = ['questions', 'checklists', 'matrixResult', 'result', 'users', 'auditDetails', 'originalFileName', 'auditors', 'participants', 'productScopesAudit', 'techScopesAudit', 'productScopesCertificate', 'techScopesCertificate', 'auditTimes', 'processingStepsAudit', 'processingStepsCertificate'];

        Object.keys(food8).forEach(key => {
            if (ignoredRoots.includes(key)) return;
            const val = food8[key];
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                profile[label] = val.toString();
            }
        });

        // C. Traitement des Objets Complexes Spécifiques (pour "tout extraire")

        // 1. Auditeurs
        if (food8.auditors) {
            const auditorList = Object.values(food8.auditors).map(a => {
                const data = a.auditorData || {};
                return `${data.firstName || ''} ${data.lastName || ''} (${data.role || 'Auditor'})`.trim();
            }).filter(s => s !== '()').join(', ');
            if (auditorList) profile['Auditeurs'] = auditorList;
        }

        // 2. Participants
        if (food8.participants) {
            const participantList = Object.values(food8.participants).map(p => {
                return `${p.firstName || ''} ${p.lastName || ''} - ${p.position || 'N/A'}`.trim();
            }).filter(s => s !== '- N/A').join(', '); // Saut de ligne pour lisibilité si supporté par CSS, sinon virgule
            if (participantList) profile['Participants'] = participantList;
            // Note: Le CSS actuel du tableau supporte mal les \n, on verra. Sinon utiliser <br> si le rendu est HTML.
            // DataProcessor renderCompanyProfile utilise textContent ou innerHTML? Check renderCompanyProfile.
            // renderCompanyProfile dans data-processor.js utilise généralement textContent. 
            // On va utiliser ", " pour l'instant.
        }

        // 3. Dates d'audit
        if (food8.auditTimes) {
            if (food8.auditTimes.startDate) profile['Date début audit'] = food8.auditTimes.startDate;
            if (food8.auditTimes.endDate) profile['Date fin audit'] = food8.auditTimes.endDate;
            if (food8.auditTimes.auditTimeInMinutes) {
                const mins = parseInt(food8.auditTimes.auditTimeInMinutes);
                const hours = mins / 60;
                const days = hours / 8;
                profile['Durée audit'] = `${mins} min (${hours}h / ${days.toFixed(2).replace('.', ',')} jours)`;
            }
        }

        // 4. Scopes (Périmètres)
        const formatScopes = (scopes, labelPrefix) => {
            if (!scopes || !Array.isArray(scopes)) return;
            const scopeTexts = scopes.map(s => {
                if (s.text) return s.text;
                // Si pas de texte, on affiche le type ou UUID court
                return s.type === 'productScope' ? `Scope UUID: ...${s.uuid.slice(-6)}` : s.type;
            }).filter(Boolean).join(', ');
            if (scopeTexts) profile[labelPrefix] = scopeTexts;
        };

        formatScopes(food8.productScopesAudit, 'Scopes Produits (Audit)');
        formatScopes(food8.techScopesAudit, 'Scopes Techniques (Audit)');

        console.log(`✅ ${Object.keys(profile).length} champs extraits (Questions + Root + Complexes)`);
        return profile;
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

            console.log(`✅ UUIDs MATCHÉS : ${matchedUUIDs.length}/${ifsUUIDs.length} (${((matchedUUIDs.length / ifsUUIDs.length) * 100).toFixed(1)}%)`);

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

                let fieldAnswersText = '';
                if (item.scoring.answers?.fieldAnswers) {
                    Object.entries(item.scoring.answers.fieldAnswers).forEach(([k, v]) => {
                        if (v?.answer && v.answer !== 'false' && v.answer !== 'true' && v.answer !== '') {
                            // Clean up key for display if possible, or just use answer
                            // If key ends in _en, maybe ignore if we have _fr or base?
                            // For now, simpler: Just show the answer.
                            // Often these are additional questions.
                            fieldAnswersText += `\n> ${v.answer}`;
                        }
                    });
                }

                // Recherche "Floue" des clés pour les dates et preuves
                const answers = item.scoring.answers || {};
                const keys = Object.keys(answers);

                const findKey = (keywords) => {
                    return keys.find(k => {
                        const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return keywords.every(kw => norm.includes(kw));
                    });
                };

                const correctionDateKey = findKey(['correction', 'date']) || findKey(['correction', 'deadline']);
                const actionDateKey = findKey(['corrective', 'action', 'date']) || findKey(['corrective', 'action', 'deadline']) || findKey(['action', 'date']);
                const evidenceKey = findKey(['evidence']) || findKey(['preuve']);

                newChecklistData.push({
                    uuid: item.uuid,
                    requirementNumber: item.requirementNumber,
                    chapter: item.chapter,
                    theme: item.theme,
                    sstheme: item.sstheme,
                    score: item.scoring.score?.label || 'N/D',
                    scoreValue: item.scoring.score?.value,
                    explanation: answers.explanationText || '',
                    detailedExplanation: (answers.englishExplanationText || '') + fieldAnswersText,
                    correction: answers.correctionText || '',
                    correctionDueDate: answers[correctionDateKey] || '',
                    evidence: answers.correctionEvidence || answers[evidenceKey] || '',
                    correctiveAction: answers.correctiveActionText || '',
                    correctiveActionDueDate: answers[actionDateKey] || '',
                    needsCorrection: item.scoring.isCorrectionRequired || false
                });

                // DEBUG : LOG DES CLÉS TROUVÉES (Si score < 20)
                if (item.scoring.score?.value < 20 && !window.hasLoggedDates) {
                    console.log("🧩 CLÉS DÉTECTÉES POUR NON-CONFORMITÉ :", {
                        correctionDateKey,
                        actionDateKey,
                        evidenceKey,
                        allKeys: keys
                    });
                    window.hasLoggedDates = true;
                }
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

        window.dataProcessor = this;

        // Persistance de l'état
        if (!this.openProfileCategories) {
            this.openProfileCategories = new Set(['🏢 Description & Identité de l\'Entreprise']);
        }

        const state = this.state.get();
        let companyProfileData = state.companyProfileData ? { ...state.companyProfileData } : {};
        const conversations = state.conversations || {};

        if (!companyProfileData || Object.keys(companyProfileData).length === 0) {
            container.innerHTML = `<div class="no-data-notice"><p>Aucune donnée de profil chargée.</p></div>`;
            return;
        }

        // 0. FONCTION DE NORMALISATION ROBUSTE
        // Minuscule, sans accents, sans caractères spéciaux, sans espaces
        const normalize = (str) => {
            return str.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever accents
                .replace(/[^a-z0-9]/g, ""); // Garder a-z et 0-9 uniquement
        };

        // 1. CARTE DE RECHERCHE PRÉ-CALCULÉE (Normalized -> Original Key)
        const normalizedDataKeys = {};
        Object.keys(companyProfileData).forEach(originalKey => {
            normalizedDataKeys[normalize(originalKey)] = originalKey;
        });

        // 2. FORCER LE CALCUL DE LA DURÉE (Prioritaire)
        const durKeys = ['maximumaudittimeinminutes', 'dureeauditmin', 'auditdurationminutes'];
        let minutesValue = null;

        for (const k of durKeys) {
            if (normalizedDataKeys[k]) {
                minutesValue = parseInt(companyProfileData[normalizedDataKeys[k]]);
                break;
            }
        }

        if (minutesValue && !isNaN(minutesValue)) {
            const hours = minutesValue / 60;
            const days = hours / 8;
            companyProfileData['Durée audit'] = `${minutesValue} min (${hours}h / ${days.toFixed(2).replace('.', ',')} jours)`;
            // Mettre à jour la map
            normalizedDataKeys['dureeaudit'] = 'Durée audit';
        }

        // 3. RECETTE DES CATÉGORIES (Mapping exhaustif basé sur le dump utilisateur)
        const categoryMap = {
            '🏢 Description & Identité de l\'Entreprise': [
                'nomdusiteaauditer', 'nomdusiteauditer', 'companyid', 'ncoidduportail', 'codegln', 'companygln', 'nomdusiegesocial',
                'rue', 'codepostal', 'nomdelaville', 'pays', 'telephone', 'email', 'companyfax', 'companywebpage',
                'ruesiegesocial', 'nomdelavillesiegesocial', 'codepostalsiegesocial', 'payssiegesocial', 'telephonesiegesocial',
                'surfacecouvertedelentreprisem2', 'nombredebatiments', 'nombredelignesdeproduction', 'nombredetages',
                'nombremaximumdemployes', 'numberofemployees', 'commentairesemployes', 'numberofemployeesdescriptionen',
                'codeemballeuragrement', 'nagrementsanitaire', 'latitude', 'longitude', 'companyyearconstruction',
                'companyemergencycontactname', 'companyemergencycontactemail', 'companyemergencycontacttelephone',
                'descriptioncodeemballeur', 'companypackingcodes', 'companyemergencycontactfax'
            ],
            '📋 Réalisation de l\'Audit & Logistique': [
                'datedebutaudit', 'datefinaudit', 'dureeaudit', 'auditeurs', 'participants',
                'auditfirstday', 'auditlastday', 'totalauditduration', 'maximumaudittimeinminutes', 'minimumaudittimeinminutes',
                'audittype', 'isunannounced', 'auditannouncedoption', 'standardversion', 'uploaddate', 'auditid', 'id', 'revision', 'type', 'iterationtype',
                'creationdate', 'lastmodificationdate', 'auditlanguage', 'langueaudit', 'dernierjouraudit',
                'langueparleeetecritesurlesite', 'languedusystemequalite', 'executionmode', 'auditwitnesstype',
                'certificationbodyname', 'certificationbodyaddress', 'certificationbodyaccreditationnumber',
                'previousauditunannounceddate', 'previousauditwasunannounced', 'previouscertificationauditor',
                'previouscertificationdate', 'previouscertificationcertificatevalidity', 'previouscertificationbody',
                'previouscertificationstandardversion', 'otherstandardscertification'
            ],
            '🔬 Périmètre & Scopes d\'Audit': [
                'auditscopeen', 'scopeen', 'scopeauditdescriptionen', 'scopeauditscopedescriptionen',
                'perimetredelauditfr', 'scopefr', 'scopeauditdescriptionfr', 'scopecertificatescopedescription',
                'scopesproduitsaudit', 'productscopes', 'scopestechniquesaudit', 'techscopes', 'scopeproductgroupsdescriptionen',
                'processetactivites', 'exclusions', 'justificationexclusions', 'exclusionsdescriptionen',
                'companyprofileadditionalinformation', 'companyprofileadditionalinformationen'
            ],
            '⚙️ Activités, Procédés & Flux': [
                'partieduprocedesoustraitee', 'procedessoustraites', 'produitstotalementsoustraites', 'listeproduitssoustraites',
                'fullyoutsourcedproductsdescriptionen', 'fullyoutsourcedproductscertificationstatus',
                'activedonegoce', 'activedunegoce', 'listeproduitsdenegoce', 'procedesobservesaudit', 'productsproducedprocessesrunningen',
                'activitesaisonniereon', 'seasonalproduction', 'seasonalproductionbreak', 'seasonalproductionbreakdescription',
                'seasonalproductionbreakdescriptionen', 'seasonalproductionbreakperiod', 'seasonalproductiondescription',
                'seasonalproductiondescriptionen', 'seasonalproductionperioden', 'seasonalproductionperiod',
                'structuresdecentralisees', 'fonctionscentralisees', 'companystructuredecentralised',
                'companystructuremultilocationproduction', 'companystructuremultilegalentity',
                'companyclaimuse', 'companyclaims', 'customerbrandedproducts', 'fsma', 'geographicalindicationscheme',
                'hkzlogo', 'companyadditionalinformation', 'logorequirementsfulfilled',
                'companyclaimsotherlist', 'dangerousproductsnotification'
            ],
            '📈 Résultats & Suivi': [
                'resumeko', 'kosummaryen', 'verificationdesacn1suivi', 'followupsummary', 'followupsummaryen',
                'keyinvestmentsafetyquality', 'keyinvestmentsafetyqualityen'
            ]
        };

        const keyTranslations = {
            'auditId': 'ID Audit (NEO)', 'companyId': 'ID Entreprise (NEO)',
            'isUnannounced': 'Audit inopiné ?', 'standardVersion': 'Version Référentiel',
            'scopeEn': 'Audit Scope (EN)', 'scopeFr': 'Périmètre Audité (FR)',
            'followupSummaryEn': 'Résumé du suivi (EN)', 'koSummaryEn': 'Résumé KO (EN)',
            'iterationType': 'Type d\'Itération'
        };

        const beautifyKey = (rawKey) => {
            if (keyTranslations[rawKey]) return keyTranslations[rawKey];
            return rawKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        };

        const displayedFields = new Set();
        let html = '';

        const renderTableSection = (title, distinctNormalizedKeys) => {
            // Trouver les clés réelles correspondantes
            const visibleRawKeys = distinctNormalizedKeys
                .map(nk => normalizedDataKeys[nk])
                .filter(realKey => realKey !== undefined);

            if (visibleRawKeys.length === 0) return '';

            const isOpen = this.openProfileCategories.has(title);
            let pending = 0, total = 0;

            visibleRawKeys.forEach(k => {
                const fid = `profile-${this.sanitizeFieldId(k)}`;
                const conv = conversations[fid];
                if (conv && conv.thread?.length > 0) {
                    total++;
                    if (this.getConversationStatus(conv) === 'pending') pending++;
                }
            });

            let sectionHtml = `
                <details class="profile-category-details" ${isOpen ? 'open' : ''} 
                    onclick="if(event.target.tagName==='SUMMARY' || event.target.closest('SUMMARY')) { 
                        setTimeout(() => {
                            const details = event.target.closest('details');
                            if(details.open) window.dataProcessor.openProfileCategories.add('${title.replace(/'/g, "\\'")}');
                            else window.dataProcessor.openProfileCategories.delete('${title.replace(/'/g, "\\'")}');
                        }, 50);
                    }">
                    <summary class="category-header">
                        <div class="category-title-wrap">
                            <span class="category-title">${title}</span>
                            <div class="category-meta-badges">
                                ${pending > 0 ? `<span class="badge-count pending">${pending}</span>` : ''}
                                ${total > 0 ? `<span class="badge-count total">${total}</span>` : ''}
                            </div>
                        </div>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </summary>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Information</th><th>Valeur</th><th>Commentaires</th></tr></thead>
                            <tbody>`;

            visibleRawKeys.forEach(rawKey => {
                displayedFields.add(rawKey);
                const val = companyProfileData[rawKey];
                const fid = `profile-${this.sanitizeFieldId(rawKey)}`;
                const conv = conversations[fid];
                const commStat = this.getConversationStatus(conv);
                const count = conv?.thread?.length || 0;

                const isLong = (val && val.toString().length > 100) || title.includes('Périmètre') || title.includes('Résultats');

                sectionHtml += `
                    <tr class="table-row-clickable" data-field-id="${fid}" data-comment-status="${commStat}" onclick="openCommentModal(this)">
                        <td class="font-medium" style="width: 30%;">${beautifyKey(rawKey)}</td>
                        <td style="width: 60%;">${isLong ? `<div class="field-display long-text">${val || 'N/A'}</div>` : `<span>${val || 'N/A'}</span>`}</td>
                        <td class="comment-status-cell" style="width: 10%;">
                            <div class="comment-indicators">
                                <span class="comment-count-badge" style="display: ${count > 0 ? 'inline-flex' : 'none'}">${count}</span>
                                <span class="status-indicator ${commStat}"></span>
                                <button class="quick-comment-btn" onclick="event.stopPropagation(); openCommentModal(this.closest('tr'))"><i class="fas fa-comment"></i></button>
                            </div>
                        </td>
                    </tr>`;
            });
            return sectionHtml + `</tbody></table></div></details>`;
        };

        // Rendu des thèmes
        Object.entries(categoryMap).forEach(([name, mappedKeys]) => {
            html += renderTableSection(name, mappedKeys);
        });

        // Catch-all: Clés non affichées
        const remainingKeys = Object.keys(companyProfileData)
            .filter(k => !displayedFields.has(k))
            .sort();

        if (remainingKeys.length > 0) {
            // Passer les clés normalisées pour réutiliser la fonction renderTableSection
            // Ou plus simplement, créer une map temporaire pour ces clés
            const remainingNormalized = remainingKeys.map(k => {
                const nk = normalize(k);
                normalizedDataKeys[nk] = k; // Ensure mapping exists
                return nk;
            });
            html += renderTableSection('🏷️ Autres Données Techniques', remainingNormalized);
        }

        container.innerHTML = html;
        if (this.filterProfileTable) this.filterProfileTable();
    }

    renderChecklistTable() {
        const tbody = document.getElementById('checklistTableBody');
        if (!tbody) return;

        // Use the new filtered data source instead of the raw one
        const checklistData = this.state.getFilteredChecklistData();
        const conversations = this.state.get().conversations;

        if (!checklistData || checklistData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-10">Aucun élément ne correspond au filtre actif.</td></tr>';
            return;
        }

        let html = '';
        checklistData.forEach(item => {
            const isNC = ['B', 'C', 'D'].includes(item.score);
            const constatFieldId = `ckl-${item.uuid}`;
            const paFieldId = `pa-${item.uuid}`;

            const constatConv = conversations[constatFieldId] || conversations[`req-${item.uuid}`]; // Fallback old format
            const paConv = conversations[paFieldId];

            const constatStatus = this.getConversationStatus(constatConv);
            const constatCount = constatConv?.thread?.length || 0;
            const paStatus = this.getConversationStatus(paConv);
            const paCount = paConv?.thread?.length || 0;

            html += `<tr class="table-row-clickable" data-chapter="${item.chapter}" data-score="${item.score}">
                        <td class="font-medium">${item.requirementNumber}</td>
                        <td><span class="score-badge score-${item.score}">${item.score}</span></td>
                        <td class="max-w-xs text-xs">${item.explanation || ''}</td>
                        <td class="max-w-xs text-xs">${item.detailedExplanation || ''}</td>
                        
                        <td class="comment-status-cell" onclick="event.stopPropagation(); window.openCommentModalFromCell(this, '${constatFieldId}')">
                            <div class="comment-indicators">
                                <span class="comment-count-badge" style="display: ${constatCount > 0 ? 'inline-flex' : 'none'}">${constatCount}</span>
                                <span class="status-indicator ${constatStatus}"></span>
                                <button class="quick-comment-btn">
                                    <i class="fas fa-comment"></i>
                                </button>
                            </div>
                        </td>
                        
                        <td class="comment-status-cell ${isNC ? '' : 'opacity-20 pointer-events-none'}" onclick="event.stopPropagation(); if(${isNC}) window.openCommentModalFromCell(this, '${paFieldId}')">
                            <div class="comment-indicators">
                                <span class="comment-count-badge" style="display: ${paCount > 0 ? 'inline-flex' : 'none'}">${paCount}</span>
                                <span class="status-indicator ${paStatus}"></span>
                                <button class="quick-comment-btn">
                                    <i class="fas fa-tools"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
        });

        tbody.innerHTML = html;
        this.setupTableFilters();
        this.filterChecklist();
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
            const fieldId = `req-${item.uuid}`;
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
                                <span class="comment-count-badge" style="display: ${commentCount > 0 ? 'inline-flex' : 'none'}">${commentCount}</span>
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

    renderAuditorTaskList() {
        const tbody = document.getElementById('auditorTasksBody');
        const emptyState = document.getElementById('auditorEmptyState');
        const tableContainer = document.getElementById('auditorTasksContainer');

        if (!tbody) return;

        const conversations = this.state.get().conversations;
        // Filter logic
        const filter = this.state.get().activeFilters.auditorTasks?.filter || 'pending';

        // Update Buttons
        ['pending', 'resolved', 'all'].forEach(f => {
            const btn = document.getElementById(`auditor-filter-${f}`);
            if (btn) {
                if (f === filter) {
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-secondary');
                } else {
                    btn.classList.add('btn-secondary');
                    btn.classList.remove('btn-primary');
                }
            }
        });

        let tasks = [];
        let pendingCount = 0;
        let resolvedCount = 0;

        Object.entries(conversations).forEach(([fieldId, conversation]) => {
            const thread = conversation.thread;
            if (!thread || thread.length === 0) return;

            const lastMessage = thread[thread.length - 1];
            const isResolved = conversation.status === 'resolved';

            // "Pending": Reviewer spoke last, and not resolved. Auditor needs to act.
            const isPending = !isResolved && lastMessage.author === 'reviewer';

            // "Replied/Resolved": Auditor spoke last (waiting for reviewer) OR explicitly resolved
            const isReplied = !isResolved && lastMessage.author === 'auditor';

            if (isPending) pendingCount++;
            if (isResolved || isReplied) resolvedCount++;

            let include = false;
            if (filter === 'pending' && isPending) include = true;
            if (filter === 'resolved' && (isResolved || isReplied)) include = true;
            if (filter === 'all' && (isPending || isResolved || isReplied)) include = true;

            if (include) {
                const fieldInfo = this.getFieldInfo(fieldId);
                let statusLabel = '';
                let statusClass = '';
                if (isPending) {
                    statusLabel = 'À traiter';
                    statusClass = 'pending';
                } else if (isReplied) {
                    statusLabel = 'En attente Reviewer';
                    statusClass = 'read'; // Reuse 'read' style for simplicity or add custom
                } else if (isResolved) {
                    statusLabel = 'Résolu / Clôturé';
                    statusClass = 'resolved';
                }

                tasks.push({
                    fieldId: fieldId,
                    type: fieldInfo.type,
                    name: fieldInfo.name,
                    lastMessage: lastMessage.content,
                    date: lastMessage.date,
                    statusLabel,
                    statusClass,
                    isResolved: isResolved || isReplied
                });
            }
        });

        // Update Counters (Independent of view filter)
        this.uiManager.updateElementText('auditorTodoCounter', pendingCount > 0 ? pendingCount : '');
        this.uiManager.updateElementText('auditorPendingTotal', pendingCount);
        this.uiManager.updateElementText('auditorResolvedTotal', resolvedCount);

        // Sort Tasks
        tasks.sort((a, b) => {
            // Prioritize Pending items at the top
            if (a.statusClass === 'pending' && b.statusClass !== 'pending') return -1;
            if (a.statusClass !== 'pending' && b.statusClass === 'pending') return 1;

            if (a.statusClass === 'pending') {
                // Pending: Oldest first (to handle queue)
                return new Date(a.date) - new Date(b.date);
            } else {
                // Resolved/Replied: Newest first (history)
                return new Date(b.date) - new Date(a.date);
            }
        });

        // Display Logic
        if (tasks.length === 0) {
            if (tableContainer) tableContainer.classList.add('hidden');
            if (emptyState) {
                // Only show the "Good Job" empty state if we are filtering for PENDING and there are no pending tasks.
                if (filter === 'pending') {
                    emptyState.classList.remove('hidden');
                    emptyState.innerHTML = `
                        <div class="text-green-500 text-5xl mb-4"><i class="fas fa-check-circle"></i></div>
                        <h3 class="text-xl font-bold text-gray-700 dark:text-gray-200">Tout est à jour !</h3>
                        <p class="text-gray-500 mt-2">Vous avez répondu à toutes les questions du reviewer.</p>
                        <button onclick="showPackageModal()" class="btn btn-primary mt-6">
                            <i class="fas fa-reply"></i> Renvoyer le package au Reviewer
                        </button>
                     `;
                } else {
                    emptyState.classList.remove('hidden');
                    emptyState.innerHTML = `
                        <div class="text-gray-400 text-5xl mb-4"><i class="fas fa-inbox"></i></div>
                        <h3 class="text-xl font-bold text-gray-700 dark:text-gray-200">Aucun élément</h3>
                        <p class="text-gray-500 mt-2">Aucune conversation ne correspond à ce filtre.</p>
                     `;
                }
            }
        } else {
            if (tableContainer) tableContainer.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');

            let html = '';
            tasks.forEach(task => {
                let shortMsg = task.lastMessage.length > 80 ? task.lastMessage.substring(0, 80) + '...' : task.lastMessage;

                let typeLabel = '';
                if (task.type === 'profile') {
                    typeLabel = '<span class="score-badge" style="background-color:#3b82f6">Profil</span>';
                } else if (task.type === 'nc-pa' || task.fieldId.startsWith('pa-')) {
                    typeLabel = '<span class="score-badge" style="background-color:#ef4444">Plan d\'actions</span>';
                } else if (task.type === 'ckl' || task.fieldId.startsWith('ckl-')) {
                    typeLabel = '<span class="score-badge" style="background-color:#f59e0b">Constat d\'audit</span>';
                } else {
                    typeLabel = '<span class="score-badge" style="background-color:#8b5cf6">Checklist</span>';
                }

                html += `
                    <tr class="table-row-clickable" onclick="openCommentModal(this)" data-field-id="${task.fieldId}">
                        <td>${typeLabel}</td>
                        <td class="font-bold">${task.name}</td>
                        <td class="text-gray-600 dark:text-gray-400"><i class="fas fa-quote-left text-xs opacity-50"></i> ${shortMsg}</td>
                        <td><span class="status-badge ${task.statusClass}">${task.statusLabel}</span></td>
                        <td>
                            <button class="btn btn-sm btn-primary">
                                <i class="fas fa-${task.statusClass === 'pending' ? 'reply' : 'eye'}"></i> ${task.statusClass === 'pending' ? 'Répondre' : 'Voir'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    }

    getFieldInfo(fieldId) {
        const companyProfileData = this.state.get().companyProfileData;
        const checklistData = this.state.get().checklistData;

        if (fieldId.startsWith('profile-')) {
            const sanitizedPart = fieldId.replace('profile-', '');
            let originalFieldName = '';
            for (const fieldName in companyProfileData) {
                if (this.sanitizeFieldId(fieldName) === sanitizedPart) {
                    originalFieldName = fieldName;
                    break;
                }
            }

            if (originalFieldName) {
                return {
                    name: originalFieldName,
                    content: companyProfileData[originalFieldName] || 'N/A',
                    type: 'profile'
                };
            }
        } else if (fieldId.startsWith('dossier-')) {
            const rawId = fieldId.replace('dossier-', '');
            let name = 'Document du dossier';
            let description = '';

            // Search in the static structure
            for (const key in DataProcessor.REVIEW_CHECKLIST_STRUCTURE) {
                const category = DataProcessor.REVIEW_CHECKLIST_STRUCTURE[key];
                const item = category.items.find(i => i.id === rawId);
                if (item) {
                    name = item.nom;
                    description = item.description || '';
                    break;
                }
            }

            let contentHTML = `<strong>${name}</strong><br>`;
            if (description) {
                contentHTML += `<p class="text-sm text-gray-500 mb-2">${description}</p>`;
            }
            contentHTML += `<br>Point de contrôle de la revue du dossier.`;

            return {
                name: `[DOSSIER] ${name}`,
                content: contentHTML,
                type: 'dossier'
            };
        } else if (fieldId.startsWith('ckl-') || fieldId.startsWith('pa-') || fieldId.startsWith('req-') || fieldId.startsWith('nc-')) {
            const prefix = fieldId.startsWith('ckl-') ? 'ckl-' : (fieldId.startsWith('pa-') ? 'pa-' : (fieldId.startsWith('req-') ? 'req-' : 'nc-'));
            const uuid = fieldId.replace(prefix, '');
            const item = checklistData.find(r => r.uuid === uuid);

            if (item) {
                let contentHTML = `<strong>Exigence ${item.requirementNumber}</strong> - `;
                contentHTML += `<span class="score-badge score-${item.score}">${item.score}</span><br><br>`;

                if (prefix === 'pa-') {
                    contentHTML += `<div style="border-left: 4px solid var(--color-danger); padding-left: 10px; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--color-danger);">PLAN D'ACTIONS</h4>`;

                    contentHTML += `<strong>Correction (Action Immédiate):</strong><br>
                                   <div class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded mb-2">
                                        ${item.correction || '<span class="text-gray-400 italic">Non renseigné</span>'}
                                        ${item.correctionDueDate ? `<div class="mt-1 text-xs text-gray-500 font-semibold"><i class="fas fa-calendar-alt"></i> Échéance: ${item.correctionDueDate}</div>` : ''}
                                   </div>`;

                    contentHTML += `<strong>Preuves de correction:</strong><br>
                                   <div class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded mb-2">
                                        ${item.evidence || '<span class="text-gray-400 italic">Non renseigné</span>'}
                                   </div>`;

                    contentHTML += `<strong>Action Corrective (Plan d'action):</strong><br>
                                   <div class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded mb-2">
                                        ${item.correctiveAction || '<span class="text-gray-400 italic">Non renseigné</span>'}
                                        ${item.correctiveActionDueDate ? `<div class="mt-1 text-xs text-gray-500 font-semibold"><i class="fas fa-calendar-alt"></i> Échéance: ${item.correctiveActionDueDate}</div>` : ''}
                                   </div>`;

                    contentHTML += `</div>`;
                    return {
                        name: `[P.A.] Exigence ${item.requirementNumber}`,
                        content: contentHTML,
                        type: 'nc-pa'
                    };
                } else {
                    // CKL or REQ or NC fallback -> Constat focus
                    contentHTML += `<div style="border-left: 4px solid var(--color-theme-500); padding-left: 10px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--color-theme-600);">CONSTAT D'AUDIT</h4>`;
                    contentHTML += `<strong>Constat (Explanation):</strong><br><div class="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">${item.explanation || '-'}</div>`;
                    contentHTML += `<strong>Explication détaillée:</strong><br><div class="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">${item.detailedExplanation || '-'}</div>`;
                    contentHTML += `</div>`;
                    return {
                        name: `[CONSTAT] Exigence ${item.requirementNumber}`,
                        content: contentHTML,
                        type: prefix === 'ckl-' ? 'ckl' : 'requirement'
                    };
                }
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
        const currentMode = this.state.get().currentMode;
        const updatedThread = newThreadWithComment.map((msg, index) => {
            // Un message passe en 'read' uniquement si un message SUBSÉQUENT d'un AUTRE auteur existe
            const hasBeenAnsweredByOther = newThreadWithComment.slice(index + 1).some(nextMsg => nextMsg.author !== msg.author);

            if (hasBeenAnsweredByOther && msg.status === 'pending') {
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

        this.state.setState({ conversations: newConversations, hasUnsavedChanges: true });
    }

    getConversationStatus(conversation) {
        if (!conversation || !conversation.thread || conversation.thread.length === 0) {
            return 'none';
        }

        if (conversation.status === 'resolved') {
            return 'resolved';
        }

        const visibleMessages = conversation.thread.filter(m => !m.isDeleted);
        if (visibleMessages.length === 0) {
            return 'none';
        }

        const lastMessage = visibleMessages[visibleMessages.length - 1];
        const currentUser = this.state.get().currentMode;

        // Si le dernier message vient de l'AUTRE personne -> Action requise pour MOI
        if (lastMessage.author !== currentUser) {
            return 'pending'; // Sera labellisé "À traiter"
        }

        // Si le dernier message vient de MOI -> J'attends leur réponse
        // On vérifie si dans le fil il y a des messages encore non "lus" par l'autre
        const hasUnreadByOther = visibleMessages.some(m => m.author === currentUser && m.status === 'pending');

        if (hasUnreadByOther) {
            return 'waiting'; // Nouveau statut interne pour "En attente de leur part"
        }

        return 'read';
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'À traiter',
            'waiting': 'En attente',
            'read': 'Lu / Répondu',
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
            this.state.setState({ conversations, hasUnsavedChanges: true });
        }
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

        // Also refresh auditor tasks if relevant
        if (this.state.get().currentMode === 'auditor') {
            this.renderAuditorTaskList();
        }

        this.updateProgressStats();
    }

    refreshCountersForTab(tabId) {
        console.log(`--- Refreshing counters for tab: ${tabId} ---`);

        // Skip for auditor tasks tab as it's handled separately
        if (tabId === 'auditor-tasks') return;

        let pending = 0, resolved = 0, total = 0;
        const conversations = this.state.get().conversations;
        const checklistData = this.state.get().checklistData;
        const companyProfileData = this.state.get().companyProfileData;

        if (tabId === 'profil') {
            Object.keys(companyProfileData).forEach(field => {
                const fieldId = `profile-${this.sanitizeFieldId(field)}`;
                const conversation = conversations[fieldId];
                if (conversation && conversation.thread?.length > 0) {
                    total++;
                    const status = this.getConversationStatus(conversation);
                    if (status === 'resolved') resolved++;
                    else if (status === 'pending') pending++;
                }
            });
        } else if (tabId === 'checklist') {
            checklistData.forEach(item => {
                const fieldId = `req-${item.uuid}`;
                const conversation = conversations[fieldId];
                if (conversation && conversation.thread?.length > 0) {
                    total++;
                    const status = this.getConversationStatus(conversation);
                    if (status === 'resolved') resolved++;
                    else if (status === 'pending') pending++;
                }
            });
        } else if (tabId === 'nonconformites') {
            const nonConformItems = checklistData.filter(item => ['B', 'C', 'D', 'NA'].includes(item.score));
            nonConformItems.forEach((item, index) => {
                const fieldId = `req-${item.uuid}`;
                const conversation = conversations[fieldId];
                if (conversation && conversation.thread?.length > 0) {
                    total++;
                    const status = this.getConversationStatus(conversation);
                    if (status === 'resolved') resolved++;
                    else if (status === 'pending') pending++;
                }
            });
        } else if (tabId === 'dossier') {
            Object.values(DataProcessor.REVIEW_CHECKLIST_STRUCTURE).forEach(cat => {
                cat.items.forEach(item => {
                    total++;
                    const status = this.state.get().dossierReviewState?.[item.id];
                    const conversation = conversations[`dossier-${item.id}`];

                    // Total counts conversations (consistent with other tabs)
                    // But for Dossier, we often want to know what's left to process
                    const hasComment = conversation && conversation.thread?.length > 0;

                    if (!status) pending++;
                    // Note: resolved is tricky here as it's about comments. 
                    // Let's stick to comment status for resolved/pending logic
                    if (hasComment) {
                        const convStatus = this.getConversationStatus(conversation);
                        if (convStatus === 'resolved') resolved++;
                        // If we already counted it as pending because of NC, we don't double count for comment
                    }
                });
            });
            // Overwrite total to be the number of comments for the sidebar counter consistency
            const dossierCommentCount = Object.keys(conversations).filter(k => k.startsWith('dossier-') && conversations[k].thread?.length > 0).length;
            total = dossierCommentCount;
        }

        console.log(`--- Finished refreshing for ${tabId}. Total: ${total} ---`);
        this.updateElementText(`${tabId}PendingCount`, pending);
        this.updateElementText(`${tabId}ResolvedCount`, resolved);
        this.updateElementText(`${tabId}TotalCount`, total);

        this.updateElementText(`${tabId}CommentCounter`, total > 0 ? total : '');
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
        const createFilterHandler = (tab, filterName) => {
            return (e) => {
                const value = e.target.value;
                const activeFilters = {
                    ...this.state.get().activeFilters
                };
                activeFilters[tab][filterName] = value;
                this.state.setState({
                    activeFilters
                });
            };
        };

        const setupListener = (elementId, eventType, tab, filterName) => {
            const element = document.getElementById(elementId);
            if (element) {
                // To prevent multiple listeners, we can store the handler on the element
                const handler = debounce(createFilterHandler(tab, filterName), 300);
                if (element._filterHandler) {
                    element.removeEventListener(eventType, element._filterHandler);
                }
                element.addEventListener(eventType, handler);
                element._filterHandler = handler;
            }
        };

        // Profile Filters
        setupListener('profileCommentStatusFilter', 'change', 'profil', 'status');
        setupListener('profileSearchInput', 'keyup', 'profil', 'search');

        // Checklist Filters
        setupListener('chapterFilter', 'change', 'checklist', 'chapter');
        setupListener('scoreFilter', 'change', 'checklist', 'score');
        setupListener('commentStatusFilter', 'change', 'checklist', 'status');
        setupListener('searchInput', 'keyup', 'checklist', 'search');

        // Non-Conformities Filters
        setupListener('ncTypeFilter', 'change', 'nonconformites', 'type');
        setupListener('ncChapterFilter', 'change', 'nonconformites', 'chapter');
        setupListener('correctionFilter', 'change', 'nonconformites', 'correction');
        setupListener('ncSearchInput', 'keyup', 'nonconformites', 'search');


        // These are now handled by state changes, but we keep the window binding for the UI buttons
        window.showAll = () => this.showAll();
        window.showOnlyWithComments = () => this.showOnlyWithComments();

        // QUICK FILTER BUTTONS (Added)
        const setupButtonFilter = (btnId, actions) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                // Remove potential existing listeners if needed, or just add one.
                // Since this might be called multiple times, we should probably handle it, but simple add is fine for now if not re-run often.
                // Ideally use the same _handler pattern if we want to be safe.
                const handler = (e) => {
                    e.preventDefault();
                    const activeFilters = { ...this.state.get().activeFilters };
                    actions(activeFilters.checklist);
                    this.state.setState({ activeFilters });
                };
                if (btn._clickHandler) btn.removeEventListener('click', btn._clickHandler);
                btn.addEventListener('click', handler);
                btn._clickHandler = handler;
            }
        };

        setupButtonFilter('filter-nc', (filters) => {
            filters.score = 'B,C,D';
            filters.chapter = '';
            filters.simpleFilter = 'NC';
        });

        setupButtonFilter('filter-na', (filters) => {
            filters.score = 'NA';
            filters.chapter = '';
            filters.simpleFilter = 'NA';
        });

        setupButtonFilter('filter-comments-only', (filters) => {
            filters.status = 'with_comments';
            filters.simpleFilter = 'HAS_COMMENT';
        });

        setupButtonFilter('filter-all', (filters) => {
            filters.chapter = '';
            filters.score = '';
            filters.status = '';
            filters.search = '';
            filters.simpleFilter = null;
        });

        window.setAuditorTaskFilter = (filterType) => {
            const activeFilters = { ...this.state.get().activeFilters };
            if (activeFilters.auditorTasks) {
                activeFilters.auditorTasks.filter = filterType;
                this.state.setState({ activeFilters });
            }
        };

        window.updateCertificationDecision = () => this.updateCertificationDecision();
    }

    showAll() {
        const activeFilters = { ...this.state.get().activeFilters };
        // Reset all filters
        activeFilters.profil.status = '';
        activeFilters.profil.search = '';
        activeFilters.checklist.chapter = '';
        activeFilters.checklist.score = '';
        activeFilters.checklist.status = '';
        activeFilters.checklist.search = '';
        activeFilters.checklist.simpleFilter = null;

        this.state.setState({ activeFilters });
    }

    showOnlyWithComments() {
        const activeFilters = { ...this.state.get().activeFilters };
        activeFilters.profil.status = 'with_comments';
        activeFilters.checklist.status = 'with_comments';
        activeFilters.checklist.simpleFilter = 'HAS_COMMENT';

        this.state.setState({ activeFilters });
    }

    filterChecklist() {
        const filters = this.state.get().activeFilters.checklist;
        const {
            chapter,
            score,
            status: commentStatus,
            search
        } = filters;

        // Update UI to reflect state
        const chapterFilterEl = document.getElementById('chapterFilter');
        if (chapterFilterEl) chapterFilterEl.value = chapter;
        const scoreFilterEl = document.getElementById('scoreFilter');
        if (scoreFilterEl) scoreFilterEl.value = score;
        const commentStatusFilterEl = document.getElementById('commentStatusFilter');
        if (commentStatusFilterEl) commentStatusFilterEl.value = commentStatus;
        const searchInputEl = document.getElementById('searchInput');
        if (searchInputEl) searchInputEl.value = search;


        const rows = document.querySelectorAll('#checklistTableBody tr');
        if (!rows || rows.length === 0) return;

        rows.forEach(row => {
            if (row.cells.length <= 1) return; // Ignore placeholder rows

            let show = true;
            const rowChapter = row.dataset.chapter;
            const rowScore = row.dataset.score;
            const rowCommentStatus = row.dataset.commentStatus;
            const rowTextContent = row.textContent.toLowerCase();

            if (chapter && rowChapter !== chapter) {
                show = false;
            }
            if (score) {
                const scores = score.split(',');
                if (!scores.includes(rowScore)) {
                    show = false;
                }
            }

            if (commentStatus) {
                if (commentStatus === 'with_comments') {
                    if (rowCommentStatus === 'none') show = false;
                } else {
                    if (rowCommentStatus !== commentStatus) show = false;
                }
            }

            if (search && !rowTextContent.includes(search)) {
                show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }

    filterNonConformities() {
        const filters = this.state.get().activeFilters.nonconformites;
        const {
            type,
            chapter,
            correction,
            search
        } = filters;

        // Update UI to reflect state
        const ncTypeFilterEl = document.getElementById('ncTypeFilter');
        if (ncTypeFilterEl) ncTypeFilterEl.value = type;
        const ncChapterFilterEl = document.getElementById('ncChapterFilter');
        if (ncChapterFilterEl) ncChapterFilterEl.value = chapter;
        const correctionFilterEl = document.getElementById('correctionFilter');
        if (correctionFilterEl) correctionFilterEl.value = correction;
        const ncSearchInputEl = document.getElementById('ncSearchInput');
        if (ncSearchInputEl) ncSearchInputEl.value = search;


        const rows = document.querySelectorAll('#nonConformitiesTableBody tr');
        if (!rows || rows.length === 0) return;

        rows.forEach(row => {
            if (row.cells.length <= 1) return;

            let show = true;
            const rowType = row.dataset.score; // Assuming type filter is based on score
            const rowChapter = row.dataset.chapter;
            const rowCommentStatus = row.dataset.commentStatus;
            const rowTextContent = row.textContent.toLowerCase();

            if (type) {
                const scores = type.split(',');
                if (!scores.includes(rowType)) {
                    show = false;
                }
            }
            if (chapter && rowChapter !== chapter) {
                show = false;
            }
            if (correction) {
                const hasComments = rowCommentStatus !== 'none';
                if (correction === 'with' && !hasComments) {
                    show = false;
                }
                if (correction === 'without' && hasComments) {
                    show = false;
                }
                if (correction === 'pending' && rowCommentStatus !== 'pending') {
                    show = false;
                }
            }
            if (search && !rowTextContent.includes(search)) {
                show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }
    filterProfileTable() {
        const filters = this.state.get().activeFilters.profil;
        const { status, search } = filters;

        // Update UI to reflect state
        const statusElement = document.getElementById('profileCommentStatusFilter');
        if (statusElement) statusElement.value = status;
        const searchElement = document.getElementById('profileSearchInput');
        if (searchElement) searchElement.value = search;

        const categories = document.querySelectorAll('#companyProfileTable .profile-category-details');
        if (!categories || categories.length === 0) return;

        categories.forEach(details => {
            const rows = details.querySelectorAll('tbody tr');
            let visibleRowsInCategory = 0;

            rows.forEach(row => {
                let show = true;
                const rowCommentStatus = row.dataset.commentStatus;
                const hasComments = rowCommentStatus !== 'none';
                const rowTextContent = row.textContent.toLowerCase();

                if (status) {
                    if (status === 'with_comments' && !hasComments) show = false;
                    if (status === 'none' && hasComments) show = false;
                    if (status === 'pending' && rowCommentStatus !== 'pending') show = false;
                    if (status === 'waiting' && rowCommentStatus !== 'waiting') show = false;
                    if (status === 'read' && rowCommentStatus !== 'read') show = false;
                    if (status === 'resolved' && rowCommentStatus !== 'resolved') show = false;
                }

                if (search && !rowTextContent.includes(search)) show = false;

                row.style.display = show ? '' : 'none';
                if (show) visibleRowsInCategory++;
            });

            // Hide/Show section and auto-expand explicitly if search is active
            if (visibleRowsInCategory > 0) {
                details.style.display = '';
                // Auto-expand on search/filter to show results, but otherwise respect this.openProfileCategories
                if (search.trim().length > 0 || (status && status !== '')) {
                    details.open = true;
                }
            } else {
                details.style.display = 'none';
            }
        });
    }

    renderDossierTable() {
        const container = document.getElementById('dossierTableContainer');
        if (!container) return;

        // Ensure UI state
        if (!this.dossierUiState) {
            this.dossierUiState = { filter: 'all', openCategories: new Set() };
        }

        const state = this.state.get();
        const conversations = state.conversations || {};
        const reviewState = state.dossierReviewState || {};
        const currentFilter = this.dossierUiState.filter;

        // Statistics
        let allItems = [];
        Object.values(DataProcessor.REVIEW_CHECKLIST_STRUCTURE).forEach(cat => {
            cat.items.forEach(item => allItems.push({ ...item, categoryKey: cat.titre }));
        });

        const counts = {
            all: allItems.length,
            todo: allItems.filter(i => !reviewState[i.id]).length,
            problem: allItems.filter(i => reviewState[i.id] === 'nok').length,
            comments: allItems.filter(i => conversations[`dossier-${i.id}`]?.thread?.length > 0).length
        };

        // Local Window Helpers
        window.setDossierFilter = (f) => { this.dossierUiState.filter = f; this.renderDossierTable(); };
        window.toggleDossierCategory = (k) => {
            if (this.dossierUiState.openCategories.has(k)) this.dossierUiState.openCategories.delete(k);
            else this.dossierUiState.openCategories.add(k);
            this.renderDossierTable();
        };

        const themeColor = 'var(--color-theme-600, #3b82f6)';
        const successColor = 'var(--color-success, #10b981)';
        const dangerColor = 'var(--color-danger, #ef4444)';
        const grayColor = 'var(--color-gray-500, #64748b)';

        let html = `
            <style>
                .dossier-modern-tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--border-primary); margin-bottom: 24px; padding-bottom: 2px; }
                .dossier-tab-btn { background: none; border: none; padding: 12px 4px; font-size: 14px; font-weight: 600; color: var(--text-tertiary); cursor: pointer; position: relative; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
                .dossier-tab-btn.active { color: ${themeColor}; }
                .dossier-tab-btn.active::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 3px; background: ${themeColor}; border-radius: 3px; }
                .dossier-card { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; margin-bottom: 20px; box-shadow: var(--shadow-sm); overflow: hidden; }
                .dossier-cat-header { padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s; }
                .dossier-cat-header:hover { background: var(--color-gray-50); }
                .dossier-item-row { display: grid; grid-template-columns: 1fr auto auto; gap: 24px; padding: 16px 24px; align-items: center; border-top: 1px solid var(--border-primary); }
                .dossier-validation-group { display: flex; gap: 8px; }
                .dossier-v-btn { height: 36px; padding: 0 16px; border-radius: 18px; border: 1.5px solid var(--border-primary); background: transparent; color: var(--text-secondary); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
                .dossier-v-btn:hover { background: var(--color-gray-100); border-color: var(--color-gray-400); }
                .btn-ok.active { background: ${successColor}; border-color: ${successColor}; color: white; box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.4); }
                .btn-nok.active { background: ${dangerColor}; border-color: ${dangerColor}; color: white; box-shadow: 0 4px 12px -2px rgba(239, 68, 68, 0.4); }
                .btn-na.active { background: ${grayColor}; border-color: ${grayColor}; color: white; }
                .comment-btn-modern { width: 40px; height: 40px; border-radius: 10px; background: var(--color-gray-100); border: none; color: var(--color-gray-500); cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.2s; }
                .comment-btn-modern:hover { background: var(--color-theme-50); color: ${themeColor}; }
                .comment-btn-modern.has-comments { background: var(--color-theme-100); color: ${themeColor}; border: 1px solid var(--color-theme-200); }
                .v-badge { position: absolute; top: -6px; right: -6px; background: ${themeColor}; color: white; font-size: 9px; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .status-dot { width: 8px; height: 8px; border-radius: 4px; background: var(--border-primary); }
                .status-dot.complete { background: ${successColor}; }
            </style>

            <div class="dossier-modern-tabs">
                <button onclick="window.setDossierFilter('all')" class="dossier-tab-btn ${currentFilter === 'all' ? 'active' : ''}">Tout (${counts.all})</button>
                <button onclick="window.setDossierFilter('todo')" class="dossier-tab-btn ${currentFilter === 'todo' ? 'active' : ''}">À traiter (${counts.todo})</button>
                <button onclick="window.setDossierFilter('problem')" class="dossier-tab-btn ${currentFilter === 'problem' ? 'active' : ''}">Points NOK (${counts.problem})</button>
                <button onclick="window.setDossierFilter('comments')" class="dossier-tab-btn ${currentFilter === 'comments' ? 'active' : ''}">Commentaires (${counts.comments})</button>
            </div>

            <div class="dossier-content-area">
        `;

        for (const [key, category] of Object.entries(DataProcessor.REVIEW_CHECKLIST_STRUCTURE)) {
            const items = category.items;
            const completed = items.filter(i => reviewState[i.id]).length;
            const isAllDone = completed === items.length;

            const visibleItems = items.filter(item => {
                const s = reviewState[item.id];
                const hasC = conversations[`dossier-${item.id}`]?.thread?.length > 0;
                if (currentFilter === 'todo') return !s;
                if (currentFilter === 'problem') return s === 'nok';
                if (currentFilter === 'comments') return hasC;
                return true;
            });

            if (visibleItems.length === 0 && currentFilter !== 'all') continue;

            const isOpen = this.dossierUiState.openCategories.has(key) || currentFilter !== 'all';

            html += `
                <div class="dossier-card" style="border-left: 5px solid ${isAllDone ? successColor : 'var(--border-primary)'}">
                    <div class="dossier-cat-header" onclick="window.toggleDossierCategory('${key}')">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div class="status-dot ${isAllDone ? 'complete' : ''}"></div>
                            <div>
                                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">${category.titre}</h3>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-tertiary);">${category.sous_titres || ''}</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                             <span style="font-size: 10px; font-weight: 800; color: var(--color-theme-600); cursor: pointer;" onclick="event.stopPropagation(); window.markCategoryNA('${key}')">TOUT N/A</span>
                             <span style="font-size: 10px; font-weight: 800; color: ${successColor}; cursor: pointer;" onclick="event.stopPropagation(); window.markCategoryValid('${key}')">TOUT VALIDE</span>
                             <span style="font-size: 13px; font-weight: 700; color: ${isAllDone ? successColor : 'var(--text-tertiary)'}">${completed} / ${items.length}</span>
                             <i class="fas fa-chevron-down" style="color: var(--color-gray-400); transition: transform 0.3s; transform: rotate(${isOpen ? '180deg' : '0deg'})"></i>
                        </div>
                    </div>

                    <div class="dossier-cat-content" style="display: ${isOpen ? 'block' : 'none'}">
            `;

            visibleItems.forEach(item => {
                const fieldId = `dossier-${item.id}`;
                const conv = conversations[fieldId];
                const threadLen = conv?.thread?.length || 0;
                const status = reviewState[item.id];

                html += `
                    <div class="dossier-item-row">
                        <div class="item-info">
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${item.nom}</div>
                            <div style="font-size: 11px; color: var(--text-tertiary); line-height: 1.4;">${item.description || ''}</div>
                        </div>
                        
                        <div class="dossier-validation-group">
                            <button onclick="window.toggleDossierStatus('${item.id}', 'ok')" class="dossier-v-btn btn-ok ${status === 'ok' ? 'active' : ''}">
                                <i class="fas fa-check-circle"></i> VALIDE
                            </button>
                            <button onclick="window.toggleDossierStatus('${item.id}', 'nok')" class="dossier-v-btn btn-nok ${status === 'nok' ? 'active' : ''}">
                                <i class="fas fa-exclamation-circle"></i> ÉCART
                            </button>
                            <button onclick="window.toggleDossierStatus('${item.id}', 'na')" class="dossier-v-btn btn-na ${status === 'na' ? 'active' : ''}">
                                N/A
                            </button>
                        </div>

                        <div class="item-actions">
                            <button class="comment-btn-modern ${threadLen > 0 ? 'has-comments' : ''}" onclick="const r=this.closest('.dossier-item-row'); r.setAttribute('data-field-id', '${fieldId}'); openCommentModal(r)">
                                <i class="fas fa-comment-dots" style="font-size: 18px;"></i>
                                ${threadLen > 0 ? `<div class="v-badge">${threadLen}</div>` : ''}
                            </button>
                        </div>
                    </div>
                `;
            });

            if (visibleItems.length === 0) {
                html += `<div style="padding: 30px; text-align: center; color: var(--text-tertiary); font-style: italic; font-size: 13px;">Aucun point dans cette sélection.</div>`;
            }

            html += `</div></div>`;
        }

        html += `</div>`;
        container.innerHTML = html;

        // Ensure global functions
        if (!window.markCategoryNA) {
            window.markCategoryNA = (k) => {
                const cat = DataProcessor.REVIEW_CHECKLIST_STRUCTURE[k];
                if (!cat) return;
                const cur = this.state.get().dossierReviewState || {};
                const upd = {};
                cat.items.forEach(i => { if (!cur[i.id]) upd[i.id] = 'na'; });
                this.state.setState({ dossierReviewState: { ...cur, ...upd } });
                this.renderDossierTable();
            };
        }

        if (!window.markCategoryValid) {
            window.markCategoryValid = (k) => {
                const cat = DataProcessor.REVIEW_CHECKLIST_STRUCTURE[k];
                if (!cat) return;
                const cur = this.state.get().dossierReviewState || {};
                const upd = {};
                cat.items.forEach(i => { if (!cur[i.id]) upd[i.id] = 'ok'; });
                this.state.setState({ dossierReviewState: { ...cur, ...upd } });
                this.renderDossierTable();
            };
        }

        if (!window.toggleDossierStatus) {
            window.toggleDossierStatus = (id, s) => {
                const cur = this.state.get().dossierReviewState || {};
                const next = cur[id] === s ? null : s;
                this.state.setState({ dossierReviewState: { ...cur, [id]: next } });
                this.renderDossierTable();
            };
        }
    }

    updateCertificationDecision() {
        // Collect data from the form
        const date = document.getElementById('decisionDate')?.value;
        const maker = document.getElementById('decisionMaker')?.value;
        const result = document.getElementById('certificationResult')?.value;
        const comments = document.getElementById('decisionComment')?.value;

        // Update state
        const certificationDecisionData = {
            date,
            maker,
            result,
            comments,
            lastUpdated: new Date().toISOString()
        };

        this.state.setState({
            certificationDecisionData,
            hasUnsavedChanges: true
        });

        console.log('💾 Certification decision saved to state:', certificationDecisionData);
    }

    renderCertificationDecision() {
        const data = this.state.get().certificationDecisionData || {};

        const dateEl = document.getElementById('decisionDate');
        const makerEl = document.getElementById('decisionMaker');
        const resultEl = document.getElementById('certificationResult');
        const commentEl = document.getElementById('decisionComment');

        if (dateEl) dateEl.value = data.date || '';
        if (makerEl) makerEl.value = data.maker || '';
        if (resultEl) resultEl.value = data.result || '';
        if (commentEl) commentEl.value = data.comments || '';
    }



    sanitizeFieldId(str) {
        if (!str) return '';
        // Convert to string, lowercase, and replace spaces with hyphens
        let sanitized = str.toString().toLowerCase().replace(/\s+/g, '-');
        // Remove all characters that are not alphanumeric, a hyphen, or an underscore
        sanitized = sanitized.replace(/[^\w\-]/g, '');
        // Replace multiple hyphens with a single one
        sanitized = sanitized.replace(/\-\-+/g, '-');
        // Trim hyphens from the start and end
        sanitized = sanitized.replace(/^-+/, '').replace(/-+$/, '');
        return sanitized;
    }
}