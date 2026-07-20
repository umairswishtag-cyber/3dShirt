import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import GarmentIllustration from '@/Components/GarmentIllustration';
import UiIcon from '@/Components/UiIcon';
import { GARMENT_CATEGORIES, GENDER_OPTIONS, PRODUCT_CATALOG } from '../config/productCatalog';

export default function ProductSelectionScreen({ onSelect, adminPreview = false }) {
    const [category, setCategory] = useState(null);
    const [gender, setGender] = useState(null);
    const products = useMemo(() => PRODUCT_CATALOG.filter((product) => product.gender === gender && product.category === category), [category, gender]);
    const categories = useMemo(() => {
        const known = new Map(GARMENT_CATEGORIES.map((item) => [item.id, item]));
        PRODUCT_CATALOG.forEach((product) => {
            known.set(product.category, { id: product.category, label: product.categoryLabel || known.get(product.category)?.label || titleCase(product.category) });
        });
        return [...known.values()].filter((option) => PRODUCT_CATALOG.some((product) => product.category === option.id));
    }, []);
    const audiences = useMemo(() => {
        const known = new Map(GENDER_OPTIONS.map((item) => [item.id, item]));
        PRODUCT_CATALOG.forEach((product) => known.set(product.gender, {
            id: product.gender,
            label: product.audienceLabel || known.get(product.gender)?.label || titleCase(product.gender),
        }));
        return [...known.values()].filter((option) => PRODUCT_CATALOG.some((product) => product.category === category && product.gender === option.id));
    }, [category]);

    const chooseCategory = (categoryId) => { setCategory(categoryId); setGender(null); };

    return (
        <div className="relative min-h-dvh overflow-hidden bg-[#f6f8fc] text-slate-950">
            <div className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-60 -right-40 h-[34rem] w-[34rem] rounded-full bg-cyan-100/50 blur-3xl" />

            <header className="relative border-b border-white/80 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-md">3D</span><span><strong className="block text-sm font-black">Design studio</strong><span className="text-xs text-slate-500">Choose your starting garment</span></span></div>
                    <button type="button" onClick={() => router.visit(adminPreview ? route('admin.configurator.products.index') : '/account')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 hover:shadow-md"><UiIcon name={adminPreview ? 'arrow' : 'bookmark'} className="h-4 w-4" /><span className="hidden sm:inline">{adminPreview ? 'Back to products' : 'My saved designs'}</span><span className="sm:hidden">{adminPreview ? 'Back' : 'Saved'}</span></button>
                </div>
            </header>

            <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-11">
                <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                    <div><span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"><UiIcon name="sparkles" className="h-3.5 w-3.5" />New design</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Choose a product</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Choose what you want to customize, select its audience or fit, then pick a published 3D model.</p></div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <ProgressStep number="1" label="Category" active />
                        <span className="h-px w-6 bg-slate-200" />
                        <ProgressStep number="2" label="Audience" active={Boolean(category)} />
                        <span className="h-px w-6 bg-slate-200" />
                        <ProgressStep number="3" label="Model" active={Boolean(gender)} />
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl">
                    <SelectionSection number="1" title="What would you like to customize?" hint="Choose a product category">
                        {categories.length === 0 ? <EmptyCatalog /> : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {categories.map((option) => {
                                    const count = PRODUCT_CATALOG.filter((product) => product.category === option.id).length;
                                    return <OptionCard key={option.id} selected={category === option.id} onClick={() => chooseCategory(option.id)} icon={categoryIcon(option.id)} label={option.label} description={`${count} model${count === 1 ? '' : 's'} available`} />;
                                })}
                            </div>
                        )}
                    </SelectionSection>

                    {category && (
                        <SelectionSection number="2" title="Who is it for?" hint="Choose an available audience or fit" bordered>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {audiences.map((option) => {
                                    const count = PRODUCT_CATALOG.filter((product) => product.category === category && product.gender === option.id).length;
                                    return <OptionCard key={option.id} selected={gender === option.id} onClick={() => setGender(option.id)} icon={option.id === 'kids' ? 'sparkles' : option.id === 'unisex' ? 'users' : 'user'} label={option.label} description={`${count} model${count === 1 ? '' : 's'} available`} />;
                                })}
                            </div>
                        </SelectionSection>
                    )}

                    {gender && (
                        <SelectionSection number="3" title="Choose your 3D model" hint="You can change this later" bordered>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {products.map((product) => (
                                    <button key={product.id} type="button" onClick={() => onSelect(product.id)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100">
                                        <span className="relative grid h-44 place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
                                            {product.thumbnailUrl ? <img src={product.thumbnailUrl} alt="" className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105" /> : <GarmentIllustration type={product.category} className="h-40 w-full transition duration-300 group-hover:scale-105" />}
                                            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur">3D ready</span>
                                        </span>
                                        <span className="block p-5"><span className="block text-base font-black text-slate-950">{product.name}</span><span className="mt-1.5 line-clamp-2 block min-h-10 text-xs leading-5 text-slate-500">{product.description || 'A customizable 3D garment ready for your colors and artwork.'}</span><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-blue-700">Customize this model<UiIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span></span>
                                    </button>
                                ))}
                            </div>
                        </SelectionSection>
                    )}
                </div>
                <p className="mt-5 text-center text-xs text-slate-400">Only models published by your administrator appear here.</p>
            </main>
        </div>
    );
}

function SelectionSection({ number, title, hint, bordered = false, children }) {
    return <section className={`p-5 sm:p-7 lg:p-8 ${bordered ? 'border-t border-slate-100' : ''}`}><div className="mb-5 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{number}</span><div><h2 className="text-sm font-black text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-400">{hint}</p></div></div>{children}</section>;
}

function OptionCard({ selected, disabled = false, onClick, icon, label, description }) {
    return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={selected} className={`relative flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 ${selected ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${selected ? 'bg-blue-600 text-white' : disabled ? 'bg-slate-100 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><UiIcon name={icon} className="h-5 w-5" /></span><span><strong className={`block text-sm ${selected ? 'text-blue-950' : ''}`}>{label}</strong><span className={`mt-1 block text-xs ${selected ? 'text-blue-600' : disabled ? 'text-slate-300' : 'text-slate-400'}`}>{description}</span></span>{selected && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white"><UiIcon name="check" className="h-3 w-3" strokeWidth={2.5} /></span>}</button>;
}

function ProgressStep({ number, label, active = false }) {
    return <span className={`inline-flex items-center gap-1.5 ${active ? 'text-blue-700' : ''}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{number}</span><span className="hidden sm:inline">{label}</span></span>;
}

function EmptyCatalog() {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-9 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm"><UiIcon name="products" /></span><p className="mt-4 text-sm font-bold">No garments are published yet</p><p className="mt-1 text-xs text-slate-500">An administrator must publish a configured 3D product first.</p></div>;
}

const categoryIcon = (category) => category === 'dresses' ? 'dress' : category === 'shirts' ? 'shirt' : ['cap', 'caps', 'hat', 'hats', 'headwear'].includes(category) ? 'cap' : ['footwear', 'shoe', 'shoes', 'sneakers', 'boots', 'sandals'].includes(category) ? 'footwear' : ['cup', 'cups', 'mug', 'mugs'].includes(category) ? 'cup' : 'products';
const titleCase = (value) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
