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

export function useDesignTexture(areaId, layer = 'composite') {
    const invalidate = useThree((state) => state.invalidate);
    const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
    const objects = useConfiguratorStore(
        (state) => state.designObjects.filter((object) => object.areaId === areaId),
        shallow,
    );
    const selectedPatternId = useConfiguratorStore((state) => state.selectedPatternId);
    const selectedPattern = useConfiguratorStore((state) =>
        state.product.patterns?.find((pattern) => pattern.id === state.selectedPatternId),
    );
    const patternColors = useConfiguratorStore((state) =>
        state.selectedPatternId
            ? state.patternColors[state.selectedPatternId]
            : null,
    );
    const patternEnabled = useConfiguratorStore(
        (state) => state.patternZones[areaId],
    );
    const logoBounds = useConfiguratorStore(
        (state) => state.product.model.printAreas?.[areaId]?.logoBounds ?? null,
    );
    const canvas = useMemo(
        () => getDesignTextureCanvas(areaId, layer),
        [areaId, layer],
    );
    const texture = useMemo(() => {
        const nextTexture = new CanvasTexture(canvas);
        nextTexture.colorSpace = SRGBColorSpace;
        nextTexture.flipY = DESIGN_AREAS_BY_ID[areaId]?.texture.flipY ?? false;
        nextTexture.anisotropy = maxAnisotropy;
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [areaId, canvas, maxAnisotropy]);

    useEffect(() => {
        let active = true;

        const includesObjects = layer !== 'pattern';
        const includesPattern = layer !== 'logos';

        renderDesignArea(areaId, includesObjects ? objects : [], {
            id: includesPattern && patternEnabled ? selectedPatternId : null,
            pattern: includesPattern && patternEnabled ? selectedPattern : null,
            colors: patternColors,
        }, layer, layer === 'logos' ? logoBounds : null).then(() => {
            if (!active) return;
            texture.needsUpdate = true;
            invalidate();
        });

        return () => {
            active = false;
        };
    }, [areaId, invalidate, layer, logoBounds, objects, patternColors, patternEnabled, selectedPattern, selectedPatternId, texture]);

    useEffect(() => () => texture.dispose(), [texture]);

    return texture;
}
