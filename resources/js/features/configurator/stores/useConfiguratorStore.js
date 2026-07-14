import { create } from 'zustand';
import { DESIGN_AREAS_BY_ID } from '../config/designAreas';
import {
    createDefaultPatternColors,
    createDefaultPatternZones,
} from '../config/patterns';
import { DEFAULT_SHIRT_COLORS } from '../config/shirtZones';
import {
    DEFAULT_PRODUCT_ID,
    PRODUCTS_BY_ID,
} from '../config/productCatalog';
import {
    createLocalDesignPayload,
    LOCAL_DESIGN_STORAGE_KEY,
    parseLocalDesign,
} from '../utils/designSerialization';

const MAX_HISTORY_LENGTH = 40;
const productColors = (product) => ({
    ...DEFAULT_SHIRT_COLORS,
    ...(product?.defaultColors ?? {}),
});
const SHIRT_ZONE_PATTERN_AREAS = {
    body: ['front', 'back'],
    leftSleeve: ['leftSleeve'],
    rightSleeve: ['rightSleeve'],
};

const clone = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
};

const createSnapshot = (state) => ({
    shirtColors: { ...state.shirtColors },
    selectedPatternId: state.selectedPatternId,
    patternColors: clone(state.patternColors),
    patternZones: { ...state.patternZones },
    designObjects: state.designObjects.map((object) => ({ ...object })),
});

const restoreSnapshot = (snapshot) => ({
    shirtColors: { ...snapshot.shirtColors },
    selectedPatternId: snapshot.selectedPatternId ?? null,
    patternColors: clone(snapshot.patternColors ?? createDefaultPatternColors()),
    patternZones: { ...(snapshot.patternZones ?? createDefaultPatternZones()) },
    designObjects: snapshot.designObjects.map((object) => ({ ...object })),
});

const pushHistory = (history, snapshot) =>
    [...history, snapshot].slice(-MAX_HISTORY_LENGTH);

