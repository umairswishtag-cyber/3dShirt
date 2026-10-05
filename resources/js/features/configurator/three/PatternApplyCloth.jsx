import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, SRGBColorSpace, Vector3 } from 'three';
import { getPatternImage } from '../canvas/designTextureManager';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

const DURATION = 1.65;
const smooth = (a, b, t) => {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
};

// One temporary, low-resolution sheet; deformation runs in the vertex shader,
// with no cloth solver, CPU vertex updates, extra render pass or texture resize.
export default function PatternApplyCloth({ application, controlsRef }) {
    const mesh = useRef(null);
    const material = useRef(null);
    const run = useRef(null);
    const { camera, gl, invalidate } = useThree();
    const request = useConfiguratorStore((state) => state.patternApplyRequest);
    const product = useConfiguratorStore((state) => state.product);
    const selectedId = useConfiguratorStore((state) => state.selectedPatternId);
    const uniforms = useMemo(() => ({ clothProgress: { value: 0 } }), []);
    const patchMaterial = useMemo(() => (shader) => {
        shader.uniforms.clothProgress = uniforms.clothProgress;
        shader.vertexShader = `uniform float clothProgress;\n${shader.vertexShader}`
            .replace('#include <begin_vertex>', `
                #include <begin_vertex>
                float radius = clamp(length(uv - 0.5) * 1.4142, 0.0, 1.0);
                float pinch = smoothstep(0.04, 0.24, clothProgress);
                float settle = smoothstep(0.67, 1.0, clothProgress);
                // Lift the center first. The perimeter hangs behind it.
                transformed.z += pinch * (0.48 * (1.0 - radius) - 0.3 * radius);
                transformed.y -= pinch * radius * radius * (0.28 + settle * 0.4);
                transformed.z += sin(uv.x * 15.0 + clothProgress * 13.0)
                    * radius * 0.07 * pinch * (1.0 - settle);
                transformed.x *= 1.0 - settle * 0.28;
            `);
    }, [uniforms]);

    useEffect(() => {
        let cancelled = false;
        let texture = null;
        run.current = null;
        if (mesh.current) mesh.current.visible = false;
        application.opacity = 1;

        const pattern = product.patterns?.find((item) => item.id === selectedId);
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!request || request.product !== product || request.patternId !== selectedId || !pattern || reducedMotion) {
            invalidate();
            return;
        }

        application.opacity = 0;
        invalidate();
        const colors = useConfiguratorStore.getState().patternColors[selectedId];
        getPatternImage(pattern, colors).then((image) => {
            if (cancelled || !image || !mesh.current || !material.current) return;
            // SVG intrinsic dimensions can be very large. Only the temporary
            // preview needs this small texture; existing design textures stay intact.
            const preview = document.createElement('canvas');
            preview.width = 512;
            preview.height = 512;
            preview.getContext('2d').drawImage(image, 0, 0, 512, 512);
            texture = new CanvasTexture(preview);
            texture.colorSpace = SRGBColorSpace;
            texture.needsUpdate = true;
            material.current.map = texture;
            material.current.needsUpdate = true;

            const rect = gl.domElement.getBoundingClientRect();
            const target = controlsRef.current?.target ?? new Vector3(0, -0.05, 0);
            const towardCamera = camera.position.clone().sub(target).normalize();
            const end = target.clone().addScaledVector(towardCamera, 0.55);
            const depth = end.clone().project(camera).z;
            // Clamp off-canvas thumbnails to the viewport edge so the incoming
            // cloth remains visible on both desktop sidebars and mobile panels.
            const x = Math.max(-0.88, Math.min(0.88, (request.origin.x - rect.left) / rect.width * 2 - 1));
            const y = Math.max(-0.8, Math.min(0.8, 1 - (request.origin.y - rect.top) / rect.height * 2));
            const start = new Vector3(x, y, depth).unproject(camera);
            const distance = camera.position.distanceTo(end);
            const viewportHeight = 2 * distance * Math.tan(camera.fov * Math.PI / 360);
            const startScale = Math.max(0.3, Math.min(0.9, request.origin.width / rect.width * viewportHeight * camera.aspect / 1.8));
            run.current = { elapsed: 0, start, end, startScale };
            uniforms.clothProgress.value = 0;
            mesh.current.quaternion.copy(camera.quaternion);
            mesh.current.visible = true;
            invalidate();
        }).catch(() => {
            if (cancelled) return;
            // A failed preview must never leave the real garment hidden.
            application.opacity = 1;
            invalidate();
        });

        return () => {
            cancelled = true;
            run.current = null;
            application.opacity = 1;
            if (mesh.current) mesh.current.visible = false;
            if (material.current) material.current.map = null;
            texture?.dispose();
        };
    }, [application, camera, controlsRef, gl, invalidate, product, request, selectedId, uniforms]);

    useFrame((_, delta) => {
        const animation = run.current;
        if (!animation || !mesh.current || !material.current) return;
        animation.elapsed += Math.min(delta, 0.05);
        const t = Math.min(1, animation.elapsed / DURATION);
        const travel = smooth(0.2, 0.74, t);
        mesh.current.position.lerpVectors(animation.start, animation.end, travel);
        mesh.current.position.y += Math.sin(travel * Math.PI) * 0.65;
        mesh.current.quaternion.copy(camera.quaternion);
        const scale = animation.startScale + (1.05 - animation.startScale) * smooth(0, 0.35, t);
        mesh.current.scale.setScalar(scale);
        uniforms.clothProgress.value = t;
        material.current.opacity = 1 - smooth(0.72, 1, t);
        // Reveal the actual UV-bound pattern as the sheet arrives and drapes.
        application.opacity = smooth(0.64, 0.94, t);
        if (t >= 1) {
            mesh.current.visible = false;
            application.opacity = 1;
            run.current = null;
        }
        // Keep the existing demand loop asleep once this finite animation ends.
        invalidate();
    }, -1);

    return (
        <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={15}>
            <planeGeometry args={[1.8, 1.35, 20, 16]} />
            <meshBasicMaterial ref={material} transparent depthWrite={false} side={DoubleSide}
                toneMapped={false} onBeforeCompile={patchMaterial} />
        </mesh>
    );
}
