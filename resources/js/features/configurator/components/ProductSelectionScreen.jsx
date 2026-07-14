import { useMemo, useState } from 'react';
import {
    GARMENT_CATEGORIES,
    GENDER_OPTIONS,
    PRODUCT_CATALOG,
} from '../config/productCatalog';

export default function ProductSelectionScreen({ onSelect }) {
    const [gender, setGender] = useState(null);
    const [category, setCategory] = useState(null);
    const products = useMemo(
        () => PRODUCT_CATALOG.filter(
            (product) => product.gender === gender && product.category === category,
        ),
        [category, gender],
    );
    const genders = useMemo(() => GENDER_OPTIONS.filter(
        (option) => PRODUCT_CATALOG.some((product) => product.gender === option.id),
    ), []);
    const categories = useMemo(() => {
        const known = new Map(GARMENT_CATEGORIES.map((item) => [item.id, item]));
        PRODUCT_CATALOG.forEach((product) => {
            if (!known.has(product.category)) {
                known.set(product.category, {
                    id: product.category,
                    label: product.category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
                });
            }
        });
        return [...known.values()];
    }, []);

    const chooseGender = (genderId) => {
        setGender(genderId);
        setCategory(null);
    };

    return (
        <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fafc_45%,#e2e8f0_100%)] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-base font-black text-white shadow-lg">
                        3D
                    </div>
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Choose a garment</h1>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Select gender, garment category, and a compatible 3D model before customization.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-2xl backdrop-blur sm:p-7">
                    <section>
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">1. Gender</p>
                        {genders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                No garments are published yet. An administrator must publish a configured GLB product.
                            </div>
                        ) : <div className="grid grid-cols-2 gap-3">
                            {genders.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => chooseGender(option.id)}
                                    aria-pressed={gender === option.id}
                                    className={`min-h-20 rounded-2xl border px-4 text-base font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        gender === option.id
                                            ? 'border-blue-500 bg-blue-600 text-white shadow-lg'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>}
                    </section>

                    {gender && (
                        <section className="mt-7 border-t border-slate-100 pt-6">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">2. Category</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {categories.map((option) => {
                                    const available = PRODUCT_CATALOG.some(
                                        (product) => product.gender === gender && product.category === option.id,
                                    );

                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            disabled={!available}
                                            onClick={() => setCategory(option.id)}
                                            aria-pressed={category === option.id}
                                            className={`min-h-14 rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 ${
                                                category === option.id
                                                    ? 'border-slate-950 bg-slate-950 text-white'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                            }`}
                                        >
                                            {option.label}
                                            {!available && <span className="ml-1 text-[9px] uppercase">Soon</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {category && (
                        <section className="mt-7 border-t border-slate-100 pt-6">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">3. 3D model</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => onSelect(product.id)}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {product.thumbnailUrl && (
                                            <img src={product.thumbnailUrl} alt="" className="mb-3 h-28 w-full rounded-xl bg-slate-100 object-contain" />
                                        )}
                                        <span className="text-sm font-bold text-slate-950">{product.name}</span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500">{product.description}</span>
                                        <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                                            Select model
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
