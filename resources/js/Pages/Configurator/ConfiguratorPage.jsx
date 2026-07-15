import { Head } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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
import { createLocalDesignPayload } from '@/features/configurator/utils/designSerialization';
import { graphqlRequest } from '@/services/graphqlClient';
import { isInlineDesignAsset, storeDesignAsset } from '@/services/designAssetService';

const LOAD_DESIGN = `query LoadDesign($id: ID!) { myDesign(id: $id) { id title status document } }`;
const SAVE_DESIGN = `
    mutation SaveDesign($input: SaveCustomerDesignInput!) {
        saveMyDesign(input: $input) { id title status updatedAt }
    }
`;

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

export default function ConfiguratorPage({ catalog, adminPreview = false, initialProductId = null }) {
    useState(() => replaceProductCatalog(catalog));
    const requestedDesignId = useMemo(() => new URLSearchParams(window.location.search).get('design'), []);
    const [activeTool, setActiveTool] = useState('colors');
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [printEditorExpanded, setPrintEditorExpanded] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(!requestedDesignId && !initialProductId);
    const [designId, setDesignId] = useState(requestedDesignId);
    const [designTitle, setDesignTitle] = useState('');
    const [designStatus, setDesignStatus] = useState('DRAFT');
    const [saving, setSaving] = useState(false);
    const selectedObjectId = useConfiguratorStore((state) => state.selectedObjectId);
    const product = useConfiguratorStore((state) => state.product);
    const restoreError = useConfiguratorStore((state) => state.restoreError);
    const clearRestoreError = useConfiguratorStore((state) => state.clearRestoreError);
    const resetDesign = useConfiguratorStore((state) => state.resetDesign);
    const selectProduct = useConfiguratorStore((state) => state.selectProduct);
    const loadDesignDocument = useConfiguratorStore((state) => state.loadDesignDocument);
    const saveLocalDesign = useConfiguratorStore((state) => state.saveLocalDesign);

    useLocalDesignPersistence(!adminPreview);
    useConfiguratorKeyboardShortcuts();

    useEffect(() => {
        if (!initialProductId || requestedDesignId) return;
        const selectedProduct = selectProduct(initialProductId);
        if (!selectedProduct) {
            setCatalogOpen(true);
            return;
        }
        setActiveTool(
            selectedProduct.capabilities.solidColors
                ? 'colors'
                : selectedProduct.capabilities.patterns || selectedProduct.capabilities.logos
                  ? 'image'
                  : 'product',
        );
        setCatalogOpen(false);
    }, [initialProductId, requestedDesignId, selectProduct]);

    useEffect(() => {
        if (!requestedDesignId) return;

        graphqlRequest(LOAD_DESIGN, { id: requestedDesignId })
            .then((data) => {
                const design = data.myDesign;
                const result = loadDesignDocument(JSON.parse(design.document));
                if (!result.ok) throw new Error(result.message);
                setDesignId(design.id);
                setDesignTitle(design.title);
                setDesignStatus(design.status);
                setCatalogOpen(false);
            })
            .catch((error) => {
                toast.error(error.message);
                setCatalogOpen(true);
            });
    }, [loadDesignDocument, requestedDesignId]);

    const saveDesign = async (nextStatus = designStatus) => {
        if (adminPreview) {
            toast('Preview mode does not create customer designs.', { icon: '👁️' });
            return;
        }
        setSaving(true);

        try {
            let state = useConfiguratorStore.getState();
            for (const object of state.designObjects.filter((item) => isInlineDesignAsset(item.source))) {
                const source = await storeDesignAsset(object.source, object.name);
                useConfiguratorStore.getState().updateDesignObject(object.id, { source }, false);
            }
            state = useConfiguratorStore.getState();
            const document = createLocalDesignPayload(state);
            const data = await graphqlRequest(SAVE_DESIGN, {
                input: {
                    id: designId,
                    title: designTitle || `${state.product.name} design`,
                    status: nextStatus,
                    productId: state.product.id,
                    productName: state.product.name,
                    document: JSON.stringify(document),
                },
            });
            const saved = data.saveMyDesign;
            setDesignId(saved.id);
            setDesignTitle(saved.title);
            setDesignStatus(saved.status);
            saveLocalDesign();
            window.history.replaceState({}, '', `/configurator?design=${saved.id}`);
            toast.success(saved.status === 'FINAL' ? 'Design finished and saved to your account!' : 'Design saved to your account.');
        } catch (error) {
            toast.error(error.message);
            if (/sign in|unauthenticated/i.test(error.message)) {
                window.setTimeout(() => window.location.assign('/login'), 1200);
            }
        } finally {
            setSaving(false);
        }
    };

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
                <Toaster position="top-center" />
                <ProductSelectionScreen
                    adminPreview={adminPreview}
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
            <Toaster position="top-center" />
            <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-slate-100 text-slate-950">
                <ConfiguratorHeader
                    onReset={() => setResetDialogOpen(true)}
                    onChangeProduct={() => setCatalogOpen(true)}
                    onSave={() => saveDesign()}
                    onFinalize={() => saveDesign('FINAL')}
                    saving={saving}
                    adminPreview={adminPreview}
                />

                {adminPreview && (
                    <div className="relative z-20 flex shrink-0 items-center justify-center border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900" role="status">
                        Administrator preview: explore the customer experience without signing in. Saving and finishing are disabled.
                    </div>
                )}

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
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    2D print editor
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Live</span>
                                    <button type="button" onClick={() => setPrintEditorExpanded(true)} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200">Expand</button>
                                </div>
                            </div>
                            <Suspense fallback={<CanvasLoadingState />}>
                                <DesignCanvas compact />
                            </Suspense>
                        </div>}

                        {printEditorExpanded && product.capabilities.logos && (
                            <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-start p-4 lg:pl-[360px]" role="dialog" aria-modal="false" aria-label="Expanded 2D print editor">
                                <div className="pointer-events-auto w-full max-w-[30rem] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                                    <div className="mb-5 flex items-start justify-between gap-4">
                                        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Live placement</p><h2 className="mt-1 text-xl font-black text-slate-950">2D print editor</h2><p className="mt-1 text-xs text-slate-500">Drag, resize, and rotate while watching the 3D product update beside it.</p></div>
                                        <button type="button" onClick={() => setPrintEditorExpanded(false)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200" aria-label="Close expanded editor">&times;</button>
                                    </div>
                                    <Suspense fallback={<CanvasLoadingState />}><DesignCanvas /></Suspense>
                                    <button type="button" onClick={() => setPrintEditorExpanded(false)} className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">Done positioning</button>
                                </div>
                            </div>
                        )}

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
