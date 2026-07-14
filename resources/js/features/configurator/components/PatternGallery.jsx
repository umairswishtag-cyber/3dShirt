import { useEffect, useState } from 'react';
import { createPatternSvgSource } from '../config/patterns';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import PatternColorControls from './PatternColorControls';
import PatternCoverageControls from './PatternCoverageControls';

function PatternThumbnail({ pattern }) {
    const [source, setSource] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        let objectUrl = null;

        fetch(pattern.assetUrl)
            .then((response) => {
                if (!response.ok) throw new Error('Pattern asset unavailable');
                return response.text();
            })
            .then((svg) => {
                if (!active) return;
                const blob = new Blob(
                    [createPatternSvgSource(svg, pattern)],
                    { type: 'image/svg+xml' },
                );
                objectUrl = URL.createObjectURL(blob);
                setSource(objectUrl);
                setFailed(false);
            })
            .catch(() => {
                if (!active) return;
                setSource(null);
                setFailed(true);
            });

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [pattern]);

    if (failed) {
        return (
            <span className="grid h-full w-full place-items-center bg-red-50 px-2 text-center text-[10px] font-semibold text-red-600">
                Preview unavailable
            </span>
        );
    }

    return source ? (
        <img src={source} alt="" className="h-full w-full object-cover" />
    ) : (
        <span className="block h-full w-full animate-pulse bg-slate-200" />
    );
}

export default function PatternGallery() {
    const patterns = useConfiguratorStore((state) => state.product.patterns ?? []);
    const selectedPatternId = useConfiguratorStore((state) => state.selectedPatternId);
    const setPattern = useConfiguratorStore((state) => state.setPattern);

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Style patterns
                </p>
                {selectedPatternId && (
                    <button
                        type="button"
                        onClick={() => setPattern(null)}
                        className="text-[11px] font-bold text-slate-500 underline hover:text-slate-900"
                    >
                        Remove
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {patterns.map((pattern) => (
                    <button
                        key={pattern.id}
                        type="button"
                        onClick={() => setPattern(pattern.id)}
                        aria-pressed={selectedPatternId === pattern.id}
                        className={`overflow-hidden rounded-xl border bg-white text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            selectedPatternId === pattern.id
                                ? 'border-blue-500 ring-2 ring-blue-100'
                                : 'border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        <div className="aspect-[1.5] overflow-hidden bg-slate-100">
                            <PatternThumbnail pattern={pattern} />
                        </div>
                        <span className="block truncate px-2 py-2 text-center text-[11px] font-semibold text-slate-700">
                            {pattern.name}
                        </span>
                    </button>
                ))}
            </div>

            {patterns.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                    No active patterns are assigned to this product.
                </p>
            )}

            <p className="mt-3 text-xs leading-5 text-slate-500">
                A selected pattern is applied across the front, back, and both sleeves.
            </p>

            {selectedPatternId && (
                <div className="mt-4">
                    <PatternColorControls />
                    <PatternCoverageControls />
                </div>
            )}
        </div>
    );
}
