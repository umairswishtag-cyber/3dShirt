const originalMaterialValues = new WeakMap();

export function parseModelColorConfiguration(value, fallback) {
    if (typeof value !== 'string') return value ?? fallback;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export function prepareModelPreviewMaterials(scene) {
    scene.traverse((node) => {
        if (!node.isMesh || !node.material) return;

        node.material = Array.isArray(node.material)
            ? node.material.map((material) => material.clone())
            : node.material.clone();

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
            originalMaterialValues.set(material, {
                color: material.color?.clone(),
                metalness: material.metalness,
                roughness: material.roughness,
            });
        });
    });
}

export function applyModelPreviewColors(scene, colorZones, meshZones) {
    const colorsByZone = new Map(
        colorZones
            .filter((zone) => zone?.id && zone?.defaultColor)
            .map((zone) => [zone.id, zone.defaultColor]),
    );

    scene.traverse((node) => {
        if (!node.isMesh || !node.material) return;

        const color = colorsByZone.get(meshZones[node.name]);
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
            const original = originalMaterialValues.get(material);

            if (color) {
                material.color?.set(color);
                if (typeof material.metalness === 'number') material.metalness = 0;
                if (typeof material.roughness === 'number') material.roughness = 0.86;
            } else if (original) {
                if (original.color) material.color?.copy(original.color);
                if (typeof original.metalness === 'number') material.metalness = original.metalness;
                if (typeof original.roughness === 'number') material.roughness = original.roughness;
            }

            material.needsUpdate = true;
        });
    });
}
