import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from '../Configurator/AdminShell';

const statusStyles = {
    enabled: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function PlacementPreview({ value }) {
    const active = (corner) => corner === value
        ? 'bg-indigo-600 shadow-[0_4px_10px_rgba(79,70,229,0.35)]'
        : 'bg-slate-200';

    return (
        <div className="relative h-16 w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-50 shadow-inner" aria-hidden="true">
            <span className={`absolute left-2 top-2 h-3 w-3 rounded-md ${active('top-left')}`} />
            <span className={`absolute right-2 top-2 h-3 w-3 rounded-md ${active('top-right')}`} />
            <span className={`absolute bottom-2 left-2 h-3 w-3 rounded-md ${active('bottom-left')}`} />
            <span className={`absolute bottom-2 right-2 h-3 w-3 rounded-md ${active('bottom-right')}`} />
            <span className="absolute inset-x-7 bottom-2 top-2 rounded-md border border-slate-200 bg-white" />
        </div>
    );
}

function StoreAccessCard({ store, positions }) {
    const [position, setPosition] = useState(store.assistant.position);
    const [saving, setSaving] = useState(false);

    useEffect(() => setPosition(store.assistant.position), [store.assistant.position]);

    const update = (enabled, nextPosition = position) => {
        setSaving(true);
        router.patch(route('admin.chatbot.update', store.id), {
            is_enabled: enabled,
            position: nextPosition,
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 font-bold text-indigo-700">{store.name?.slice(0, 1)?.toUpperCase() || 'S'}</span>
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold text-slate-950">{store.name}</h2>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{store.email}</p>
                    </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ring-inset ${statusStyles[store.assistant.status]}`}>
                    {store.assistant.status}
                </span>
            </div>

            {store.assistant.status === 'pending' && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Activation requested {formatDate(store.assistant.requestedAt)}
                </p>
            )}

            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <PlacementPreview value={position} />
                <label className="min-w-0 flex-1">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Widget position</span>
                    <select
                        value={position}
                        disabled={saving}
                        onChange={(event) => {
                            const nextPosition = event.target.value;
                            setPosition(nextPosition);
                            update(store.assistant.enabled, nextPosition);
                        }}
                        className="min-h-10 w-full rounded-xl border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-indigo-400 focus:ring-indigo-200"
                    >
                        {positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{store.productsCount} customizer {store.productsCount === 1 ? 'product' : 'products'}</p>
                <button
                    type="button"
                    role="switch"
                    aria-checked={store.assistant.enabled}
                    disabled={saving}
                    onClick={() => update(! store.assistant.enabled)}
                    className={`relative h-8 w-14 rounded-full transition focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-60 ${store.assistant.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition ${store.assistant.enabled ? 'left-7' : 'left-1'}`} />
                    <span className="sr-only">{store.assistant.enabled ? 'Disable' : 'Enable'} chatbot for {store.name}</span>
                </button>
            </div>
        </article>
    );
}

function MerchantStatus({ store, positions }) {
    const pending = store.assistant.status === 'pending';
    const enabled = store.assistant.enabled;
    const positionLabel = positions.find((item) => item.value === store.assistant.position)?.label;

    return (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:p-8">
                <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] ring-1 ring-inset ${statusStyles[store.assistant.status]}`}>
                    {enabled ? 'Active on your store' : pending ? 'Request pending' : 'Not active'}
                </span>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                    {enabled ? 'Your customization guide is live' : pending ? 'Your request is awaiting review' : 'Request the customization guide'}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    The assistant answers only customer-facing product customization questions. It uses no paid service, external data source, or third-party AI API.
                </p>

                {enabled ? (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <span className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Position: {positionLabel}</span>
                        <a href={route('admin.configurator.preview')} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Preview storefront</a>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => router.post(route('admin.chatbot.request'), {}, { preserveScroll: true })}
                        className="mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                    >
                        {pending ? 'Activation requested' : 'Request activation'}
                    </button>
                )}
            </section>

            <section className="rounded-[26px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">Storefront preview</p>
                <div className="mt-5 flex min-h-52 items-center justify-center rounded-2xl border border-white bg-white/80 p-6 shadow-sm">
                    <PlacementPreview value={store.assistant.position} />
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-600">The platform administrator controls activation and placement. No customer conversations are recorded.</p>
            </section>
        </div>
    );
}

export default function Access({ canManageAccess, store, stores, summary, positions }) {
    return (
        <AdminShell
            title={canManageAccess ? 'Chatbot access' : 'Customization guide'}
            subtitle={canManageAccess
                ? 'Approve stores and choose where their local customization assistant appears.'
                : 'View or request the chatbot entitlement for your store.'}
        >
            {canManageAccess ? (
                <>
                    <section className="mb-6 grid gap-4 sm:grid-cols-3">
                        {[
                            ['Stores', summary.stores, 'users'],
                            ['Enabled', summary.enabled, 'chat'],
                            ['Pending requests', summary.pending, 'mail'],
                        ].map(([label, value, icon]) => (
                            <article key={label} className="flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><UiIcon name={icon} className="h-5 w-5" /></span>
                                <div><p className="text-2xl font-bold text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>
                            </article>
                        ))}
                    </section>

                    {stores.length ? (
                        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {stores.map((item) => <StoreAccessCard key={item.id} store={item} positions={positions} />)}
                        </section>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">No stores are registered yet.</div>
                    )}
                </>
            ) : (
                <MerchantStatus store={store} positions={positions} />
            )}
        </AdminShell>
    );
}

function formatDate(value) {
    if (! value) return 'recently';
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
