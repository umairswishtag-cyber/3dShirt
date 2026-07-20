import { useMemo, useState } from 'react';
import { Bounds, Center, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Matrix4, Vector3 } from 'three';

const clamp = (value) => Math.max(0, Math.min(1, value));
const clean = (value) => Number(value.toFixed(6));
const cleanVector = (vector) => [clean(vector.x), clean(vector.y), clean(vector.z)];

function cameraViewForNormal(normal) {
    if (Math.abs(normal.x) > Math.abs(normal.z)) return normal.x >= 0 ? 'right' : 'left';
    return normal.z >= 0 ? 'front' : 'back';
}

function screenPoint(event) {
    return { x: clamp((event.pointer.x + 1) / 2), y: clamp((1 - event.pointer.y) / 2) };
}

function rectangleBetween(start, end) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
    };
}

function logoBoundsForPlacement(width, height) {
    const maximum = 0.9;
    const aspect = width / Math.max(height, 0.000001);
    const bounds = aspect >= 1
        ? { width: maximum, height: maximum / aspect }
        : { width: maximum * aspect, height: maximum };

    return {
        x: clean((1 - bounds.width) / 2),
        y: clean((1 - bounds.height) / 2),
        width: clean(bounds.width),
        height: clean(bounds.height),
    };
}

function createSurfaceFrame(event) {
    const mesh = event.object;
    if (!mesh?.isMesh || !event.face?.normal || !event.camera) return null;

    mesh.updateWorldMatrix(true, false);
    event.camera.updateWorldMatrix(true, false);
    const inverseWorld = new Matrix4().copy(mesh.matrixWorld).invert();
    const normal = event.face.normal.clone().normalize();
    const cameraRight = new Vector3()
        .setFromMatrixColumn(event.camera.matrixWorld, 0)
        .transformDirection(inverseWorld)
        .projectOnPlane(normal)
        .normalize();
    if (cameraRight.lengthSq() < 0.000001) return null;

    const cameraUp = new Vector3()
        .setFromMatrixColumn(event.camera.matrixWorld, 1)
        .transformDirection(inverseWorld);
    const vertical = normal.clone().cross(cameraRight).normalize();
    if (vertical.dot(cameraUp) < 0) vertical.negate();

    return {
        mesh,
        start: mesh.worldToLocal(event.point.clone()),
        normal,
        cameraView: cameraViewForNormal(normal.clone().transformDirection(mesh.matrixWorld)),
        horizontal: cameraRight,
        vertical,
    };
}

function placementFromDrag(frame, worldPoint) {
    const current = frame.mesh.worldToLocal(worldPoint.clone());
    const delta = current.clone().sub(frame.start);
    const signedWidth = delta.dot(frame.horizontal);
    const signedHeight = delta.dot(frame.vertical);
    const horizontal = frame.horizontal.clone().multiplyScalar(Math.sign(signedWidth) || 1);
    const vertical = frame.vertical.clone().multiplyScalar(Math.sign(signedHeight) || 1);
    const width = Math.abs(signedWidth);
    const height = Math.abs(signedHeight);
    const origin = frame.start.clone()
        .addScaledVector(frame.horizontal, signedWidth / 2)
        .addScaledVector(frame.vertical, signedHeight / 2);

    return {
        type: 'surface',
        origin: cleanVector(origin),
        uAxis: cleanVector(horizontal),
        vAxis: cleanVector(vertical),
        normal: cleanVector(frame.normal),
        width: clean(width),
        height: clean(height),
    };
}

function relocatePlacement(frame, source, uOffset = 0, vOffset = 0) {
    const origin = frame.start.clone()
        .addScaledVector(frame.horizontal, uOffset)
        .addScaledVector(frame.vertical, vOffset);

    return {
        ...source,
        origin: cleanVector(origin),
        uAxis: cleanVector(frame.horizontal),
        vAxis: cleanVector(frame.vertical),
        normal: cleanVector(frame.normal),
    };
}

function pointsFromRectangle(bounds) {
    if (!bounds) return null;
    return [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height },
    ];
}

function SavedZoneOverlay({ points, label, active = false }) {
    if (!points?.length) return null;
    const pointList = points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ');
    const left = Math.min(...points.map((point) => point.x));
    const top = Math.min(...points.map((point) => point.y));

    return (
        <div className="pointer-events-none absolute inset-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                <polygon points={pointList} fill={active ? 'rgba(232,121,249,.2)' : 'rgba(59,130,246,.12)'} stroke={active ? '#d946ef' : '#2563eb'} strokeWidth="0.35" strokeDasharray="1.1 .8" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className={`absolute -translate-y-full whitespace-nowrap rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow ${active ? 'bg-fuchsia-600' : 'bg-blue-600'}`} style={{ left: `${left * 100}%`, top: `${top * 100}%` }}>
                {label}
            </span>
        </div>
    );
}

