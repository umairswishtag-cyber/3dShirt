export const DESIGN_TEXTURE_SIZE = 2048;

export const DESIGN_AREAS = [
    {
        id: 'front',
        label: 'Front',
        shortLabel: 'Front',
        shirtZoneId: 'body',
        cameraView: 'front',
        textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE },
        bounds: { x: 0.12, y: 0.1, width: 0.76, height: 0.8 },
        texture: { flipY: false },
    },
    {
        id: 'back',
        label: 'Back',
        shortLabel: 'Back',
        shirtZoneId: 'body',
        cameraView: 'back',
        textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE },
        bounds: { x: 0.12, y: 0.1, width: 0.76, height: 0.8 },
        texture: { flipY: false },
    },
    {
        id: 'leftSleeve',
        label: 'Left sleeve',
        shortLabel: 'Left',
        shirtZoneId: 'leftSleeve',
        cameraView: 'left',
        textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE },
        bounds: { x: 0.12, y: 0.1, width: 0.76, height: 0.8 },
        texture: { flipY: false },
    },
    {
        id: 'rightSleeve',
        label: 'Right sleeve',
        shortLabel: 'Right',
        shirtZoneId: 'rightSleeve',
        cameraView: 'right',
        textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE },
        bounds: { x: 0.12, y: 0.1, width: 0.76, height: 0.8 },
        texture: { flipY: false },
    },
    { id: 'leftShoe', label: 'Left shoe', shortLabel: 'Left shoe', shirtZoneId: 'body', cameraView: 'left', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 }, texture: { flipY: false } },
    { id: 'rightShoe', label: 'Right shoe', shortLabel: 'Right shoe', shirtZoneId: 'body', cameraView: 'right', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 }, texture: { flipY: false } },
    { id: 'toe', label: 'Toe area', shortLabel: 'Toe', shirtZoneId: 'body', cameraView: 'front', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'heel', label: 'Heel area', shortLabel: 'Heel', shirtZoneId: 'body', cameraView: 'back', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'tongue', label: 'Tongue / top', shortLabel: 'Tongue', shirtZoneId: 'body', cameraView: 'front', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.08, width: 0.8, height: 0.84 }, texture: { flipY: false } },
    { id: 'frontPanel', label: 'Front panel', shortLabel: 'Front', shirtZoneId: 'body', cameraView: 'front', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'backPanel', label: 'Back panel', shortLabel: 'Back', shirtZoneId: 'body', cameraView: 'back', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'leftPanel', label: 'Left side', shortLabel: 'Left', shirtZoneId: 'body', cameraView: 'left', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'rightPanel', label: 'Right side', shortLabel: 'Right', shirtZoneId: 'body', cameraView: 'right', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, texture: { flipY: false } },
    { id: 'brim', label: 'Brim / visor', shortLabel: 'Brim', shirtZoneId: 'body', cameraView: 'front', textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE }, bounds: { x: 0.08, y: 0.12, width: 0.84, height: 0.76 }, texture: { flipY: false } },
    {
        id: 'fullBody',
        label: 'Full product',
        shortLabel: 'Full',
        shirtZoneId: 'body',
        cameraView: 'front',
        textureSize: { width: DESIGN_TEXTURE_SIZE, height: DESIGN_TEXTURE_SIZE },
        bounds: { x: 0.06, y: 0.06, width: 0.88, height: 0.88 },
        texture: { flipY: false },
    },
];

export const DESIGN_AREAS_BY_ID = Object.fromEntries(
    DESIGN_AREAS.map((area) => [area.id, area]),
);

export function shouldFlipEditorY(areaId, category) {
    return ['cap', 'caps', 'hat', 'hats', 'headwear'].includes(category)
        && ['frontPanel', 'backPanel', 'leftPanel', 'rightPanel', 'brim', 'fullBody'].includes(areaId);
}
