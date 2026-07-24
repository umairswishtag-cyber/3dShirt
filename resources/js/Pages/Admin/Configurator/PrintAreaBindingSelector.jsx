import { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import LogoPlacementEditor, { logoBoundsForPlacement, ModelOverview } from './LogoPlacementEditor';
import {
    applyModelPreviewColors,
    parseModelColorConfiguration,
    prepareModelPreviewMaterials,
} from './modelPreviewMaterials';

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

function parseAreaIds(value) {
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
        return Array.isArray(parsed) ? parsed.filter((areaId) => typeof areaId === 'string') : [];
    } catch {
        return [];
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

export default function PrintAreaBindingSelector({ modelFile, modelUrl, colorZones = [], meshZones = {}, value, patternZonesValue = [], onChange, error, patternZonesError, onInspection, onDisableArtwork, supportsPatterns = false, supportsLogos = false, enabled = true }) {
    const [meshes, setMeshes] = useState([]);
    const [previewScene, setPreviewScene] = useState(null);
    const [activeLogoAreaId, setActiveLogoAreaId] = useState(null);
    const [expandedAreaId, setExpandedAreaId] = useState(null);
    const [status, setStatus] = useState(modelFile || modelUrl ? 'loading' : 'empty');
    const [inspectionError, setInspectionError] = useState(null);
    const bindings = useMemo(() => parseBindings(value), [value]);
    const patternAreaIds = useMemo(() => parseAreaIds(patternZonesValue), [patternZonesValue]);
    const patternAreaSet = useMemo(() => new Set(patternAreaIds), [patternAreaIds]);
    const parsedColorZones = useMemo(() => {
        const parsed = parseModelColorConfiguration(colorZones, []);
        return Array.isArray(parsed) ? parsed : [];
    }, [colorZones]);
    const parsedMeshZones = useMemo(() => {
        const parsed = parseModelColorConfiguration(meshZones, {});
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }, [meshZones]);
    const printAreas = useMemo(
        () => Object.entries(bindings).map(([id, binding]) => ({
            id,
            label: binding.label || headline(id),
        })),
        [bindings],
    );

    useEffect(() => {
        if (printAreas.length === 0) {
            setExpandedAreaId(null);
            setActiveLogoAreaId(null);
            return;
        }

        setExpandedAreaId((current) => printAreas.some((area) => area.id === current) ? current : printAreas[0].id);
        if (supportsLogos) {
            setActiveLogoAreaId((current) => printAreas.some((area) => area.id === current) ? current : printAreas[0].id);
        }
    }, [printAreas, supportsLogos]);

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
                prepareModelPreviewMaterials(loadedScene);
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

    useEffect(() => {
        if (!previewScene) return;
        applyModelPreviewColors(previewScene, parsedColorZones, parsedMeshZones);
    }, [parsedColorZones, parsedMeshZones, previewScene]);

    const uvMeshCount = meshes.filter((mesh) => mesh.uvBounds).length;

    const bindingForMesh = (mesh, label) => ({
        label,
        meshName: mesh.name,
        outwardNormalZ: null,
        uvBounds: mesh.uvBounds ?? { min: [0, 0], max: [1, 1] },
        ...(mesh.uvBounds ? {} : { projection: boxProjection }),
    });

    const commitAreas = (nextBindings, nextPatternAreaIds = patternAreaIds) => {
        const existingIds = new Set(Object.keys(nextBindings));
        onChange(
            JSON.stringify(nextBindings, null, 2),
            [...new Set(nextPatternAreaIds)].filter((areaId) => existingIds.has(areaId)),
        );
    };

    const addArea = (kind) => {
        const mesh = meshes[0];
        if (!mesh) return;
        const isLogo = kind === 'logo';
        const prefix = isLogo ? 'logoArea' : 'patternArea';
        const existingKindCount = isLogo
            ? Object.values(bindings).filter((binding) => Boolean(binding.logoPlacement)).length
            : patternAreaIds.length;
        let number = existingKindCount + 1;
        let areaId = `${prefix}${number}`;
        while (bindings[areaId]) {
            number += 1;
            areaId = `${prefix}${number}`;
        }
        const label = isLogo ? `Logo ${number}` : `Pattern ${number}`;
        const nextBindings = {
            ...bindings,
            [areaId]: bindingForMesh(mesh, label),
        };
        commitAreas(
            nextBindings,
            isLogo ? patternAreaIds : [...patternAreaIds, areaId],
        );
        setExpandedAreaId(areaId);
        setActiveLogoAreaId(supportsLogos ? areaId : null);
    };

    const setAreaMesh = (areaId, meshName) => {
        const next = { ...bindings };
        const mesh = meshes.find((item) => item.name === meshName);
        if (!mesh) return;
        next[areaId] = bindingForMesh(mesh, bindings[areaId]?.label || headline(areaId));
        commitAreas(next);
    };

    const setAreaLabel = (areaId, label) => commitAreas({
        ...bindings,
        [areaId]: { ...bindings[areaId], label },
    });

    const setPatternArea = (areaId, enabledForPatterns) => commitAreas(
        bindings,
        enabledForPatterns
            ? [...patternAreaIds, areaId]
            : patternAreaIds.filter((id) => id !== areaId),
    );

    const removeArea = (areaId) => {
        const next = { ...bindings };
        delete next[areaId];
        if (activeLogoAreaId === areaId) setActiveLogoAreaId(null);
        commitAreas(next, patternAreaIds.filter((id) => id !== areaId));
    };

    const selectLogoArea = (areaId) => {
        setExpandedAreaId(areaId);
        setActiveLogoAreaId(areaId);
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

        commitAreas({
            ...bindings,
            [areaId]: nextBinding,
        });
    };

    const updateLogoPlacementDimension = (areaId, dimension, value) => {
        const placement = bindings[areaId]?.logoPlacement;
        if (!placement || !Number.isFinite(value) || value < 0.001) return;
        const nextPlacement = { ...placement, [dimension]: Number(value.toFixed(6)) };
        setLogoPlacement(areaId, {
            logoPlacement: nextPlacement,
            logoBounds: logoBoundsForPlacement(nextPlacement.width, nextPlacement.height),
            cameraView: bindings[areaId]?.cameraView ?? 'front',
        });
    };

    if (!enabled) return null;

    return (
        <div className="xl:col-span-2">
            <div>
                <p className="text-sm font-black text-slate-800">Pattern areas and logo zones</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Settings stay in the left panel while the larger model canvas remains visible on the right.</p>
            </div>

            {status === 'empty' && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">Upload the 3D model first. Available artwork areas will appear here.</p>}
            {status === 'loading' && <p className="mt-3 animate-pulse rounded-xl bg-blue-50 p-4 text-xs font-semibold text-blue-700">Checking where artwork can be placed…</p>}
            {inspectionError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{inspectionError}</p>}

            {status === 'ready' && meshes.length > 0 && (
                <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(17rem,3fr)_minmax(0,7fr)]">
                    <aside className="space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black text-slate-900">Area settings</p>
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">{meshes.length} model part{meshes.length === 1 ? '' : 's'}</span>
                            </div>
                            <div className="mt-3 grid gap-2">
                                {supportsPatterns && <button type="button" onClick={() => addArea('pattern')} className="rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-50">+ Add pattern area</button>}
                                {supportsLogos && <button type="button" onClick={() => addArea('logo')} className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-black text-white hover:bg-fuchsia-700">+ Add logo zone</button>}
                            </div>
                        </div>

                        {uvMeshCount === 0 && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] font-semibold leading-5 text-blue-900">
                                This model has no UV map. Patterns use automatic projection; logo zones use the surface you draw.
                                {onDisableArtwork && <button type="button" onClick={onDisableArtwork} className="mt-2 block w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-100">Use as a solid-color product</button>}
                            </div>
                        )}

                        <div className="space-y-2">
                            {printAreas.map((area) => {
                                const isExpanded = expandedAreaId === area.id;
                                const placement = bindings[area.id]?.logoPlacement;
                                return (
                                    <section key={area.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${activeLogoAreaId === area.id ? 'border-fuchsia-300 ring-1 ring-fuchsia-100' : 'border-slate-200'}`}>
                                        <button type="button" onClick={() => setExpandedAreaId(isExpanded ? null : area.id)} aria-expanded={isExpanded} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50">
                                            <span className="min-w-0">
                                                <span className="block truncate text-xs font-black text-slate-900">{area.label}</span>
                                                <span className="mt-1 flex flex-wrap gap-1">
                                                    {patternAreaSet.has(area.id) && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-purple-700">Pattern</span>}
                                                    {placement && <span className="rounded-full bg-fuchsia-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-fuchsia-700">Logo zone</span>}
                                                    {!patternAreaSet.has(area.id) && !placement && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-700">Setup needed</span>}
                                                </span>
                                            </span>
                                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>

                                        {isExpanded && (
                                            <div className="space-y-3 border-t border-slate-100 p-3">
                                                <label className="block">
                                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Area name</span>
                                                    <input value={area.label} onChange={(event) => setAreaLabel(area.id, event.target.value)} className="h-9 w-full rounded-lg border-slate-300 text-xs font-black text-slate-800 focus:border-fuchsia-500 focus:ring-fuchsia-500" />
                                                </label>
                                                <label className="block">
                                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">GLB mesh</span>
                                                    <select value={bindings[area.id]?.meshName ?? ''} onChange={(event) => setAreaMesh(area.id, event.target.value)} className="h-10 w-full rounded-lg border-slate-300 text-xs focus:border-blue-500 focus:ring-blue-500">
                                                        {meshes.map((mesh) => <option key={mesh.name} value={mesh.name}>{mesh.name} {mesh.uvBounds ? '(UV mapped)' : '(automatic projection)'}</option>)}
                                                    </select>
                                                </label>

                                                {supportsPatterns && (
                                                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-purple-100 bg-purple-50/60 px-3 py-2">
                                                        <span><span className="block text-[11px] font-black text-slate-800">Allow patterns here</span><span className="block text-[9px] text-slate-500">Show this area in Pattern coverage.</span></span>
                                                        <input type="checkbox" checked={patternAreaSet.has(area.id)} onChange={(event) => setPatternArea(area.id, event.target.checked)} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                                                    </label>
                                                )}

                                                {supportsLogos && (
                                                    <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/60 p-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span><span className="block text-[11px] font-black text-slate-800">Logo placement</span><span className="block text-[9px] text-slate-500">{placement ? 'A logo-safe surface is ready.' : 'Draw a safe surface on the model.'}</span></span>
                                                            <button type="button" onClick={() => selectLogoArea(area.id)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black ${activeLogoAreaId === area.id ? 'bg-fuchsia-600 text-white' : 'border border-fuchsia-200 bg-white text-fuchsia-700 hover:bg-fuchsia-100'}`}>{placement ? 'Edit zone' : 'Draw zone'}</button>
                                                        </div>
                                                        {placement && (
                                                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-fuchsia-100 pt-3">
                                                                {['width', 'height'].map((dimension) => (
                                                                    <label key={dimension} className="block">
                                                                        <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-500">{dimension}</span>
                                                                        <input type="number" min="0.001" step="any" value={placement[dimension]} onChange={(event) => updateLogoPlacementDimension(area.id, dimension, Number(event.target.value))} className="h-9 w-full rounded-lg border-slate-300 bg-white px-2 text-center font-mono text-[11px] font-bold focus:border-fuchsia-500 focus:ring-fuchsia-500" />
                                                                    </label>
                                                                ))}
                                                                <p className="col-span-2 text-[9px] leading-4 text-slate-500">Resize values keep the zone centered on the same surface.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <button type="button" onClick={() => removeArea(area.id)} className="w-full rounded-lg border border-red-100 px-3 py-2 text-[10px] font-black text-red-600 hover:bg-red-50">Remove area</button>
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>

                        {printAreas.length === 0 && <p className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-500">Add the first pattern area or logo zone above.</p>}
                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                        {patternZonesError && <p className="text-xs font-semibold text-red-600">{patternZonesError}</p>}
                        <details className="rounded-xl border border-slate-200 bg-slate-50">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-500">Developer: placement data</summary>
                            <div className="border-t border-slate-200 p-3"><textarea value={value} onChange={(event) => onChange(event.target.value)} rows="10" spellCheck="false" className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:ring-blue-500" /></div>
                        </details>
                    </aside>

                    <div className="min-w-0 lg:sticky lg:top-24">
                        {supportsLogos && previewScene && activeLogoAreaId && bindings[activeLogoAreaId] ? (
                            <LogoPlacementEditor
                                key={activeLogoAreaId}
                                scene={previewScene}
                                area={printAreas.find((area) => area.id === activeLogoAreaId) ?? { id: activeLogoAreaId, label: headline(activeLogoAreaId) }}
                                binding={bindings[activeLogoAreaId]}
                                zones={Object.entries(bindings).map(([id, zoneBinding]) => ({ id, label: zoneBinding.label || headline(id), binding: zoneBinding }))}
                                onChange={(placement) => setLogoPlacement(activeLogoAreaId, placement)}
                            />
                        ) : previewScene ? <ModelOverview scene={previewScene} /> : null}
                    </div>
                </div>
            )}
        </div>
    );
}
