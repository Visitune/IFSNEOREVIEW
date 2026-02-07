function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDate(date) {
    return new Date(date).toLocaleString('fr-FR');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function sanitizeFieldId(fieldName) {
    return fieldName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

function unsanitizeFieldId(fieldId) {
    const mapping = {
        'nom-du-site-à-auditer': 'Nom du site à auditer',
        'n-coid-du-portail': 'N° COID du portail',
    };
    return mapping[fieldId] || fieldId.replace(/-/g, ' ');
}