function ProjectSavedZone({ scene, binding, placement, onProject }) {
    useFrame(({ camera }) => {
        if (!placement || placement.type !== 'surface') {
            onProject(null);
            return;
        }
        const mesh = scene.getObjectByName(binding.meshName);
        if (!mesh?.isMesh) return;
        const origin = new Vector3().fromArray(placement.origin);
        const horizontal = new Vector3().fromArray(placement.uAxis);
        const vertical = new Vector3().fromArray(placement.vAxis);
        const halfWidth = placement.width / 2;
        const halfHeight = placement.height / 2;
        const corners = [[-halfWidth, halfHeight], [halfWidth, halfHeight], [halfWidth, -halfHeight], [-halfWidth, -halfHeight]];
        const points = corners.map(([u, v]) => {
            const local = origin.clone().addScaledVector(horizontal, u).addScaledVector(vertical, v);
            const projected = mesh.localToWorld(local).project(camera);
            return { x: clamp((projected.x + 1) / 2), y: clamp((1 - projected.y) / 2) };
        });

        onProject((current) => {
            const unchanged = current?.length === points.length
                && current.every((point, index) => Math.abs(point.x - points[index].x) < 0.0005 && Math.abs(point.y - points[index].y) < 0.0005);
            return unchanged ? current : points;
        });
    });
    return null;
}

