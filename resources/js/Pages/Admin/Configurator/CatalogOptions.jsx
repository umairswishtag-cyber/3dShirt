import { router, useForm, usePage } from '@inertiajs/react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from './AdminShell';

export default function CatalogOptions({ audiences, categories }) {
    const errors = usePage().props.errors ?? {};

    return (
        <AdminShell title="Catalog options" subtitle="Manage the customer groups and garment categories available throughout the product and storefront journey.">
            {errors.taxonomy && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{errors.taxonomy}</div>}
            <div className="grid gap-6 lg:grid-cols-2">
                <OptionManager
                    type="audience"
                    title="Customer groups"
                    description="The first choice customers make, such as Men, Women, Kids, Old Men, or Old Women."
                    placeholder="Example: Old Men"
                    items={audiences}
                    icon="users"
                />
                <OptionManager
                    type="category"
                    title="Garment categories"
                    description="Product families shown after a customer group, such as Footwear, Caps, Hats, or Shirts."
                    placeholder="Example: Footwear"
                    items={categories}
                    icon="products"
                />
            </div>
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
                New options become available in the product editor immediately. The storefront shows an option only after at least one product using it is published.
            </div>
        </AdminShell>
    );
}

function OptionManager({ type, title, description, placeholder, items, icon }) {
    const form = useForm({ type, label: '' });

    const submit = (event) => {
        event.preventDefault();
        form.post(route('admin.configurator.taxonomies.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('label'),
        });
    };

    const remove = (item) => {
        if (item.productsCount > 0 || !window.confirm(`Remove ${item.label}?`)) return;
        router.delete(route('admin.configurator.taxonomies.destroy', item.id), { preserveScroll: true });
    };

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
            <div className="border-b border-slate-100 p-6">
                <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UiIcon name={icon} className="h-5 w-5" /></span>
                    <div><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
                </div>
                <form onSubmit={submit} className="mt-5 flex gap-2">
                    <div className="min-w-0 flex-1">
                        <input value={form.data.label} onChange={(event) => form.setData('label', event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500" />
                        {form.errors.label && <p className="mt-1 text-xs font-semibold text-red-600">{form.errors.label}</p>}
                    </div>
                    <button disabled={form.processing} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"><UiIcon name="plus" className="h-4 w-4" />Add</button>
                </form>
            </div>
            <div className="divide-y divide-slate-100 px-4">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3.5">
                        <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.productsCount} product{item.productsCount === 1 ? '' : 's'} · {item.slug}</p></div>
                        <button type="button" onClick={() => remove(item)} disabled={item.productsCount > 0} title={item.productsCount > 0 ? 'Move or delete products using this option first' : `Remove ${item.label}`} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"><UiIcon name="trash" className="h-4 w-4" /></button>
                    </div>
                ))}
            </div>
        </section>
    );
}
