import { Link, router } from '@inertiajs/react';
import AdminShell from './AdminShell';

export default function ProductsIndex({ products }) {
    const remove = (product) => {
        if (!window.confirm(`Delete ${product.name} and all of its uploaded patterns?`)) return;
        router.delete(route('admin.configurator.products.destroy', product.id));
    };

    return (
        <AdminShell
            title="Storefront garments"
            actions={(
                <Link href={route('admin.configurator.products.create')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                    Add GLB product
                </Link>
            )}
        >
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                Published products appear automatically in the storefront gender and category selector. Patterns are assigned to one GLB product and never leak into another product.
            </div>

            {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="font-bold">No configurator products yet.</p>
                    <p className="mt-1 text-sm text-slate-500">Upload the first GLB as a draft, configure its capabilities, then publish it.</p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {products.map((product) => (
                        <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-black">{product.name}</h2>
                                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${product.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {product.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs capitalize text-slate-500">{product.gender} / {product.category}</p>
                                </div>
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">{product.patternsCount} patterns</span>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">{product.description || 'No description'}</p>
                            <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase">
                                {product.supports_colors && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Colors</span>}
                                {product.supports_patterns && <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">Patterns</span>}
                                {product.supports_logos && <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">Logos</span>}
                                {!product.supports_colors && !product.supports_patterns && !product.supports_logos && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Static model</span>}
                            </div>
                            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                                <Link href={route('admin.configurator.products.edit', product.id)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Configure</Link>
                                <button type="button" onClick={() => remove(product)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </AdminShell>
    );
}
