let exportCurrentModel = null;

export function registerModelExporter(exporter) {
    exportCurrentModel = exporter;

    return () => {
        if (exportCurrentModel === exporter) exportCurrentModel = null;
    };
}

export async function exportConfiguredModel() {
    if (!exportCurrentModel) {
        throw new Error('The 3D model is still loading. Wait a moment and try again.');
    }

    return exportCurrentModel();
}
