import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminShell({ title, children, actions = null }) {
    const { flash = {}, auth = {} } = usePage().props;

    useEffect(() => {
        if (flash.success) toast.success(flash.success, { icon: '✨' });
    }, [flash.success]);

    return (
        <>
            <Head title={title} />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4200,
                    style: {
                        borderRadius: '16px',
                        background: '#0f172a',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        padding: '14px 16px',
                        boxShadow: '0 18px 50px rgba(15, 23, 42, 0.25)',
                    },
                }}
            />
            <div className="min-h-dvh bg-slate-100 text-slate-950">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">3D</div>
                            <div>
                                <p className="text-sm font-black">Configurator admin</p>
                                <p className="text-xs text-slate-500">{auth.user?.email}</p>
                            </div>
                        </div>
                        <nav className="flex items-center gap-2 text-xs font-bold">
                            <Link href={route('admin.dashboard')} className="rounded-lg px-3 py-2 hover:bg-slate-100">Dashboard</Link>
                            <Link href={route('admin.configurator.products.index')} className="rounded-lg px-3 py-2 hover:bg-slate-100">Products</Link>
                            <Link href={route('configurator')} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">View storefront</Link>
                        </nav>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                        {actions}
                    </div>
                    {children}
                </main>
            </div>
        </>
    );
}
