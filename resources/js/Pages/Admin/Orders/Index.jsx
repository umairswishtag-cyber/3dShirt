import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from '../Configurator/AdminShell';
import OrderStatusBadge from './OrderStatusBadge';

const summaryCards = [
    { key: 'total', label: 'Total orders', detail: 'Synced from Shopify', icon: 'orders', tone: 'bg-indigo-50 text-indigo-700' },
    { key: 'paid', label: 'Paid', detail: 'Payment captured', icon: 'check', tone: 'bg-emerald-50 text-emerald-700' },
    { key: 'needsFulfillment', label: 'To fulfill', detail: 'Still needs attention', icon: 'box', tone: 'bg-orange-50 text-orange-700' },
    { key: 'customized', label: 'Customized', detail: 'Includes 3D production', icon: 'sparkles', tone: 'bg-violet-50 text-violet-700' },
];

export default function Index({ orders, summary, filters, platformView = false, accessRestricted = false, shopifyReportedCount = 0 }) {
    const [values, setValues] = useState(filters);
    const [syncing, setSyncing] = useState(false);

    const submit = (event) => {
        event.preventDefault();
        router.get(route('admin.orders.index'), values, { preserveState: true, replace: true });
    };

    const clear = () => {
        const empty = { query: '', payment: '', fulfillment: '', period: 'all' };
        setValues(empty);
        router.get(route('admin.orders.index'), empty, { preserveState: true, replace: true });
    };

    return (
        <AdminShell
            title={platformView ? 'Store orders' : 'Orders'}
            subtitle={platformView
                ? 'Review Shopify orders and production-ready customizations across connected stores.'
                : 'Track every Shopify order from payment through fulfillment and download its production assets.'}
            actions={(
                <button
                    type="button"
                    disabled={syncing || platformView}
                    onClick={() => router.post(route('admin.orders.sync'), {}, {
                        preserveScroll: true,
                        onStart: () => setSyncing(true),
                        onFinish: () => setSyncing(false),
                    })}
                    className="relative z-10 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <UiIcon name="refresh" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Refresh'}
                </button>
            )}
        >
            {accessRestricted && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><UiIcon name="lock" className="h-[18px] w-[18px]" /></span>
                    <div><p className="text-sm font-black">Shopify order access is awaiting approval</p><p className="mt-1 text-xs leading-5 text-amber-800">Shopify reports {shopifyReportedCount} {shopifyReportedCount === 1 ? 'order' : 'orders'}, but it currently blocks this app from reading Order data. Approve protected customer data access in the Shopify Partner dashboard; automatic sync will then populate this page.</p></div>
                </div>
            )}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <article key={card.key} className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(29,38,77,0.045)]">
                        <div className="flex items-center gap-4">
                            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${card.tone}`}><UiIcon name={card.icon} className="h-6 w-6" /></span>
                            <div><p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{card.label}</p><p className="mt-1 text-[27px] font-bold leading-none tracking-tight text-slate-950">{summary[card.key]}</p><p className="mt-2 text-xs text-slate-500">{card.detail}</p></div>
                        </div>
                    </article>
                ))}
            </section>

            <form onSubmit={submit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_210px_150px_auto]">
                    <label className="relative block">
                        <span className="sr-only">Search orders</span>
                        <UiIcon name="search" className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input value={values.query} onChange={(event) => setValues({ ...values, query: event.target.value })} placeholder="Search order, customer or email" className="h-11 w-full rounded-xl border-slate-200 pl-10 text-sm focus:border-indigo-400 focus:ring-indigo-400" />
                    </label>
                    <FilterSelect label="Payment" value={values.payment} onChange={(payment) => setValues({ ...values, payment })} options={['paid', 'pending', 'authorized', 'partially_paid', 'refunded', 'partially_refunded', 'unpaid']} />
                    <FilterSelect label="Fulfillment" value={values.fulfillment} onChange={(fulfillment) => setValues({ ...values, fulfillment })} options={['fulfilled', 'unfulfilled', 'partially_fulfilled', 'in_progress', 'on_hold', 'scheduled']} />
                    <select aria-label="Order period" value={values.period} onChange={(event) => setValues({ ...values, period: event.target.value })} className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:ring-indigo-400">
                        <option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
                    </select>
                    <div className="flex gap-2">
                        <button className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700">Filter</button>
                        <button type="button" onClick={clear} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50">Clear</button>
                    </div>
                </div>
            </form>

            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
                {orders.data.length === 0 ? <EmptyOrders filtered={Object.values(filters).some((value) => value && value !== 'all')} /> : (
                    <>
                        <div className="hidden grid-cols-[minmax(130px,.75fr)_minmax(210px,1.25fr)_minmax(220px,1.2fr)_90px_120px_140px_28px] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 lg:grid">
                            <span>Order</span><span>Customer</span><span>Status</span><span>Items</span><span>Total</span><span>Received</span><span />
                        </div>
                        <div className="divide-y divide-slate-100">
                            {orders.data.map((order) => <OrderRow key={order.id} order={order} platformView={platformView} />)}
                        </div>
                    </>
                )}
            </section>

            <Pagination links={orders.links} />
        </AdminShell>
    );
}

function OrderRow({ order, platformView }) {
    return (
        <Link href={order.url} className="group block px-5 py-4 transition hover:bg-indigo-50/35 lg:grid lg:grid-cols-[minmax(130px,.75fr)_minmax(210px,1.25fr)_minmax(220px,1.2fr)_90px_120px_140px_28px] lg:items-center lg:gap-4">
            <div className="flex items-center justify-between gap-3 lg:block">
                <div><p className="text-sm font-black text-slate-950 group-hover:text-indigo-700">{order.name}</p>{platformView && <p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-500">{order.store}</p>}</div>
                <p className="text-sm font-black text-slate-950 lg:hidden">{money(order.total, order.currency)}</p>
            </div>
            <div className="mt-3 min-w-0 lg:mt-0"><p className="truncate text-sm font-bold text-slate-800">{order.customerName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{order.customerEmail || 'No email provided'}</p></div>
            <div className="mt-3 flex flex-wrap gap-2 lg:mt-0"><OrderStatusBadge status={order.paymentStatus} /><OrderStatusBadge status={order.fulfillmentStatus} /></div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 lg:mt-0 lg:block"><span>{order.itemQuantity} {order.itemQuantity === 1 ? 'item' : 'items'}</span>{order.customizedItemsCount > 0 && <span className="ml-2 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">3D × {order.customizedItemsCount}</span>}</div>
            <p className="hidden text-sm font-black text-slate-950 lg:block">{money(order.total, order.currency)}</p>
            <p className="mt-3 text-xs text-slate-500 lg:mt-0">{dateTime(order.createdAt)}</p>
            <UiIcon name="arrow" className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600 lg:block" />
        </Link>
    );
}

function FilterSelect({ label, value, onChange, options }) {
    return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:ring-indigo-400"><option value="">All {label.toLowerCase()} statuses</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select>;
}

function EmptyOrders({ filtered }) {
    return <div className="px-6 py-20 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-indigo-50 text-indigo-600"><UiIcon name="orders" className="h-8 w-8" /></span><h2 className="mt-5 text-lg font-bold text-slate-950">{filtered ? 'No matching orders' : 'No orders received yet'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? 'Try clearing one or more filters.' : 'Orders will appear here automatically after Shopify sends them to the app.'}</p></div>;
}

function Pagination({ links }) {
    if (!links || links.length <= 3) return null;
    return <nav className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Order pages">{links.map((link, index) => link.url ? <Link key={index} href={link.url} preserveScroll className={`rounded-xl border px-3 py-2 text-xs font-bold ${link.active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`} dangerouslySetInnerHTML={{ __html: link.label }} /> : null)}</nav>;
}

function money(value, currency = 'USD') { return new Intl.NumberFormat([], { style: 'currency', currency }).format(Number(value || 0)); }
function dateTime(value) { return value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }
