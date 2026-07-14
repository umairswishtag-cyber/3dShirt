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

export default function PrintAreaBindingSelector({ modelFile, modelUrl, value, onChange, error }) {
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
                if (inspectedMeshes.length === 0) {
                    setInspectionError('No named meshes were found in this GLB.');
                }
            } catch {
                if (!active) return;
                setMeshes([]);
                setStatus('failed');
                setInspectionError('The GLB could not be inspected. You can still use the advanced JSON editor below.');
            } finally {
                if (loadedScene) disposeScene(loadedScene);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [modelFile, modelUrl]);

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

    return (
        <div className="xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-bold text-slate-700">Print-area bindings</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">Select a UV-enabled GLB mesh for every customer-facing print area you want to offer.</p>
                </div>
                {status === 'ready' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{meshes.length} meshes detected</span>}
            </div>

            {status === 'empty' && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Upload the GLB above first. Its mesh choices will appear here automatically.</p>}
            {status === 'loading' && <p className="mt-3 animate-pulse rounded-xl bg-blue-50 p-4 text-xs font-semibold text-blue-700">Inspecting GLB meshes and UV coordinates…</p>}
            {inspectionError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{inspectionError}</p>}

            {status === 'ready' && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {PRINT_AREAS.map((area) => (
                        <label key={area.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="mb-1.5 block text-xs font-black text-slate-800">{area.label}</span>
                            <select
                                value={bindings[area.id]?.meshName ?? ''}
                                onChange={(event) => setAreaMesh(area.id, event.target.value)}
                                className="h-11 w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Not enabled</option>
                                {meshes.map((mesh) => (
                                    <option key={mesh.name} value={mesh.name} disabled={!mesh.uvBounds}>
                                        {mesh.name} {mesh.uvBounds ? `(${mesh.vertices} vertices)` : '(no UV map)'}
                                    </option>
                                ))}
                            </select>
                            {bindings[area.id] && <span className="mt-1.5 block text-[10px] text-emerald-700">UV bounds detected automatically</span>}
                        </label>
                    ))}
                </div>
            )}

            {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-600">Advanced binding JSON</summary>
                <div className="border-t border-slate-200 p-3">
                    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="10" spellCheck="false" className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:ring-blue-500" />
                </div>
            </details>
        </div>
    );
}
