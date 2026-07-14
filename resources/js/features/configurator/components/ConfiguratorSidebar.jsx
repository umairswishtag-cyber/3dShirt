import ColorPalette from './ColorPalette';
import ImageUploadTool from './ImageUploadTool';
import LayersPanel from './LayersPanel';
import PatternGallery from './PatternGallery';

export const CONFIGURATOR_TOOLS = [
    { id: 'product', label: 'Product', shortLabel: 'Product' },
    { id: 'colors', label: 'Colors', shortLabel: 'Colors' },
    { id: 'image', label: 'Design texture', shortLabel: 'Design' },
    { id: 'layers', label: 'Layers', shortLabel: 'Layers' },
];

export function ToolPanelContent({ tool }) {
    if (tool === 'colors') return <ColorPalette />;
    if (tool === 'image') {
        return (
            <div className="space-y-5">
                <PatternGallery />
                <div className="border-t border-slate-100 pt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Add logo
                    </p>
                    <ImageUploadTool />
                </div>
            </div>
        );
    }
    if (tool === 'layers') return <LayersPanel />;

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white p-5">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-5xl shadow-sm" aria-hidden="true">
                    👕
                </div>
            </div>
            <div>
                <p className="text-base font-bold text-slate-950">Basic T-Shirt</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                    Real configurable T-shirt with separate front, back, left-sleeve, and right-sleeve design areas.
                </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-slate-400">3D model</dt>
                    <dd className="mt-1 font-semibold text-slate-800">GLB</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-slate-400">Print areas</dt>
                    <dd className="mt-1 font-semibold text-slate-800">4 areas</dd>
                </div>
            </dl>
        </div>
    );
}

export default function ConfiguratorSidebar({ activeTool, onToolChange }) {
    const activeToolConfig = CONFIGURATOR_TOOLS.find((tool) => tool.id === activeTool);

    return (
        <aside className="hidden min-h-0 w-[280px] shrink-0 border-r border-slate-200 bg-white lg:flex">
            <nav className="flex w-[76px] shrink-0 flex-col items-stretch gap-1 border-r border-slate-100 bg-slate-50 p-2" aria-label="Configurator tools">
                {CONFIGURATOR_TOOLS.map((tool) => (
                    <button
                        key={tool.id}
                        type="button"
                        onClick={() => onToolChange(tool.id)}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-[10px] font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            activeTool === tool.id
                                ? 'bg-slate-950 text-white shadow-sm'
                                : 'text-slate-500 hover:bg-white hover:text-slate-950'
                        }`}
                        aria-pressed={activeTool === tool.id}
                    >
                        <span className="mb-1 text-base" aria-hidden="true">
                            {tool.id === 'product' ? '◫' : tool.id === 'colors' ? '●' : tool.id === 'image' ? '+' : '≡'}
                        </span>
                        {tool.shortLabel}
                    </button>
                ))}
            </nav>
            <section className="min-w-0 flex-1 overflow-y-auto p-4">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {activeToolConfig?.label}
                </p>
                <ToolPanelContent tool={activeTool} />
            </section>
        </aside>
    );
}
