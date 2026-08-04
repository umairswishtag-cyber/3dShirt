import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const stages = ['submitted', 'under_review', 'quoted', 'quote_approved', 'payment_pending', 'paid', 'ready_for_print', 'printing', 'completed'];
const labels = { prepared: 'Uploading files', submitted: 'Request received', under_review: 'Technical review', changes_requested: 'Changes requested', rejected: 'Not accepted', quoted: 'Quotation ready', quote_approved: 'Quotation approved', payment_pending: 'Awaiting payment', paid: 'Payment cleared', proof_review: 'Proof review', ready_for_print: 'Approved for print', printing: 'In production', completed: 'Completed', cancelled: 'Cancelled', ordered: 'Order received' };

export default function Show({ productionRequest: item, storefront }) {
    const { flash = {} } = usePage().props;
    useEffect(() => { if (flash.success) toast.success(flash.success); if (flash.error) toast.error(flash.error); }, [flash.success, flash.error]);
    useEffect(() => { const timer = window.setInterval(() => router.reload({ only: ['productionRequest'], preserveScroll: true }), 15000); return () => window.clearInterval(timer); }, []);
    const respond = (action, note = null) => router.post(route('store.customer.requests.respond', { store: storefront.key, id: item.id }), { action, note }, { preserveScroll: true });
    const active = Math.max(0, stages.indexOf(item.status));

    return (
        <>
            <Head title={`Production request - ${item.designName}`} /><Toaster position="top-center" />
            <div className="min-h-screen bg-[#f8f9fc] text-slate-950">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                        <a href={storefront.shopifyStoreUrl} target="_top" className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 font-black text-white">3D</span>
                            <span><strong className="block">My production request</strong><small className="text-slate-500">{item.id}</small></span>
                        </a>
                        <nav className="flex flex-wrap items-center gap-2">
                            <Link href={storefront.dashboardUrl} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">My requests</Link>
                            <a href={storefront.shopifyConfiguratorUrl} target="_top" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Create new design</a>
                            <a href={storefront.shopifyStoreUrl} target="_top" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Back to Shopify store</a>
                        </nav>
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                    <section className="rounded-[28px] bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white shadow-xl shadow-indigo-600/15"><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-100">Current stage</p><h1 className="mt-3 text-3xl font-black">{labels[item.status] ?? item.status}</h1><p className="mt-2 text-sm text-indigo-100">{item.designName} · {item.productName} · Quantity {item.quantity}</p></section>

                    {!['changes_requested', 'rejected', 'cancelled'].includes(item.status) && <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6"><div className="flex min-w-[720px] items-start">{stages.map((stage, index) => <div key={stage} className="relative flex-1 text-center"><div className={`relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black ${index <= active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < active ? '✓' : index + 1}</div>{index < stages.length - 1 && <span className={`absolute left-1/2 top-4 h-0.5 w-full ${index < active ? 'bg-indigo-600' : 'bg-slate-200'}`} />}<p className="relative z-10 mt-2 text-[10px] font-bold text-slate-500">{labels[stage]}</p></div>)}</div></div>}

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]">
                        <div className="space-y-6">
                            {item.quote && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Quotation v{item.quote.version}</p><h2 className="mt-2 text-2xl font-black">{item.quote.currency} {item.quote.total}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.quantity} units</span></div><div className="mt-5 divide-y divide-slate-100 text-sm"><Row label="Unit price" value={`${item.quote.currency} ${item.quote.unitPrice}`} /><Row label="Shipping" value={item.quote.shipping} /><Row label="Tax" value={item.quote.tax} /><Row label="Discount" value={`-${item.quote.discount}`} /></div>{item.quote.notes && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{item.quote.notes}</div>}
                                {item.status === 'quoted' && <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => respond('approve_quote')} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Approve quotation</button><button onClick={() => { const note = window.prompt('What should we change?'); if (note) respond('request_changes', note); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Request changes</button><button onClick={() => respond('decline')} className="px-4 py-3 text-sm font-bold text-rose-600">Decline</button></div>}
                                {item.status === 'payment_pending' && item.shopifyInvoiceUrl && <a href={item.shopifyInvoiceUrl} target="_top" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Pay securely with Shopify</a>}
                            </section>}
                            {item.status === 'proof_review' && <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6"><h2 className="text-xl font-black text-indigo-950">Approve the production proof</h2><p className="mt-2 text-sm text-indigo-800">Confirm the reviewed design is ready to print, or tell the team what must change.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => respond('approve_proof')} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white">Approve for printing</button><button onClick={() => { const note = window.prompt('What should we change?'); if (note) respond('request_changes', note); }} className="rounded-xl border border-indigo-300 px-5 py-3 text-sm font-bold text-indigo-800">Request changes</button></div></section>}
                            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Design summary</h2><div className="mt-4 space-y-3 text-sm text-slate-600"><p><strong className="text-slate-900">Colors:</strong> {item.summary?.colors}</p><p><strong className="text-slate-900">Pattern:</strong> {item.summary?.pattern}</p><p><strong className="text-slate-900">Artwork:</strong> {item.summary?.artwork}</p></div></section>
                        </div>
                        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Updates</h2><span className="text-xs text-slate-400">Refreshes automatically</span></div><div className="mt-5 space-y-5">{[...item.events].reverse().map((event) => <div key={event.id} className="border-l-2 border-indigo-100 pl-4"><p className="text-sm font-black capitalize">{event.event.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>{event.note && <p className="mt-2 text-sm text-slate-600">{event.note}</p>}</div>)}</div></aside>
                    </div>
                </main>
            </div>
        </>
    );
}

function Row({ label, value }) { return <div className="flex justify-between py-2"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>; }
