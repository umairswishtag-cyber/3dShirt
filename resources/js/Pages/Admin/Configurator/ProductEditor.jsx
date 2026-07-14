import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
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

function Toggle({ label, description, checked, onChange }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-slate-300">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
        </label>
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

    return (
        <section id="product-patterns" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Product patterns</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Upload SVGs only for this GLB. Unsafe SVG elements are removed and each detected source color becomes a storefront color picker.</p>

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
                                    <><div className="flex items-center gap-2"><h3 className="font-bold">{pattern.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${pattern.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{pattern.is_active ? 'Active' : 'Hidden'}</span></div><p className="mt-1 text-xs text-slate-500">{pattern.color_slots.length} editable colors</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setEditing({ ...pattern, color_slots: pattern.color_slots.map((slot) => ({ ...slot })) })} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit colors</button><button type="button" onClick={() => window.confirm('Delete this pattern?') && router.delete(route('admin.configurator.patterns.destroy', [product.id, pattern.id]), { preserveScroll: true })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Delete</button></div></>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default function ProductEditor({ product }) {
    const editing = Boolean(product);
    const form = useForm({
        name: product?.name ?? '', gender: product?.gender ?? 'men', category: product?.category ?? 'shirts', description: product?.description ?? '', fit_height: product?.fit_height ?? 2.45,
        model: null, thumbnail: null, mesh_zones: JSON.stringify(product?.mesh_zones ?? { Object_1: 'body' }, null, 2), print_areas: JSON.stringify(product?.print_areas ?? {}, null, 2),
        color_zones: JSON.stringify(product?.color_zones ?? DEFAULT_COLOR_ZONES, null, 2), allowed_colors: JSON.stringify(product?.allowed_colors ?? DEFAULT_ALLOWED_COLORS, null, 2), pattern_zones: JSON.stringify(product?.pattern_zones ?? ['front', 'back', 'leftSleeve', 'rightSleeve'], null, 2),
        supports_colors: product?.supports_colors ?? true, supports_patterns: product?.supports_patterns ?? false, supports_logos: product?.supports_logos ?? false, is_published: product?.is_published ?? false, sort_order: product?.sort_order ?? 0,
        pattern_name: '', pattern_svg: null, pattern_is_active: true,
    });

    const submit = (event) => {
        event.preventDefault();
        if (editing) {
            form.transform((data) => ({ ...data, _method: 'put' })).post(route('admin.configurator.products.update', product.id), { forceFormData: true, preserveScroll: true });
        } else {
            form.post(route('admin.configurator.products.store'), { forceFormData: true });
        }
    };

    return (
        <AdminShell title={editing ? `Configure ${product.name}` : 'Add GLB product'} actions={<Link href={route('admin.configurator.products.index')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Back to products</Link>}>
            <nav className="sticky top-3 z-20 mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label="Product editor sections">
                <a href="#product-details" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Product</a>
                <a href="#product-assets" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">GLB & capabilities</a>
                <a href="#product-patterns" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700">SVG patterns</a>
                <a href="#model-bindings" className="rounded-xl px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Bindings</a>
            </nav>

            {editing && <PatternManager product={product} />}

            <form onSubmit={submit} className="space-y-6">
                <section id="product-details" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black">Catalog information</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <TextField label="Product name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                        <label className="block"><span className="mb-1.5 block text-xs font-bold">Gender</span><select value={form.data.gender} onChange={(e) => form.setData('gender', e.target.value)} className="h-11 w-full rounded-xl border-slate-300 text-sm"><option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option><option value="kids">Kids</option></select><FieldError message={form.errors.gender} /></label>
                        <TextField label="Category key" value={form.data.category} onChange={(e) => form.setData('category', e.target.value.toLowerCase().replace(/\s+/g, '-'))} help="Examples: shirts, dresses, pants, jackets" error={form.errors.category} />
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
                    {editing ? (
                        <div className="mt-4"><Toggle label="Published on storefront" description="Publishing patterns or logos requires at least one valid print-area binding." checked={form.data.is_published} onChange={(value) => form.setData('is_published', value)} /><FieldError message={form.errors.is_published} /></div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                            New products are created as drafts. After creation, the edit screen opens with the full SVG pattern manager; complete the bindings there, then publish.
                        </div>
                    )}

                    {!editing && (
                        <div id="product-patterns" className={`mt-5 scroll-mt-24 rounded-2xl border p-4 ${form.data.supports_patterns ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-black text-slate-950">Initial SVG pattern</h3>
                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">Optional</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">Upload the first pattern with this GLB. Selecting an SVG automatically enables pattern customization. After the draft is created, you will be redirected to the same full pattern manager used when editing products.</p>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <TextField label="Pattern name" value={form.data.pattern_name} onChange={(event) => form.setData('pattern_name', event.target.value)} placeholder="Example: Blue diagonal stripes" error={form.errors.pattern_name} />
                                <TextField
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
                    <h2 className="text-lg font-black">Model bindings</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Mesh names must exactly match the GLB. Products with patterns or logos also need print-area mesh names and UV bounds.</p>
                    {(form.data.supports_patterns || form.data.supports_logos) && (
                        <div className={`mt-3 rounded-xl border px-4 py-3 text-xs leading-5 ${form.data.is_published ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                            {form.data.is_published
                                ? 'Before publishing, add a print-area binding that identifies the GLB mesh and UV region where patterns or logos will render.'
                                : 'You can create this draft now and complete print-area bindings on the edit screen. Bindings are required only when you publish the product.'}
                        </div>
                    )}
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <JsonField label="Mesh to color-zone mapping" value={form.data.mesh_zones} onChange={(value) => form.setData('mesh_zones', value)} error={form.errors.mesh_zones} help={'Example: { "Object_10": "body", "Object_18": "rightSleeve" }'} />
                        <PrintAreaBindingSelector
                            modelFile={form.data.model}
                            modelUrl={product?.modelUrl}
                            value={form.data.print_areas}
                            onChange={(value) => form.setData('print_areas', value)}
                            error={form.errors.print_areas}
                        />
                        <JsonField label="Color zones" value={form.data.color_zones} onChange={(value) => form.setData('color_zones', value)} error={form.errors.color_zones} help={'Array items: { "id": "body", "label": "Body", "defaultColor": "#F8FAFC" }'} />
                        <JsonField label="Allowed storefront colors" value={form.data.allowed_colors} onChange={(value) => form.setData('allowed_colors', value)} error={form.errors.allowed_colors} />
                        <JsonField label="Pattern coverage areas" value={form.data.pattern_zones} onChange={(value) => form.setData('pattern_zones', value)} error={form.errors.pattern_zones} help={'Example: ["front", "back", "leftSleeve", "rightSleeve"]'} />
                    </div>
                </section>

                <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur"><button disabled={form.processing} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{form.processing ? 'Saving…' : editing ? 'Save configuration' : 'Create draft and manage patterns'}</button></div>
            </form>

        </AdminShell>
    );
}
