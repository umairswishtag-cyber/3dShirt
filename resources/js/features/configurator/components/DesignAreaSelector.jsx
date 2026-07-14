import { DESIGN_AREAS } from '../config/designAreas';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export default function DesignAreaSelector({ compact = false }) {
    const activeDesignAreaId = useConfiguratorStore((state) => state.activeDesignAreaId);
    const setActiveDesignArea = useConfiguratorStore((state) => state.setActiveDesignArea);

    return (
        <div
            className={`flex items-center rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur ${
                compact ? 'gap-0.5' : 'gap-1'
            }`}
            aria-label="Print area"
        >
            {DESIGN_AREAS.map((area) => (
                <button
                    key={area.id}
                    type="button"
                    onClick={() => setActiveDesignArea(area.id)}
                    className={`rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        compact ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm'
                    } ${
                        activeDesignAreaId === area.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                    aria-pressed={activeDesignAreaId === area.id}
                >
                    {area.label}
                </button>
            ))}
        </div>
    );
}

