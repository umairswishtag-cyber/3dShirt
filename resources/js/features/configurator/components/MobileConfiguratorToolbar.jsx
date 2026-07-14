import { CONFIGURATOR_TOOLS } from './ConfiguratorSidebar';

export default function MobileConfiguratorToolbar({ activeTool, onToolChange, hasSelection }) {
    const tools = [
        ...CONFIGURATOR_TOOLS,
        { id: 'adjust', label: 'Adjust', shortLabel: 'Adjust', disabled: !hasSelection },
    ];

    return (
        <nav className="relative z-40 grid h-[68px] shrink-0 grid-cols-5 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Mobile configurator tools">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    type="button"
                    disabled={tool.disabled}
                    onClick={() => onToolChange(tool.id)}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 ${
                        activeTool === tool.id
                            ? 'text-blue-700'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    aria-pressed={activeTool === tool.id}
                >
                    <span className={`mb-1 h-1.5 w-1.5 rounded-full ${activeTool === tool.id ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    {tool.shortLabel}
                </button>
            ))}
        </nav>
    );
}

