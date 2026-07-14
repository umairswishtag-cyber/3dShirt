import { useEffect } from 'react';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export function useLocalDesignPersistence() {
    const loadLocalDesign = useConfiguratorStore((state) => state.loadLocalDesign);

    useEffect(() => {
        loadLocalDesign();
    }, [loadLocalDesign]);
}
