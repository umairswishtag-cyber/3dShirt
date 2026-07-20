import { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import LogoPlacementEditor from './LogoPlacementEditor';

const boxProjection = { type: 'box', axis: null, direction: null };

const headline = (value) => value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

export default function PrintAreaBindingSelector({ modelFile, modelUrl, value, onChange, error, onInspection, onDisableArtwork, supportsLogos = false, enabled = true }) {
    const [meshes, setMeshes] = useState([]);
    const [previewScene, setPreviewScene] = useState(null);
    const [activeLogoAreaId, setActiveLogoAreaId] = useState(null);
    const [status, setStatus] = useState(modelFile || modelUrl ? 'loading' : 'empty');
    const [inspectionError, setInspectionError] = useState(null);
    const bindings = useMemo(() => parseBindings(value), [value]);
    const printAreas = useMemo(
        () => Object.entries(bindings).map(([id, binding]) => ({
            id,
            label: binding.label || headline(id),
        })),
        [bindings],
    );

    useEffect(() => {
        let active = true;
        let loadedScene = null;

        if (!modelFile && !modelUrl) {
            setMeshes([]);
            setPreviewScene(null);
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
                if (!active) {
                    disposeScene(loadedScene);
                    loadedScene = null;
                    return;
                }
                setMeshes(inspectedMeshes);
                setPreviewScene(loadedScene);
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
                setPreviewScene(null);
                setStatus('failed');
                onInspection?.({ status: 'failed', meshCount: 0, uvMeshCount: 0, meshes: [] });
                setInspectionError('The GLB could not be inspected. You can still use the advanced JSON editor below.');
            }
        };

        load();
        return () => {
            active = false;
            if (loadedScene) disposeScene(loadedScene);
        };
    }, [modelFile, modelUrl, onInspection]);

    const uvMeshCount = meshes.filter((mesh) => mesh.uvBounds).length;

    const bindingForMesh = (mesh, label) => ({
        label,
        meshName: mesh.name,
        outwardNormalZ: null,
        uvBounds: mesh.uvBounds ?? { min: [0, 0], max: [1, 1] },
        ...(mesh.uvBounds ? {} : { projection: boxProjection }),
    });

    const addArea = () => {
        const mesh = meshes[0];
        if (!mesh) return;
        let number = Object.keys(bindings).length + 1;
        let areaId = `artworkArea${number}`;
        while (bindings[areaId]) {
            number += 1;
            areaId = `artworkArea${number}`;
        }
        const label = supportsLogos ? `Logo ${number}` : `Pattern area ${number}`;
        onChange(JSON.stringify({
            ...bindings,
            [areaId]: bindingForMesh(mesh, label),
        }, null, 2));
        setActiveLogoAreaId(areaId);
    };

    const setAreaMesh = (areaId, meshName) => {
        const next = { ...bindings };
        const mesh = meshes.find((item) => item.name === meshName);
        if (!mesh) return;
        next[areaId] = bindingForMesh(mesh, bindings[areaId]?.label || headline(areaId));
        onChange(JSON.stringify(next, null, 2));
    };

    const setAreaLabel = (areaId, label) => onChange(JSON.stringify({
        ...bindings,
        [areaId]: { ...bindings[areaId], label },
    }, null, 2));

    const removeArea = (areaId) => {
        const next = { ...bindings };
        delete next[areaId];
        if (activeLogoAreaId === areaId) setActiveLogoAreaId(null);
        onChange(JSON.stringify(next, null, 2));
    };

    const setLogoPlacement = (areaId, { logoBounds, logoPlacement, cameraView }) => {
        const nextBinding = { ...bindings[areaId] };
        if (logoPlacement && logoBounds) {
            nextBinding.logoPlacement = logoPlacement;
            nextBinding.logoBounds = logoBounds;
            nextBinding.cameraView = cameraView;
            delete nextBinding.logoProjection;
        } else {
            delete nextBinding.logoPlacement;
            delete nextBinding.logoBounds;
            delete nextBinding.cameraView;
        }

        onChange(JSON.stringify({
            ...bindings,
            [areaId]: nextBinding,
        }, null, 2));
    };

    if (!enabled) return null;

    return (
        <div className="xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-black text-slate-800">Where can customers add artwork?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Create any number of named areas, connect each one to a GLB mesh, then draw its logo zone directly on the model.</p>
                </div>
                {status === 'ready' && (
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{meshes.length} model part{meshes.length === 1 ? '' : 's'}</span>
                        <button type="button" onClick={addArea} className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-black text-white hover:bg-fuchsia-700">{supportsLogos ? 'Add another logo zone' : 'Add artwork area'}</button>
                    </div>
                )}
            </div>

            {status === 'empty' && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Upload the 3D model first. Available artwork areas will appear here.</p>}
            {status === 'loading' && <p className="mt-3 animate-pulse rounded-xl bg-blue-50 p-4 text-xs font-semibold text-blue-700">Checking where artwork can be placed…</p>}
            {inspectionError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{inspectionError}</p>}
            {status === 'ready' && meshes.length > 0 && uvMeshCount === 0 && (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900">
                    This model has no UV map. Patterns will use an automatic full-mesh projection; logo zones use the exact surface you draw and do not depend on UVs.
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
                        <div key={area.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center gap-2">
                                <input
                                    value={area.label}
                                    onChange={(event) => setAreaLabel(area.id, event.target.value)}
                                    aria-label="Artwork area name"
                                    className="h-9 min-w-0 flex-1 rounded-lg border-slate-300 text-xs font-black text-slate-800 focus:border-fuchsia-500 focus:ring-fuchsia-500"
                                />
                                <button type="button" onClick={() => removeArea(area.id)} className="rounded-lg px-2 py-2 text-[10px] font-black text-red-600 hover:bg-red-50">Remove</button>
                            </div>
                            <select
                                value={bindings[area.id]?.meshName ?? ''}
                                onChange={(event) => setAreaMesh(area.id, event.target.value)}
                                aria-label={`${area.label} GLB mesh`}
                                className="h-11 w-full rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {meshes.map((mesh) => (
                                    <option key={mesh.name} value={mesh.name}>
                                        {mesh.name} {mesh.uvBounds ? '(UV mapped)' : '(automatic projection)'}
                                    </option>
                                ))}
                            </select>
                            {bindings[area.id] && (
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[10px] text-emerald-700">{bindings[area.id].logoPlacement ? 'Surface zone ready' : bindings[area.id].projection ? 'Automatic pattern projection' : 'UV pattern mapping'}</span>
                                    {supportsLogos && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveLogoAreaId(area.id)}
                                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${activeLogoAreaId === area.id ? 'bg-fuchsia-600 text-white' : 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100'}`}
                                        >
                                            {bindings[area.id].logoPlacement ? 'Edit logo zone' : 'Draw logo zone'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {status === 'ready' && meshes.length > 0 && printAreas.length === 0 && (
                <button type="button" onClick={addArea} className="mt-3 w-full rounded-xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50/50 p-5 text-sm font-black text-fuchsia-700 hover:bg-fuchsia-50">
                    + {supportsLogos ? 'Create Logo 1 placement zone' : 'Create the first artwork area'}
                </button>
            )}

            {supportsLogos && previewScene && activeLogoAreaId && bindings[activeLogoAreaId] && (
                <LogoPlacementEditor
                    scene={previewScene}
                    area={printAreas.find((area) => area.id === activeLogoAreaId) ?? { id: activeLogoAreaId, label: headline(activeLogoAreaId) }}
                    binding={bindings[activeLogoAreaId]}
                    zones={Object.entries(bindings).map(([id, zoneBinding]) => ({
                        id,
                        label: zoneBinding.label || headline(id),
                        binding: zoneBinding,
                    }))}
                    onChange={(placement) => setLogoPlacement(activeLogoAreaId, placement)}
                />
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
