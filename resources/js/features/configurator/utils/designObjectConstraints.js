const SAFE_PADDING = 0.015;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function rotatedHalfSize(object) {
    const radians = ((object.rotation ?? 0) * Math.PI) / 180;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    const width = Math.abs((object.width ?? 0) * (object.scaleX ?? 1));
    const height = Math.abs((object.height ?? 0) * (object.scaleY ?? 1));

    return {
        width: (width * cosine + height * sine) / 2,
        height: (width * sine + height * cosine) / 2,
    };
}

export function constrainDesignObject(object, area) {
    if (!area?.bounds) return object;

    const safe = {
        x: area.bounds.x + SAFE_PADDING,
        y: area.bounds.y + SAFE_PADDING,
        width: Math.max(0.05, area.bounds.width - SAFE_PADDING * 2),
        height: Math.max(0.05, area.bounds.height - SAFE_PADDING * 2),
    };
    let next = {
        ...object,
        scaleX: Math.max(0.05, Math.abs(object.scaleX ?? 1)),
        scaleY: Math.max(0.05, Math.abs(object.scaleY ?? 1)),
    };
    let half = rotatedHalfSize(next);
    const fit = Math.min(
        1,
        half.width > 0 ? safe.width / (half.width * 2) : 1,
        half.height > 0 ? safe.height / (half.height * 2) : 1,
    );
    if (fit < 1) {
        next = { ...next, scaleX: next.scaleX * fit, scaleY: next.scaleY * fit };
        half = rotatedHalfSize(next);
    }

    const centerX = safe.x + safe.width / 2;
    const centerY = safe.y + safe.height / 2;
    const minimumX = safe.x + half.width;
    const maximumX = safe.x + safe.width - half.width;
    const minimumY = safe.y + half.height;
    const maximumY = safe.y + safe.height - half.height;

    return {
        ...next,
        x: minimumX > maximumX ? centerX : clamp(Number.isFinite(next.x) ? next.x : centerX, minimumX, maximumX),
        y: minimumY > maximumY ? centerY : clamp(Number.isFinite(next.y) ? next.y : centerY, minimumY, maximumY),
    };
}

export function fitDesignObjectInsideArea(object, area) {
    if (!area?.bounds) return object;

    const currentScale = Math.min(Math.abs(object.scaleX ?? 1), Math.abs(object.scaleY ?? 1));
    const maximumScale = Math.min(
        ((area.bounds.width - SAFE_PADDING * 4) * 0.9) / Math.max(object.width ?? 0, 0.001),
        ((area.bounds.height - SAFE_PADDING * 4) * 0.9) / Math.max(object.height ?? 0, 0.001),
    );

    return constrainDesignObject({
        ...object,
        x: area.bounds.x + area.bounds.width / 2,
        y: area.bounds.y + area.bounds.height / 2,
        scaleX: Math.min(currentScale, maximumScale),
        scaleY: Math.min(currentScale, maximumScale),
    }, area);
}