const makeObjectId = () =>
    globalThis.crypto?.randomUUID?.() ??
    `design-object-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useConfiguratorStore = create((set, get) => ({
    product: PRODUCTS_BY_ID[DEFAULT_PRODUCT_ID],
    activeDesignAreaId: 'front',
    activeShirtZoneId: 'body',
    cameraView: 'front',
    cameraRequestId: 0,
    shirtColors: { ...DEFAULT_SHIRT_COLORS },
    selectedPatternId: null,
    patternColors: createDefaultPatternColors(PRODUCTS_BY_ID[DEFAULT_PRODUCT_ID]?.patterns),
    patternZones: createDefaultPatternZones(PRODUCTS_BY_ID[DEFAULT_PRODUCT_ID]?.patternZones),
    designObjects: [],
    selectedObjectId: null,
    isDirty: false,
    lastSavedAt: null,
    restoreError: null,
    past: [],
    future: [],
    interactionSnapshot: null,

    selectProduct: (productId) => {
        const product = PRODUCTS_BY_ID[productId];
        if (!product) return false;

        try {
            localStorage.removeItem(LOCAL_DESIGN_STORAGE_KEY);
        } catch {
            // Product selection must still work when storage is restricted.
        }

        set((state) => ({
            product,
            activeDesignAreaId: Object.keys(product.model.printAreas ?? {})[0] ?? 'front',
            activeShirtZoneId: product.colorZones[0] ?? 'body',
            cameraView: 'front',
            cameraRequestId: state.cameraRequestId + 1,
            shirtColors: productColors(product),
            selectedPatternId: null,
            patternColors: createDefaultPatternColors(product.patterns),
            patternZones: createDefaultPatternZones(product.patternZones),
            designObjects: [],
            selectedObjectId: null,
            past: [],
            future: [],
            interactionSnapshot: null,
            isDirty: false,
            lastSavedAt: null,
            restoreError: null,
        }));

        return product;
    },

    setActiveDesignArea: (areaId) => {
        const area = DESIGN_AREAS_BY_ID[areaId];
        if (!area) return;

        set((state) => ({
            activeDesignAreaId: areaId,
            cameraView: area.cameraView,
            cameraRequestId: state.cameraRequestId + 1,
            selectedObjectId: null,
        }));
    },

    setActiveShirtZone: (zoneId) => {
        if (!get().product.colorZones.includes(zoneId)) return;
        set({ activeShirtZoneId: zoneId });
    },

    setCameraView: (cameraView) =>
        set((state) => ({
            cameraView,
            cameraRequestId: state.cameraRequestId + 1,
        })),

    setShirtZoneColor: (zoneId, color) => {
        const state = get();
        const patternAreaIds = SHIRT_ZONE_PATTERN_AREAS[zoneId] ?? [];
        const patternIsEnabled = patternAreaIds.some(
            (areaId) => state.patternZones[areaId] === true,
        );
        if (state.shirtColors[zoneId] === color && !patternIsEnabled) return;

        const patternZones = patternIsEnabled
            ? patternAreaIds.reduce(
                (zones, areaId) => ({ ...zones, [areaId]: false }),
                state.patternZones,
            )
            : state.patternZones;

        set({
            shirtColors: { ...state.shirtColors, [zoneId]: color },
            patternZones,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    setPattern: (patternId) => {
        const state = get();
        const nextPatternId = patternId && state.product.patterns?.some((pattern) => pattern.id === patternId)
            ? patternId
            : null;
        if (state.selectedPatternId === nextPatternId) return;

        set({
            selectedPatternId: nextPatternId,
            patternZones: nextPatternId
                ? createDefaultPatternZones(state.product.patternZones)
                : state.patternZones,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    setPatternColor: (colorId, color) => {
        const state = get();
        const patternId = state.selectedPatternId;
        const pattern = state.product.patterns?.find((item) => item.id === patternId);
        if (!pattern?.colors.some((slot) => slot.id === colorId)) return;
        if (state.patternColors[patternId]?.[colorId] === color) return;

        set({
            patternColors: {
                ...state.patternColors,
                [patternId]: {
                    ...state.patternColors[patternId],
                    [colorId]: color,
                },
            },
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    setPatternZoneEnabled: (zoneId, enabled) => {
        const state = get();
        if (!(zoneId in state.patternZones)) return;
        if (state.patternZones[zoneId] === enabled) return;

        set({
            patternZones: { ...state.patternZones, [zoneId]: enabled },
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    applyPatternToFullShirt: () => {
        const state = get();
        if (!state.selectedPatternId) return;
        if (Object.values(state.patternZones).every(Boolean)) return;

        set({
            patternZones: createDefaultPatternZones(state.product.patternZones),
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    addDesignObject: (object) => {
        const state = get();
        const nextObject = { ...object, id: object.id ?? makeObjectId() };

        set({
            designObjects: [...state.designObjects, nextObject],
            selectedObjectId: nextObject.id,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });

        return nextObject.id;
    },

    updateDesignObject: (objectId, changes, recordHistory = true) => {
        const state = get();
        const object = state.designObjects.find((item) => item.id === objectId);
        if (!object) return;

        const designObjects = state.designObjects.map((item) =>
            item.id === objectId ? { ...item, ...changes } : item,
        );

        set({
            designObjects,
            past: recordHistory
                ? pushHistory(state.past, createSnapshot(state))
                : state.past,
            future: recordHistory ? [] : state.future,
            isDirty: true,
        });
    },

    beginObjectTransform: () => {
        const state = get();
        if (state.interactionSnapshot) return;
        set({ interactionSnapshot: createSnapshot(state) });
    },

    commitObjectTransform: () => {
        const state = get();
        if (!state.interactionSnapshot) return;

        set({
            past: pushHistory(state.past, state.interactionSnapshot),
            future: [],
            interactionSnapshot: null,
            isDirty: true,
        });
    },

    removeDesignObject: (objectId) => {
        const state = get();
        if (!state.designObjects.some((object) => object.id === objectId)) return;

        set({
            designObjects: state.designObjects.filter((object) => object.id !== objectId),
            selectedObjectId:
                state.selectedObjectId === objectId ? null : state.selectedObjectId,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    duplicateDesignObject: (objectId) => {
        const state = get();
        const source = state.designObjects.find((object) => object.id === objectId);
        if (!source) return;

        const duplicate = {
            ...clone(source),
            id: makeObjectId(),
            name: `${source.name} copy`,
            x: Math.min(0.94, source.x + 0.04),
            y: Math.min(0.94, source.y + 0.04),
            zIndex: Math.max(0, ...state.designObjects.map((object) => object.zIndex ?? 0)) + 1,
        };

        set({
            designObjects: [...state.designObjects, duplicate],
            selectedObjectId: duplicate.id,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            isDirty: true,
        });
    },

    selectDesignObject: (objectId) => set({ selectedObjectId: objectId }),

    undo: () => {
        const state = get();
        const previous = state.past.at(-1);
        if (!previous) return;

        set({
            ...restoreSnapshot(previous),
            selectedObjectId: null,
            past: state.past.slice(0, -1),
            future: [createSnapshot(state), ...state.future].slice(0, MAX_HISTORY_LENGTH),
            interactionSnapshot: null,
            isDirty: true,
        });
    },

    redo: () => {
        const state = get();
        const next = state.future[0];
        if (!next) return;

        set({
            ...restoreSnapshot(next),
            selectedObjectId: null,
            past: pushHistory(state.past, createSnapshot(state)),
            future: state.future.slice(1),
            interactionSnapshot: null,
            isDirty: true,
        });
    },

    resetDesign: () => {
        const state = get();
        try {
            localStorage.removeItem(LOCAL_DESIGN_STORAGE_KEY);
        } catch {
            // Resetting the in-memory document must still work in restricted browsers.
        }

        set({
            activeDesignAreaId: 'front',
            activeShirtZoneId: state.product.colorZones[0] ?? 'body',
            cameraView: 'front',
            cameraRequestId: state.cameraRequestId + 1,
            shirtColors: productColors(state.product),
            selectedPatternId: null,
            patternColors: createDefaultPatternColors(state.product.patterns),
            patternZones: createDefaultPatternZones(state.product.patternZones),
            designObjects: [],
            selectedObjectId: null,
            past: pushHistory(state.past, createSnapshot(state)),
            future: [],
            interactionSnapshot: null,
            isDirty: true,
            lastSavedAt: null,
        });
    },

    saveLocalDesign: () => {
        const state = get();
        const payload = createLocalDesignPayload(state);

        try {
            localStorage.setItem(LOCAL_DESIGN_STORAGE_KEY, JSON.stringify(payload));
            set({ isDirty: false, lastSavedAt: payload.updatedAt, restoreError: null });
            return { ok: true };
        } catch (error) {
            const message =
                error?.name === 'QuotaExceededError'
                    ? 'The browser storage limit was reached. Remove large images and try again.'
                    : 'This browser could not save the design locally.';
            set({ restoreError: message });
            return { ok: false, message };
        }
    },

    loadLocalDesign: () => {
        try {
            const rawValue = localStorage.getItem(LOCAL_DESIGN_STORAGE_KEY);
            if (!rawValue) return { ok: true, restored: false };

            const draft = parseLocalDesign(rawValue);
            const area = DESIGN_AREAS_BY_ID[draft.activeDesignAreaId];

            set((state) => ({
                product: PRODUCTS_BY_ID[draft.productId],
                shirtColors: draft.shirtColors,
                selectedPatternId: draft.selectedPatternId,
                patternColors: draft.patternColors,
                patternZones: draft.patternZones,
                designObjects: draft.designObjects,
                activeDesignAreaId: draft.activeDesignAreaId,
                cameraView: area.cameraView,
                cameraRequestId: state.cameraRequestId + 1,
                selectedObjectId: null,
                isDirty: false,
                lastSavedAt: draft.updatedAt,
                restoreError: null,
                past: [],
                future: [],
            }));

            return { ok: true, restored: true };
        } catch (error) {
            const message = error?.message || 'The saved local design could not be restored.';
            set({ restoreError: message });
            return { ok: false, restored: false, message };
        }
    },

    clearRestoreError: () => set({ restoreError: null }),
}));
