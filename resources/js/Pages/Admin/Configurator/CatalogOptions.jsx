import { router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import UiIcon from '@/Components/UiIcon';
import AdminShell from './AdminShell';

const optionTypes = {
    category: {
        title: 'Product category',
        question: 'What is it?',
        description: 'The type of item customers customize.',
        examples: 'Shirts, hats, caps, footwear, cups',
        placeholder: 'Example: Hoodies',
        icon: 'products',
        tone: 'violet',
    },
    audience: {
        title: 'Customer group',
        question: 'Who is it for?',
        description: 'A fit or audience collection—not a product type.',
        examples: 'Men, women, kids, unisex',
        placeholder: 'Example: Teenagers',
        icon: 'users',
        tone: 'blue',
    },
};

const productWords = ['shirt', 'tshirt', 'hoodie', 'dress', 'pant', 'jacket', 'shoe', 'footwear', 'cap', 'hat', 'cup', 'mug', 'bag', 'sock'];
const audienceWords = ['men', 'man', 'women', 'woman', 'kid', 'child', 'unisex', 'adult', 'teen', 'boy', 'girl'];

export default function CatalogOptions({ audiences, categories }) {
    const errors = usePage().props.errors ?? {};

    return (
        <AdminShell title="Catalog structure" subtitle="Create product types and customer groups in the right place, then use them when adding a 3D model.">
            {errors.taxonomy && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{errors.taxonomy}</div>}

            <CatalogFlow />
            <CreateOptionPanel />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <OptionList type="category" items={categories} replacements={categories} />
                <OptionList type="audience" items={audiences} replacements={audiences} />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs leading-5 text-indigo-950">
                <UiIcon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <p>Only options used by a published model appear in the storefront. Categories and customer groups can be moved later; linked products will be reassigned safely.</p>
            </div>
        </AdminShell>
    );
}

function CatalogFlow() {
    const steps = [
        ['1', 'Product category', 'Shirts, caps, cups…', 'products'],
        ['2', 'Customer group', 'Men, kids, unisex…', 'users'],
        ['3', '3D model', 'Upload and publish', 'shirt'],
    ];

    return (
        <section className="mb-6 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_rgba(29,38,77,0.045)] sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">Recommended catalog flow</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
                {steps.map(([number, title, description, icon], index) => (
                    <div key={title} className="relative flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 shadow-sm'}`}><UiIcon name={icon} className="h-5 w-5" /></span>
                        <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step {number}</p><p className="mt-0.5 text-sm font-bold text-slate-900">{title}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
                        {index < 2 && <UiIcon name="arrow" className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-1 text-slate-400 shadow md:block" />}
                    </div>
                ))}
            </div>
        </section>
    );
}

function CreateOptionPanel() {
    const form = useForm({ type: 'category', label: '' });
    const suggestion = useMemo(() => suggestedType(form.data.label), [form.data.label]);
    const mismatch = suggestion && suggestion !== form.data.type;

    const submit = (event) => {
        event.preventDefault();
        form.post(route('admin.configurator.taxonomies.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('label'),
        });
    };

    return (
        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(29,38,77,0.055)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="text-lg font-black">Add a catalog option</h2><p className="mt-1 text-sm text-slate-500">First choose what kind of option you are adding. Product categories are the usual starting point.</p></div>
            <form onSubmit={submit} className="p-5 sm:p-6">
                <fieldset>
                    <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Choose the option type</legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {Object.entries(optionTypes).map(([type, meta]) => {
                            const selected = form.data.type === type;
                            return <button key={type} type="button" onClick={() => form.setData('type', type)} aria-pressed={selected} className={`relative flex items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? type === 'category' ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400' : 'border-blue-400 bg-blue-50 ring-1 ring-blue-400' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? type === 'category' ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><UiIcon name={meta.icon} className="h-5 w-5" /></span><span><strong className="block text-sm font-bold">{meta.title} <span className="font-medium text-slate-400">— {meta.question}</span></strong><span className="mt-1 block text-xs leading-5 text-slate-500">{meta.description}</span><span className="mt-2 block text-[11px] font-semibold text-slate-400">Examples: {meta.examples}</span></span>{selected && <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white ${type === 'category' ? 'bg-violet-600' : 'bg-blue-600'}`}><UiIcon name="check" className="h-3 w-3" strokeWidth={2.5} /></span>}</button>;
                        })}
                    </div>
                </fieldset>

                <label className="mt-5 block">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Name the {optionTypes[form.data.type].title.toLowerCase()}</span>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input value={form.data.label} onChange={(event) => form.setData('label', event.target.value)} placeholder={optionTypes[form.data.type].placeholder} className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                        <button disabled={form.processing || !form.data.label.trim()} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${form.data.type === 'category' ? 'bg-violet-600 shadow-violet-600/20 hover:bg-violet-700' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'}`}><UiIcon name="plus" className="h-4 w-4" />Create {form.data.type === 'category' ? 'category' : 'group'}</button>
                    </div>
                    {form.errors.label && <span className="mt-1.5 block text-xs font-semibold text-red-600">{form.errors.label}</span>}
                </label>

                {mismatch && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                        <span><strong>Check the option type.</strong> “{form.data.label.trim()}” looks more like a {suggestion === 'category' ? 'product category' : 'customer group'}.</span>
                        <button type="button" onClick={() => form.setData('type', suggestion)} className="rounded-lg bg-white px-3 py-1.5 font-black text-amber-800 shadow-sm ring-1 ring-amber-200">Switch type</button>
                    </div>
                )}
            </form>
        </section>
    );
}

function OptionList({ type, items, replacements }) {
    const meta = optionTypes[type];
    return (
        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_38px_rgba(29,38,77,0.05)]">
            <div className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${type === 'category' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}><UiIcon name={meta.icon} className="h-5 w-5" /></span>
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{type === 'category' ? 'Product categories' : 'Customer groups'}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{items.length}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{meta.description} Examples: {meta.examples}.</p></div>
            </div>
            <div className="divide-y divide-slate-100 px-4">
                {items.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No options in this group yet.</p>}
                {items.map((item) => <OptionRow key={item.id} item={item} type={type} replacements={replacements} />)}
            </div>
        </section>
    );
}

