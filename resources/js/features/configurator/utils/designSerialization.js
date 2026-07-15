import { DEFAULT_SHIRT_COLORS } from '../config/shirtZones';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';
import {
    createDefaultPatternColors,
    createDefaultPatternZones,
} from '../config/patterns';
import { DEFAULT_PRODUCT_ID, PRODUCTS_BY_ID } from '../config/productCatalog';
import { constrainDesignObject } from './designObjectConstraints';

export const LOCAL_DESIGN_STORAGE_KEY = 'promoplus-configurator-design-v1';
export const LOCAL_DESIGN_SCHEMA_VERSION = 1;
export const PRODUCT_ID = DEFAULT_PRODUCT_ID;

export function createLocalDesignPayload(state) {
    return {
        schemaVersion: LOCAL_DESIGN_SCHEMA_VERSION,
        productId: state.product.id,
        shirtColors: state.shirtColors,
        selectedPatternId: state.selectedPatternId,
        patternColors: state.patternColors,
        patternZones: state.patternZones,
        designObjects: state.designObjects,
        activeDesignAreaId: state.activeDesignAreaId,
        updatedAt: new Date().toISOString(),
    };
}

export function parseLocalDesign(rawValue) {
    const value = JSON.parse(rawValue);

    if (
        value?.schemaVersion !== LOCAL_DESIGN_SCHEMA_VERSION ||
        !PRODUCTS_BY_ID[value?.productId] ||
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
    ).map((object) => constrainDesignObject(object, DESIGN_AREAS_BY_ID[object.areaId]));
    const product = PRODUCTS_BY_ID[value.productId];
    const patterns = product.patterns ?? [];
    const defaultPatternColors = createDefaultPatternColors(patterns);
    const patternColors = Object.fromEntries(
        patterns.map((pattern) => [
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
    const selectedPatternId = patterns.some((pattern) => pattern.id === value.selectedPatternId)
        ? value.selectedPatternId
        : null;
    const defaultPatternZones = createDefaultPatternZones(product.patternZones);
    const patternZones = Object.fromEntries(
        Object.keys(defaultPatternZones).map((zoneId) => [
            zoneId,
            typeof value.patternZones?.[zoneId] === 'boolean'
                ? value.patternZones[zoneId]
                : (zoneId === 'front' || zoneId === 'back') &&
                    typeof value.patternZones?.body === 'boolean'
                    ? value.patternZones.body
                : defaultPatternZones[zoneId],
        ]),
    );

    return {
        productId: value.productId,
        shirtColors: { ...DEFAULT_SHIRT_COLORS, ...product.defaultColors, ...value.shirtColors },
        selectedPatternId,
        patternColors,
        patternZones,
        designObjects: validObjects,
        activeDesignAreaId: DESIGN_AREAS_BY_ID[value.activeDesignAreaId]
            ? value.activeDesignAreaId
            : 'front',
        updatedAt: value.updatedAt ?? null,
    };
}
