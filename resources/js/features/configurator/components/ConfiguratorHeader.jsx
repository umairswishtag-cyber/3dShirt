import { router } from '@inertiajs/react';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

function HeaderButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            {...props}
            className={`min-h-9 min-w-0 rounded-lg border px-2 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 sm:px-3 sm:text-xs ${className}`}
        >
            {children}
        </button>
    );
}

export default function ConfiguratorHeader({
    onChangeProduct,
    onSave,
    onFinalize,
    onAddToCart,
    saving = false,
    adminPreview = false,
    embedded = false,
    accountUrl = '/account',
    onOpenDesigns,
    designTitle = '',
    designStatus = 'DRAFT',
    titleDirty = false,
    onDesignTitleChange,
    cartAvailable = false,
    carting = false,
}) {
    const product = useConfiguratorStore((state) => state.product);
    const designIsDirty = useConfiguratorStore((state) => state.isDirty);
    const isDirty = designIsDirty || titleDirty;
    const lastSavedAt = useConfiguratorStore((state) => state.lastSavedAt);
    const pastLength = useConfiguratorStore((state) => state.past.length);
    const futureLength = useConfiguratorStore((state) => state.future.length);
    const undo = useConfiguratorStore((state) => state.undo);
    const redo = useConfiguratorStore((state) => state.redo);

    const openDesigns = () => {
        if (onOpenDesigns && !adminPreview) {
            onOpenDesigns();
            return;
        }

        const url = adminPreview
            ? route('admin.configurator.products.index')
            : accountUrl;
        if (embedded) window.location.assign(url);
        else router.visit(url);
    };

    return (
        <header className="relative z-30 shrink-0 border-b border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-5 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
                    3D
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={designTitle}
                            maxLength={160}
                            disabled={adminPreview}
                            onChange={(event) =>
                                onDesignTitleChange?.(event.target.value)
                            }
                            placeholder={`${product.name} design`}
                            aria-label="Design name"
                            title="Change the name shown in My designs"
                            className="h-7 min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 text-sm font-bold text-slate-950 transition hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-100 sm:text-base"
                        />
                        <button
                            type="button"
                            onClick={onChangeProduct}
                            className="shrink-0 text-[10px] font-bold text-blue-700 underline"
                        >
                            Change
                        </button>
                        <span
                            className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline ${
                                adminPreview
                                    ? 'bg-amber-50 text-amber-700'
                                    : designStatus === 'FINAL'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                            }`}
                        >
                            {adminPreview
                                ? 'Admin preview'
                                : designStatus === 'FINAL'
                                  ? 'Published'
                                  : 'Draft'}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                isDirty ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                        />
                        <span className="truncate">
                            {isDirty
                                ? 'Unsaved changes'
                                : lastSavedAt
                                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}`
                                  : product.name}
                        </span>
                    </div>
                </div>
            </div>

            <div
                className={`mt-2 grid w-full gap-1.5 sm:gap-2 ${
                    embedded
                        ? "grid-cols-[36px_36px_repeat(4,minmax(0,1fr))]"
                        : "grid-cols-[36px_36px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]"
                }`}
            >
                <HeaderButton
                    onClick={undo}
                    disabled={pastLength === 0}
                    aria-label="Undo"
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    <span aria-hidden="true">&#8630;</span>
                    <span className="sr-only">Undo</span>
                </HeaderButton>
                <HeaderButton
                    onClick={redo}
                    disabled={futureLength === 0}
                    aria-label="Redo"
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    <span aria-hidden="true">&#8631;</span>
                    <span className="sr-only">Redo</span>
                </HeaderButton>
                <HeaderButton
                    onClick={onSave}
                    disabled={saving || adminPreview}
                    title={
                        adminPreview
                            ? 'Saving is disabled in administrator preview mode'
                            : 'Save this design to your account'
                    }
                    className="border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                    {saving ? (
                        'Saving...'
                    ) : (
                        <>
                            Save <span className="hidden sm:inline">design</span>
                        </>
                    )}
                </HeaderButton>
                <HeaderButton
                    onClick={onFinalize}
                    disabled={saving || adminPreview}
                    title="Publish this design to your account"
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                    Publish
                </HeaderButton>
                {embedded && (
                    <HeaderButton
                        onClick={onAddToCart}
                        disabled={saving || carting || adminPreview || !cartAvailable}
                        title={
                            cartAvailable
                                ? 'Send this custom design for production review and quotation'
                                : 'Connect this product to a Shopify variant before submitting a request'
                        }
                        className="border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
                    >
                        {carting
                            ? "Preparing…"
                            : cartAvailable
                              ? "Request quote"
                              : "Request unavailable"}
                    </HeaderButton>
                )}
                <HeaderButton
                    onClick={openDesigns}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    {adminPreview ? (
                        'Exit preview'
                    ) : (
                        <>
                            <span className="sm:hidden">Designs</span>
                            <span className="hidden sm:inline">My designs</span>
                        </>
                    )}
                </HeaderButton>
            </div>
        </header>
    );
}
