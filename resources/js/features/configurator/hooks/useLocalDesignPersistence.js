import { useEffect } from 'react';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export function useLocalDesignPersistence(enabled = true) {
    const loadLocalDesign = useConfiguratorStore((state) => state.loadLocalDesign);

    useEffect(() => {
        if (!enabled) return;
        loadLocalDesign();
    }, [enabled, loadLocalDesign]);
}
