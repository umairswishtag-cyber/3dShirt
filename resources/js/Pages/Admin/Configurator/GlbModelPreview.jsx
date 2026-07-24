import { Component, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import UiIcon from '@/Components/UiIcon';
import {
    applyModelPreviewColors,
    parseModelColorConfiguration,
    prepareModelPreviewMaterials,
} from './modelPreviewMaterials';

export default function GlbModelPreview({ modelFile, modelUrl, colorZones = [], meshZones = {}, compact = false }) {
    const [state, setState] = useState({ status: modelFile || modelUrl ? 'loading' : 'empty', scene: null });
    const parsedColorZones = useMemo(() => {
        const parsed = parseModelColorConfiguration(colorZones, []);
        return Array.isArray(parsed) ? parsed : [];
    }, [colorZones]);
    const parsedMeshZones = useMemo(() => {
        const parsed = parseModelColorConfiguration(meshZones, {});
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }, [meshZones]);

    useEffect(() => {
        let active = true;
        let loadedScene = null;

        if (!modelFile && !modelUrl) {
            setState({ status: 'empty', scene: null });
            return () => {};
        }

        setState({ status: 'loading', scene: null });
        const loader = new GLTFLoader();

        const load = async () => {
            try {
                const gltf = modelFile
                    ? await new Promise(async (resolve, reject) => {
                        try {
                            const buffer = await modelFile.arrayBuffer();
                            loader.parse(buffer, '', resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    })
                    : await loader.loadAsync(modelUrl);

                loadedScene = gltf.scene;
                prepareModelPreviewMaterials(loadedScene);
                if (!active) {
                    disposeScene(loadedScene);
                    return;
                }
                setState({ status: 'ready', scene: loadedScene });
            } catch {
                if (active) setState({ status: 'failed', scene: null });
            }
        };

        load();
        return () => {
            active = false;
            if (loadedScene) disposeScene(loadedScene);
        };
    }, [modelFile, modelUrl]);

    useEffect(() => {
        if (state.status !== 'ready' || !state.scene) return;
        applyModelPreviewColors(state.scene, parsedColorZones, parsedMeshZones);
    }, [parsedColorZones, parsedMeshZones, state.scene, state.status]);

    return (
        <div className={`relative overflow-hidden border border-indigo-100 bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#eef2ff_55%,#e0e7ff_100%)] shadow-inner ${compact ? 'h-24 rounded-lg' : 'mt-3 aspect-[1.5] min-h-48 rounded-2xl'}`}>
            {state.status === 'ready' && state.scene && (
                <PreviewErrorBoundary fallback={<PreviewFailed compact={compact} />}>
                    <Canvas camera={{ position: [3, 2, 4], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
                        <hemisphereLight intensity={2.2} groundColor="#c7d2fe" />
                        <directionalLight position={[4, 6, 5]} intensity={2.6} />
                        <directionalLight position={[-4, 2, -3]} intensity={1.2} color="#c4b5fd" />
                        <Bounds fit clip observe margin={1.22}>
                            <Center><primitive object={state.scene} /></Center>
                        </Bounds>
                        <OrbitControls makeDefault autoRotate autoRotateSpeed={1.15} enablePan={false} minDistance={0.5} maxDistance={20} />
                    </Canvas>
                </PreviewErrorBoundary>
            )}

            {state.status === 'empty' && <PreviewState compact={compact} icon="products" title="3D preview" description="Choose a GLB model to preview it here." />}
            {state.status === 'loading' && <PreviewState compact={compact} loading icon="sparkles" title="Preparing 3D preview" description="Reading model geometry and materials…" />}
            {state.status === 'failed' && <PreviewFailed compact={compact} />}

            {state.status === 'ready' && <div className={`pointer-events-none absolute flex items-center justify-between gap-2 ${compact ? 'inset-x-2 bottom-2' : 'inset-x-3 bottom-3'}`}><span className={`inline-flex items-center gap-1 rounded-full bg-slate-950/80 font-black uppercase text-white shadow-lg backdrop-blur ${compact ? 'px-2 py-1 text-[7px]' : 'px-2.5 py-1.5 text-[9px] tracking-wider'}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />3D preview</span>{!compact && <span className="rounded-full bg-white/90 px-2.5 py-1.5 text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur">Drag to rotate · Scroll to zoom</span>}</div>}
        </div>
    );
}

function PreviewState({ icon, title, description, loading = false, compact = false }) {
    return <div className={`absolute inset-0 grid place-items-center text-center ${compact ? 'p-2' : 'p-6'}`}><div><span className={`mx-auto grid place-items-center bg-white text-indigo-600 shadow-md ${compact ? 'h-8 w-8 rounded-lg' : 'h-12 w-12 rounded-2xl'} ${loading ? 'animate-pulse' : ''}`}><UiIcon name={icon} className={compact ? 'h-4 w-4' : 'h-6 w-6'} /></span><p className={`${compact ? 'mt-1 text-[9px]' : 'mt-3 text-sm'} font-black text-slate-800`}>{title}</p>{!compact && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div></div>;
}

function PreviewFailed({ compact = false }) {
    return <PreviewState compact={compact} icon="draft" title="Preview unavailable" description="Check that this is a valid binary GLB file." />;
}

class PreviewErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

function disposeScene(scene) {
    scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
            Object.values(material ?? {}).forEach((value) => value?.isTexture && value.dispose?.());
            material?.dispose?.();
        });
    });
}
