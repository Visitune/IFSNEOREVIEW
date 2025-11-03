# IFS NEO Reviewer

Outil d'assistance pour les auditeurs et reviewers travaillant sur les référentiels IFS (International Featured Standards).

L'application permet de charger des fichiers d'audit, de naviguer dans les exigences, d'ajouter des commentaires et de suivre le statut de chaque point.

## Guide d'utilisation détaillé

Ce guide vous accompagnera à travers les fonctionnalités clés de l'application.

### 1. Démarrage de l'application

1.  **Ouvrez le fichier `index.html`** dans votre navigateur web préféré (Chrome, Firefox, Edge, etc.). L'application se chargera automatiquement.

### 2. Chargement des données d'audit

1.  **Chargez un fichier d'audit :**
    *   Cliquez sur la zone d'upload au centre de l'écran ou sur le bouton "Charger un audit" dans la barre latérale.
    *   Sélectionnez un fichier d'audit au format `.ifsr` (fichier de revue IFS) ou un package de revue au format `.ifsp` (package de réponse auditeur).
    *   Les données seront chargées et affichées dans les différents onglets.

### 3. Navigation et analyse

1.  **Onglets principaux :**
    *   **"Profil" :** Affiche les informations générales de l'entreprise auditée et un résumé de l'audit.
    *   **"Checklist" :** Présente la liste complète des exigences IFS. Vous pouvez filtrer les exigences (toutes, avec commentaires uniquement) et interagir avec chaque ligne.
    *   **"Non-conformités" :** Liste toutes les non-conformités identifiées, avec leur statut.
2.  **Interagir avec les exigences :**
    *   Cliquez sur n'importe quelle ligne dans l'onglet "Checklist" ou "Non-conformités" pour ouvrir la **modale de commentaires**.

### 4. Gestion des modes (Reviewer / Auditeur)

L'application dispose de deux modes d'accès, chacun nécessitant un code spécifique pour basculer :

*   **Mode Reviewer :** Permet d'analyser les exigences, d'ajouter des commentaires initiaux et de marquer les conversations comme résolues.
*   **Mode Auditeur :** Permet de répondre aux commentaires du reviewer et de fournir des informations complémentaires.

Pour basculer entre les modes :

1.  **Cliquez sur le toggle** "Mode Reviewer / Mode Auditeur" situé dans la barre latérale.
2.  Une modale de saisie de code apparaîtra.
3.  **Entrez le code d'accès correspondant au mode souhaité :**
    *   **Code Reviewer :** `CDOECO2025`
    *   **Code Auditeur :** `moldu2025`
4.  Cliquez sur "Valider" ou appuyez sur Entrée. Si le code est correct, l'interface se mettra à jour pour le mode sélectionné.
5.  Vous pouvez utiliser le bouton "Afficher/Masquer" (icône œil) pour voir ou masquer le code que vous saisissez.

### 5. Utilisation de la modale de commentaires

Lorsque vous ouvrez la modale de commentaires :

1.  **Historique de conversation :** Visualisez tous les échanges précédents pour le champ sélectionné.
2.  **Ajouter un commentaire :** Saisissez votre texte dans la zone de saisie.
    *   **Templates :** Utilisez les boutons de template ("Point Qualité", "Correction Requise") pour insérer des structures de commentaires prédéfinies.
    *   **Sauvegarde automatique :** Vos brouillons sont sauvegardés automatiquement.
3.  **Actions spécifiques au mode :**
    *   **En mode Reviewer :** Vous pouvez marquer une conversation comme "Résolue" si l'auditeur a répondu de manière satisfaisante.
    *   **Édition/Suppression :** Vous pouvez éditer ou supprimer vos propres commentaires dans les 5 minutes suivant leur publication.

### 6. Sauvegarde et Exportation

1.  **Sauvegarder le travail en cours :** Cliquez sur "Sauvegarder l'audit" pour enregistrer votre session actuelle.
2.  **Créer un package :**
    *   **Reviewer :** Crée un package `.ifsp` à envoyer à l'auditeur pour qu'il réponde aux commentaires.
    *   **Auditeur :** Crée un package `.ifsp` de réponse à renvoyer au reviewer.
3.  **Exporter :** Exportez les données de l'audit au format Excel ou PDF.

## Contribuer et faire des retours

Ce projet est maintenant sur GitHub pour faciliter le suivi des améliorations et des corrections.

### Signaler un bug ou suggérer une amélioration

Le meilleur moyen de faire un retour est d'ouvrir une "Issue" (un ticket) sur GitHub.

1.  Allez dans l'onglet **Issues** du dépôt GitHub.
2.  Cliquez sur **New Issue**.
3.  Donnez un titre clair et une description détaillée du problème que vous rencontrez ou de l'amélioration que vous suggérez.

C'est le moyen le plus efficace pour moi de suivre et de traiter vos demandes.
