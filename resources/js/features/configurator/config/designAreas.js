export const DESIGN_TEXTURE_SIZE = 1024;

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
];

export const DESIGN_AREAS_BY_ID = Object.fromEntries(
    DESIGN_AREAS.map((area) => [area.id, area]),
);
