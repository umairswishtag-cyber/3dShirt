import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import UiIcon from '@/Components/UiIcon';

export default function AdminShell({ title, subtitle = null, children, actions = null }) {
    const { flash = {}, auth = {} } = usePage().props;
    const { url } = usePage();

    useEffect(() => {
        if (flash.success) toast.success(flash.success, { icon: '✨' });
    }, [flash.success]);

    const navClass = (active) => `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`;

    return (
        <>
            <Head title={title} />
            <Toaster position="top-right" toastOptions={{ duration: 4200, style: { borderRadius: '16px', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 700, padding: '14px 16px', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)' } }} />
            <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_32%,#f1f5f9_100%)] text-slate-950">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                        <Link href={route('admin.dashboard')} className="flex min-w-0 items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-sm font-black text-white shadow-md shadow-slate-900/15">3D</span>
                            <span className="min-w-0"><strong className="block truncate text-sm font-black tracking-tight">Configurator admin</strong><span className="block truncate text-xs text-slate-500">{auth.user?.email}</span></span>
                        </Link>
                        <nav className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1">
                            <Link href={route('admin.dashboard')} className={navClass(url === '/admin')}><UiIcon name="dashboard" className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Link>
                            <Link href={route('admin.configurator.products.index')} className={navClass(url.startsWith('/admin/configurator/products'))}><UiIcon name="products" className="h-4 w-4" /><span className="hidden sm:inline">Products</span></Link>
                            <Link href={route('admin.configurator.taxonomies.index')} className={navClass(url.startsWith('/admin/configurator/catalog-options'))}><UiIcon name="settings" className="h-4 w-4" /><span className="hidden lg:inline">Catalog options</span></Link>
                            <Link href={route('admin.configurator.preview')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><UiIcon name="storefront" className="h-4 w-4" /><span className="hidden sm:inline">Storefront</span></Link>
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
                    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                        <div><p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Admin workspace</p><h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>{subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}</div>
                        {actions}
                    </div>
                    {children}
                </main>
            </div>
        </>
    );
}
