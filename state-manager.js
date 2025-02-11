export class StateManager {
    constructor() {
        this.STORAGE_KEY = 'currentBookState';
    }

    saveBookState(state) {
        try {
            const bookState = {
                text: state.text,
                fileName: state.fileName,
                lastPage: state.lastPage,
                timestamp: new Date().getTime()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookState));
        } catch (error) {
            console.error('Klaida išsaugant knygos būseną:', error);
        }
    }

    loadBookState() {
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            return savedState ? JSON.parse(savedState) : null;
        } catch (error) {
            console.error('Klaida įkeliant knygos būseną:', error);
            return null;
        }
    }

    clearBookState() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
