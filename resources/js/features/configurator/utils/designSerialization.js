import { DEFAULT_SHIRT_COLORS } from '../config/shirtZones';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';
import {
    createDefaultPatternColors,
    SHIRT_PATTERNS,
    SHIRT_PATTERNS_BY_ID,
} from '../config/patterns';

export const LOCAL_DESIGN_STORAGE_KEY = 'promoplus-configurator-design-v1';
export const LOCAL_DESIGN_SCHEMA_VERSION = 1;
export const PRODUCT_ID = 'basic-tshirt';

export function createLocalDesignPayload(state) {
    return {
        schemaVersion: LOCAL_DESIGN_SCHEMA_VERSION,
        productId: PRODUCT_ID,
        shirtColors: state.shirtColors,
        selectedPatternId: state.selectedPatternId,
        patternColors: state.patternColors,
        designObjects: state.designObjects,
        activeDesignAreaId: state.activeDesignAreaId,
        updatedAt: new Date().toISOString(),
    };
}

export function parseLocalDesign(rawValue) {
    const value = JSON.parse(rawValue);

    if (
        value?.schemaVersion !== LOCAL_DESIGN_SCHEMA_VERSION ||
        value?.productId !== PRODUCT_ID ||
        !Array.isArray(value?.designObjects) ||
        !value?.shirtColors
    ) {
        throw new Error('This saved design is not compatible with the current configurator.');
    }

    const validObjects = value.designObjects.filter(
        (object) =>
            object &&
            object.type === 'image' &&
            typeof object.id === 'string' &&
            Boolean(DESIGN_AREAS_BY_ID[object.areaId]) &&
            typeof object.source === 'string',
    );
    const defaultPatternColors = createDefaultPatternColors();
    const patternColors = Object.fromEntries(
        SHIRT_PATTERNS.map((pattern) => [
            pattern.id,
            Object.fromEntries(
                pattern.colors.map((slot) => {
                    const savedColor = value.patternColors?.[pattern.id]?.[slot.id];
                    return [
                        slot.id,
                        typeof savedColor === 'string' && /^#[0-9A-F]{6}$/i.test(savedColor)
                            ? savedColor.toUpperCase()
                            : defaultPatternColors[pattern.id][slot.id],
                    ];
                }),
            ),
        ]),
    );
    const selectedPatternId = SHIRT_PATTERNS_BY_ID[value.selectedPatternId]
        ? value.selectedPatternId
        : null;

    return {
        shirtColors: { ...DEFAULT_SHIRT_COLORS, ...value.shirtColors },
        selectedPatternId,
        patternColors,
        designObjects: validObjects,
        activeDesignAreaId: DESIGN_AREAS_BY_ID[value.activeDesignAreaId]
            ? value.activeDesignAreaId
            : 'front',
        updatedAt: value.updatedAt ?? null,
    };
}
