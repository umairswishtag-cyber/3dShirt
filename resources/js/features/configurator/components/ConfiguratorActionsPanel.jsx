import { router } from "@inertiajs/react";
import ConfigurationPanel from "./ConfigurationPanel";

function ActionButton({ children, className = "", ...props }) {
    return (
        <button
            type="button"
            {...props}
            className={`min-h-9 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
        >
            {children}
        </button>
    );
}

export default function ConfiguratorActionsPanel({
    onSave,
    onFinalize,
    onChangeProduct,
    onOpenDesigns,
    saving = false,
    adminPreview = false,
    embedded = false,
    accountUrl = "/account",
    designStatus = "DRAFT",
}) {
    const openDesigns = () => {
        if (onOpenDesigns && !adminPreview) {
            onOpenDesigns();
            return;
        }

        const url = adminPreview
            ? route("admin.configurator.products.index")
            : accountUrl;
        if (embedded) window.location.assign(url);
        else router.visit(url);
    };

    return (
        <aside className="hidden min-h-0 w-[clamp(300px,16vw,360px)] shrink-0 flex-col border-l border-slate-200 bg-white lg:flex">
            <div className="shrink-0 border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                    <ActionButton
                        onClick={onSave}
                        disabled={saving || adminPreview}
                        title={
                            adminPreview
                                ? "Saving is disabled in administrator preview mode"
                                : "Save this design to your account"
                        }
                        className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    >
                        {saving ? "Saving…" : "Save Draft"}
                    </ActionButton>
                    <ActionButton
                        onClick={onFinalize}
                        disabled={saving || adminPreview}
                        title="Mark this design as finished"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                        Publish
                    </ActionButton>
                    <ActionButton
                        onClick={openDesigns}
                        className="ml-auto text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    >
                        {adminPreview ? "Exit preview" : "My designs"}
                    </ActionButton>
                </div>

                <div className="mt-4 flex items-center gap-3 px-1">
                    <button
                        type="button"
                        onClick={onChangeProduct}
                        className="text-[11px] font-bold text-blue-700 underline"
                    >
                        Change product
                    </button>
                    <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                            adminPreview
                                ? "bg-amber-50 text-amber-700"
                                : designStatus === "FINAL"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                        }`}
                    >
                        {adminPreview
                            ? "Admin preview"
                            : designStatus === "FINAL"
                              ? "Finished"
                              : "Draft"}
                    </span>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Design details
                </p>
                <ConfigurationPanel embedded />
            </div>
        </aside>
    );
}
