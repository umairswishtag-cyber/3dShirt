import { useEffect, useState } from 'react';

export default function AddToCartDialog({ open, product, busy = false, onClose, onConfirm }) {
    const variants = product.commerce?.variants ?? [];
    const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (!open) return;
        setVariantId(variants[0]?.id ?? '');
        setQuantity(1);
    }, [open, product.id]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="request-quote-title">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Custom production request</p>
                        <h2 id="request-quote-title" className="mt-1 text-xl font-black text-slate-950">Request a quotation for {product.name}</h2>
                        <p className="mt-2 text-xs leading-5 text-slate-500">Submitting publishes this design and freezes its production files for review. The team will check feasibility and send a quotation before payment or printing.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-600" aria-label="Close">&times;</button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-slate-800">Size / variant</span>
                        <select value={variantId} onChange={(event) => setVariantId(event.target.value)} disabled={busy} className="h-11 w-full rounded-xl border-slate-300 text-sm">
                            {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.title}{variant.sku ? ` - ${variant.sku}` : ''}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-slate-800">Quantity</span>
                        <input type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} disabled={busy} className="h-11 w-full rounded-xl border-slate-300 text-sm" />
                    </label>
                </div>

                <div className="mt-6 flex gap-3">
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="button" disabled={busy || !variantId} onClick={() => onConfirm({ variantId, quantity })} className="min-h-11 flex-[1.5] rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                        {busy ? 'Submitting files...' : 'Submit for review'}
                    </button>
                </div>
            </div>
        </div>
    );
}
