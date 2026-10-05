export const DEFAULT_CLOTH_MOTION = {
    enabled: false, upper: 0.15, hem: 1, sleeves: 0.5,
    hemHeight: 0.45, damping: 15, meshParts: {},
};

const GROUPS = [
    { id: 'upper', label: 'Upper body / chest', example: 'Chest_Front and Chest_Back', help: 'Light movement for the selected torso parts.' },
    { id: 'hem', label: 'Bottom / hem', example: 'Shirt_Hem or Skirt_Bottom', help: 'Stronger movement near the bottom of the selected parts.' },
    { id: 'sleeves', label: 'Sleeves', example: 'Sleeve_Left and Sleeve_Right', help: 'Both selected sleeves follow the same strength.' },
];

export default function ClothMotionControls({ value, onChange, meshes = [], allowed, errors = {}, preview }) {
    const parts = value.meshParts ?? {};
    const update = (key, next) => onChange({ ...value, [key]: next });
    const assignPart = (group, name, checked) => {
        const next = { ...parts };
        if (checked) next[name] = group;
        else if (next[name] === group) delete next[name];
        update('meshParts', next);
    };
    const connected = meshes.filter((mesh) => GROUPS.some((group) => group.id === parts[mesh.name])).length;

    return (
        <section id="cloth-motion" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Cloth motion</h2>
            {!allowed ? <p className="mt-2 text-sm text-slate-500">Your super admin must grant cloth motion access before you can configure this product. Saved settings are kept while access is disabled.</p> : <>
                <p className="mt-1 text-xs leading-5 text-slate-500">Set a motion strength, then select every GLB part it should control, just like connecting your colors. Selected fabric parts sway, ripple and settle when the garment turns.</p>
                <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={value.enabled} onChange={(e) => update('enabled', e.target.checked)} />Enable cloth sway</label>
                {value.enabled && <div className="mt-3 max-w-2xl">{preview}<p className="mt-2 text-xs text-slate-500">Drag the preview horizontally, then reverse direction to see traveling folds. Faster turns create stronger ripples; loose edges keep moving briefly after you release.</p></div>}

                <fieldset disabled={!value.enabled} className="mt-4 space-y-4 disabled:opacity-50">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><h3 className="text-sm font-black">Motion and model parts</h3><p className="mt-0.5 text-[11px] text-slate-500">Select GLB parts by name for each motion group.</p></div>
                            <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700">{connected}/{meshes.length} parts connected</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {GROUPS.map((group) => {
                                const count = meshes.filter((mesh) => parts[mesh.name] === group.id).length;
                                return <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="grid gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1fr)] sm:items-center">
                                        <div><h4 className="text-xs font-bold">{group.label}</h4><p className="mt-1 text-[11px] text-slate-500">{group.help}</p></div>
                                        <label className="text-xs font-bold"><span className="flex justify-between gap-2"><span>Sway strength</span><span>{Math.round(value[group.id] * 100)}%</span></span>
                                            <input className="mt-2 w-full accent-indigo-600" aria-label={`${group.label} sway strength`} type="range" min="0" max="1" step="0.05" value={value[group.id]} onChange={(e) => update(group.id, Number(e.target.value))} />
                                            <span className="flex justify-between font-normal text-slate-500"><span>Off</span><span>Light</span><span>Strong</span></span>
                                        </label>
                                        <details className="group relative">
                                            <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300">
                                                <span>{count || 'No'} model part{count === 1 ? '' : 's'} selected</span>
                                            </summary>
                                            <div className="absolute right-0 z-30 mt-1 max-h-60 w-full min-w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                                {meshes.length > 0 ? meshes.map((mesh) => {
                                                    const assigned = GROUPS.find((item) => item.id === parts[mesh.name]);
                                                    return <label key={mesh.name} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                                                        <input type="checkbox" aria-label={`${group.label}: ${mesh.name}`} checked={parts[mesh.name] === group.id} onChange={(e) => assignPart(group.id, mesh.name, e.target.checked)} className="mt-0.5 rounded border-slate-300 text-indigo-600" />
                                                        <span className="min-w-0"><span className="block truncate text-[11px] font-bold" title={mesh.name}>{mesh.name}</span>
                                                            {assigned && assigned.id !== group.id && <span className="block text-[10px] text-slate-500">Currently: {assigned.label}. Selecting moves it here.</span>}
                                                        </span>
                                                    </label>;
                                                }) : <p className="p-2 text-xs text-slate-500">Upload the GLB model first.</p>}
                                            </div>
                                        </details>
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-500">Example part names: {group.example}. Choose the actual names from your model.</p>
                                    {count > 0 && <p className="mt-1 break-words text-[11px] font-semibold text-indigo-700">Connected: {meshes.filter((mesh) => parts[mesh.name] === group.id).map((mesh) => mesh.name).join(', ')}</p>}
                                    {group.id === 'hem' && <label className="mt-3 block border-t border-slate-100 pt-3 text-xs font-bold">Moving area: bottom {Math.round(value.hemHeight * 100)}% of the connected hem area
                                        <input aria-label="Hem moving area" className="mt-2 block w-full max-w-sm accent-indigo-600" type="range" min="0.15" max="0.65" step="0.05" value={value.hemHeight} onChange={(e) => update('hemHeight', Number(e.target.value))} />
                                        <span className="mt-1 block text-[11px] font-normal text-slate-500">A larger area lets more fabric sway. Shared attachments stay anchored to keep connected parts together.</span>
                                    </label>}
                                </div>;
                            })}
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-slate-500">Parts without a connection stay still. Each part belongs to one motion group. Color and pattern connections remain independent.</p>
                        {value.enabled && connected === 0 && <p className="mt-2 text-xs font-semibold text-amber-700">Select at least one GLB part to see sway in the preview.</p>}
                    </div>
                    <label className="block max-w-sm text-xs font-bold">Settling feel for connected parts
                        <select className="mt-2 block w-full rounded-lg border-slate-300 text-sm" value={value.damping} onChange={(e) => update('damping', Number(e.target.value))}>
                            <option value={10}>Soft - more overshoot</option><option value={15}>Balanced</option><option value={24}>Firm - less overshoot</option>
                        </select>
                    </label>
                    <p className="rounded-xl bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">Example: connect chest parts at 15%, hem parts at 100%, and both sleeve parts at 50%. Changing sleeves to 25% then affects only the connected sleeve parts.</p>
                    {meshes.length === 1 && <p className="text-xs leading-5 text-slate-500">This GLB contains one combined part. You can connect it to one motion group. Separate chest, hem and sleeve controls need those areas to be separate GLB parts.</p>}
                </fieldset>
            </>}
            {Object.entries(errors).filter(([key]) => key.startsWith('cloth_motion')).map(([key, message]) => <p key={key} className="mt-2 text-xs text-red-600">{message}</p>)}
        </section>
    );
}
