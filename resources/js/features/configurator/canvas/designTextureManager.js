import { DESIGN_AREAS_BY_ID, DESIGN_TEXTURE_SIZE } from '../config/designAreas';
import {
    createPatternSvgSource,
} from '../config/patterns';

const canvases = new Map();
const imagePromises = new Map();
const patternSourcePromises = new Map();
const patternImagePromises = new Map();
const renderVersions = new Map();

function getImage(source) {
    if (!imagePromises.has(source)) {
        imagePromises.set(
            source,
            new Promise((resolve, reject) => {
                const image = new Image();
                image.decoding = 'async';
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('A design image could not be decoded.'));
                image.src = source;
            }),
        );
    }

    return imagePromises.get(source);
}

function getPatternSource(pattern) {
    if (!patternSourcePromises.has(pattern.id)) {
        patternSourcePromises.set(
            pattern.id,
            fetch(pattern.assetUrl).then((response) => {
                if (!response.ok) {
                    throw new Error(`The ${pattern.name} pattern could not be loaded.`);
                }

                return response.text();
            }),
        );
    }

    return patternSourcePromises.get(pattern.id);
}

function getPatternImage(pattern, colors) {
    if (!pattern) return Promise.resolve(null);

    const cacheKey = `${pattern.id}:${pattern.colors
        .map((slot) => colors?.[slot.id] ?? slot.source)
        .join(':')}`;

    if (!patternImagePromises.has(cacheKey)) {
        patternImagePromises.set(
            cacheKey,
            getPatternSource(pattern).then((source) => {
                const recoloredSource = createPatternSvgSource(source, pattern, colors);

                return new Promise((resolve, reject) => {
                    const blob = new Blob([recoloredSource], { type: 'image/svg+xml' });
                    const objectUrl = URL.createObjectURL(blob);
                    const image = new Image();
                    image.decoding = 'async';
                    image.onload = () => {
                        URL.revokeObjectURL(objectUrl);
                        resolve(image);
                    };
                    image.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error(`The ${pattern.name} pattern could not be rendered.`));
                    };
                    image.src = objectUrl;
                });
            }),
        );
    }

    return patternImagePromises.get(cacheKey);
}

export function getDesignTextureCanvas(areaId) {
    if (!canvases.has(areaId)) {
        const canvas = document.createElement('canvas');
        canvas.width = DESIGN_TEXTURE_SIZE;
        canvas.height = DESIGN_TEXTURE_SIZE;
        canvas.dataset.designAreaId = areaId;
        canvases.set(areaId, canvas);
    }

    return canvases.get(areaId);
}

export async function renderDesignArea(areaId, objects, patternSelection = null) {
    const area = DESIGN_AREAS_BY_ID[areaId];
    const canvas = getDesignTextureCanvas(areaId);
    const context = canvas.getContext('2d');
    const version = (renderVersions.get(areaId) ?? 0) + 1;
    renderVersions.set(areaId, version);

    const imageObjects = objects
        .filter((object) => object.type === 'image')
        .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0));

    const [patternImage, images] = await Promise.all([
        patternSelection?.id
            ? getPatternImage(patternSelection.pattern, patternSelection.colors).catch(() => null)
            : null,
        Promise.all(imageObjects.map(async (object) => {
            try {
                return await getImage(object.source);
            } catch {
                return null;
            }
        })),
    ]);

    if (renderVersions.get(areaId) !== version) return canvas;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (patternImage) {
        context.drawImage(patternImage, 0, 0, canvas.width, canvas.height);
    }

    context.save();
    context.beginPath();
    context.rect(
        area.bounds.x * canvas.width,
        area.bounds.y * canvas.height,
        area.bounds.width * canvas.width,
        area.bounds.height * canvas.height,
    );
    context.clip();

    imageObjects.forEach((object, index) => {
        const image = images[index];
        if (!image) return;

        const width = object.width * canvas.width;
        const height = object.height * canvas.height;

        context.save();
        context.globalAlpha = object.opacity;
        context.translate(object.x * canvas.width, object.y * canvas.height);
        context.rotate((object.rotation * Math.PI) / 180);
        context.scale(
            object.scaleX * (object.flipX ? -1 : 1),
            object.scaleY * (object.flipY ? -1 : 1),
        );
        context.drawImage(image, -width / 2, -height / 2, width, height);
        context.restore();
    });

    context.restore();
    return canvas;
}
