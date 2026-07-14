import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export default function LayersPanel() {
    const activeDesignAreaId = useConfiguratorStore((state) => state.activeDesignAreaId);
    const selectedObjectId = useConfiguratorStore((state) => state.selectedObjectId);
    const designObjects = useConfiguratorStore((state) => state.designObjects);
    const selectDesignObject = useConfiguratorStore((state) => state.selectDesignObject);
    const duplicateDesignObject = useConfiguratorStore((state) => state.duplicateDesignObject);
    const removeDesignObject = useConfiguratorStore((state) => state.removeDesignObject);
    const layers = designObjects
        .filter((object) => object.areaId === activeDesignAreaId)
        .sort((left, right) => (right.zIndex ?? 0) - (left.zIndex ?? 0));

    if (layers.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">No layers on this side</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Use Add image to place your first design.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {layers.map((layer) => (
                <div
                    key={layer.id}
                    className={`group flex items-center gap-2 rounded-xl border p-2 transition ${
                        selectedObjectId === layer.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => selectDesignObject(layer.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                            <img src={layer.source} alt="" className="max-h-full max-w-full object-contain" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-800">{layer.name}</span>
                            <span className="text-[11px] capitalize text-slate-500">{layer.type}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => duplicateDesignObject(layer.id)}
                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
                        aria-label={`Duplicate ${layer.name}`}
                    >
                        Copy
                    </button>
                    <button
                        type="button"
                        onClick={() => removeDesignObject(layer.id)}
                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${layer.name}`}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
}
