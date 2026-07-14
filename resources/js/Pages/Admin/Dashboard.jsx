import { Link } from '@inertiajs/react';
import AdminShell from './Configurator/AdminShell';

const summaryCards = [
    { key: 'products', label: 'Products', tone: 'bg-blue-50 text-blue-800' },
    { key: 'published', label: 'Published', tone: 'bg-emerald-50 text-emerald-800' },
    { key: 'drafts', label: 'Drafts', tone: 'bg-amber-50 text-amber-800' },
    { key: 'patterns', label: 'Active patterns', tone: 'bg-purple-50 text-purple-800' },
];

export default function Dashboard({ summary, recentProducts }) {
    return (
        <AdminShell title="Admin dashboard">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <article key={card.key} className={`rounded-2xl p-5 ${card.tone}`}>
                        <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{card.label}</p>
                        <p className="mt-2 text-3xl font-black">{summary[card.key]}</p>
                    </article>
                ))}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <Link href={route('admin.configurator.products.create')} className="group rounded-2xl bg-blue-600 p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-100">Storefront catalog</span>
                    <h2 className="mt-3 text-xl font-black">Create GLB product</h2>
                    <p className="mt-2 text-sm leading-6 text-blue-100">Upload a garment, select gender and category, configure colors, patterns, logos, and publish it.</p>
                    <span className="mt-5 inline-block text-sm font-black">Start creating →</span>
                </Link>

                <Link href={route('admin.configurator.products.index')} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Configuration</span>
                    <h2 className="mt-3 text-xl font-black">Manage storefront</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Edit product mappings, upload product-specific SVG patterns, and control publishing.</p>
                    <span className="mt-5 inline-block text-sm font-black text-blue-700">Manage products →</span>
                </Link>

                <Link href={route('configurator')} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Customer experience</span>
                    <h2 className="mt-3 text-xl font-black">Preview storefront</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Open the live gender, category, product, color, pattern, and logo selection flow.</p>
                    <span className="mt-5 inline-block text-sm font-black text-blue-700">View storefront →</span>
                </Link>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h2 className="text-lg font-black">Recently updated products</h2><p className="mt-1 text-xs text-slate-500">Continue configuring the latest storefront items.</p></div>
                    <Link href={route('dashboard')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Open orders dashboard</Link>
                </div>
                <div className="mt-4 divide-y divide-slate-100">
                    {recentProducts.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No products yet. Create your first GLB product above.</p>}
                    {recentProducts.map((product) => (
                        <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div><p className="text-sm font-bold">{product.name}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{product.gender} / {product.category}</p></div>
                            <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${product.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{product.is_published ? 'Published' : 'Draft'}</span><Link href={route('admin.configurator.products.edit', product.id)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Configure</Link></div>
                        </div>
                    ))}
                </div>
            </section>
        </AdminShell>
    );
}
