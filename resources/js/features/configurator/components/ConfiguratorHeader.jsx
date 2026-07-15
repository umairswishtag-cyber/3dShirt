import { router } from '@inertiajs/react';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

function HeaderButton({ children, className = '', ...props }) {
    return (
        <button
            type="button"
            {...props}
            className={`min-h-9 rounded-lg border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 sm:px-3 ${className}`}
        >
            {children}
        </button>
    );
}

export default function ConfiguratorHeader({ onReset, onChangeProduct, onSave, onFinalize, saving = false, adminPreview = false }) {
    const product = useConfiguratorStore((state) => state.product);
    const isDirty = useConfiguratorStore((state) => state.isDirty);
    const lastSavedAt = useConfiguratorStore((state) => state.lastSavedAt);
    const pastLength = useConfiguratorStore((state) => state.past.length);
    const futureLength = useConfiguratorStore((state) => state.future.length);
    const undo = useConfiguratorStore((state) => state.undo);
    const redo = useConfiguratorStore((state) => state.redo);

    return (
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
                    3D
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-sm font-bold text-slate-950 sm:text-base">{product.name}</h1>
                        <button
                            type="button"
                            onClick={onChangeProduct}
                            className="hidden text-[10px] font-bold text-blue-700 underline sm:inline"
                        >
                            Change
                        </button>
                        <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline ${adminPreview ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            {adminPreview ? 'Admin preview' : 'Configurator'}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {isDirty
                            ? 'Unsaved changes'
                            : lastSavedAt
                              ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Ready'}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                <HeaderButton
                    onClick={undo}
                    disabled={pastLength === 0}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    <span className="sm:hidden" aria-hidden="true">↶</span>
                    <span className="sr-only sm:not-sr-only">Undo</span>
                </HeaderButton>
                <HeaderButton
                    onClick={redo}
                    disabled={futureLength === 0}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    <span className="sm:hidden" aria-hidden="true">↷</span>
                    <span className="sr-only sm:not-sr-only">Redo</span>
                </HeaderButton>
                <HeaderButton
                    onClick={onReset}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                    <span className="sm:hidden" aria-hidden="true">↺</span>
                    <span className="sr-only sm:not-sr-only">Reset</span>
                </HeaderButton>
                <HeaderButton
                    onClick={onSave}
                    disabled={saving || adminPreview}
                    title={adminPreview ? 'Saving is disabled in administrator preview mode' : 'Save this design to your account'}
                    className="border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                    {saving ? 'Saving…' : <>Save <span className="hidden sm:inline">design</span></>}
                </HeaderButton>
                <HeaderButton
                    onClick={onFinalize}
                    disabled={saving || adminPreview}
                    title="Mark this design as finished"
                    className="hidden border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 lg:block"
                >
                    Finish
                </HeaderButton>
                <HeaderButton onClick={() => router.visit(adminPreview ? route('admin.configurator.products.index') : '/account')} className="hidden border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:block">{adminPreview ? 'Exit preview' : 'My designs'}</HeaderButton>
            </div>
        </header>
    );
}
