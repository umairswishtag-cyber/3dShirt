import { Link, router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import UiIcon from '@/Components/UiIcon';
import AdminShell from './AdminShell';
import GlbModelPreview from './GlbModelPreview';
import PrintAreaBindingSelector from './PrintAreaBindingSelector';
import { supportsLogoPlacement } from '@/features/configurator/config/designAreas';

const DEFAULT_COLOR_ZONES = [
    { id: 'body', label: 'Body', defaultColor: '#F8FAFC' },
];
const DEFAULT_ALLOWED_COLORS = ['#F8FAFC', '#111827', '#172554', '#2563EB', '#DC2626', '#16A34A', '#FACC15', '#F97316', '#64748B', '#7C3AED'];

function FieldError({ message }) {
    return message ? <p className="mt-1 text-xs font-semibold text-red-600">{message}</p> : null;
}

function TextField({ label, error, help, ...props }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
            <input {...props} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-blue-500" />
            {help && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{help}</span>}
            <FieldError message={error} />
        </label>
    );
}

function ThumbnailUpload({ file, currentUrl, onChange, error }) {
    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Product thumbnail <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></p>
                {file && <button type="button" onClick={() => onChange(null)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">{currentUrl ? 'Use saved image' : 'Clear selection'}</button>}
            </div>
            <input key={file ? `${file.name}-${file.lastModified}` : 'empty-thumbnail'} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="mt-1 block h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs file:mr-2 file:border-0 file:border-r file:border-slate-200 file:bg-transparent file:pr-2 file:text-[10px] file:font-bold focus:border-indigo-500 focus:ring-indigo-500" />
            <p className="mt-1 text-[9px] text-slate-500">PNG, JPEG or WebP · 5 MB max{currentUrl && !file ? ' · Saved image retained' : ''}</p>
            {file && <p className="mt-0.5 truncate text-[9px] font-semibold text-emerald-700">Ready: {file.name}</p>}
            <FieldError message={error} />
        </div>
    );
}

function JsonField({ label, value, onChange, error, help, rows = 6 }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
            <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} spellCheck="false" className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 focus:border-blue-500 focus:ring-blue-500" />
            {help && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{help}</span>}
            <FieldError message={error} />
        </label>
    );
}

