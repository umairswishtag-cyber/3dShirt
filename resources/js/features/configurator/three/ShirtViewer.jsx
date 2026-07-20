import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
    ContactShadows,
    Html,
    OrbitControls,
    PerspectiveCamera,
} from '@react-three/drei';
import { CAMERA_VIEWS } from '../config/cameraViews';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import CameraViewController from './CameraViewController';
import ShirtModel from './ShirtModel';
import ViewerErrorBoundary from './ViewerErrorBoundary';
import ViewerLights from './ViewerLights';

function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(
            window.WebGL2RenderingContext && canvas.getContext('webgl2'),
        );
    } catch {
        return false;
    }
}

function Scene() {
    const controlsRef = useRef(null);
    const cameraView = useConfiguratorStore((state) => state.cameraView);
    const cameraRequestId = useConfiguratorStore((state) => state.cameraRequestId);

    return (
        <>
            <PerspectiveCamera makeDefault position={CAMERA_VIEWS.front.position} fov={34} near={0.1} far={100} />
            <CameraViewController
                view={cameraView}
                requestId={cameraRequestId}
                controlsRef={controlsRef}
            />
            <ViewerLights />
            <Suspense
                fallback={
                    <Html center>
                        <div className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg">
                            Loading shirt…
                        </div>
                    </Html>
                }
            >
                <ShirtModel />
            </Suspense>
            <ContactShadows
                position={[0, 0, 0]}
                opacity={0.24}
                scale={5}
                blur={2.5}
                far={4}
                frames={1}
            />
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enableDamping
                dampingFactor={0.08}
                enablePan
                screenSpacePanning
                minDistance={3.2}
                maxDistance={26}
                minPolarAngle={Math.PI * 0.2}
                maxPolarAngle={Math.PI * 0.8}
                target={[0, -0.05, 0]}
            />
        </>
    );
}

export default function ShirtViewer() {
    const cameraView = useConfiguratorStore((state) => state.cameraView);
    const setCameraView = useConfiguratorStore((state) => state.setCameraView);

    if (!supportsWebGL()) {
        return (
            <div className="grid h-full min-h-80 place-items-center bg-slate-100 p-6 text-center">
                <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                    <p className="font-bold text-slate-900">WebGL 2 is unavailable</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Enable hardware acceleration or open the configurator in a current browser.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ViewerErrorBoundary>
            <div className="relative h-full min-h-80 w-full bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#eef2f7_50%,#dbe3ed_100%)]">
                <Canvas
                    frameloop="demand"
                    dpr={[1, 1.5]}
                    shadows
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                >
                    <Scene />
                </Canvas>

                <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-white/70 bg-white/90 p-1 shadow-lg backdrop-blur md:right-5 md:top-5">
                    {Object.entries(CAMERA_VIEWS).map(([viewId, view]) => (
                        <button
                            key={viewId}
                            type="button"
                            onClick={() => setCameraView(viewId)}
                            className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                cameraView === viewId
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                            }`}
                            aria-pressed={cameraView === viewId}
                        >
                            {view.label}
                        </button>
                    ))}
                    <div className="my-0.5 h-px bg-slate-200" />
                    <button
                        type="button"
                        onClick={() => setCameraView('front')}
                        className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Reset
                    </button>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-slate-900/75 px-3 py-1.5 text-[11px] font-medium text-white shadow backdrop-blur lg:bottom-auto lg:left-5 lg:top-5 lg:translate-x-0">
                    Drag to rotate · scroll or pinch to zoom
                </div>
            </div>
        </ViewerErrorBoundary>
    );
}
