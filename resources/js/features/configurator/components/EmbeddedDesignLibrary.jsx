import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import GarmentIllustration from "@/Components/GarmentIllustration";
import UiIcon from "@/Components/UiIcon";
import { graphqlRequest } from "@/services/graphqlClient";

const MY_DESIGNS = `query MyDesigns { myDesigns { id title status productId productName updatedAt finalizedAt } }`;
const DELETE_DESIGN = `mutation DeleteDesign($id: ID!) { deleteMyDesign(id: $id) }`;

export default function EmbeddedDesignLibrary({
    status,
    catalog,
    onOpenDesign,
    onCreateDesign,
}) {
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const final = status === "FINAL";

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        graphqlRequest(MY_DESIGNS)
            .then((data) => {
                if (active) setDesigns(data.myDesigns ?? []);
            })
            .catch((requestError) => {
                if (active) setError(requestError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const visibleDesigns = useMemo(
        () => designs.filter((design) => design.status === status),
        [designs, status],
    );

    const remove = async (design) => {
        if (!window.confirm(`Delete “${design.title}”? This cannot be undone.`)) {
            return;
        }

        try {
            await graphqlRequest(DELETE_DESIGN, { id: design.id });
            setDesigns((items) => items.filter((item) => item.id !== design.id));
            toast.success("Design deleted.");
        } catch (requestError) {
            toast.error(requestError.message);
        }
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f6f8fc] px-4 py-7 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[100rem]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                            Your design studio
                        </p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                            {final ? "Final Products" : "Saved Designs"}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm text-slate-500">
                            {final
                                ? "Completed designs that you have marked as finished."
                                : "Draft designs that are ready for you to continue editing."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCreateDesign}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <UiIcon name="plus" className="h-4 w-4" />
                        Create new design
                    </button>
                </div>

                {loading ? (
                    <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-80 animate-pulse rounded-3xl bg-white"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <section className="mt-7 rounded-3xl border border-rose-200 bg-white px-6 py-14 text-center">
                        <h2 className="text-lg font-black text-slate-950">
                            Designs could not be loaded
                        </h2>
                        <p className="mt-2 text-sm text-rose-600">{error}</p>
                    </section>
                ) : visibleDesigns.length === 0 ? (
                    <EmptyLibrary final={final} onCreateDesign={onCreateDesign} />
                ) : (
                    <>
                        <p className="mt-7 text-xs font-bold text-slate-400">
                            {visibleDesigns.length}{" "}
                            {visibleDesigns.length === 1 ? "design" : "designs"}
                        </p>
                        <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleDesigns.map((design) => (
                                <DesignCard
                                    key={design.id}
                                    design={design}
                                    product={catalog.find(
                                        (item) => item.id === design.productId,
                                    )}
                                    onOpen={() => onOpenDesign(design.id)}
                                    onDelete={() => remove(design)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

function EmptyLibrary({ final, onCreateDesign }) {
    return (
        <section className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <UiIcon name={final ? "check" : "bookmark"} className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-xl font-black text-slate-950">
                {final ? "No final products yet" : "No saved designs yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {final
                    ? "Open a design and select Finish to place it in your final products."
                    : "Create a product design and select Save design to keep it here."}
            </p>
            <button
                type="button"
                onClick={onCreateDesign}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"
            >
                <UiIcon name="plus" className="h-4 w-4" />
                Open configurator
            </button>
        </section>
    );
}

function DesignCard({ design, product, onOpen, onDelete }) {
    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <button type="button" onClick={onOpen} className="block w-full text-left">
                <span className="relative grid h-48 place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
                    {product?.thumbnailUrl ? (
                        <img
                            src={product.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-contain p-5 transition group-hover:scale-105"
                        />
                    ) : (
                        <GarmentIllustration
                            type={product?.category ?? design.productId}
                            className="h-44 w-full transition group-hover:scale-105"
                        />
                    )}
                    <span
                        className={`absolute right-3 top-3 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase shadow-sm ${
                            design.status === "FINAL"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                    >
                        {design.status === "FINAL" ? "Finished" : "Draft"}
                    </span>
                </span>
                <span className="block p-5">
                    <strong className="block truncate text-base font-black text-slate-950">
                        {design.title}
                    </strong>
                    <span className="mt-1 block text-xs text-slate-500">
                        {design.productName}
                    </span>
                    <span className="mt-4 block text-[11px] text-slate-400">
                        Updated {new Date(design.updatedAt).toLocaleString()}
                    </span>
                </span>
            </button>
            <div className="flex border-t border-slate-100">
                <button
                    type="button"
                    onClick={onOpen}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-xs font-black text-blue-700 hover:bg-blue-50"
                >
                    Open design
                    <UiIcon name="arrow" className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${design.title}`}
                    className="min-h-11 border-l border-slate-100 px-4 text-rose-500 hover:bg-rose-50"
                >
                    <UiIcon name="trash" className="h-4 w-4" />
                </button>
            </div>
        </article>
    );
}
