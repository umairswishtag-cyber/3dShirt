import { Link, router } from '@inertiajs/react';
import UiIcon from '@/Components/UiIcon';
import GarmentIllustration from '@/Components/GarmentIllustration';
import AdminShell from './AdminShell';

export default function ProductsIndex({ products }) {
    const remove = (product) => {
        if (!window.confirm(`Delete ${product.name} and all of its uploaded patterns?`)) return;
        router.delete(route('admin.configurator.products.destroy', product.id));
    };

    return (
        <AdminShell
            title="Storefront garments"
            subtitle="Build and maintain every customizable product available in your 3D storefront."
            actions={(
                <Link href={route('admin.configurator.products.create')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                    <UiIcon name="plus" className="h-4 w-4" /> Add new product
                </Link>
            )}
        >
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-950">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm"><UiIcon name="sparkles" className="h-4 w-4" /></span>
                <p>Published products appear automatically in the storefront selector. Patterns remain assigned to their own GLB product, keeping every catalog item isolated.</p>
            </div>

            {products.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><UiIcon name="shirt" className="h-8 w-8" /></span>
                    <p className="mt-5 text-lg font-bold">No configurator products yet</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Upload the first GLB as a draft, configure its capabilities, then publish it.</p>
                    <Link href={route('admin.configurator.products.create')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"><UiIcon name="plus" className="h-4 w-4" />Create first product</Link>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {products.map((product) => (
                        <article key={product.id} className="group overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(29,38,77,0.045)] transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(49,46,129,0.08)]">
                            <div className="flex gap-4 p-5">
                                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 ring-1 ring-slate-100">
                                    <GarmentIllustration type={product.category} className="h-28 w-36 transition duration-300 group-hover:scale-105" />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate text-base font-bold">{product.name}</h2>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${product.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${product.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {product.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-xs capitalize text-slate-500">{product.gender} · {product.category}</p>
                                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{product.description || 'No description has been added yet.'}</p>
                                    <span className="mt-3 inline-flex rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/70">{product.activePatternsCount}/{product.patternsCount} active patterns</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3 text-[10px] font-bold uppercase tracking-wide">
                                {product.supports_colors && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Colors</span>}
                                {product.supports_patterns && <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">Patterns</span>}
                                {product.supports_logos && <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">Logos</span>}
                                {!product.supports_colors && !product.supports_patterns && !product.supports_logos && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Static model</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                                <Link href={route('admin.configurator.products.edit', product.id)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white"><UiIcon name="settings" className="h-3.5 w-3.5" />{product.is_published ? 'Configure product' : 'Continue draft'}</Link>
                                {product.is_published && <Link href={route('admin.configurator.preview', product.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700"><UiIcon name="storefront" className="h-3.5 w-3.5" />View storefront</Link>}
                                <button type="button" onClick={() => remove(product)} className="ml-auto grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50" aria-label={`Delete ${product.name}`}><UiIcon name="trash" className="h-4 w-4" /></button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </AdminShell>
    );
}
