import { DEFAULT_SHIRT_COLORS } from '../config/shirtZones';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';

export const LOCAL_DESIGN_STORAGE_KEY = 'promoplus-configurator-design-v1';
export const LOCAL_DESIGN_SCHEMA_VERSION = 1;
export const PRODUCT_ID = 'basic-tshirt';

export function createLocalDesignPayload(state) {
    return {
        schemaVersion: LOCAL_DESIGN_SCHEMA_VERSION,
        productId: PRODUCT_ID,
        shirtColors: state.shirtColors,
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

    return {
        shirtColors: { ...DEFAULT_SHIRT_COLORS, ...value.shirtColors },
        designObjects: validObjects,
        activeDesignAreaId: DESIGN_AREAS_BY_ID[value.activeDesignAreaId]
            ? value.activeDesignAreaId
            : 'front',
        updatedAt: value.updatedAt ?? null,
    };
}
