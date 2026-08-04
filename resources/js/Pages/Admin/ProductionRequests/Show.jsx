import { Link, router, useForm } from '@inertiajs/react';
import AdminShell from '../Configurator/AdminShell';
import GlbModelPreview from '../Configurator/GlbModelPreview';

const labels = { prepared: 'Uploading', submitted: 'New request', under_review: 'Under review', changes_requested: 'Changes requested', rejected: 'Rejected', quoted: 'Quote sent', quote_approved: 'Quote approved', payment_pending: 'Payment pending', paid: 'Paid', proof_review: 'Proof review', ready_for_print: 'Ready for print', printing: 'Printing', completed: 'Completed', cancelled: 'Cancelled', ordered: 'Shopify order received' };
const actionLabels = { review: 'Start review', request_changes: 'Request changes', reject: 'Reject request', mark_paid: 'Mark payment cleared', proof_review: 'Request proof approval', ready_for_print: 'Approve for printing', start_printing: 'Start printing', complete: 'Mark completed', cancel: 'Cancel request' };

export default function Show({ productionRequest: item }) {
    const quote = useForm({ unit_price: item.quote?.unitPrice ?? '', shipping: item.quote?.shipping ?? 0, tax: item.quote?.tax ?? 0, discount: item.quote?.discount ?? 0, currency: item.quote?.currency ?? 'USD', notes: item.quote?.notes ?? '', expires_at: item.quote?.expiresAt?.slice(0, 10) ?? '' });
    const run = (action, extra = {}) => router.post(route('admin.production-requests.action', item.id), { action, ...extra }, { preserveScroll: true });
    const runAction = (action) => {
        if (['request_changes', 'reject'].includes(action)) {
            const note = window.prompt(action === 'reject' ? 'Explain why this request cannot be accepted:' : 'Describe the required changes:');
            if (!note) return;
            run(action, { note });
            return;
        }
        run(action);
    };
    const actions = [];
    if (['submitted', 'changes_requested'].includes(item.status)) actions.push('review');
    if (['submitted', 'under_review', 'quoted', 'proof_review'].includes(item.status)) actions.push('request_changes');
    if (['submitted', 'under_review', 'quoted'].includes(item.status)) actions.push('reject');
    if (['quote_approved', 'payment_pending'].includes(item.status)) actions.push('mark_paid');
    if (item.status === 'paid') actions.push('proof_review', 'ready_for_print');
    if (item.status === 'proof_review') actions.push('ready_for_print');
    if (item.status === 'ready_for_print') actions.push('start_printing');
    if (item.status === 'printing') actions.push('complete');

    return (
        <AdminShell title={item.designName} subtitle={`Request ${item.id}`} actions={<Link href={route('admin.production-requests.index')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Back to requests</Link>}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
                <div className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Submitted production model</p>
                                <h2 className="mt-2 text-xl font-black">Final customer GLB</h2>
                                <p className="mt-1 text-sm text-slate-500">This frozen model is the exact file attached to the quotation request.</p>
                            </div>
                            <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ${item.designStatus === 'FINAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {item.designStatus === 'FINAL' ? 'Published' : 'Draft'}
                            </span>
                        </div>
                        {item.finalModelUrl ? (
                            <>
                                <GlbModelPreview modelUrl={item.finalModelUrl} />
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500">Drag to inspect every side before reviewing or quoting.</p>
                                    <a href={item.finalModelUrl} download className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800">Download final GLB</a>
                                </div>
                            </>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-10 text-center text-sm font-semibold text-amber-800">The final GLB has not finished uploading yet. Refresh this request shortly.</div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Current stage</p><h2 className="mt-2 text-2xl font-black">{labels[item.status] ?? item.status}</h2></div><span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">Payment: {item.paymentStatus.replaceAll('_', ' ')}</span></div>
                        <div className="mt-6 grid gap-4 sm:grid-cols-3"><Info label="Customer" value={`${item.customer?.name} (${item.customer?.email})`} /><Info label="Product" value={`${item.productName} × ${item.quantity}`} /><Info label="Production files" value={item.assetsReady ? 'Ready' : 'Missing'} /></div>
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p><strong>Colors:</strong> {item.summary?.colors}</p><p className="mt-2"><strong>Pattern:</strong> {item.summary?.pattern}</p><p className="mt-2"><strong>Artwork:</strong> {item.summary?.artwork}</p></div>
                        <div className="mt-5 flex flex-wrap gap-3"><a href={item.productionManifestUrl} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Open production assets</a>{actions.map((action) => <button key={action} type="button" onClick={() => runAction(action)} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${action === 'reject' ? 'bg-rose-600' : action === 'request_changes' ? 'bg-amber-600' : 'bg-indigo-600'}`}>{actionLabels[action]}</button>)}</div>
                    </section>

                    {['under_review', 'changes_requested', 'quoted'].includes(item.status) && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Prepare quotation</h2><p className="mt-1 text-sm text-slate-500">A new submission creates a versioned quote and records it in the timeline.</p><form onSubmit={(event) => { event.preventDefault(); quote.post(route('admin.production-requests.quote', item.id), { preserveScroll: true }); }} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Unit price" type="number" value={quote.data.unit_price} onChange={(v) => quote.setData('unit_price', v)} /><Field label="Currency" value={quote.data.currency} onChange={(v) => quote.setData('currency', v.toUpperCase())} /><Field label="Shipping" type="number" value={quote.data.shipping} onChange={(v) => quote.setData('shipping', v)} /><Field label="Tax" type="number" value={quote.data.tax} onChange={(v) => quote.setData('tax', v)} /><Field label="Discount" type="number" value={quote.data.discount} onChange={(v) => quote.setData('discount', v)} /><Field label="Expires" type="date" value={quote.data.expires_at} onChange={(v) => quote.setData('expires_at', v)} /><label className="sm:col-span-2"><span className="text-xs font-bold">Scope and notes</span><textarea value={quote.data.notes} onChange={(e) => quote.setData('notes', e.target.value)} className="mt-1.5 w-full rounded-xl border-slate-300" rows="4" /></label><button disabled={quote.processing} className="w-fit rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white">{quote.processing ? 'Sending...' : item.status === 'quoted' ? 'Send revised quote' : 'Send quotation'}</button></form></section>}

                    {item.status === 'quoted' && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-black text-amber-950">Waiting for customer approval</h2><p className="mt-2 text-sm text-amber-800">Do not collect payment or begin production until the customer approves this quote.</p></section>}
                    {['quote_approved', 'payment_pending'].includes(item.status) && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><h2 className="font-black text-emerald-950">Payment collection</h2><p className="mt-2 text-sm text-emerald-800">Create a secure Shopify checkout invoice, or record an externally cleared payment.</p><div className="mt-4 flex gap-3"><button onClick={() => router.post(route('admin.production-requests.invoice', item.id), {}, { preserveScroll: true })} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Create & email Shopify invoice</button><button onClick={() => run('mark_paid')} className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800">Mark paid manually</button></div></section>}
                </div>

                <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activity timeline</h2><div className="mt-5 space-y-5">{[...item.events].reverse().map((event) => <div key={event.id} className="relative border-l-2 border-indigo-100 pl-5"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo-500" /><p className="text-sm font-black">{event.event.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-slate-500">{event.actorType} · {new Date(event.createdAt).toLocaleString()}</p>{event.note && <p className="mt-2 text-sm text-slate-600">{event.note}</p>}</div>)}</div></aside>
            </div>
        </AdminShell>
    );
}

function Info({ label, value }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label><span className="text-xs font-bold">{label}</span><input type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border-slate-300" /></label>; }
