export class StateManager {
    constructor() {
        this.APP_NAME = '[StateManager]';
        this.STORAGE_KEY = 'currentBookState';
    }

    saveBookState(state) {
        try {
            console.log(`${this.APP_NAME} Išsaugoma knygos būsena`);
            const bookState = {
                text: state.text,
                fileName: state.fileName,
                lastPage: state.lastPage,
                timestamp: new Date().getTime()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookState));
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida išsaugant knygos būseną:`, error);
        }
    }

    loadBookState() {
        try {
            console.log(`${this.APP_NAME} Bandoma užkrauti knygos būseną`);
            const savedState = localStorage.getItem(this.STORAGE_KEY);
            if (savedState) {
                console.log(`${this.APP_NAME} Rasta išsaugota knygos būsena`);
                return JSON.parse(savedState);
            }
            console.log(`${this.APP_NAME} Nerasta išsaugota knygos būsena`);
            return null;
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida įkeliant knygos būseną:`, error);
            return null;
        }
    }

    clearBookState() {
        try {
            console.log(`${this.APP_NAME} Išvaloma knygos būsena`);
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida valant knygos būseną:`, error);
        }
    }

    hasBookState() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }
}
