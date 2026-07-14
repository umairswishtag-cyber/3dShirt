import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export default function PatternColorControls() {
    const selectedPatternId = useConfiguratorStore((state) => state.selectedPatternId);
    const colors = useConfiguratorStore((state) =>
        state.selectedPatternId
            ? state.patternColors[state.selectedPatternId]
            : null,
    );
    const setPatternColor = useConfiguratorStore((state) => state.setPatternColor);
    const pattern = useConfiguratorStore((state) =>
        state.product.patterns?.find((item) => item.id === state.selectedPatternId),
    );

    if (!pattern) return null;

    return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="mb-3">
                <p className="text-xs font-bold text-slate-900">{pattern.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Pattern colors</p>
            </div>

            <div className="space-y-2">
                {pattern.colors.map((slot) => {
                    const value = colors?.[slot.id] ?? slot.source;

                    return (
                        <label
                            key={slot.id}
                            className="flex cursor-pointer items-center justify-between rounded-xl border border-white bg-white px-3 py-2 shadow-sm"
                        >
                            <span className="text-xs font-semibold text-slate-700">
                                {slot.label}
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-400">
                                    {value}
                                </span>
                                <input
                                    type="color"
                                    value={value}
                                    onChange={(event) =>
                                        setPatternColor(slot.id, event.target.value.toUpperCase())
                                    }
                                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                                    aria-label={`${slot.label} color`}
                                />
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
