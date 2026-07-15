import { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const boxProjection = { type: 'box', axis: null, direction: null };
const PRINT_AREA_PRESETS = {
    garment: [
        { id: 'front', label: 'Front body', projection: { type: 'planar', axis: 'z', direction: 1 } },
        { id: 'back', label: 'Back body', projection: { type: 'planar', axis: 'z', direction: -1 } },
        { id: 'leftSleeve', label: 'Left sleeve', projection: { type: 'planar', axis: 'x', direction: 1 } },
        { id: 'rightSleeve', label: 'Right sleeve', projection: { type: 'planar', axis: 'x', direction: -1 } },
        { id: 'fullBody', label: 'Full body', projection: boxProjection },
    ],
    footwear: [
        { id: 'leftShoe', label: 'Left shoe / outer side', projection: { type: 'planar', axis: 'x', direction: 1 } },
        { id: 'rightShoe', label: 'Right shoe / outer side', projection: { type: 'planar', axis: 'x', direction: -1 } },
        { id: 'toe', label: 'Toe area', projection: { type: 'planar', axis: 'z', direction: 1 } },
        { id: 'heel', label: 'Heel area', projection: { type: 'planar', axis: 'z', direction: -1 } },
        { id: 'tongue', label: 'Tongue / top', projection: { type: 'planar', axis: 'y', direction: 1 } },
        { id: 'fullBody', label: 'Full shoe', projection: boxProjection },
    ],
    headwear: [
        { id: 'frontPanel', label: 'Front panel', projection: { type: 'planar', axis: 'z', direction: 1 } },
        { id: 'backPanel', label: 'Back panel', projection: { type: 'planar', axis: 'z', direction: -1 } },
        { id: 'leftPanel', label: 'Left side', projection: { type: 'planar', axis: 'x', direction: 1 } },
        { id: 'rightPanel', label: 'Right side', projection: { type: 'planar', axis: 'x', direction: -1 } },
        { id: 'brim', label: 'Brim / visor', projection: { type: 'planar', axis: 'y', direction: 1 } },
        { id: 'fullBody', label: 'Full cap or hat', projection: boxProjection },
    ],
};

const categoryFamily = (category) => ['footwear', 'shoe', 'shoes', 'sneakers', 'boots', 'sandals'].includes(category)
    ? 'footwear'
    : ['cap', 'caps', 'hat', 'hats', 'headwear'].includes(category)
      ? 'headwear'
      : 'garment';

function parseBindings(value) {
    try {
        const parsed = JSON.parse(value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function uvBounds(geometry) {
    const uv = geometry?.getAttribute?.('uv');
    if (!uv?.count) return null;

    let minU = Infinity;
    let minV = Infinity;
    let maxU = -Infinity;
    let maxV = -Infinity;
    for (let index = 0; index < uv.count; index += 1) {
        minU = Math.min(minU, uv.getX(index));
        minV = Math.min(minV, uv.getY(index));
        maxU = Math.max(maxU, uv.getX(index));
        maxV = Math.max(maxV, uv.getY(index));
    }

    const clean = (number) => Number(number.toFixed(6));
    return { min: [clean(minU), clean(minV)], max: [clean(maxU), clean(maxV)] };
}

function inspectScene(scene) {
    const byName = new Map();
    scene.updateMatrixWorld(true);
    scene.traverse((node) => {
        if (!node.isMesh || !node.name || byName.has(node.name)) return;
        const bounds = uvBounds(node.geometry);
        byName.set(node.name, {
            name: node.name,
            uvBounds: bounds,
            vertices: node.geometry?.getAttribute?.('position')?.count ?? 0,
        });
    });

    return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function disposeScene(scene) {
    scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material?.dispose?.());
    });
}

export default function PrintAreaBindingSelector({ modelFile, modelUrl, category, value, onChange, error, onInspection, onDisableArtwork, enabled = true }) {
    const [meshes, setMeshes] = useState([]);
    const [status, setStatus] = useState(modelFile || modelUrl ? 'loading' : 'empty');
    const [inspectionError, setInspectionError] = useState(null);
    const bindings = useMemo(() => parseBindings(value), [value]);
    const printAreas = PRINT_AREA_PRESETS[categoryFamily(category)];

    useEffect(() => {
        let active = true;
        let loadedScene = null;

        if (!modelFile && !modelUrl) {
            setMeshes([]);
            setStatus('empty');
            setInspectionError(null);
            onInspection?.({ status: 'empty', meshCount: 0, uvMeshCount: 0, meshes: [] });
            return () => {};
        }

        setStatus('loading');
        setInspectionError(null);
        const loader = new GLTFLoader();

        const load = async () => {
            try {
                const gltf = modelFile
                    ? await new Promise(async (resolve, reject) => {
                        try {
                            const buffer = await modelFile.arrayBuffer();
                            loader.parse(buffer, '', resolve, reject);
                        } catch (loadError) {
                            reject(loadError);
                        }
                    })
                    : await loader.loadAsync(modelUrl);
                loadedScene = gltf.scene;
                const inspectedMeshes = inspectScene(gltf.scene);
                if (!active) return;
                setMeshes(inspectedMeshes);
                setStatus('ready');
                onInspection?.({
                    status: 'ready',
                    meshCount: inspectedMeshes.length,
                    uvMeshCount: inspectedMeshes.filter((mesh) => mesh.uvBounds).length,
                    meshes: inspectedMeshes.map((mesh) => ({ name: mesh.name, hasUv: Boolean(mesh.uvBounds) })),
                });
                if (inspectedMeshes.length === 0) {
                    setInspectionError('No named meshes were found in this GLB.');
                }
            } catch {
                if (!active) return;
                setMeshes([]);
                setStatus('failed');
                onInspection?.({ status: 'failed', meshCount: 0, uvMeshCount: 0, meshes: [] });
                setInspectionError('The GLB could not be inspected. You can still use the advanced JSON editor below.');
            } finally {
                if (loadedScene) disposeScene(loadedScene);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [modelFile, modelUrl, onInspection]);

    const uvMeshCount = meshes.filter((mesh) => mesh.uvBounds).length;

    const setAreaMesh = (areaId, meshName) => {
        const next = { ...bindings };
        if (!meshName) {
            delete next[areaId];
        } else {
            const mesh = meshes.find((item) => item.name === meshName);
            if (!mesh) return;
            const area = printAreas.find((item) => item.id === areaId);
            next[areaId] = {
                meshName: mesh.name,
                outwardNormalZ: null,
                uvBounds: mesh.uvBounds ?? { min: [0, 0], max: [1, 1] },
                ...(mesh.uvBounds ? {} : { projection: area.projection }),
            };
        }
        onChange(JSON.stringify(next, null, 2));
    };

    if (!enabled) return null;

    return (
        <div className="xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-black text-slate-800">Where can customers add patterns or logos?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">For each artwork area you offer, choose the matching part of the 3D model. Placement settings are prepared automatically.</p>
                </div>
                {status === 'ready' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{meshes.length} artwork-ready part{meshes.length === 1 ? '' : 's'}</span>}
            </div>

            {status === 'empty' && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Upload the 3D model first. Available artwork areas will appear here.</p>}
            {status === 'loading' && <p className="mt-3 animate-pulse rounded-xl bg-blue-50 p-4 text-xs font-semibold text-blue-700">Checking where artwork can be placed…</p>}
            {inspectionError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{inspectionError}</p>}
            {status === 'ready' && meshes.length > 0 && uvMeshCount === 0 && (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900">
                    This model has no UV map, so the configurator will generate artwork projection automatically. Choose the complete-product option for one-piece models, or choose individual areas when artwork should appear on one side only.
                    {onDisableArtwork && (
                        <button type="button" onClick={onDisableArtwork} className="mt-3 block rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-100">
                            Use this as a solid-color product
                        </button>
                    )}
                </div>
            )}

            {status === 'ready' && meshes.length > 0 && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {printAreas.map((area) => (
                        <label key={area.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="mb-1.5 block text-xs font-black text-slate-800">{area.label}</span>
                            <select
                                value={bindings[area.id]?.meshName ?? ''}
                                onChange={(event) => setAreaMesh(area.id, event.target.value)}
                                className="h-11 w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Not offered</option>
                                {meshes.map((mesh) => (
                                    <option key={mesh.name} value={mesh.name}>
                                        {mesh.name} {mesh.uvBounds ? '(UV mapped)' : '(automatic projection)'}
                                    </option>
                                ))}
                            </select>
                            {bindings[area.id] && <span className="mt-1.5 block text-[10px] text-emerald-700">{bindings[area.id].projection ? 'Automatic projection ready' : 'UV artwork ready'}</span>}
                        </label>
                    ))}
                </div>
            )}

            {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-500">Developer: artwork placement data</summary>
                <div className="border-t border-slate-200 p-3">
                    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="10" spellCheck="false" className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:ring-blue-500" />
                </div>
            </details>
        </div>
    );
}
