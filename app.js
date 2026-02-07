// Initialize IndexedDB Handler
const dbHandler = new IndexedDBHandler();
const state = new State(dbHandler);
const dataProcessor = new DataProcessor(state);
const fileHandler = new FileHandler(state);
const uiManager = new UIManager(state, dataProcessor, fileHandler);

// Expose to window for inline event handlers and global access
window.uiManager = uiManager;
window.dataProcessor = dataProcessor;
window.fileHandler = fileHandler;

dataProcessor.setUIManager(uiManager);
fileHandler.setUIManager(uiManager);
fileHandler.setDataProcessor(dataProcessor);

state.loadInitialData().then(() => {
    console.log('Initial data loaded from IndexedDB');
    uiManager.initUI();
});