function OptionRow({ item, type, replacements }) {
    const [moving, setMoving] = useState(false);
    const availableReplacements = replacements.filter((option) => option.slug !== item.slug);
    const moveForm = useForm({ replacement_slug: preferredReplacement(availableReplacements, type) });
    const destination = type === 'category' ? 'customer groups' : 'product categories';

    const remove = () => {
        if (item.productsCount > 0 || !window.confirm(`Remove ${item.label}?`)) return;
        router.delete(route('admin.configurator.taxonomies.destroy', item.id), { preserveScroll: true });
    };
    const move = () => {
        if (item.productsCount === 0) {
            router.patch(route('admin.configurator.taxonomies.move', item.id), {}, { preserveScroll: true });
            return;
        }
        setMoving(true);
    };
    const submitMove = (event) => {
        event.preventDefault();
        moveForm.patch(route('admin.configurator.taxonomies.move', item.id), { preserveScroll: true, onSuccess: () => setMoving(false) });
    };

    return (
        <div className="py-3.5">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.productsCount} product{item.productsCount === 1 ? '' : 's'} · {item.slug}</p></div>
                <div className="flex items-center gap-1.5"><button type="button" onClick={move} title={`Move ${item.label} to ${destination}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><UiIcon name="arrow" className="h-3.5 w-3.5" />Move</button><button type="button" onClick={remove} disabled={item.productsCount > 0} title={item.productsCount > 0 ? 'Move or delete products using this option first' : `Remove ${item.label}`} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"><UiIcon name="trash" className="h-4 w-4" /></button></div>
            </div>
            {moving && (
                <form onSubmit={submitMove} className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                    <p className="text-xs font-bold text-indigo-950">Move “{item.label}” to {destination}</p>
                    <p className="mt-1 text-[11px] leading-5 text-indigo-800">Choose the replacement {type === 'audience' ? 'customer group' : 'category'} for its {item.productsCount} linked product{item.productsCount === 1 ? '' : 's'}. The products will also receive the moved option.</p>
                    <div className="mt-2 flex flex-wrap gap-2"><select required value={moveForm.data.replacement_slug} onChange={(event) => moveForm.setData('replacement_slug', event.target.value)} className="h-9 min-w-40 flex-1 rounded-lg border-indigo-200 bg-white text-xs"><option value="">Choose replacement</option>{availableReplacements.map((option) => <option key={option.slug} value={option.slug}>{option.label}</option>)}</select><button disabled={moveForm.processing || !moveForm.data.replacement_slug} className="rounded-lg bg-indigo-600 px-3 text-xs font-black text-white disabled:opacity-40">Move and reassign</button><button type="button" onClick={() => setMoving(false)} className="rounded-lg px-3 text-xs font-bold text-slate-500">Cancel</button></div>
                    {moveForm.errors.replacement_slug && <p className="mt-1.5 text-xs font-semibold text-red-600">{moveForm.errors.replacement_slug}</p>}
                </form>
            )}
        </div>
    );
}

function suggestedType(label) {
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!value) return null;
    if (productWords.some((word) => value.includes(word))) return 'category';
    if (audienceWords.some((word) => value.includes(word))) return 'audience';
    return null;
}

function preferredReplacement(options, sourceType) {
    if (sourceType === 'audience') return options.find((option) => option.slug === 'unisex')?.slug ?? options[0]?.slug ?? '';
    return options.find((option) => option.slug === 'others')?.slug ?? options[0]?.slug ?? '';
}
