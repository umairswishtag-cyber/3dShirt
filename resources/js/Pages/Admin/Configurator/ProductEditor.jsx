import { Link, router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdminShell from './AdminShell';
import PrintAreaBindingSelector from './PrintAreaBindingSelector';

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

function ColorOptionsField({ zonesValue, paletteValue, onZonesChange, onPaletteChange, zonesError, paletteError }) {
    const zones = parseJsonField(zonesValue, 'array').value;
    const palette = parseJsonField(paletteValue, 'array').value;
    const updateZone = (index, changes) => {
        onZonesChange(JSON.stringify(zones.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...changes } : zone), null, 2));
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-black">Solid color choices</h3>
                    <p className="mt-1 text-xs text-slate-500">Name each customer color option and choose its starting color.</p>
                </div>
                <button type="button" onClick={() => onZonesChange(JSON.stringify([...zones, { id: `area${zones.length + 1}`, label: `Area ${zones.length + 1}`, defaultColor: '#F8FAFC' }], null, 2))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold">Add color area</button>
            </div>
            <div className="mt-3 space-y-2">
                {zones.map((zone, index) => (
                    <div key={zone.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
                        <input type="color" value={zone.defaultColor || '#F8FAFC'} onChange={(event) => updateZone(index, { defaultColor: event.target.value.toUpperCase() })} className="h-10 w-11 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`${zone.label || zone.id} starting color`} />
                        <input value={zone.label || ''} onChange={(event) => updateZone(index, { label: event.target.value })} className="h-10 rounded-lg border-slate-300 text-sm" aria-label="Color area name" />
                        {zones.length > 1 && <button type="button" onClick={() => onZonesChange(JSON.stringify(zones.filter((_, zoneIndex) => zoneIndex !== index), null, 2))} className="rounded-lg px-2 py-2 text-xs font-bold text-red-600">Remove</button>}
                    </div>
                ))}
            </div>
            <FieldError message={zonesError} />

            <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-black">Colors customers can choose</p>
                        <p className="mt-1 text-[11px] text-slate-500">Click a swatch to change it.</p>
                    </div>
                    <button type="button" onClick={() => onPaletteChange(JSON.stringify([...palette, '#FFFFFF'], null, 2))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold">Add color</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {palette.map((color, index) => (
                        <label key={`${color}-${index}`} className="group relative h-10 w-10 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow ring-1 ring-slate-300" style={{ backgroundColor: color }} title={color}>
                            <input type="color" value={color} onChange={(event) => onPaletteChange(JSON.stringify(palette.map((item, itemIndex) => itemIndex === index ? event.target.value.toUpperCase() : item), null, 2))} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Change customer color ${index + 1}`} />
                        </label>
                    ))}
                </div>
                <FieldError message={paletteError} />
            </div>
        </div>
    );
}

function MeshZoneField({ meshes, value, colorZonesValue, onChange, onUseSingleColor, error }) {
    const mappings = parseJsonField(value, 'object');
    const colorZones = parseJsonField(colorZonesValue, 'array').value;
    const [reviewOpen, setReviewOpen] = useState(colorZones.length > 1);
    const [autoSignature, setAutoSignature] = useState(null);
    const modelSignature = `${meshes.map((mesh) => mesh.name).join('|')}::${colorZones[0]?.id ?? ''}`;
    const zoneIds = new Set(colorZones.map((zone) => zone.id));
    const recognizedMappings = meshes.filter((mesh) => zoneIds.has(mappings.value[mesh.name]));

    useEffect(() => {
        if (meshes.length === 0 || colorZones.length !== 1 || recognizedMappings.length > 0 || autoSignature === modelSignature) return;
        onChange(JSON.stringify(Object.fromEntries(meshes.map((mesh) => [mesh.name, colorZones[0].id])), null, 2));
        setAutoSignature(modelSignature);
    }, [autoSignature, colorZones, meshes, modelSignature, onChange, recognizedMappings.length]);
    const setMapping = (meshName, zoneId) => {
        const next = { ...mappings.value };
        if (zoneId) next[meshName] = zoneId;
        else delete next[meshName];
        onChange(JSON.stringify(next, null, 2));
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-black text-slate-800">Connect colors to the 3D model</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {colorZones.length === 1 ? 'This is set up automatically for a single-color product.' : 'Choose which color option controls each model part.'}
                    </p>
                </div>
                {meshes.length > 0 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{recognizedMappings.length} parts connected</span>}
            </div>
            {meshes.length === 1 && colorZones.length > 1 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    This model has one editable part, so it cannot use separate sleeve, front, and back colors.
                    <button type="button" onClick={() => onUseSingleColor?.(meshes[0].name, colorZones.find((zone) => zone.id === mappings.value[meshes[0].name]) ?? colorZones[0])} className="mt-2 block rounded-lg bg-amber-700 px-3 py-2 font-black text-white hover:bg-amber-800">
                        Use one color for the whole product
                    </button>
                </div>
            )}
            {meshes.length > 0 && colorZones.length === 1 && !reviewOpen && (
                <button type="button" onClick={() => setReviewOpen(true)} className="mt-3 text-xs font-bold text-slate-600 underline">Review individual model parts</button>
            )}
            {meshes.length > 0 && (reviewOpen || colorZones.length > 1) ? (
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {meshes.map((mesh) => (
                        <label key={mesh.name} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                            <span className="truncate text-xs font-bold text-slate-700" title={mesh.name}>{meshes.length === 1 ? 'Whole product' : mesh.name}</span>
                            <select value={mappings.value[mesh.name] ?? ''} onChange={(event) => setMapping(mesh.name, event.target.value)} className="h-10 rounded-lg border-slate-300 text-xs">
                                <option value="">Not color editable</option>
                                {colorZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label || zone.id}</option>)}
                            </select>
                        </label>
                    ))}
                </div>
            ) : (
                meshes.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">Upload the 3D model first. We will connect its parts automatically.</p>
            )}
            {!mappings.valid && <FieldError message="Mesh mappings contain invalid JSON. Assign a mesh to reset them." />}
            <FieldError message={error} />
            <details className="mt-3 rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-500">Developer: model-part data</summary>
                <div className="border-t border-slate-200 p-3">
                    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="8" spellCheck="false" className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100" />
                </div>
            </details>
        </div>
    );
}

function Toggle({ label, description, checked, onChange }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
        </label>
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
        <section className={`rounded-2xl border p-5 shadow-sm ${published ? 'border-emerald-200 bg-emerald-50' : blockers.length === 0 ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${published ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                            {published ? 'Live' : creating ? 'New product' : 'Draft'}
                        </span>
                        <h2 className="text-base font-black">Storefront status</h2>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-700">
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
                {published && <Link href={route('admin.configurator.preview', product.id)} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-emerald-800">View storefront</Link>}
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
        <section id="product-patterns" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Product patterns</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Upload SVGs only for this GLB. Unsafe SVG elements are removed and each detected source color becomes a storefront color picker.</p>
            <div className={`mt-3 rounded-xl border px-4 py-3 text-xs font-semibold leading-5 ${product.is_published && product.supports_patterns ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                {product.is_published && product.supports_patterns
                    ? 'This product is live: newly uploaded active patterns appear on the storefront immediately.'
                    : !product.is_published
                      ? 'Patterns are saved with this draft, but remain off the storefront until the product is published.'
                      : 'Patterns are saved, but customers cannot see them until SVG patterns is enabled in the product configuration.'}
            </div>

            <form onSubmit={addPattern} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
                <TextField label="Pattern name" value={upload.data.name} onChange={(event) => upload.setData('name', event.target.value)} error={upload.errors.name} />
                <TextField label="SVG file" type="file" accept="image/svg+xml,.svg" onChange={(event) => upload.setData('svg', event.target.files[0])} error={upload.errors.svg} />
                <TextField label="Sort order" type="number" min="0" value={upload.data.sort_order} onChange={(event) => upload.setData('sort_order', Number(event.target.value))} error={upload.errors.sort_order} />
                <div className="flex items-end gap-3 pb-0.5">
                    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={upload.data.is_active} onChange={(event) => upload.setData('is_active', event.target.checked)} /> Active</label>
                    <button disabled={upload.processing} className="ml-auto h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">Upload</button>
                </div>
            </form>

            <div className="mt-4 space-y-3">
                {product.patterns.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No patterns uploaded for this product.</p>}
                {product.patterns.map((pattern) => {
                    const activeEdit = editing?.id === pattern.id ? editing : null;
                    const patternVisibility = visibility(pattern);
                    return (
                        <article key={pattern.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-start">
                            <img src={pattern.assetUrl} alt="" className="h-24 w-32 rounded-lg border border-slate-200 bg-slate-50 object-cover" />
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
                                    <><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{pattern.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${patternVisibility.className}`}>{patternVisibility.label}</span></div><p className="mt-1 text-xs text-slate-500">{pattern.color_slots.length} editable colors</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setEditing({ ...pattern, color_slots: pattern.color_slots.map((slot) => ({ ...slot })) })} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit colors</button><button type="button" onClick={() => window.confirm('Delete this pattern?') && router.delete(route('admin.configurator.patterns.destroy', [product.id, pattern.id]), { preserveScroll: true })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Delete</button></div></>
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
    const form = useForm({
        name: product?.name ?? '', gender: product?.gender ?? audiences[0]?.slug ?? '', category: product?.category ?? categories[0]?.slug ?? '', description: product?.description ?? '', fit_height: product?.fit_height ?? 2.45,
        model: null, thumbnail: null, mesh_zones: JSON.stringify(product?.mesh_zones ?? {}, null, 2), print_areas: JSON.stringify(product?.print_areas ?? {}, null, 2),
        color_zones: JSON.stringify(product?.color_zones ?? DEFAULT_COLOR_ZONES, null, 2), allowed_colors: JSON.stringify(product?.allowed_colors ?? DEFAULT_ALLOWED_COLORS, null, 2), pattern_zones: JSON.stringify(product?.pattern_zones ?? [], null, 2),
        supports_colors: product?.supports_colors ?? true, supports_patterns: product?.supports_patterns ?? false, supports_logos: product?.supports_logos ?? false, is_published: product?.is_published ?? false, sort_order: product?.sort_order ?? 0,
        pattern_name: '', pattern_svg: null, pattern_is_active: true,
    });

    const handleInspection = useCallback((inspection) => setModelInspection(inspection), []);
    const handleArtworkAreasChange = (value) => {
        const areas = parseJsonField(value, 'object').value;
        form.clearErrors('print_areas', 'pattern_zones');
        form.setData({
            ...form.data,
            print_areas: value,
            pattern_zones: form.data.supports_patterns
                ? JSON.stringify(Object.keys(areas), null, 2)
                : form.data.pattern_zones,
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
            form.data.supports_patterns &&
            parsedConfiguration.patternZones.value.some((areaId) => !parsedConfiguration.printAreas.value[areaId])
        ) {
            blockers.push({ message: 'Review the selected pattern and logo areas.', href: '#model-bindings' });
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
        <AdminShell title={editing ? `Configure ${product.name}` : 'Add New product'} actions={<Link href={route('admin.configurator.products.index')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Back to products</Link>}>
            <nav className="sticky top-3 z-20 mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label="Product editor sections">
                <a href="#product-details" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Product</a>
                <a href="#product-assets" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">GLB & capabilities</a>
                <a href="#model-bindings" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Customization</a>
                {editing && <a href="#product-patterns" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700">SVG patterns</a>}
            </nav>

            <ValidationSummary errors={form.errors} />

            <form onSubmit={submit} className="space-y-6">
                <PublishReadiness product={product} blockers={publishBlockers} />
                <section id="product-details" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black">Catalog information</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <TextField label="Product name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                        <label className="block"><span className="mb-1.5 block text-xs font-bold">Customer group</span><select value={form.data.gender} onChange={(e) => form.setData('gender', e.target.value)} className="h-11 w-full rounded-xl border-slate-300 text-sm">{audiences.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select><FieldError message={form.errors.gender} /></label>
                        <label className="block"><span className="mb-1.5 block text-xs font-bold">Garment category</span><select value={form.data.category} onChange={(e) => form.setData({ ...form.data, category: e.target.value, print_areas: '{}', pattern_zones: '[]' })} className="h-11 w-full rounded-xl border-slate-300 text-sm">{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select><span className="mt-1.5 block text-[11px] text-slate-500">Changing category resets artwork areas so they can match the new product type. Manage choices under <a href={route('admin.configurator.taxonomies.index')} className="font-bold text-blue-700 underline">Catalog options</a>.</span><FieldError message={form.errors.category} /></label>
                        <TextField label="Display order" type="number" min="0" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} error={form.errors.sort_order} />
                        <TextField label="Viewer fit height" type="number" min="0.1" max="20" step="0.05" value={form.data.fit_height} onChange={(e) => form.setData('fit_height', Number(e.target.value))} error={form.errors.fit_height} />
                        <label className="block md:col-span-2 lg:col-span-3"><span className="mb-1.5 block text-xs font-bold">Description</span><textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows="3" className="w-full rounded-xl border-slate-300 text-sm" /><FieldError message={form.errors.description} /></label>
                    </div>
                </section>

                <section id="product-assets" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black">Assets and storefront capabilities</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <TextField label={editing ? 'Replace GLB model (optional)' : 'GLB model'} type="file" accept=".glb,model/gltf-binary" onChange={(e) => form.setData('model', e.target.files[0])} help={product?.model_original_name ? `Current: ${product.model_original_name}` : 'Maximum 100 MB'} error={form.errors.model} />
                        <TextField label="Product thumbnail (optional)" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => form.setData('thumbnail', e.target.files[0])} error={form.errors.thumbnail} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Toggle label="Solid colors" description="Allow configured material zones to be recolored." checked={form.data.supports_colors} onChange={(value) => form.setData('supports_colors', value)} />
                        <Toggle label="SVG patterns" description="Show this product's active uploaded patterns." checked={form.data.supports_patterns} onChange={(value) => form.setData('supports_patterns', value)} />
                        <Toggle label="Logo placement" description="Allow image uploads on configured print areas." checked={form.data.supports_logos} onChange={(value) => form.setData('supports_logos', value)} />
                    </div>
                    {!editing && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                            Publish immediately when the storefront checklist is complete, or save unfinished work as a draft and return later.
                        </div>
                    )}
                    <FieldError message={form.errors.is_published} />

                    {!editing && (
                        <div id="product-patterns" className={`mt-5 scroll-mt-24 rounded-2xl border p-4 ${form.data.supports_patterns ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
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

                    {editing && (
                        <a href="#product-patterns" className="mt-5 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-800 hover:bg-purple-100">
                            Upload and manage SVG patterns
                            <span aria-hidden="true">↓</span>
                        </a>
                    )}
                </section>

                <section id="model-bindings" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black">Customer customization</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Choose what customers can change. The 3D model is checked and connected automatically wherever possible.</p>

                    {!form.data.supports_colors && !form.data.supports_patterns && !form.data.supports_logos && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            This product is displayed as supplied; customers cannot change colors or add artwork.
                        </div>
                    )}

                    {form.data.supports_colors && (
                        <div className="mt-5 space-y-4">
                            <ColorOptionsField
                                zonesValue={form.data.color_zones}
                                paletteValue={form.data.allowed_colors}
                                onZonesChange={handleColorZonesChange}
                                onPaletteChange={(value) => form.setData('allowed_colors', value)}
                                zonesError={form.errors.color_zones}
                                paletteError={form.errors.allowed_colors}
                            />
                            <MeshZoneField
                                meshes={modelInspection.meshes}
                                value={form.data.mesh_zones}
                                colorZonesValue={form.data.color_zones}
                                onChange={(value) => form.setData('mesh_zones', value)}
                                onUseSingleColor={(meshName, zone) => form.setData({
                                    ...form.data,
                                    color_zones: JSON.stringify([zone], null, 2),
                                    mesh_zones: JSON.stringify({ [meshName]: zone.id }, null, 2),
                                })}
                                error={form.errors.mesh_zones}
                            />
                        </div>
                    )}

                    <div className={(form.data.supports_patterns || form.data.supports_logos) ? 'mt-5 rounded-2xl border border-purple-200 bg-purple-50/50 p-4' : ''}>
                        <PrintAreaBindingSelector
                            modelFile={form.data.model}
                            modelUrl={product?.modelUrl}
                            category={form.data.category}
                            value={form.data.print_areas}
                            onChange={handleArtworkAreasChange}
                            error={form.errors.print_areas}
                            onInspection={handleInspection}
                            onDisableArtwork={disableArtworkFeatures}
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
