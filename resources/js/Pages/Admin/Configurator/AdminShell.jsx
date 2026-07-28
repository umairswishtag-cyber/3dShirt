import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import UiIcon from '@/Components/UiIcon';

export default function AdminShell({ title, subtitle = null, children, actions = null, hero = null, compact = false }) {
    const { flash = {}, auth = {} } = usePage().props;
    const { url } = usePage();

    useEffect(() => {
        if (flash.success) toast.success(flash.success, { icon: '✨' });
    }, [flash.success]);

    const navClass = (active) => `inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${active ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.08)]' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`;

    return (
        <>
            <Head title={title} />
            <Toaster position="top-right" toastOptions={{ duration: 4200, style: { borderRadius: '16px', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 700, padding: '14px 16px', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)' } }} />
            <div className="min-h-dvh bg-[#f8f9fc] text-[#151827]">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                        <Link href={route('admin.dashboard')} className="flex min-w-0 items-center gap-3">
                            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 text-base font-black text-white shadow-lg shadow-indigo-500/20"><span className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white/20 blur-sm" /><span className="relative">3D</span></span>
                            <span className="hidden min-w-0 sm:block"><strong className="block truncate text-base font-bold tracking-tight">Configurator admin</strong><span className="block truncate text-xs text-slate-500">{auth.user?.email}</span></span>
                        </Link>
                        <nav aria-label="Admin navigation" className="flex min-w-0 items-center gap-0.5 sm:gap-1">
                            <Link aria-current={url === '/admin' ? 'page' : undefined} href={route('admin.dashboard')} className={navClass(url === '/admin')}><UiIcon name="dashboard" className="h-[18px] w-[18px]" /><span className="hidden md:inline">Dashboard</span></Link>
                            <Link aria-current={url.startsWith('/admin/configurator/products') ? 'page' : undefined} href={route('admin.configurator.products.index')} className={navClass(url.startsWith('/admin/configurator/products'))}><UiIcon name="products" className="h-[18px] w-[18px]" /><span className="hidden md:inline">Products</span></Link>
                            <Link aria-current={url.startsWith('/admin/customers') ? 'page' : undefined} href={route('admin.customers.index')} className={navClass(url.startsWith('/admin/customers'))}><UiIcon name="users" className="h-[18px] w-[18px]" /><span className="hidden lg:inline">Customers</span></Link>
                            <Link aria-current={url.startsWith('/admin/configurator/catalog-options') ? 'page' : undefined} href={route('admin.configurator.taxonomies.index')} className={navClass(url.startsWith('/admin/configurator/catalog-options'))}><UiIcon name="settings" className="h-[18px] w-[18px]" /><span className="hidden lg:inline">Catalog options</span></Link>
                            <Link aria-current={url.startsWith('/admin/chatbot') ? 'page' : undefined} href={route('admin.chatbot.index')} className={navClass(url.startsWith('/admin/chatbot'))}><UiIcon name="chat" className="h-[18px] w-[18px]" /><span className="hidden lg:inline">Chatbot</span></Link>
                            <Link href={route('admin.configurator.preview')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-transparent px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"><UiIcon name="storefront" className="h-[18px] w-[18px]" /><span className="hidden md:inline">Storefront</span></Link>
                            <button type="button" onClick={() => router.post(route('logout'))} className="inline-flex h-11 items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out"><UiIcon name="logout" className="h-[18px] w-[18px]" /><span className="hidden xl:inline">Sign out</span></button>
                        </nav>
                    </div>
                </header>

                <main className={`mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8 ${compact ? 'py-5 sm:py-6' : 'py-8 sm:py-10'}`}>
                    <div className={`relative flex flex-wrap items-end justify-between ${compact ? 'mb-4 gap-3' : 'mb-8 gap-5'} ${hero ? 'min-h-36 overflow-hidden rounded-[28px] border border-indigo-100/80 bg-[linear-gradient(110deg,#fff_0%,#fafbff_52%,#eef1ff_100%)] px-6 py-7 shadow-[0_12px_34px_rgba(57,69,130,0.05)] sm:px-8' : ''}`}>
                        <div className="relative z-10"><p className={`${compact ? 'mb-1' : 'mb-2'} text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600`}>Admin workspace</p><h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-[32px] sm:leading-[1.05]">{title}</h1>{subtitle && <p className={`${compact ? 'mt-2' : 'mt-3'} max-w-2xl text-sm leading-6 text-slate-500`}>{subtitle}</p>}</div>
                        {hero && <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] items-center justify-center overflow-hidden md:flex">{hero}</div>}
                        {actions}
                    </div>
                    {children}
                </main>
            </div>
        </>
    );
}
