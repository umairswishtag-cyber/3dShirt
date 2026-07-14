import { Head } from '@inertiajs/react';
import { lazy, Suspense, useState } from 'react';
import ConfigurationPanel from '@/features/configurator/components/ConfigurationPanel';
import ConfiguratorHeader from '@/features/configurator/components/ConfiguratorHeader';
import ConfiguratorSidebar, {
    CONFIGURATOR_TOOLS,
    ToolPanelContent,
} from '@/features/configurator/components/ConfiguratorSidebar';
import DesignAreaSelector from '@/features/configurator/components/DesignAreaSelector';
import MobileConfiguratorToolbar from '@/features/configurator/components/MobileConfiguratorToolbar';
import ResetDesignDialog from '@/features/configurator/components/ResetDesignDialog';
import ProductSelectionScreen from '@/features/configurator/components/ProductSelectionScreen';
import { useConfiguratorKeyboardShortcuts } from '@/features/configurator/hooks/useConfiguratorKeyboardShortcuts';
import { useLocalDesignPersistence } from '@/features/configurator/hooks/useLocalDesignPersistence';
import { useConfiguratorStore } from '@/features/configurator/stores/useConfiguratorStore';
import { replaceProductCatalog } from '@/features/configurator/config/productCatalog';

const DesignCanvas = lazy(() => import('@/features/configurator/canvas/DesignCanvas'));
const ShirtViewer = lazy(() => import('@/features/configurator/three/ShirtViewer'));

function ViewerLoadingState() {
    return (
        <div className="grid h-full min-h-80 place-items-center bg-slate-100">
            <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                Starting 3D viewer…
            </div>
        </div>
    );
}

function CanvasLoadingState() {
    return <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />;
}

export default function ConfiguratorPage({ catalog }) {
    useState(() => replaceProductCatalog(catalog));
    const [activeTool, setActiveTool] = useState('colors');
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(true);
    const selectedObjectId = useConfiguratorStore((state) => state.selectedObjectId);
    const product = useConfiguratorStore((state) => state.product);
    const restoreError = useConfiguratorStore((state) => state.restoreError);
    const clearRestoreError = useConfiguratorStore((state) => state.clearRestoreError);
    const resetDesign = useConfiguratorStore((state) => state.resetDesign);
    const selectProduct = useConfiguratorStore((state) => state.selectProduct);

    useLocalDesignPersistence();
    useConfiguratorKeyboardShortcuts();

    const handleToolChange = (toolId) => {
        setActiveTool(toolId);
        setMobilePanelOpen(true);
    };

    const activeToolLabel =
        activeTool === 'adjust'
            ? 'Image settings'
            : CONFIGURATOR_TOOLS.find((tool) => tool.id === activeTool)?.label;

    if (catalogOpen) {
        return (
            <>
                <Head title="Choose a 3D garment" />
                <ProductSelectionScreen
                    onSelect={(productId) => {
                        const selectedProduct = selectProduct(productId);
                        if (!selectedProduct) return;
                        setActiveTool(
                            selectedProduct.capabilities.solidColors
                                ? 'colors'
                                : selectedProduct.capabilities.patterns || selectedProduct.capabilities.logos
                                  ? 'image'
                                  : 'product',
                        );
                        setMobilePanelOpen(false);
                        setCatalogOpen(false);
                    }}
                />
            </>
        );
    }

    return (
        <>
            <Head title={`${product.name} Configurator`} />
            <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-slate-100 text-slate-950">
                <ConfiguratorHeader
                    onReset={() => setResetDialogOpen(true)}
                    onChangeProduct={() => setCatalogOpen(true)}
                />

                {restoreError && (
                    <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800" role="alert">
                        <span>{restoreError}</span>
                        <button type="button" onClick={clearRestoreError} className="font-bold underline">
                            Dismiss
                        </button>
                    </div>
                )}

                <main className="flex min-h-0 flex-1">
                    <ConfiguratorSidebar activeTool={activeTool} onToolChange={setActiveTool} />

                    <section className="relative min-w-0 flex-1 overflow-hidden">
                        <Suspense fallback={<ViewerLoadingState />}>
                            <ShirtViewer />
                        </Suspense>

                        <div className="absolute left-3 top-3 z-10 lg:hidden">
                            <DesignAreaSelector compact />
                        </div>

                        {product.capabilities.logos && <div className="absolute bottom-5 left-5 z-10 hidden w-[260px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur lg:block xl:w-[290px]">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    2D print editor
                                </p>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Live
                                </span>
                            </div>
                            <Suspense fallback={<CanvasLoadingState />}>
                                <DesignCanvas compact />
                            </Suspense>
                        </div>}

                        <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 lg:block">
                            <DesignAreaSelector />
                        </div>
                    </section>

                    {product.capabilities.logos && <ConfigurationPanel />}
                </main>

                {mobilePanelOpen && (
                    <section className="fixed inset-x-0 bottom-[68px] z-50 max-h-[68dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-4 shadow-[0_-20px_50px_rgba(15,23,42,0.18)] lg:hidden">
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                {activeToolLabel}
                            </p>
                            <button
                                type="button"
                                onClick={() => setMobilePanelOpen(false)}
                                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-medium text-slate-600"
                                aria-label="Close panel"
                            >
                                ×
                            </button>
                        </div>

                        {activeTool === 'adjust' ? (
                            <ConfigurationPanel embedded />
                        ) : (
                            <ToolPanelContent tool={activeTool} />
                        )}

                        {product.capabilities.logos && (activeTool === 'image' || activeTool === 'layers') && (
                            <div className="mt-5 border-t border-slate-100 pt-5">
                                <Suspense fallback={<CanvasLoadingState />}>
                                    <DesignCanvas />
                                </Suspense>
                            </div>
                        )}
                    </section>
                )}

                <MobileConfiguratorToolbar
                    activeTool={mobilePanelOpen ? activeTool : null}
                    onToolChange={handleToolChange}
                    hasSelection={Boolean(selectedObjectId)}
                />
            </div>

            <ResetDesignDialog
                show={resetDialogOpen}
                onClose={() => setResetDialogOpen(false)}
                onConfirm={resetDesign}
            />
        </>
    );
}
