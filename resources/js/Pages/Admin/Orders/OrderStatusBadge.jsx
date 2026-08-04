const tones = {
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    fulfilled: 'bg-sky-50 text-sky-700 ring-sky-600/10',
    partially_fulfilled: 'bg-violet-50 text-violet-700 ring-violet-600/10',
    partially_paid: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    authorized: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    unfulfilled: 'bg-orange-50 text-orange-700 ring-orange-600/10',
    unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    refunded: 'bg-slate-100 text-slate-700 ring-slate-600/10',
    partially_refunded: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/10',
    voided: 'bg-slate-100 text-slate-600 ring-slate-600/10',
    ordered: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
    ordered_missing_assets: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    ready: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
};

export default function OrderStatusBadge({ status, dot = true }) {
    const key = String(status || 'pending').toLowerCase();
    const label = key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ring-inset ${tones[key] || tones.pending}`}>
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
            {label}
        </span>
    );
}