function ColorModelField({ zonesValue, mappingsValue, meshes, onZonesChange, onMappingsChange, zonesError, mappingsError }) {
    const zones = parseJsonField(zonesValue, 'array').value;
    const mappings = parseJsonField(mappingsValue, 'object');
    const [autoSignature, setAutoSignature] = useState(null);
    const zoneIds = new Set(zones.map((zone) => zone.id));
    const connectedMeshes = meshes.filter((mesh) => zoneIds.has(mappings.value[mesh.name]));
    const modelSignature = `${meshes.map((mesh) => mesh.name).join('|')}::${zones[0]?.id ?? ''}`;

    useEffect(() => {
        if (meshes.length === 0 || zones.length !== 1 || connectedMeshes.length > 0 || autoSignature === modelSignature) return;
        onMappingsChange(JSON.stringify(Object.fromEntries(meshes.map((mesh) => [mesh.name, zones[0].id])), null, 2));
        setAutoSignature(modelSignature);
    }, [autoSignature, connectedMeshes.length, meshes, modelSignature, onMappingsChange, zones]);

    const updateZone = (index, changes) => {
        onZonesChange(JSON.stringify(zones.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...changes } : zone), null, 2));
    };
    const addZone = () => {
        let number = zones.length + 1;
        while (zones.some((zone) => zone.id === `area${number}`)) number += 1;
        onZonesChange(JSON.stringify([...zones, { id: `area${number}`, label: `Area ${number}`, defaultColor: '#F8FAFC' }], null, 2));
    };
    const setZoneMesh = (zoneId, meshName, checked) => {
        const next = { ...mappings.value };
        if (checked) next[meshName] = zoneId;
        else if (next[meshName] === zoneId) delete next[meshName];
        onMappingsChange(JSON.stringify(next, null, 2));
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-black">Colors and model parts</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Create a color, then select every GLB part it should control.</p>
                </div>
                <div className="flex items-center gap-2">
                    {meshes.length > 0 && <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${connectedMeshes.length === meshes.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{connectedMeshes.length}/{meshes.length} parts</span>}
                    <button type="button" onClick={addZone} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-slate-50">+ Add color</button>
                </div>
            </div>
            <div className="mt-3 space-y-2">
                {zones.map((zone, index) => (
                    <div key={zone.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-[38px_minmax(8rem,1fr)_minmax(11rem,1.2fr)_auto] sm:items-center">
                        <input type="color" value={zone.defaultColor || '#F8FAFC'} onChange={(event) => updateZone(index, { defaultColor: event.target.value.toUpperCase() })} className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`${zone.label || zone.id} starting color`} />
                        <input value={zone.label || ''} onChange={(event) => updateZone(index, { label: event.target.value })} className="h-9 min-w-0 rounded-lg border-slate-300 text-xs font-semibold" aria-label="Color area name" />
                        <details className="group relative">
                            <summary className="flex h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 hover:border-blue-300">
                                <span>{meshes.filter((mesh) => mappings.value[mesh.name] === zone.id).length || 'No'} model part{meshes.filter((mesh) => mappings.value[mesh.name] === zone.id).length === 1 ? '' : 's'}</span>
                                <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 max-h-60 w-full min-w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                {meshes.length > 0 ? meshes.map((mesh) => {
                                    const assignedZoneId = mappings.value[mesh.name];
                                    const assignedZone = zones.find((item) => item.id === assignedZoneId);
                                    return (
                                        <label key={mesh.name} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                                            <input type="checkbox" checked={assignedZoneId === zone.id} onChange={(event) => setZoneMesh(zone.id, mesh.name, event.target.checked)} className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="min-w-0"><span className="block truncate text-[11px] font-bold text-slate-800" title={mesh.name}>{meshes.length === 1 ? 'Whole product' : mesh.name}</span>{assignedZoneId && assignedZoneId !== zone.id && <span className="block truncate text-[9px] text-slate-400">Currently: {assignedZone?.label || assignedZoneId}</span>}</span>
                                        </label>
                                    );
                                }) : <p className="px-2 py-3 text-[11px] text-slate-500">Upload the GLB model first.</p>}
                            </div>
                        </details>
                        {zones.length > 1 && <button type="button" onClick={() => onZonesChange(JSON.stringify(zones.filter((_, zoneIndex) => zoneIndex !== index), null, 2))} className="rounded-lg px-2 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50">Remove</button>}
                    </div>
                ))}
            </div>
            <FieldError message={zonesError} />
            {!mappings.valid && <FieldError message="Mesh mappings contain invalid JSON. Assign a mesh to reset them." />}
            <FieldError message={mappingsError} />
            {meshes.length > 0 && connectedMeshes.length < meshes.length && <p className="mt-2 text-[10px] font-semibold text-amber-700">{meshes.length - connectedMeshes.length} model part{meshes.length - connectedMeshes.length === 1 ? '' : 's'} still need a color.</p>}
        </div>
    );
}

