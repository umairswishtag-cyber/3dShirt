import { Link } from '@inertiajs/react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from './Configurator/AdminShell';

const summaryCards = [
    { key: 'products', label: 'Total products', detail: 'Across your catalog', icon: 'products', tone: 'text-blue-700 bg-blue-50', glow: 'from-blue-500/10' },
    { key: 'published', label: 'Published', detail: 'Visible to customers', icon: 'published', tone: 'text-emerald-700 bg-emerald-50', glow: 'from-emerald-500/10' },
    { key: 'drafts', label: 'Needs attention', detail: 'Products in draft', icon: 'draft', tone: 'text-amber-700 bg-amber-50', glow: 'from-amber-500/10' },
    { key: 'patterns', label: 'Active patterns', detail: 'Ready for artwork', icon: 'patterns', tone: 'text-violet-700 bg-violet-50', glow: 'from-violet-500/10' },
];

const actions = [
    {
        href: () => route('admin.configurator.products.create'),
        eyebrow: 'Build catalog',
        title: 'Create a 3D product',
        description: 'Add a garment model, configure its customization options, and prepare it for publishing.',
        cta: 'Create product',
        icon: 'plus',
        featured: true,
    },
    {
        href: () => route('admin.configurator.products.index'),
        eyebrow: 'Configuration',
        title: 'Manage products',
        description: 'Review model bindings, colors, print areas, SVG patterns, and storefront status.',
        cta: 'Open catalog',
        icon: 'settings',
    },
    {
        href: () => route('admin.configurator.preview'),
        eyebrow: 'Customer experience',
        title: 'Preview storefront',
        description: 'Walk through garment selection and customization exactly as your customers will.',
        cta: 'Open storefront',
        icon: 'storefront',
    },
];

export default function Dashboard({ summary, recentProducts }) {
    return (
        <AdminShell title="Dashboard" subtitle="A clear view of your 3D catalog and what needs attention.">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <article key={card.key} className={`relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br ${card.glow} to-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.055)] ring-1 ring-slate-200/70`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
                                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{summary[card.key]}</p>
                                <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
                            </div>
                            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${card.tone}`}>
                                <UiIcon name={card.icon} className="h-5 w-5" />
                            </span>
                        </div>
                    </article>
                ))}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
                {actions.map((action) => (
                    <Link
                        key={action.title}
                        href={action.href()}
                        className={`group relative flex min-h-64 flex-col overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${action.featured ? 'border-blue-500/20 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/15' : 'border-slate-200/80 bg-white text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.045)] hover:border-blue-200'}`}
                    >
                        {action.featured && <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[28px] border-white/10" />}
                        <span className={`relative grid h-12 w-12 place-items-center rounded-2xl ${action.featured ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-blue-50 text-blue-700'}`}>
                            <UiIcon name={action.icon} className="h-6 w-6" />
                        </span>
                        <p className={`relative mt-6 d-block text-[11px] font-black uppercase tracking-[0.17em] ${action.featured ? 'text-blue-100' : 'text-slate-400'}`}>{action.eyebrow}</p>
                        <h2 className="relative mt-2 text-xxl font-black tracking-tight"><span style={{fontSize:'30px', margin: '10px 0px', display: 'block'}}>{action.title}</span> </h2>
                        <p className={`relative mt-2 text-sm leading-6 ${action.featured ? 'text-blue-100' : 'text-slate-500'}`}>{action.description}</p>
                        <span className={`relative mt-auto inline-flex items-center gap-2 pt-5 text-sm  ${action.featured ? 'text-white' : 'text-blue-700'}`}>
                            {action.cta}<UiIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                        </span>
                    </Link>
                ))}
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UiIcon name="products" className="h-5 w-5" /></span>
                        <div><h2 className="text-base font-black">Recently updated</h2><p className="mt-0.5 text-xs text-slate-500">Continue working on your latest catalog items.</p></div>
                    </div>
                    <Link href={route('dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                        <UiIcon name="orders" className="h-4 w-4" /> Orders dashboard
                    </Link>
                </div>
                <div className="divide-y divide-slate-100 px-3 sm:px-4">
                    {recentProducts.length === 0 && <div className="py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UiIcon name="plus" /></span><p className="mt-4 text-sm font-bold">No products yet</p><p className="mt-1 text-xs text-slate-500">Create your first 3D garment to get started.</p></div>}
                    {recentProducts.map((product) => (
                        <div key={product.id} className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl px-2 py-3.5 transition hover:bg-slate-50 sm:px-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 text-slate-600 ring-1 ring-slate-200/70"><UiIcon name={product.category === 'dresses' ? 'dress' : 'shirt'} className="h-5 w-5" /></span>
                                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{product.name}</p><p className="mt-1 text-xs capitalize text-slate-500">{product.gender} · {product.category}<span className="hidden sm:inline"> · Updated {formatDate(product.updated_at)}</span></p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide ${product.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${product.is_published ? 'bg-emerald-500' : 'bg-amber-500'}`} />{product.is_published ? 'Published' : 'Draft'}</span>
                                <Link href={route('admin.configurator.products.edit', product.id)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">Configure</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </AdminShell>
    );
}

function formatDate(value) {
    if (!value) return 'recently';
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
