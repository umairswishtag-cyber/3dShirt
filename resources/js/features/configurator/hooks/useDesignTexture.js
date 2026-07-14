import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { shallow } from 'zustand/shallow';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';
import {
    getDesignTextureCanvas,
    renderDesignArea,
} from '../canvas/designTextureManager';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export function useDesignTexture(areaId) {
    const invalidate = useThree((state) => state.invalidate);
    const objects = useConfiguratorStore(
        (state) => state.designObjects.filter((object) => object.areaId === areaId),
        shallow,
    );
    const selectedPatternId = useConfiguratorStore((state) => state.selectedPatternId);
    const patternColors = useConfiguratorStore((state) =>
        state.selectedPatternId
            ? state.patternColors[state.selectedPatternId]
            : null,
    );
    const canvas = useMemo(() => getDesignTextureCanvas(areaId), [areaId]);
    const texture = useMemo(() => {
        const nextTexture = new CanvasTexture(canvas);
        nextTexture.colorSpace = SRGBColorSpace;
        nextTexture.flipY = DESIGN_AREAS_BY_ID[areaId].texture.flipY;
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [areaId, canvas]);

    useEffect(() => {
        let active = true;

        renderDesignArea(areaId, objects, {
            id: selectedPatternId,
            colors: patternColors,
        }).then(() => {
            if (!active) return;
            texture.needsUpdate = true;
            invalidate();
        });

        return () => {
            active = false;
        };
    }, [areaId, invalidate, objects, patternColors, selectedPatternId, texture]);

    useEffect(() => () => texture.dispose(), [texture]);

    return texture;
}