export default function LogoPlacementEditor({ scene, area, binding, zones = [], onChange }) {
    const [interactionMode, setInteractionMode] = useState(null);
    const [drag, setDrag] = useState(null);
    const [message, setMessage] = useState(null);
    const [projectedZones, setProjectedZones] = useState({});
    const placement = binding.logoPlacement ?? null;
    const activePlacement = drag?.mode === 'move' ? drag.placement : placement;
    const dragBounds = drag?.mode === 'draw' && drag.screenStart && drag.screenCurrent
        ? rectangleBetween(drag.screenStart, drag.screenCurrent)
        : null;
    const ratioLabel = useMemo(() => {
        if (!placement?.width || !placement?.height) return 'No zone drawn';
        const ratio = placement.width / placement.height;
        return ratio >= 1 ? `${ratio.toFixed(1)}:1 landscape` : `1:${(1 / ratio).toFixed(1)} portrait`;
    }, [placement]);

    const updateProjectedZone = (zoneId, update) => {
        setProjectedZones((current) => {
            const previous = current[zoneId] ?? null;
            const next = typeof update === 'function' ? update(previous) : update;
            if (next === previous) return current;
            const result = { ...current };
            if (next) result[zoneId] = next;
            else delete result[zoneId];
            return result;
        });
    };

    const beginInteraction = (event) => {
        if (!interactionMode) return;
        if (event.object?.name !== binding.meshName) {
            setMessage(`Use the selected ${binding.meshName} mesh for ${area.label}.`);
            return;
        }
        const frame = createSurfaceFrame(event);
        if (!frame) {
            setMessage('This surface could not be sampled. Rotate the model slightly and try again.');
            return;
        }

        event.stopPropagation();
        setMessage(null);
        if (interactionMode === 'move' && placement) {
            const offset = new Vector3().fromArray(placement.origin).sub(frame.start);
            setDrag({
                mode: 'move',
                placement,
                cameraView: frame.cameraView,
                uOffset: offset.dot(new Vector3().fromArray(placement.uAxis)),
                vOffset: offset.dot(new Vector3().fromArray(placement.vAxis)),
            });
            return;
        }

        const pointer = screenPoint(event);
        setDrag({ mode: 'draw', frame, placement: null, screenStart: pointer, screenCurrent: pointer });
    };

    const continueInteraction = (event) => {
        if (!interactionMode || !drag || event.object?.name !== binding.meshName) return;
        event.stopPropagation();
        if (drag.mode === 'move') {
            const frame = createSurfaceFrame(event);
            if (!frame) return;
            setDrag((current) => current?.mode === 'move' ? ({
                ...current,
                placement: relocatePlacement(frame, placement, current.uOffset, current.vOffset),
                cameraView: frame.cameraView,
            }) : current);
            return;
        }

        const worldPoint = event.point.clone();
        const pointer = screenPoint(event);
        setDrag((current) => current?.mode === 'draw' ? ({
            ...current,
            placement: placementFromDrag(current.frame, worldPoint),
            screenCurrent: pointer,
        }) : current);
    };

    const finishInteraction = (event) => {
        if (!interactionMode || !drag) return;
        event.stopPropagation();
        let nextPlacement = drag.placement;
        let cameraView = drag.cameraView ?? drag.frame?.cameraView;
        if (drag.mode === 'draw' && event.object?.name === binding.meshName) {
            nextPlacement = placementFromDrag(drag.frame, event.point);
        } else if (drag.mode === 'move' && event.object?.name === binding.meshName) {
            const frame = createSurfaceFrame(event);
            if (frame) {
                nextPlacement = relocatePlacement(frame, placement, drag.uOffset, drag.vOffset);
                cameraView = frame.cameraView;
            }
        }

        if (!nextPlacement || nextPlacement.width < 0.001 || nextPlacement.height < 0.001) {
            setMessage('Draw a larger rectangle so customers have room to place a logo.');
            setDrag(null);
            return;
        }

        onChange({
            logoPlacement: nextPlacement,
            logoBounds: logoBoundsForPlacement(nextPlacement.width, nextPlacement.height),
            cameraView,
        });
        setDrag(null);
        setInteractionMode(null);
        setMessage(drag.mode === 'move' ? 'Logo zone moved. Save the product to publish its new position.' : 'Logo-safe zone updated. Save the product to publish this placement.');
    };

    return (
        <div className="mt-4 overflow-hidden rounded-2xl border border-fuchsia-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fuchsia-100 px-4 py-3">
                <div>
                    <p className="text-sm font-black text-slate-900">Edit {area.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">The active zone is purple; every other saved logo zone is blue.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setInteractionMode((mode) => mode === 'draw' ? null : 'draw'); setDrag(null); setMessage(null); }} className={`rounded-xl px-3 py-2 text-xs font-black ${interactionMode === 'draw' ? 'bg-amber-500 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'}`}>
                        {interactionMode === 'draw' ? 'Cancel drawing' : placement ? 'Redraw shape' : 'Draw shape'}
                    </button>
                    {placement && <button type="button" onClick={() => { setInteractionMode((mode) => mode === 'move' ? null : 'move'); setDrag(null); setMessage(null); }} className={`rounded-xl border px-3 py-2 text-xs font-black ${interactionMode === 'move' ? 'border-amber-500 bg-amber-500 text-white' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>{interactionMode === 'move' ? 'Cancel moving' : 'Move zone'}</button>}
                    {placement && <button type="button" onClick={() => onChange({ logoPlacement: null, logoBounds: null, cameraView: null })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Clear zone</button>}
                </div>
            </div>

            <div className={`relative aspect-[1.8] min-h-72 overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f5f3ff_55%,#ede9fe_100%)] ${interactionMode ? 'cursor-crosshair' : 'cursor-grab'}`}>
                <Canvas camera={{ position: [3, 2, 4], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                    <hemisphereLight intensity={2.2} groundColor="#c4b5fd" />
                    <directionalLight position={[4, 6, 5]} intensity={2.5} />
                    <directionalLight position={[-4, 2, -3]} intensity={1.1} color="#ddd6fe" />
                    <Bounds fit clip observe margin={1.18}><Center><primitive object={scene} onPointerDown={beginInteraction} onPointerMove={continueInteraction} onPointerUp={finishInteraction} /></Center></Bounds>
                    {zones.filter((zone) => zone.binding.logoPlacement).map((zone) => <ProjectSavedZone key={zone.id} scene={scene} binding={zone.binding} placement={zone.id === area.id ? activePlacement : zone.binding.logoPlacement} onProject={(update) => updateProjectedZone(zone.id, update)} />)}
                    <OrbitControls makeDefault enabled={!interactionMode} enablePan={false} minDistance={0.5} maxDistance={20} />
                </Canvas>
                {zones.filter((zone) => projectedZones[zone.id] && !(zone.id === area.id && dragBounds)).map((zone) => <SavedZoneOverlay key={zone.id} points={projectedZones[zone.id]} label={zone.label} active={zone.id === area.id} />)}
                {dragBounds && <SavedZoneOverlay points={pointsFromRectangle(dragBounds)} label={area.label} active />}
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow backdrop-blur ${interactionMode ? 'bg-amber-500 text-white' : 'bg-slate-950/80 text-white'}`}>
                        {interactionMode === 'draw' ? 'Drag to draw the new shape' : interactionMode === 'move' ? 'Drag the zone to a new surface position' : 'Drag model to rotate · scroll to zoom'}
                    </span>
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-fuchsia-700 shadow backdrop-blur">{ratioLabel}</span>
                </div>
            </div>

            <div className="border-t border-fuchsia-100 bg-fuchsia-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
                {message ?? 'Add Logo 1, Logo 2, Logo 3, or more. Each zone keeps its own mesh, shape, position, orientation, and storefront placement.'}
            </div>
        </div>
    );
}
