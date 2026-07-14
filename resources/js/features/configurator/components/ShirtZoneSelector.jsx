import { SHIRT_ZONES } from '../config/shirtZones';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

export default function ShirtZoneSelector() {
    const activeShirtZoneId = useConfiguratorStore((state) => state.activeShirtZoneId);
    const shirtColors = useConfiguratorStore((state) => state.shirtColors);
    const setActiveShirtZone = useConfiguratorStore((state) => state.setActiveShirtZone);

    return (
        <div className="grid grid-cols-2 gap-2">
            {SHIRT_ZONES.map((zone) => (
                <button
                    key={zone.id}
                    type="button"
                    onClick={() => setActiveShirtZone(zone.id)}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        activeShirtZoneId === zone.id
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                    aria-pressed={activeShirtZoneId === zone.id}
                >
                    <span
                        className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: shirtColors[zone.id] }}
                    />
                    {zone.label}
                </button>
            ))}
        </div>
    );
}

