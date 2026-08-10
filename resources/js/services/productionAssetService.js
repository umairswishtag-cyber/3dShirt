import { getDesignTextureCanvas, renderDesignArea } from '@/features/configurator/canvas/designTextureManager';
import { exportConfiguredModel } from '@/features/configurator/three/modelExportRegistry';
import { fetchWithCsrf } from '@/services/csrf';

function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('A print-area image could not be generated.')),
            'image/png',
        );
    });
}

export async function createProductionAssets(state) {
    const selectedPattern = state.product.patterns?.find(
        (pattern) => pattern.id === state.selectedPatternId,
    );
    const areaIds = Object.keys(state.product.model.printAreas ?? {});
    const printAreas = [];

    for (const areaId of areaIds) {
        const binding = state.product.model.printAreas[areaId];
        const objects = state.designObjects.filter((object) => object.areaId === areaId);
        const patternEnabled = Boolean(
            state.patternZones[areaId] && state.selectedPatternId && selectedPattern,
        );
        await renderDesignArea(areaId, objects, {
            id: patternEnabled ? state.selectedPatternId : null,
            pattern: patternEnabled ? selectedPattern : null,
            colors: patternEnabled ? state.patternColors[state.selectedPatternId] : null,
        }, 'composite', binding.logoBounds ?? null);
        printAreas.push({
            areaId,
            blob: await canvasBlob(getDesignTextureCanvas(areaId, 'composite')),
        });
    }

    return {
        model: await exportConfiguredModel(),
        printAreas,
    };
}

export async function uploadProductionAssets(prepared, assets, customer = {}) {
    const uploadUrl = new URL(prepared.uploadUrl, window.location.origin);
    uploadUrl.searchParams.set('customer_name', customer.name || '');
    uploadUrl.searchParams.set('customer_email', customer.email || '');
    const form = new FormData();
    form.append('final_model', assets.model, 'final-model.glb');
    assets.printAreas.forEach(({ areaId, blob }) => {
        form.append('print_areas[]', blob, `${areaId}.png`);
        form.append('print_area_ids[]', areaId);
    });

    const response = await fetchWithCsrf(`${uploadUrl.pathname}${uploadUrl.search}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const validationMessage = Object.values(result?.errors ?? {}).flat().find(Boolean);
        throw new Error(validationMessage || result?.message || 'The production files could not be uploaded.');
    }

    return result;
}