function parseJsonField(value, expectedType) {
    try {
        const parsed = JSON.parse(value || (expectedType === 'array' ? '[]' : '{}'));
        const valid = expectedType === 'array'
            ? Array.isArray(parsed)
            : parsed && typeof parsed === 'object' && !Array.isArray(parsed);
        return { valid, value: valid ? parsed : expectedType === 'array' ? [] : {} };
    } catch {
        return { valid: false, value: expectedType === 'array' ? [] : {} };
    }
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ValidationSummary({ errors }) {
    const messages = [...new Set(Object.values(errors).flat().filter(Boolean))];
    if (messages.length === 0) return null;

    return (
        <div id="configuration-errors" role="alert" className="mb-6 scroll-mt-24 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <p className="text-sm font-black">Configuration was not saved</p>
            <p className="mt-1 text-xs">Fix the following items and try again:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold">
                {messages.map((message) => <li key={message}>{message}</li>)}
            </ul>
        </div>
    );
}

function PublishReadiness({ product, blockers }) {
    const published = Boolean(product?.is_published);
    const creating = !product;

    return (
        <section className={`rounded-2xl border p-4 shadow-sm ${published ? 'border-emerald-200 bg-emerald-50' : blockers.length === 0 ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${published ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                            {published ? 'Live' : creating ? 'New product' : 'Draft'}
                        </span>
                        <h2 className="text-base font-black">Storefront status</h2>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-700">
                        {published
                            ? 'This product is live. Active patterns appear immediately when pattern customization is enabled.'
                            : creating && blockers.length === 0
                              ? 'Everything is ready. You can publish this product immediately.'
                              : creating
                                ? 'Complete the items below to publish now, or save the product as a draft.'
                            : blockers.length === 0
                              ? 'Everything required is ready. Save the draft or publish it to the storefront.'
                              : 'The draft is safe. Complete the items below before publishing it.'}
                    </p>
                </div>
            </div>
            {!published && blockers.length > 0 && (
                <ul className="mt-3 grid gap-2 text-xs font-semibold text-amber-950 sm:grid-cols-2">
                    {blockers.map((blocker) => (
                        <li key={blocker.message}>
                            <a href={blocker.href} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 hover:bg-white">
                                <span aria-hidden="true">○</span><span>{blocker.message}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function PatternManager({ product }) {
    const upload = useForm({ name: '', svg: null, is_active: true, sort_order: 0 });
    const [editing, setEditing] = useState(null);

    const addPattern = (event) => {
        event.preventDefault();
        upload.post(route('admin.configurator.patterns.store', product.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => upload.reset(),
        });
    };

    const savePattern = (pattern) => {
        router.put(route('admin.configurator.patterns.update', [product.id, pattern.id]), editing, {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const visibility = (pattern) => {
        if (!pattern.is_active) return { label: 'Hidden', className: 'bg-slate-100 text-slate-600' };
        if (!product.is_published) return { label: 'Ready with draft', className: 'bg-amber-50 text-amber-700' };
        if (!product.supports_patterns) return { label: 'Patterns disabled', className: 'bg-orange-50 text-orange-700' };
        return { label: 'Live on storefront', className: 'bg-emerald-50 text-emerald-700' };
    };

    return (
        <section id="product-patterns" className="mt-5 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">Product patterns</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Upload SVGs for this GLB. Each detected source color becomes a storefront color picker.</p>
            <div className={`mt-3 rounded-lg border px-3 py-2 text-[10px] font-semibold leading-5 ${product.is_published && product.supports_patterns ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                {product.is_published && product.supports_patterns
                    ? 'This product is live: newly uploaded active patterns appear on the storefront immediately.'
                    : !product.is_published
                      ? 'Patterns are saved with this draft, but remain off the storefront until the product is published.'
                      : 'Patterns are saved, but customers cannot see them until SVG patterns is enabled in the product configuration.'}
            </div>

            <form onSubmit={addPattern} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-4">
                <TextField label="Pattern name" value={upload.data.name} onChange={(event) => upload.setData('name', event.target.value)} error={upload.errors.name} />
                <TextField label="SVG file" type="file" accept="image/svg+xml,.svg" onChange={(event) => upload.setData('svg', event.target.files[0])} error={upload.errors.svg} />
                <TextField label="Sort order" type="number" min="0" value={upload.data.sort_order} onChange={(event) => upload.setData('sort_order', Number(event.target.value))} error={upload.errors.sort_order} />
                <div className="flex items-end gap-3 pb-0.5">
                    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={upload.data.is_active} onChange={(event) => upload.setData('is_active', event.target.checked)} /> Active</label>
                    <button disabled={upload.processing} className="ml-auto h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">Upload</button>
                </div>
            </form>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {product.patterns.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">No patterns uploaded for this product.</p>}
                {product.patterns.map((pattern) => {
                    const activeEdit = editing?.id === pattern.id ? editing : null;
                    const patternVisibility = visibility(pattern);
                    return (
                        <article key={pattern.id} className={`flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-start ${activeEdit ? 'sm:col-span-2 xl:col-span-3' : ''}`}>
                            <img src={pattern.assetUrl} alt="" className={`shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover ${activeEdit ? 'h-24 w-32' : 'h-20 w-24'}`} />
                            <div className="min-w-0 flex-1">
                                {activeEdit ? (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-2"><TextField label="Name" value={activeEdit.name} onChange={(event) => setEditing({ ...activeEdit, name: event.target.value })} /><TextField label="Sort order" type="number" value={activeEdit.sort_order} onChange={(event) => setEditing({ ...activeEdit, sort_order: Number(event.target.value) })} /></div>
                                        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={activeEdit.is_active} onChange={(event) => setEditing({ ...activeEdit, is_active: event.target.checked })} /> Visible on storefront</label>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {activeEdit.color_slots.map((slot, index) => (
                                                <div key={slot.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                                                    <input type="color" value={slot.source} onChange={(event) => setEditing({ ...activeEdit, color_slots: activeEdit.color_slots.map((item, itemIndex) => itemIndex === index ? { ...item, source: event.target.value.toUpperCase() } : item) })} />
                                                    <input value={slot.label} onChange={(event) => setEditing({ ...activeEdit, color_slots: activeEdit.color_slots.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs" />
                                                    <span className="font-mono text-[10px]">{slot.source}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2"><button type="button" onClick={() => savePattern(pattern)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Save pattern</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-3 py-2 text-xs font-bold">Cancel</button></div>
                                    </div>
                                ) : (
                                    <><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-sm font-bold">{pattern.name}</h3><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${patternVisibility.className}`}>{patternVisibility.label}</span></div><p className="mt-0.5 text-[10px] text-slate-500">{pattern.color_slots.length} editable colors</p><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => setEditing({ ...pattern, color_slots: pattern.color_slots.map((slot) => ({ ...slot })) })} className="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold">Edit colors</button><button type="button" onClick={() => window.confirm('Delete this pattern?') && router.delete(route('admin.configurator.patterns.destroy', [product.id, pattern.id]), { preserveScroll: true })} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-600">Delete</button></div></>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default function ProductEditor({ product, audiences = [], categories = [] }) {
    const editing = Boolean(product);
    const [modelInspection, setModelInspection] = useState({ status: 'loading', meshCount: 0, uvMeshCount: 0, meshes: [] });
    const [patternInputKey, setPatternInputKey] = useState(0);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const form = useForm({
        name: product?.name ?? '', category: product?.category ?? categories[0]?.slug ?? '', gender: product?.gender ?? audiences.find((item) => item.slug === 'unisex')?.slug ?? audiences[0]?.slug ?? '', description: product?.description ?? '', fit_height: product?.fit_height ?? 2.45,
        shopify_status: product?.shopify_status ?? 'draft', price: product?.price ?? '0.00', inventory_quantity: product?.inventory_quantity ?? 0, tags: Array.isArray(product?.tags) ? product.tags.join(', ') : '',
        model: null, thumbnail: null, mesh_zones: JSON.stringify(product?.mesh_zones ?? {}, null, 2), print_areas: JSON.stringify(product?.print_areas ?? {}, null, 2),
        color_zones: JSON.stringify(product?.color_zones ?? DEFAULT_COLOR_ZONES, null, 2), allowed_colors: JSON.stringify(product?.allowed_colors ?? DEFAULT_ALLOWED_COLORS, null, 2), pattern_zones: JSON.stringify(product?.pattern_zones ?? [], null, 2),
        supports_colors: product?.supports_colors ?? true, supports_patterns: product?.supports_patterns ?? false, supports_logos: product?.supports_logos ?? false, is_published: product?.is_published ?? false, sort_order: product?.sort_order ?? 0,
        pattern_name: '', pattern_svg: null, pattern_is_active: true,
    });

    useEffect(() => {
        const keepSessionAlive = () => {
            window.axios.get(route('admin.session.keep-alive'), {
                headers: { Accept: 'application/json' },
            }).catch(() => {});
        };
        const interval = window.setInterval(keepSessionAlive, 10 * 60 * 1000);

        return () => window.clearInterval(interval);
    }, []);

    const handleInspection = useCallback((inspection) => setModelInspection(inspection), []);
    const handleArtworkAreasChange = (value, requestedPatternAreaIds = null) => {
        const areas = parseJsonField(value, 'object').value;
        const currentPatternAreaIds = parseJsonField(form.data.pattern_zones, 'array').value;
        const patternAreaIds = Array.isArray(requestedPatternAreaIds)
            ? requestedPatternAreaIds
            : currentPatternAreaIds;
        form.clearErrors('print_areas', 'pattern_zones');
        form.setData({
            ...form.data,
            print_areas: value,
            pattern_zones: JSON.stringify(
                patternAreaIds.filter((areaId) => Boolean(areas[areaId])),
                null,
                2,
            ),
        });
    };
    const handleColorZonesChange = (value) => {
        const zoneIds = new Set(parseJsonField(value, 'array').value.map((zone) => zone.id));
        const currentMappings = parseJsonField(form.data.mesh_zones, 'object').value;
        const nextMappings = Object.fromEntries(
            Object.entries(currentMappings).filter(([, zoneId]) => zoneIds.has(zoneId)),
        );
        form.setData({
            ...form.data,
            color_zones: value,
            mesh_zones: JSON.stringify(nextMappings, null, 2),
        });
    };
    const disableArtworkFeatures = () => {
        const colorZones = parseJsonField(form.data.color_zones, 'array').value;
        const meshMappings = parseJsonField(form.data.mesh_zones, 'object').value;
        const onlyMesh = modelInspection.meshes.length === 1 ? modelInspection.meshes[0] : null;
        const wholeProductZone = onlyMesh
            ? colorZones.find((zone) => zone.id === meshMappings[onlyMesh.name]) ?? colorZones[0]
            : null;
        setPatternInputKey((key) => key + 1);
        form.setData({
            ...form.data,
            supports_patterns: false,
            supports_logos: false,
            print_areas: '{}',
            pattern_zones: '[]',
            pattern_name: editing ? form.data.pattern_name : '',
            pattern_svg: editing ? form.data.pattern_svg : null,
            color_zones: wholeProductZone ? JSON.stringify([wholeProductZone], null, 2) : form.data.color_zones,
            mesh_zones: wholeProductZone ? JSON.stringify({ [onlyMesh.name]: wholeProductZone.id }, null, 2) : form.data.mesh_zones,
        });
    };
    const parsedConfiguration = useMemo(() => ({
        meshZones: parseJsonField(form.data.mesh_zones, 'object'),
        printAreas: parseJsonField(form.data.print_areas, 'object'),
        colorZones: parseJsonField(form.data.color_zones, 'array'),
        allowedColors: parseJsonField(form.data.allowed_colors, 'array'),
        patternZones: parseJsonField(form.data.pattern_zones, 'array'),
    }), [form.data.allowed_colors, form.data.color_zones, form.data.mesh_zones, form.data.pattern_zones, form.data.print_areas]);

    const publishBlockers = useMemo(() => {
        const blockers = [];
        if (!form.data.name.trim() || !form.data.category.trim()) {
            blockers.push({ message: 'Add the product name and category.', href: '#product-details' });
        }
        if (!form.data.model && !product?.modelUrl) {
            blockers.push({ message: 'Upload a GLB model.', href: '#product-assets' });
        }
        if (Object.values(parsedConfiguration).some((field) => !field.valid)) {
            blockers.push({ message: 'Fix invalid configuration JSON.', href: '#model-bindings' });
        }
        if (form.data.supports_colors) {
            if (parsedConfiguration.colorZones.value.length === 0) {
                blockers.push({ message: 'Add at least one solid color area.', href: '#model-bindings' });
            }
            if (Object.keys(parsedConfiguration.meshZones.value).length === 0) {
                blockers.push({ message: 'Finish connecting colors to the 3D model.', href: '#model-bindings' });
            } else if (
                modelInspection.status === 'ready' &&
                !modelInspection.meshes.some((mesh) => parsedConfiguration.colorZones.value.some((zone) => zone.id === parsedConfiguration.meshZones.value[mesh.name]))
            ) {
                blockers.push({ message: 'Reconnect colors to the uploaded 3D model.', href: '#model-bindings' });
            } else if (modelInspection.status === 'ready') {
                const connectedZoneIds = new Set(
                    modelInspection.meshes.map((mesh) => parsedConfiguration.meshZones.value[mesh.name]).filter(Boolean),
                );
                if (parsedConfiguration.colorZones.value.some((zone) => !connectedZoneIds.has(zone.id))) {
                    blockers.push({ message: 'Remove or connect color areas that do not change the model.', href: '#model-bindings' });
                }
            }
        }
        if (form.data.supports_patterns || form.data.supports_logos) {
            if (Object.keys(parsedConfiguration.printAreas.value).length === 0) {
                blockers.push({ message: 'Choose where customers can add patterns or logos.', href: '#model-bindings' });
            }
        }
        if (
            form.data.supports_logos
            && !Object.values(parsedConfiguration.printAreas.value).some(supportsLogoPlacement)
        ) {
            blockers.push({ message: 'Draw at least one logo-safe zone directly on the model.', href: '#model-bindings' });
        }
        if (
            form.data.supports_patterns &&
            parsedConfiguration.patternZones.value.some((areaId) => !parsedConfiguration.printAreas.value[areaId])
        ) {
            blockers.push({ message: 'Review the selected pattern areas.', href: '#model-bindings' });
        }
        if (
            form.data.supports_patterns &&
            parsedConfiguration.patternZones.value.length === 0
        ) {
            blockers.push({ message: 'Choose at least one model area for patterns.', href: '#model-bindings' });
        }
        const hasActivePattern = editing
            ? product.patterns.some((pattern) => pattern.is_active)
            : Boolean(form.data.pattern_svg && form.data.pattern_is_active);
        if (form.data.supports_patterns && !hasActivePattern) {
            blockers.push({ message: 'Upload or activate at least one SVG pattern.', href: '#product-patterns' });
        }
        return blockers;
    }, [editing, form.data.category, form.data.model, form.data.name, form.data.pattern_is_active, form.data.pattern_svg, form.data.supports_colors, form.data.supports_logos, form.data.supports_patterns, modelInspection, parsedConfiguration, product]);

    const sendConfiguration = (published) => {
        const options = {
            forceFormData: true,
            preserveScroll: true,
            preserveState: 'errors',
            replace: editing,
            headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
            onError: (errors) => {
                const errorCount = Object.keys(errors).length;
                toast.error(errorCount === 1 ? 'Please fix the highlighted item.' : `Please fix ${errorCount} highlighted items.`);
                window.setTimeout(() => document.getElementById('configuration-errors')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            },
        };
        if (editing) {
            form.transform((data) => ({ ...data, is_published: published, _method: 'put' }));
            form.post(route('admin.configurator.products.update', product.id), options);
        } else {
            form.transform((data) => ({ ...data, is_published: published }));
            form.post(route('admin.configurator.products.store'), { ...options, preserveScroll: false });
        }
    };

    const submit = (event) => {
        event.preventDefault();
        sendConfiguration(editing ? product.is_published : false);
    };

    return (
        <AdminShell compact title={editing ? `Configure ${product.name}` : 'Add new product'} subtitle="Start with what the product is, choose who it is for, then connect its 3D model and customization options.">
            <nav className="sticky top-3 z-20 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label="Product editor sections">
                <div className="flex flex-wrap gap-2">
                    <a href="#product-details" className="rounded-xl px-4 py-2 text-md font-bold text-slate-700 hover:bg-slate-100">Product</a>
                    <a href="#product-assets" className="rounded-xl px-4 py-2 text-md font-bold text-slate-700 hover:bg-slate-100">GLB & capabilities</a>
                    <a href="#model-bindings" className="rounded-xl px-4 py-2 text-md font-bold text-slate-700 hover:bg-slate-100">Customization</a>
                    {editing && <a href="#product-patterns" className="rounded-xl bg-purple-600 px-4 py-2 text-md font-bold text-white hover:bg-purple-700">SVG patterns</a>}
                </div>
                {editing && product.is_published && <Link href={route('admin.configurator.preview', product.id)} className="rounded-xl px-3 py-2 text-md font-bold button text-emerald-700 hover:bg-emerald-50">View Product on Storefront</Link>}
            </nav>

            <ValidationSummary errors={form.errors} />

            <form onSubmit={submit} className="space-y-4">
                {!product?.is_published && <PublishReadiness product={product} blockers={publishBlockers} />}
                <section id="product-details" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Catalog information</h2>
                    <p className="mt-1 text-xs text-slate-500">A category describes the product itself. A customer group only describes its audience or fit.</p>
                    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
                        <div className="grid gap-4 md:grid-cols-12">
                            <div className="md:col-span-6"><TextField label="Product name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} /></div>
                            <div className="md:col-span-3"><TextField label="Price" type="number" min="0" step="0.01" value={form.data.price} onChange={(e) => form.setData('price', e.target.value)} help="Synced to Shopify" error={form.errors.price} /></div>
                            <div className="md:col-span-3"><TextField label="Quantity" type="number" min="0" step="1" value={form.data.inventory_quantity} onChange={(e) => form.setData('inventory_quantity', e.target.value)} help="Primary Shopify location" error={form.errors.inventory_quantity} /></div>
                            <label className="block md:col-span-6">
                                <span className="mb-1.5 block text-xs font-bold">Shopify status</span>
                                <select value={form.data.shopify_status} onChange={(event) => form.setData('shopify_status', event.target.value)} className="h-11 w-full rounded-xl border-slate-300 text-sm">
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="unlisted">Unlisted</option>
                                </select>
                                <span className="mt-1.5 block text-[11px] text-slate-500">Active is discoverable, Draft is hidden, and Unlisted is available only by direct link.</span>
                                <FieldError message={form.errors.shopify_status} />
                            </label>
                            <div className="md:col-span-6"><TextField label="Tags" value={form.data.tags} onChange={(e) => form.setData('tags', e.target.value)} help="Separate tags with commas" error={form.errors.tags} /></div>
                            {product?.shopify_product_id && (
                                <div className="md:col-span-6 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                                    <span className="font-black">Shopify product #{product.shopify_product_id}</span>
                                    <span className="mt-0.5 block">{product.shopify_synced_at ? `Last synced ${new Date(product.shopify_synced_at).toLocaleString()}` : 'Connected to Shopify'}</span>
                                </div>
                            )}
                            {form.errors.shopify && <div className="md:col-span-12"><FieldError message={form.errors.shopify} /></div>}
                            <label className="block md:col-span-6"><span className="mb-1.5 block text-xs font-bold">Product category <span className="font-medium text-slate-400">— what it is</span></span><select value={form.data.category} onChange={(e) => form.setData({ ...form.data, category: e.target.value, print_areas: '{}', pattern_zones: '[]' })} className="h-11 w-full rounded-xl border-slate-300 text-sm">{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select><span className="mt-1.5 block text-[11px] text-slate-500">Examples: shirts, hats, caps, footwear, cups. Changing this resets artwork areas.</span><FieldError message={form.errors.category} /></label>
                            <label className="block md:col-span-6"><span className="mb-1.5 block text-xs font-bold">Customer group <span className="font-medium text-slate-400">— who it is for</span></span><select value={form.data.gender} onChange={(e) => form.setData('gender', e.target.value)} className="h-11 w-full rounded-xl border-slate-300 text-sm">{audiences.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select><span className="mt-1.5 block text-[11px] text-slate-500">Use Unisex for products without a gender-specific fit. <a href={route('admin.configurator.taxonomies.index')} className="font-bold text-blue-700 underline">Manage catalog structure</a>.</span><FieldError message={form.errors.gender} /></label>
                            <div className="md:col-span-6"><TextField label="Display order" type="number" min="0" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} error={form.errors.sort_order} /></div>
                            {/* <div className="md:col-span-3"><TextField label="Viewer fit height" type="number" min="0.1" max="20" step="0.05" value={form.data.fit_height} onChange={(e) => form.setData('fit_height', Number(e.target.value))} error={form.errors.fit_height} /></div> */}
                            <label className="flex min-h-0 flex-col md:col-span-12"><span className="mb-1.5 block text-xs font-bold">Description</span><textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows="4" className="min-h-28 w-full flex-1 rounded-xl border-slate-300 text-sm" /><FieldError message={form.errors.description} /></label>
                        </div>

                        <div id="product-assets" className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div><h3 className="text-xs font-black text-slate-900">Assets and capabilities</h3><p className="mt-0.5 text-[9px] text-slate-500">Model, thumbnail and storefront tools.</p></div>
                                <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase text-slate-500">Product assets</span>
                            </div>
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-2">
                                <div className="min-w-0">
                                    <TextField label={editing ? 'Replace GLB (optional)' : 'GLB model'} type="file" accept=".glb,model/gltf-binary" onChange={(e) => form.setData('model', e.target.files?.[0] ?? null)} help={product?.model_original_name ? `Current: ${product.model_original_name}` : 'GLB · 100 MB max'} error={form.errors.model} />
                                    {form.data.model && <p className="mt-1 truncate text-[9px] font-semibold text-emerald-700"><UiIcon name="check" className="mr-1 inline h-3 w-3" />{form.data.model.name} · {formatFileSize(form.data.model.size)}</p>}
                                </div>
                                <GlbModelPreview
                                    compact
                                    modelFile={form.data.model}
                                    modelUrl={product?.modelUrl}
                                    colorZones={form.data.color_zones}
                                    meshZones={form.data.mesh_zones}
                                />
                            </div>
                            <div className="mt-3 border-t border-slate-200 pt-3">
                                <ThumbnailUpload file={form.data.thumbnail} currentUrl={product?.thumbnailUrl} onChange={(file) => form.setData('thumbnail', file)} error={form.errors.thumbnail} />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                                {[
                                    ['Solid colors', 'supports_colors'],
                                    ['SVG patterns', 'supports_patterns'],
                                    ['Logo placement', 'supports_logos'],
                                ].map(([label, field]) => (
                                    <label key={field} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center text-[9px] font-bold text-slate-700 hover:border-slate-300">
                                        <input type="checkbox" checked={form.data[field]} onChange={(event) => form.setData(field, event.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />{label}
                                    </label>
                                ))}
                            </div>
                            {editing && <a href="#product-patterns" className="mt-2 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-2 text-[10px] font-bold text-purple-800 hover:bg-purple-100">Manage SVG patterns <span aria-hidden="true">↓</span></a>}
                        </div>
                    </div>
                    {!editing && (
                        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] text-blue-900">Publish when the checklist is complete, or save this product as a draft.</p>
                    )}
                    <FieldError message={form.errors.is_published} />

                    {!editing && (
                        <div id="product-patterns" className={`mt-3 scroll-mt-24 rounded-xl border p-3 ${form.data.supports_patterns ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-black text-slate-950">Initial SVG pattern</h3>
                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">Optional</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">Upload the first pattern with this model. Selecting an SVG enables pattern customization. After saving or publishing, you can manage additional patterns from the edit screen.</p>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <TextField label="Pattern name" value={form.data.pattern_name} onChange={(event) => form.setData('pattern_name', event.target.value)} placeholder="Example: Blue diagonal stripes" error={form.errors.pattern_name} />
                                <TextField
                                    key={patternInputKey}
                                    label="SVG pattern file"
                                    type="file"
                                    accept="image/svg+xml,.svg"
                                    onChange={(event) => {
                                        const patternFile = event.target.files[0] ?? null;
                                        form.setData({
                                            ...form.data,
                                            pattern_svg: patternFile,
                                            supports_patterns: patternFile ? true : form.data.supports_patterns,
                                        });
                                    }}
                                    help="SVG only, maximum 2 MB"
                                    error={form.errors.pattern_svg}
                                />
                            </div>
                            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-950"><input type="checkbox" checked={form.data.pattern_is_active} onChange={(event) => form.setData('pattern_is_active', event.target.checked)} /> Show this pattern immediately after the product is published</label>
                            <FieldError message={form.errors.supports_patterns} />
                        </div>
                    )}

                </section>

                <section id="model-bindings" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Customer customization</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Choose what customers can change. The 3D model is checked and connected automatically wherever possible.</p>

                    {!form.data.supports_colors && !form.data.supports_patterns && !form.data.supports_logos && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            This product is displayed as supplied; customers cannot change colors or add artwork.
                        </div>
                    )}

                    {form.data.supports_colors && (
                        <div className="mt-5">
                            <ColorModelField
                                zonesValue={form.data.color_zones}
                                mappingsValue={form.data.mesh_zones}
                                meshes={modelInspection.meshes}
                                onZonesChange={handleColorZonesChange}
                                onMappingsChange={(value) => form.setData('mesh_zones', value)}
                                zonesError={form.errors.color_zones}
                                mappingsError={form.errors.mesh_zones}
                            />
                        </div>
                    )}

                    <div className={(form.data.supports_patterns || form.data.supports_logos) ? 'mt-5 rounded-2xl border border-purple-200 bg-purple-50/50 p-4' : ''}>
                        <PrintAreaBindingSelector
                            modelFile={form.data.model}
                            modelUrl={product?.modelUrl}
                            colorZones={form.data.color_zones}
                            meshZones={form.data.mesh_zones}
                            value={form.data.print_areas}
                            patternZonesValue={form.data.pattern_zones}
                            onChange={handleArtworkAreasChange}
                            error={form.errors.print_areas}
                            patternZonesError={form.errors.pattern_zones}
                            onInspection={handleInspection}
                            onDisableArtwork={disableArtworkFeatures}
                            supportsPatterns={form.data.supports_patterns}
                            supportsLogos={form.data.supports_logos}
                            enabled={form.data.supports_patterns || form.data.supports_logos}
                        />
                    </div>

                    <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-500">Developer settings</summary>
                        <div className="grid gap-4 border-t border-slate-200 p-4 xl:grid-cols-2">
                            <JsonField label="Color-area data" value={form.data.color_zones} onChange={handleColorZonesChange} error={form.errors.color_zones} />
                            <JsonField label="Customer color-palette data" value={form.data.allowed_colors} onChange={(value) => form.setData('allowed_colors', value)} error={form.errors.allowed_colors} />
                            <JsonField label="Pattern-area data" value={form.data.pattern_zones} onChange={(value) => form.setData('pattern_zones', value)} error={form.errors.pattern_zones} />
                        </div>
                    </details>
                </section>

                <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                    <p className="text-xs font-semibold text-slate-500">
                        {editing && product.is_published
                            ? 'Changes stay live after saving.'
                            : editing
                              ? 'Draft changes never appear to customers.'
                              : 'Publish now, or save as a draft if the product is not ready.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {editing && product.is_published && (
                            <button type="button" disabled={form.processing} onClick={() => sendConfiguration(false)} className="rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-black text-amber-800 disabled:opacity-50">
                                Unpublish
                            </button>
                        )}
                        <button type="submit" disabled={form.processing} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 disabled:opacity-50">
                            {form.processing ? 'Saving…' : editing && product.is_published ? 'Save live changes' : 'Save draft'}
                        </button>
                        {(!editing || !product.is_published) && (
                            <button type="button" disabled={form.processing || publishBlockers.length > 0} onClick={() => sendConfiguration(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" title={publishBlockers.length > 0 ? 'Complete the publishing checklist first' : undefined}>
                                {editing ? 'Publish to storefront' : 'Publish product'}
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {editing && <PatternManager product={product} />}

        </AdminShell>
    );
}
