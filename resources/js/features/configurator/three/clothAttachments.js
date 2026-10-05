import { Float32BufferAttribute, Vector3 } from 'three';

const cellKey = (x, y, z) => `${x},${y},${z}`;

// Run once when part assignments change. Contact vertices also detect closed,
// overlapping panels, for which a topological boundary-only test misses seams.
export function createAttachmentSampler(entries, height) {
    const tolerance = Math.max(height * 0.004, 0.00001);
    const weldTolerance = tolerance * 0.25;
    const boundaries = [];
    for (const { geometry, matrix, role } of entries) {
        const positions = geometry.attributes.position;
        const welded = new Map();
        const points = [];
        const point = new Vector3();
        for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
            const key = cellKey(Math.round(point.x / weldTolerance), Math.round(point.y / weldTolerance), Math.round(point.z / weldTolerance));
            if (!welded.has(key)) { welded.set(key, points.length); points.push(point.clone()); }
        }
        for (const point of points) boundaries.push({ point, role });
    }
    const buckets = new Map();
    const add = (map, size, item) => {
        const p = item.point;
        const key = cellKey(Math.floor(p.x / size), Math.floor(p.y / size), Math.floor(p.z / size));
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    };
    const nearby = (map, size, point, visit) => {
        const x = Math.floor(point.x / size), y = Math.floor(point.y / size), z = Math.floor(point.z / size);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            const items = map.get(cellKey(x + dx, y + dy, z + dz));
            if (items) for (const item of items) visit(item);
        }
    };
    for (const item of boundaries) add(buckets, tolerance * 2, item);
    const radius = height * 0.065;
    const seams = new Map();
    const seamCells = new Set();
    let seamCount = 0;
    for (const item of boundaries) {
        let shared = false;
        nearby(buckets, tolerance * 2, item.point, (other) => {
            if (other.role !== item.role && other.point.distanceToSquared(item.point) <= tolerance * tolerance * 4) shared = true;
        });
        if (shared) {
            const p = item.point;
            const key = cellKey(Math.round(p.x / tolerance), Math.round(p.y / tolerance), Math.round(p.z / tolerance));
            if (!seamCells.has(key)) { seamCells.add(key); add(seams, radius, item); seamCount++; }
        }
    }
    const bound = new WeakSet();
    return {
        seamCount,
        bind(geometry, matrix) {
            if (bound.has(geometry)) return;
            const positions = geometry.attributes.position;
            const values = new Float32Array(positions.count * 4);
            const point = new Vector3();
            for (let i = 0; i < positions.count; i++) {
                point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
                let distanceSq = radius * radius, closest = null;
                nearby(seams, radius, point, (item) => {
                    const d = point.distanceToSquared(item.point);
                    if (d < distanceSq) { distanceSq = d; closest = item.point; }
                });
                const distance = Math.sqrt(distanceSq);
                // Keep a narrow fully pinned seam, then smoothly release the
                // nearby fabric. All adjoining roles share exactly zero motion.
                const t = Math.max(0, Math.min(1, (distance - tolerance * 2) / (radius - tolerance * 2)));
                values[i * 4] = t * t * (3 - 2 * t);
                if (closest && t > 0 && t < 1) {
                    const slope = 6 * t * (1 - t) / ((radius - tolerance * 2) * distance);
                    values[i * 4 + 1] = (point.x - closest.x) * slope;
                    values[i * 4 + 2] = (point.y - closest.y) * slope;
                    values[i * 4 + 3] = (point.z - closest.z) * slope;
                }
            }
            geometry.setAttribute('dressAttachment', new Float32BufferAttribute(values, 4));
            bound.add(geometry);
        },
    };
}
