import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { CAMERA_VIEWS } from '../config/cameraViews';

const TRANSITION_SECONDS = 0.62;

export default function CameraViewController({ view, requestId, controlsRef }) {
    const camera = useThree((state) => state.camera);
    const invalidate = useThree((state) => state.invalidate);
    const size = useThree((state) => state.size);
    const transition = useRef(null);

    useEffect(() => {
        const preset = CAMERA_VIEWS[view] ?? CAMERA_VIEWS.front;
        const currentTarget = controlsRef.current?.target?.clone() ?? new Vector3(0, -0.05, 0);
        const viewportAspect = Math.max(0.1, size.width / Math.max(1, size.height));
        const narrowViewportMultiplier = Math.max(1, 0.95 / viewportAspect);
        const targetPosition = new Vector3(...preset.position);
        targetPosition.setLength(targetPosition.length() * narrowViewportMultiplier);

        transition.current = {
            elapsed: 0,
            fromPosition: camera.position.clone(),
            toPosition: targetPosition,
            fromTarget: currentTarget,
            toTarget: new Vector3(...preset.target),
        };
        invalidate();
    }, [camera, controlsRef, invalidate, requestId, size.height, size.width, view]);

    useFrame((_, delta) => {
        if (!transition.current) return;

        transition.current.elapsed += Math.min(delta, 0.05);
        const progress = Math.min(transition.current.elapsed / TRANSITION_SECONDS, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(
            transition.current.fromPosition,
            transition.current.toPosition,
            eased,
        );

        if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(
                transition.current.fromTarget,
                transition.current.toTarget,
                eased,
            );
            controlsRef.current.update();
        } else {
            camera.lookAt(transition.current.toTarget);
        }

        if (progress >= 1) {
            transition.current = null;
            return;
        }

        invalidate();
    });

    return null;
}
