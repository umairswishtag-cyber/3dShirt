import { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const PRINT_AREAS = [
    { id: 'front', label: 'Front' },
    { id: 'back', label: 'Back' },
    { id: 'leftSleeve', label: 'Left sleeve' },
    { id: 'rightSleeve', label: 'Right sleeve' },
];

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

export default function PrintAreaBindingSelector({ modelFile, modelUrl, value, onChange, error, onInspection, onDisableArtwork, enabled = true }) {
    const [meshes, setMeshes] = useState([]);
    const [status, setStatus] = useState(modelFile || modelUrl ? 'loading' : 'empty');
    const [inspectionError, setInspectionError] = useState(null);
    const bindings = useMemo(() => parseBindings(value), [value]);

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
            if (!mesh?.uvBounds) return;
            next[areaId] = {
                meshName: mesh.name,
                outwardNormalZ: null,
                uvBounds: mesh.uvBounds,
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
                    <p className="mt-1 text-xs leading-5 text-slate-500">For each side you offer, choose the matching part of the 3D model. We handle the placement settings automatically.</p>
                </div>
                {status === 'ready' && <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${uvMeshCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{uvMeshCount} artwork-ready parts</span>}
            </div>

            {status === 'empty' && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Upload the 3D model first. Available artwork areas will appear here.</p>}
            {status === 'loading' && <p className="mt-3 animate-pulse rounded-xl bg-blue-50 p-4 text-xs font-semibold text-blue-700">Checking where artwork can be placed…</p>}
            {inspectionError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{inspectionError}</p>}
            {status === 'ready' && meshes.length > 0 && uvMeshCount === 0 && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-800">
                    This 3D model cannot display patterns or logos. You can still offer solid colors, or ask your 3D designer to export the model with artwork/texture mapping (UVs).
                    {onDisableArtwork && (
                        <button type="button" onClick={onDisableArtwork} className="mt-3 block rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white hover:bg-red-800">
                            Use this as a solid-color product
                        </button>
                    )}
                </p>
            )}

            {status === 'ready' && uvMeshCount > 0 && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {PRINT_AREAS.map((area) => (
                        <label key={area.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="mb-1.5 block text-xs font-black text-slate-800">{area.label}</span>
                            <select
                                value={bindings[area.id]?.meshName ?? ''}
                                onChange={(event) => setAreaMesh(area.id, event.target.value)}
                                className="h-11 w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Not offered</option>
                                {meshes.map((mesh) => (
                                    <option key={mesh.name} value={mesh.name} disabled={!mesh.uvBounds}>
                                        {mesh.name} {mesh.uvBounds ? '' : '(cannot display artwork)'}
                                    </option>
                                ))}
                            </select>
                            {bindings[area.id] && <span className="mt-1.5 block text-[10px] text-emerald-700">Ready for customer artwork</span>}
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
