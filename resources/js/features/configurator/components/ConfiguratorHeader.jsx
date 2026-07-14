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

export default function ConfiguratorHeader({ onReset }) {
    const product = useConfiguratorStore((state) => state.product);
    const isDirty = useConfiguratorStore((state) => state.isDirty);
    const lastSavedAt = useConfiguratorStore((state) => state.lastSavedAt);
    const pastLength = useConfiguratorStore((state) => state.past.length);
    const futureLength = useConfiguratorStore((state) => state.future.length);
    const undo = useConfiguratorStore((state) => state.undo);
    const redo = useConfiguratorStore((state) => state.redo);
    const saveLocalDesign = useConfiguratorStore((state) => state.saveLocalDesign);

    return (
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
                    3D
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="truncate text-sm font-bold text-slate-950 sm:text-base">{product.name}</h1>
                        <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 sm:inline">
                            Configurator
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
                    onClick={saveLocalDesign}
                    className="border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                >
                    Save <span className="hidden sm:inline">design</span>
                </HeaderButton>
                <HeaderButton
                    disabled
                    title="Checkout will be added in a future module"
                    className="hidden border-slate-200 bg-slate-100 text-slate-500 lg:block"
                >
                    Continue
                </HeaderButton>
            </div>
        </header>
    );
}
