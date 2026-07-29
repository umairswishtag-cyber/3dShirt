import { lazy, Suspense, useEffect, useState } from "react";
import UiIcon from "@/Components/UiIcon";
import { replaceProductCatalog } from "@/features/configurator/config/productCatalog";
import { useConfiguratorStore } from "@/features/configurator/stores/useConfiguratorStore";
import { graphqlRequest } from "@/services/graphqlClient";

const LOAD_DESIGN = `query LoadDesignPreview($id: ID!) { myDesign(id: $id) { id document } }`;
const ShirtViewer = lazy(
    () => import("@/features/configurator/three/ShirtViewer"),
);

export default function SavedDesignCard({
    design,
    catalog,
    previewActive,
    embedded = false,
    onTogglePreview,
    onOpen,
    onDelete,
}) {
    const final = design.status === "FINAL";

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="relative h-44 overflow-hidden">
                {previewActive ? (
                    <SavedDesignPreview
                        designId={design.id}
                        catalog={catalog}
                        embedded={embedded}
                    />
                ) : (
                    <StatusCover final={final} />
                )}

                <span
                    className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase shadow-sm ${
                        final
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            final ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                    />
                    {final ? "Finished" : "Draft"}
                </span>
            </div>

            <button
                type="button"
                onClick={onOpen}
                className="block w-full p-5 text-left"
            >
                <h3 className="truncate font-black text-slate-950">
                    {design.title}
                </h3>
                <p className="mt-1 truncate text-xs text-slate-500">
                    {design.productName}
                </p>
                <p className="mt-4 text-[11px] text-slate-400">
                    Updated {new Date(design.updatedAt).toLocaleString()}
                </p>
            </button>

            <div className="grid grid-cols-[1fr_1fr_auto] border-t border-slate-100">
                <button
                    type="button"
                    onClick={onTogglePreview}
                    aria-pressed={previewActive}
                    className="flex min-h-12 items-center justify-center gap-1.5 px-3 text-[11px] font-black text-violet-700 hover:bg-violet-50"
                >
                    <UiIcon
                        name={previewActive ? "check" : "products"}
                        className="h-3.5 w-3.5"
                    />
                    {previewActive ? "Hide preview" : "View product"}
                </button>
                <button
                    type="button"
                    onClick={onOpen}
                    className="flex min-h-12 items-center justify-center gap-1.5 border-l border-slate-100 px-3 text-[11px] font-black text-blue-700 hover:bg-blue-50"
                >
                    Open design
                    <UiIcon name="arrow" className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${design.title}`}
                    className="min-h-12 border-l border-slate-100 px-4 text-rose-500 hover:bg-rose-50"
                >
                    <UiIcon name="trash" className="h-4 w-4" />
                </button>
            </div>
        </article>
    );
}

function StatusCover({ final }) {
    return (
        <div
            className={`grid h-full place-items-center ${
                final
                    ? "bg-[radial-gradient(circle_at_50%_30%,#ecfdf5_0%,#d1fae5_52%,#a7f3d0_100%)] text-emerald-800"
                    : "bg-[radial-gradient(circle_at_50%_30%,#fffbeb_0%,#fef3c7_52%,#fde68a_100%)] text-amber-800"
            }`}
        >
            <div className="text-center">
                <span
                    className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/80 shadow-sm ${
                        final ? "text-emerald-600" : "text-amber-600"
                    }`}
                >
                    <UiIcon
                        name={final ? "check" : "draft"}
                        className="h-7 w-7"
                        strokeWidth={2}
                    />
                </span>
                <strong className="mt-3 block text-sm font-black uppercase tracking-[0.16em]">
                    {final ? "Finished product" : "Draft design"}
                </strong>
                <span className="mt-1 block text-[10px] font-semibold opacity-70">
                    Preview stays off until requested
                </span>
            </div>
        </div>
    );
}

function SavedDesignPreview({ designId, catalog, embedded }) {
    const loadDesignDocument = useConfiguratorStore(
        (state) => state.loadDesignDocument,
    );
    const [state, setState] = useState({ loading: true, error: "" });

    useEffect(() => {
        let active = true;
        replaceProductCatalog(catalog);
        setState({ loading: true, error: "" });

        graphqlRequest(LOAD_DESIGN, { id: designId })
            .then((data) => {
                if (!active) return;
                const document = normalizeDesignAssets(
                    JSON.parse(data.myDesign.document),
                    embedded,
                );
                const result = loadDesignDocument(document);
                if (!result.ok) throw new Error(result.message);
                setState({ loading: false, error: "" });
            })
            .catch((error) => {
                if (active) {
                    setState({
                        loading: false,
                        error: error.message || "Preview could not be loaded.",
                    });
                }
            });

        return () => {
            active = false;
        };
    }, [catalog, designId, embedded, loadDesignDocument]);

    if (state.loading) {
        return (
            <div className="grid h-full place-items-center bg-slate-100 text-xs font-bold text-slate-500">
                Loading saved product…
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="grid h-full place-items-center bg-rose-50 px-6 text-center text-xs font-bold text-rose-600">
                {state.error}
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-100">
            <Suspense
                fallback={
                    <div className="grid h-full place-items-center text-xs font-bold text-slate-500">
                        Starting preview…
                    </div>
                }
            >
                <ShirtViewer compact />
            </Suspense>
        </div>
    );
}

function normalizeDesignAssets(document, embedded) {
    if (!embedded || !Array.isArray(document?.designObjects)) return document;

    return {
        ...document,
        designObjects: document.designObjects.map((object) => ({
            ...object,
            source:
                typeof object?.source === "string" &&
                object.source.startsWith("/storage/customer-designs/")
                    ? object.source.replace(
                          "/storage/customer-designs/",
                          "/apps/configurator/assets/customer-designs/",
                      )
                    : object?.source,
        })),
    };
}
