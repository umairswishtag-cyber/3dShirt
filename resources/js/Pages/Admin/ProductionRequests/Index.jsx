import { Link, router } from '@inertiajs/react';
import AdminShell from '../Configurator/AdminShell';

const labels = {
    submitted: 'New request', under_review: 'Under review', changes_requested: 'Changes requested',
    quoted: 'Quote sent', quote_approved: 'Quote approved', payment_pending: 'Payment pending',
    paid: 'Paid', proof_review: 'Proof review', ready_for_print: 'Ready for print',
    printing: 'Printing', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled', prepared: 'Uploading',
};
const tone = (status) => status === 'completed' ? 'bg-emerald-50 text-emerald-700' : ['rejected', 'cancelled'].includes(status) ? 'bg-rose-50 text-rose-700' : ['submitted', 'quoted', 'quote_approved'].includes(status) ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700';

export default function Index({ requests, filters = {}, counts }) {
    const cards = [
        ['New', counts.new], ['In review', counts.review], ['Customer decision', counts.awaitingCustomer],
        ['Payment', counts.payment], ['Production', counts.production],
    ];

    return (
        <AdminShell title="Production requests" subtitle="Review custom designs, quote the work, clear payment, and control printing from one lifecycle.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <select value={filters.status ?? ''} onChange={(event) => router.get(route('admin.production-requests.index'), { status: event.target.value }, { preserveState: true })} className="h-11 rounded-xl border-slate-300 text-sm font-semibold">
                    <option value="">All statuses</option>
                    {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <span className="text-sm text-slate-500">{requests.total} request{requests.total === 1 ? '' : 's'}</span>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {requests.data.length === 0 ? <div className="px-6 py-20 text-center"><h2 className="text-xl font-black">No production requests yet</h2><p className="mt-2 text-sm text-slate-500">New custom-design submissions will appear here immediately after their production files upload.</p></div> : (
                    <div className="divide-y divide-slate-100">
                        {requests.data.map((item) => <Link key={item.id} href={route('admin.production-requests.show', item.id)} className="grid gap-3 px-5 py-5 transition hover:bg-slate-50 sm:grid-cols-[1.4fr_1fr_.7fr_.8fr_auto] sm:items-center">
                            <div><p className="font-black text-slate-950">{item.designName}</p><p className="mt-1 text-xs text-slate-500">{item.productName} · {item.quantity} unit{item.quantity === 1 ? '' : 's'}</p></div>
                            <div><p className="text-sm font-semibold">{item.customer?.name}</p><p className="text-xs text-slate-500">{item.customer?.email}</p></div>
                            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone(item.status)}`}>{labels[item.status] ?? item.status}</span>
                            <div className="text-sm font-bold">{item.quote ? `${item.quote.currency} ${item.quote.total}` : 'Not quoted'}</div>
                            <span className="text-sm font-bold text-indigo-600">Manage →</span>
                        </Link>)}
                    </div>
                )}
            </div>
        </AdminShell>
    );
}
