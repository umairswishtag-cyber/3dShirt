import { useEffect } from 'react';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export function useConfiguratorKeyboardShortcuts() {
    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
                return;
            }

            const state = useConfiguratorStore.getState();
            const modifier = event.ctrlKey || event.metaKey;

            if (modifier && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                event.shiftKey ? state.redo() : state.undo();
                return;
            }

            if (modifier && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                state.redo();
                return;
            }

            if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedObjectId) {
                event.preventDefault();
                state.removeDesignObject(state.selectedObjectId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

