export const SHIRT_PATTERNS = [
    {
        id: '3d-style',
        name: '3D Style',
        assetUrl: '/patterns/3d-style.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#6541AE' },
            { id: 'shadow', label: 'Shadow', source: '#521791' },
            { id: 'highlight', label: 'Highlight', source: '#84C5DC' },
            { id: 'accent', label: 'Accent', source: '#FF8000' },
        ],
    },
    {
        id: 'animals',
        name: 'Animals',
        assetUrl: '/patterns/animals.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#FFFFFF' },
            { id: 'art', label: 'Artwork', source: '#000000' },
        ],
    },
    {
        id: 'circle-lines',
        name: 'Circle Lines',
        assetUrl: '/patterns/circle-lines.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#547B9B' },
            { id: 'line', label: 'Line', source: '#D2C8BE' },
            { id: 'highlight', label: 'Highlight', source: '#FFFFFF' },
        ],
    },
    {
        id: 'design-art',
        name: 'Design Art',
        assetUrl: '/patterns/design-art.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#293456' },
            { id: 'accent', label: 'Accent', source: '#00A4B9' },
        ],
    },
    {
        id: 'kuchar-muchar',
        name: 'Kuchar Muchar',
        assetUrl: '/patterns/kuchar-muchar.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#CED2D0' },
            { id: 'art', label: 'Artwork', source: '#939798' },
        ],
    },
    {
        id: 'multi-color-lines',
        name: 'Multi Lines',
        assetUrl: '/patterns/multi-color-lines.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#293456' },
            { id: 'stripe1', label: 'Stripe 1', source: '#006384' },
            { id: 'stripe2', label: 'Stripe 2', source: '#00A676' },
            { id: 'stripe3', label: 'Stripe 3', source: '#E2E54C' },
        ],
    },
    {
        id: 'pattern-1',
        name: 'Diagonal',
        assetUrl: '/patterns/pattern-1.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#152B58' },
            { id: 'stripe', label: 'Stripe', source: '#EB382E' },
        ],
    },
    {
        id: 'triangles',
        name: 'Triangles',
        assetUrl: '/patterns/triangles.svg',
        colors: [
            { id: 'base', label: 'Base', source: '#9CD5C2' },
            { id: 'accent', label: 'Accent', source: '#C94528' },
        ],
    },
];

export const SHIRT_PATTERNS_BY_ID = Object.fromEntries(
    SHIRT_PATTERNS.map((pattern) => [pattern.id, pattern]),
);

export const PATTERN_ZONE_OPTIONS = [
    { id: 'body', label: 'Body' },
    { id: 'leftSleeve', label: 'Left sleeve' },
    { id: 'rightSleeve', label: 'Right sleeve' },
];

export function createDefaultPatternZones() {
    return Object.fromEntries(PATTERN_ZONE_OPTIONS.map((zone) => [zone.id, true]));
}

export function createDefaultPatternColors() {
    return Object.fromEntries(
        SHIRT_PATTERNS.map((pattern) => [
            pattern.id,
            Object.fromEntries(
                pattern.colors.map((color) => [color.id, color.source]),
            ),
        ]),
    );
}

export function createPatternSvgSource(source, pattern, colors = null) {
    let nextSource = source
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<metadata\b[^>]*\/>/gi, '')
        .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, '');

    pattern.colors.forEach((slot) => {
        nextSource = nextSource.replace(
            new RegExp(slot.source, 'gi'),
            colors?.[slot.id] ?? slot.source,
        );
    });

    return nextSource;
}
