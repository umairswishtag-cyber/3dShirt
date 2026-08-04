import { Link } from '@inertiajs/react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from '../Configurator/AdminShell';
import OrderStatusBadge from './OrderStatusBadge';

export default function Show({ order, platformView = false }) {
    return (
        <AdminShell
            compact
            title={`Order ${order.name}`}
            subtitle={`${dateTime(order.createdAt)}${platformView && order.store ? ` · ${order.store}` : ''}`}
            actions={(
                <div className="flex flex-wrap gap-2">
                    <Link href={route('admin.orders.index')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"><span className="rotate-180"><UiIcon name="arrow" className="h-4 w-4" /></span> All orders</Link>
                    {order.shopifyAdminUrl && <a href={order.shopifyAdminUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700">Open in Shopify <UiIcon name="arrow" className="h-4 w-4" /></a>}
                </div>
            )}
        >
            <div className="mb-5 flex flex-wrap items-center gap-2"><OrderStatusBadge status={order.paymentStatus} /><OrderStatusBadge status={order.fulfillmentStatus} />{order.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{tag}</span>)}</div>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
                <div className="space-y-5">
                    <Panel title="Items" subtitle={`${itemQuantity(order.lineItems)} items in this order`} icon="box">
                        <div className="divide-y divide-slate-100">
                            {order.lineItems.map((item) => <LineItem key={item.id} item={item} currency={order.currency} />)}
                        </div>
                    </Panel>

                    {order.note && <Panel title="Order note" icon="orders"><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{order.note}</p></Panel>}

                    <Panel title="Fulfillment" subtitle={order.fulfillments.length ? `${order.fulfillments.length} fulfillment record${order.fulfillments.length === 1 ? '' : 's'}` : 'No shipment has been created'} icon="box">
                        {order.fulfillments.length === 0 ? <EmptyInline text="This order is waiting to be fulfilled in Shopify." /> : <div className="space-y-3">{order.fulfillments.map((fulfillment) => <Fulfillment key={fulfillment.id} fulfillment={fulfillment} />)}</div>}
                    </Panel>
                </div>

                <aside className="space-y-5">
                    <Panel title="Payment summary" icon="card"><Totals totals={order.totals} currency={order.currency} /></Panel>
                    <Panel title="Customer" icon="user"><InfoLine value={order.customer.name} strong /><InfoLine value={order.customer.email} href={order.customer.email ? `mailto:${order.customer.email}` : null} /><InfoLine value={order.customer.phone} href={order.customer.phone ? `tel:${order.customer.phone}` : null} /></Panel>
                    <Panel title="Shipping address" icon="location">{order.shippingAddress ? <Address address={order.shippingAddress} /> : <EmptyInline text="No shipping address was supplied." />}</Panel>
                    <Panel title="Order identity" icon="orders"><dl className="space-y-3 text-sm"><DataRow label="Shopify order ID" value={order.shopifyId} /><DataRow label="Local record" value={`#${order.id}`} />{platformView && <DataRow label="Store" value={order.store} />}</dl></Panel>
                </aside>
            </div>
        </AdminShell>
    );
}

function LineItem({ item, currency }) {
    const visibleProperties = Object.entries(item.properties || {}).filter(([key]) => key !== '_3d_job_id');
    return (
        <article className="py-5 first:pt-0 last:pb-0">
            <div className="flex gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <UiIcon name="shirt" className="h-8 w-8 text-slate-300" />}</div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950">{item.title || 'Order item'}</h3><p className="mt-1 text-xs text-slate-500">{item.sku ? `SKU ${item.sku} · ` : ''}Quantity {item.quantity}</p></div><p className="text-sm font-black text-slate-950">{money(item.lineTotal, currency)}</p></div>
                    {visibleProperties.length > 0 && <dl className="mt-3 grid gap-x-5 gap-y-1.5 text-xs sm:grid-cols-2">{visibleProperties.map(([key, value]) => <div key={key} className="flex gap-2"><dt className="font-bold text-slate-500">{cleanLabel(key)}:</dt><dd className="truncate text-slate-700">{value}</dd></div>)}</dl>}
                </div>
            </div>
            {item.production && <ProductionJob job={item.production} />}
        </article>
    );
}

function ProductionJob({ job }) {
    const downloads = [
        job.assets.model && { label: 'Final 3D model', href: job.assets.model },
        job.assets.pattern && { label: 'Pattern artwork', href: job.assets.pattern },
        ...Object.entries(job.assets.printAreas || {}).map(([name, href]) => ({ label: `${cleanLabel(name)} print area`, href })),
        ...Object.entries(job.assets.logos || {}).map(([name, href]) => ({ label: `${cleanLabel(name)} logo`, href })),
    ].filter(Boolean);

    return (
        <div className="mt-4 rounded-2xl border border-violet-100 bg-[linear-gradient(120deg,#fafaff,#f5f3ff)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-700"><UiIcon name="sparkles" className="h-4 w-4" /></span><div><p className="text-xs font-black text-violet-950">3D production package</p><p className="mt-0.5 text-[10px] text-violet-600">Job {job.id}</p></div></div><OrderStatusBadge status={job.status} /></div>
            {Object.keys(job.summary || {}).length > 0 && <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{Object.entries(job.summary).map(([key, value]) => <div key={key}><dt className="font-bold text-violet-500">{cleanLabel(key)}</dt><dd className="mt-0.5 text-slate-700">{displayValue(value)}</dd></div>)}</dl>}
            <div className="mt-3 flex flex-wrap gap-2">{downloads.length ? downloads.map((download) => <a key={`${download.label}-${download.href}`} href={download.href} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 transition hover:border-violet-400"><UiIcon name="download" className="h-3.5 w-3.5" />{download.label}</a>) : <p className="text-xs font-semibold text-rose-600">Production assets have not been uploaded yet.</p>}</div>
        </div>
    );
}

function Fulfillment({ fulfillment }) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black text-slate-900">{fulfillment.name || 'Shopify fulfillment'}</p><p className="mt-1 text-xs text-slate-500">{fulfillment.trackingCompany || fulfillment.service || 'Shipping service pending'}</p></div><OrderStatusBadge status={fulfillment.shipmentStatus || fulfillment.status} /></div>{fulfillment.trackingNumber && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-slate-500">Tracking:</span>{fulfillment.trackingUrl ? <a href={fulfillment.trackingUrl} target="_blank" rel="noreferrer" className="font-black text-indigo-700 hover:underline">{fulfillment.trackingNumber}</a> : <span className="font-black text-slate-800">{fulfillment.trackingNumber}</span>}</div>}</div>;
}

function Totals({ totals, currency }) {
    return <dl className="space-y-3 text-sm"><DataRow label="Subtotal" value={money(totals.subtotal, currency)} />{totals.discounts > 0 && <DataRow label="Discounts" value={`−${money(totals.discounts, currency)}`} valueClass="text-emerald-700" />}<DataRow label="Shipping" value={money(totals.shipping, currency)} /><DataRow label="Tax" value={money(totals.tax, currency)} />{totals.tips > 0 && <DataRow label="Tip" value={money(totals.tips, currency)} />}<div className="border-t border-slate-200 pt-3"><DataRow label="Total" value={money(totals.total, currency)} strong /></div>{totals.outstanding > 0 && <div className="rounded-xl bg-amber-50 px-3 py-2"><DataRow label="Outstanding" value={money(totals.outstanding, currency)} valueClass="text-amber-800" strong /></div>}</dl>;
}

function Panel({ title, subtitle = null, icon, children }) {
    return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.045)]"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><UiIcon name={icon} className="h-[18px] w-[18px]" /></span><div><h2 className="text-sm font-black text-slate-950">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}</div></div><div className="p-5">{children}</div></section>;
}

