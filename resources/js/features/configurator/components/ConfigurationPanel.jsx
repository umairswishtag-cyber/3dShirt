import { useConfiguratorStore } from '../stores/useConfiguratorStore';

function NumberField({ label, value, min, max, step = 1, onChange, suffix }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
            <div className="relative">
                <input
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(event) => onChange(Number(event.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                />
                {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                        {suffix}
                    </span>
                )}
            </div>
        </label>
    );
}

function SliderField({ label, value, min, max, step, displayValue, onPreview }) {
    const beginObjectTransform = useConfiguratorStore((state) => state.beginObjectTransform);
    const commitObjectTransform = useConfiguratorStore((state) => state.commitObjectTransform);

    return (
        <label className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                {label}
                <span className="font-mono font-medium text-slate-400">{displayValue}</span>
            </span>
            <input
                type="range"
                value={value}
                min={min}
                max={max}
                step={step}
                onPointerDown={beginObjectTransform}
                onKeyDown={beginObjectTransform}
                onChange={(event) => onPreview(Number(event.target.value))}
                onPointerUp={commitObjectTransform}
                onPointerCancel={commitObjectTransform}
                onKeyUp={commitObjectTransform}
                onBlur={commitObjectTransform}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
            />
        </label>
    );
}

export default function ConfigurationPanel({ embedded = false }) {
    const product = useConfiguratorStore((state) => state.product);
    const activeDesignAreaId = useConfiguratorStore((state) => state.activeDesignAreaId);
    const selectedObjectId = useConfiguratorStore((state) => state.selectedObjectId);
    const object = useConfiguratorStore((state) =>
        state.designObjects.find((item) => item.id === state.selectedObjectId),
    );
    const areaObjectCount = useConfiguratorStore(
        (state) => state.designObjects.filter((item) => item.areaId === state.activeDesignAreaId).length,
    );
    const updateDesignObject = useConfiguratorStore((state) => state.updateDesignObject);
    const duplicateDesignObject = useConfiguratorStore((state) => state.duplicateDesignObject);
    const removeDesignObject = useConfiguratorStore((state) => state.removeDesignObject);

    const content = !object ? (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold capitalize text-slate-900">{activeDesignAreaId} design</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                    {areaObjectCount === 0
                        ? 'Add an image, then select it to edit its position and appearance.'
                        : `${areaObjectCount} design ${areaObjectCount === 1 ? 'layer' : 'layers'}. Select one in the canvas or Layers panel.`}
                </p>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span>Product</span>
                    <strong className="text-right text-slate-900">{product.name}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span>Print area</span>
                    <strong className="capitalize text-slate-900">{activeDesignAreaId}</strong>
                </div>
                <div className="flex items-center justify-between">
                    <span>Canvas</span>
                    <strong className="text-slate-900">1024 × 1024</strong>
                </div>
            </div>
        </div>
    ) : (
        <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                    <img src={object.source} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{object.name}</p>
                    <p className="text-xs capitalize text-slate-500">{object.areaId} image</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Position X"
                    value={Math.round(object.x * 100)}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(value) =>
                        Number.isFinite(value) &&
                        updateDesignObject(selectedObjectId, { x: Math.max(0, Math.min(1, value / 100)) })
                    }
                />
                <NumberField
                    label="Position Y"
                    value={Math.round(object.y * 100)}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(value) =>
                        Number.isFinite(value) &&
                        updateDesignObject(selectedObjectId, { y: Math.max(0, Math.min(1, value / 100)) })
                    }
                />
            </div>

            <SliderField
                label="Scale"
                value={Math.round(((object.scaleX + object.scaleY) / 2) * 100)}
                min={10}
                max={300}
                step={1}
                displayValue={`${Math.round(((object.scaleX + object.scaleY) / 2) * 100)}%`}
                onPreview={(value) =>
                    updateDesignObject(
                        selectedObjectId,
                        { scaleX: value / 100, scaleY: value / 100 },
                        false,
                    )
                }
            />
            <SliderField
                label="Rotation"
                value={object.rotation}
                min={-180}
                max={180}
                step={1}
                displayValue={`${Math.round(object.rotation)}°`}
                onPreview={(value) =>
                    updateDesignObject(selectedObjectId, { rotation: value }, false)
                }
            />
            <SliderField
                label="Opacity"
                value={Math.round(object.opacity * 100)}
                min={5}
                max={100}
                step={1}
                displayValue={`${Math.round(object.opacity * 100)}%`}
                onPreview={(value) =>
                    updateDesignObject(selectedObjectId, { opacity: value / 100 }, false)
                }
            />

            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => updateDesignObject(selectedObjectId, { flipX: !object.flipX })}
                    className={`min-h-10 rounded-xl border text-xs font-semibold transition ${
                        object.flipX
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Flip horizontal
                </button>
                <button
                    type="button"
                    onClick={() => updateDesignObject(selectedObjectId, { flipY: !object.flipY })}
                    className={`min-h-10 rounded-xl border text-xs font-semibold transition ${
                        object.flipY
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Flip vertical
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={() => duplicateDesignObject(selectedObjectId)}
                    className="min-h-10 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-700"
                >
                    Duplicate
                </button>
                <button
                    type="button"
                    onClick={() => removeDesignObject(selectedObjectId)}
                    className="min-h-10 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                    Delete
                </button>
            </div>
        </div>
    );

    if (embedded) return content;

    return (
        <aside className="hidden min-h-0 w-[320px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 lg:block">
            <div className="mb-5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {object ? 'Image settings' : 'Design details'}
                </p>
                {object && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                        Selected
                    </span>
                )}
            </div>
            {content}
        </aside>
    );
}
