import { SHIRT_COLOR_PALETTE, SHIRT_ZONES } from '../config/shirtZones';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import ShirtZoneSelector from './ShirtZoneSelector';
import PatternColorControls from './PatternColorControls';

export default function ColorPalette() {
    const product = useConfiguratorStore((state) => state.product);
    const activeShirtZoneId = useConfiguratorStore((state) => state.activeShirtZoneId);
    const color = useConfiguratorStore((state) => state.shirtColors[state.activeShirtZoneId]);
    const setShirtZoneColor = useConfiguratorStore((state) => state.setShirtZoneColor);
    const activeZone = product.colorZoneOptions?.find((zone) => zone.id === activeShirtZoneId)
        ?? SHIRT_ZONES.find((zone) => zone.id === activeShirtZoneId);
    const palette = product.allowedColors?.length
        ? product.allowedColors.map((value) => ({ name: value, value }))
        : SHIRT_COLOR_PALETTE;

    return (
        <div className="space-y-5">
            {product.capabilities.patterns && <PatternColorControls />}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Shirt zone
                </p>
                <ShirtZoneSelector />
            </div>
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {activeZone?.label} color
                    </p>
                    <span className="font-mono text-xs text-slate-500">{color}</span>
                </div>
                <div className="grid grid-cols-10 gap-1.5 lg:grid-cols-5 lg:gap-2">
                    {palette.map((swatch) => (
                        <button
                            key={swatch.value}
                            type="button"
                            title={swatch.name}
                            aria-label={`${swatch.name} ${activeZone?.label}`}
                            aria-pressed={color === swatch.value}
                            onClick={() => setShirtZoneColor(activeShirtZoneId, swatch.value)}
                            className={`aspect-square rounded-full border-2 shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                color === swatch.value
                                    ? 'border-blue-500 ring-2 ring-blue-200 ring-offset-2'
                                    : 'border-white'
                            }`}
                            style={{ backgroundColor: swatch.value }}
                        />
                    ))}
                </div>
                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300">
                    Custom color
                    <input
                        type="color"
                        value={color}
                        onChange={(event) =>
                            setShirtZoneColor(activeShirtZoneId, event.target.value.toUpperCase())
                        }
                        className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                </label>
            </div>
        </div>
    );
}