function Address({ address }) {
    const cityLine = [address.city, address.province_code || address.province, address.zip].filter(Boolean).join(', ');
    return <address className="space-y-1 text-sm not-italic leading-6 text-slate-600"><p className="font-black text-slate-900">{[address.first_name, address.last_name].filter(Boolean).join(' ')}</p>{address.company && <p>{address.company}</p>}<p>{address.address1}</p>{cityLine && <p>{cityLine}</p>}<p>{address.country}</p>{address.phone && <a href={`tel:${address.phone}`} className="block pt-1 font-bold text-indigo-700">{address.phone}</a>}</address>;
}

function InfoLine({ value, href = null, strong = false }) { if (!value) return null; return href ? <a href={href} className="mb-1 block break-all text-sm font-semibold text-indigo-700 hover:underline">{value}</a> : <p className={`mb-1 break-words text-sm ${strong ? 'font-black text-slate-900' : 'text-slate-600'}`}>{value}</p>; }
function DataRow({ label, value, strong = false, valueClass = '' }) { return <div className="flex items-start justify-between gap-4"><dt className={strong ? 'font-black text-slate-950' : 'text-slate-500'}>{label}</dt><dd className={`text-right ${strong ? 'font-black text-slate-950' : 'font-bold text-slate-800'} ${valueClass}`}>{value || '—'}</dd></div>; }
function EmptyInline({ text }) { return <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">{text}</p>; }
function itemQuantity(items) { return items.reduce((total, item) => total + item.quantity, 0); }
function money(value, currency = 'USD') { return new Intl.NumberFormat([], { style: 'currency', currency }).format(Number(value || 0)); }
function dateTime(value) { return value ? new Date(value).toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date unavailable'; }
function cleanLabel(value) { return String(value).replace(/^_+/, '').replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function displayValue(value) { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
