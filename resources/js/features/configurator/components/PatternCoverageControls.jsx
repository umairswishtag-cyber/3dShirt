import { PATTERN_ZONE_OPTIONS } from '../config/patterns';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export default function PatternCoverageControls() {
    const patternZones = useConfiguratorStore((state) => state.patternZones);
    const setPatternZoneEnabled = useConfiguratorStore(
        (state) => state.setPatternZoneEnabled,
    );
    const applyPatternToFullShirt = useConfiguratorStore(
        (state) => state.applyPatternToFullShirt,
    );
    const fullShirtEnabled = PATTERN_ZONE_OPTIONS.every(
        (zone) => patternZones[zone.id],
    );

    return (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-bold text-slate-900">Pattern coverage</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Choose patterned parts</p>
                </div>
                <button
                    type="button"
                    onClick={applyPatternToFullShirt}
                    aria-pressed={fullShirtEnabled}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                        fullShirtEnabled
                            ? 'bg-blue-600 text-white'
                            : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                    }`}
                >
                    Full shirt
                </button>
            </div>

            <div className="space-y-1.5">
                {PATTERN_ZONE_OPTIONS.map((zone) => {
                    const enabled = patternZones[zone.id];

                    return (
                        <button
                            key={zone.id}
                            type="button"
                            onClick={() => setPatternZoneEnabled(zone.id, !enabled)}
                            aria-pressed={enabled}
                            className={`flex min-h-9 w-full items-center justify-between rounded-lg border px-2.5 text-xs font-semibold transition ${
                                enabled
                                    ? 'border-blue-300 bg-white text-blue-800'
                                    : 'border-slate-200 bg-white text-slate-500'
                            }`}
                        >
                            {zone.label}
                            <span
                                className={`grid h-5 w-5 place-items-center rounded-md text-[11px] ${
                                    enabled
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                }`}
                                aria-hidden="true"
                            >
                                {enabled ? '✓' : '—'}
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Choosing a solid zone color automatically turns its pattern off. The collar always uses a solid color.
            </p>
        </div>
    );
}
