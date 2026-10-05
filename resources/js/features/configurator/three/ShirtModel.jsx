import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, CanvasTexture, Float32BufferAttribute, FrontSide, Matrix4, SRGBColorSpace, Vector3 } from 'three';
import { useDesignTexture } from '../hooks/useDesignTexture';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { registerModelExporter } from './modelExportRegistry';
import PatternApplyCloth from './PatternApplyCloth';
import DressMotionController from './DressMotionController';

function cloneModelScene(scene) {
    const clone = scene.clone(true);

    clone.traverse((node) => {
        if (!node.isMesh) return;

        node.geometry = node.geometry.clone();

        node.material = Array.isArray(node.material)
            ? node.material.map((material) => material.clone())
            : node.material.clone();
        // Product parts must not cast shadows onto each other. On caps and
        // layered garments self-shadowing creates a dark band from top angles.
        node.castShadow = false;
        node.receiveShadow = false;
    });

    return clone;
}

function setMaterialColor(material, color) {
    const materials = Array.isArray(material) ? material : [material];

    materials.forEach((item) => {
        item.color?.set(color);
        item.metalness = 0;
        item.roughness = 0.86;
        item.needsUpdate = true;
    });
}

function configurePrintTexture(texture, uvBounds) {
    const width = uvBounds.max[0] - uvBounds.min[0];
    const height = uvBounds.max[1] - uvBounds.min[1];

    texture.repeat.set(1 / width, 1 / height);
    texture.offset.set(-uvBounds.min[0] / width, -uvBounds.min[1] / height);
    texture.needsUpdate = true;
}

function addProjectedUvs(geometry, projection) {
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uvs = new Float32Array(position.count * 2);
    const size = bounds.getSize(new Vector3());
    const span = (axis) => Math.max(size[axis], 0.000001);
    const normalized = (axis, value) => (value - bounds.min[axis]) / span(axis);
    const writeUv = (index, uAxis, vAxis, flipU = false) => {
        const u = normalized(uAxis, position[`get${uAxis.toUpperCase()}`](index));
        const v = normalized(vAxis, position[`get${vAxis.toUpperCase()}`](index));
        uvs[index * 2] = flipU ? 1 - u : u;
        uvs[index * 2 + 1] = v;
    };

    for (let index = 0; index < position.count; index += 3) {
        let axis = projection.axis;
        let direction = projection.direction ?? 1;
        if (projection.type === 'box') {
            const average = {
                x: (normal.getX(index) + normal.getX(index + 1) + normal.getX(index + 2)) / 3,
                y: (normal.getY(index) + normal.getY(index + 1) + normal.getY(index + 2)) / 3,
                z: (normal.getZ(index) + normal.getZ(index + 1) + normal.getZ(index + 2)) / 3,
            };
            axis = Object.keys(average).sort((left, right) => Math.abs(average[right]) - Math.abs(average[left]))[0];
            direction = Math.sign(average[axis]) || 1;
        }
        const [uAxis, vAxis] = axis === 'x' ? ['z', 'y'] : axis === 'y' ? ['x', 'z'] : ['x', 'y'];
        for (let vertex = index; vertex < index + 3; vertex += 1) {
            writeUv(vertex, uAxis, vAxis, direction < 0);
        }
    }

    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
}

function addSurfacePlacementUvs(geometry, placement, logoBounds) {
    const position = geometry.getAttribute('position');
    const uvs = new Float32Array(position.count * 2);
    const origin = new Vector3().fromArray(placement.origin);
    const horizontal = new Vector3().fromArray(placement.uAxis).normalize();
    const vertical = new Vector3().fromArray(placement.vAxis).normalize();
    const point = new Vector3();
    const relative = new Vector3();
    const bounds = logoBounds ?? { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

    for (let index = 0; index < position.count; index += 1) {
        point.fromBufferAttribute(position, index);
        relative.copy(point).sub(origin);
        const u = relative.dot(horizontal) / Math.max(placement.width, 0.000001) + 0.5;
        const v = relative.dot(vertical) / Math.max(placement.height, 0.000001) + 0.5;

        // Canvas pixels start at the upper-left while WebGL UVs start at the
        // lower-left. Invert V so the 3D artwork matches the 2D editor.
        uvs[index * 2] = bounds.x + u * bounds.width;
        uvs[index * 2 + 1] = bounds.y + (1 - v) * bounds.height;
    }

    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
}

function createOutwardPrintGeometry(sourceGeometry, binding, matrixWorld) {
    const projection = binding.projection;
    const placement = binding.logoPlacement;
    const geometry = (projection || placement) && sourceGeometry.index
        ? sourceGeometry.toNonIndexed()
        : sourceGeometry.clone();
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const sourceIndex = geometry.getIndex();
    const indices = sourceIndex
        ? Array.from(sourceIndex.array)
        : Array.from({ length: position.count }, (_, index) => index);
    const filteredIndices = [];
    const minimumFacing = 0.25;
    const placementNormal = placement ? new Vector3().fromArray(placement.normal).normalize() : null;

    for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index];
        const b = indices[index + 1];
        const c = indices[index + 2];
        const projectionAxis = projection?.axis;
        const averageProjectionNormal = projectionAxis
            ? (normal[`get${projectionAxis.toUpperCase()}`](a) + normal[`get${projectionAxis.toUpperCase()}`](b) + normal[`get${projectionAxis.toUpperCase()}`](c)) / 3
            : null;
        const averageNormalZ = (normal.getZ(a) + normal.getZ(b) + normal.getZ(c)) / 3;
        const averageNormal = placement
            ? new Vector3(
                (normal.getX(a) + normal.getX(b) + normal.getX(c)) / 3,
                (normal.getY(a) + normal.getY(b) + normal.getY(c)) / 3,
                (normal.getZ(a) + normal.getZ(b) + normal.getZ(c)) / 3,
            ).normalize()
            : null;

        if (
            (placement && averageNormal.dot(placementNormal) > 0.05) ||
            (!placement && projection?.type === 'box') ||
            (projection?.type === 'planar' && averageProjectionNormal * projection.direction > minimumFacing) ||
            (!placement && !projection && (binding.outwardNormalZ === null || averageNormalZ * binding.outwardNormalZ > minimumFacing))
        ) {
            filteredIndices.push(a, b, c);
        }
    }

    geometry.setIndex(filteredIndices);
    geometry.clearGroups();
    if (placement) addSurfacePlacementUvs(geometry, placement, binding.logoBounds);
    else if (projection) addProjectedUvs(geometry, projection);

    // Keep the exact source positions: an offset along the original normal can
    // end up underneath a moving fold. Polygon offset handles depth separation.
    geometry.applyMatrix4(matrixWorld);
    geometry.computeBoundingSphere();

    return geometry;
}

function useDressMaterial(materialRef, motion, bounds, meshName, geometry) {
    useEffect(() => {
        const material = materialRef.current;
        if (!motion || !bounds || !material) return;
        // The overlay retains the source mesh positions in model space, so its
        // bounds match that GLB part even when only some triangles are printed.
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        motion.attachments?.bind(geometry, new Matrix4());
        // These overlay geometries are already baked into model coordinates.
        motion.bindMaterial(material, new Matrix4(), bounds.getCenter(new Vector3()),
            bounds.max.y - bounds.min.y, bounds.min.y, motion.meshParts[meshName] ?? 'none',
            motion.partBounds.get(meshName) ?? geometry.boundingBox, bounds.max.x - bounds.min.x);
        return () => motion.unbindMaterial(material);
    }, [materialRef, motion, bounds, meshName, geometry]);
}

function PrintSurface({
    geometry,
    texture,
    uvBounds,
    name,
    renderOrder,
    isArtworkLayer = false,
    application = null,
    motion = null,
    motionBounds = null,
    meshName = null,
}) {
    const materialRef = useRef(null);
    useDressMaterial(materialRef, motion, motionBounds, meshName, geometry);
    useFrame(() => {
        if (materialRef.current && application) materialRef.current.opacity = application.opacity;
    });
    useEffect(() => {
        configurePrintTexture(texture, uvBounds);
    }, [texture, uvBounds]);

    return (
        <mesh name={name} geometry={geometry} renderOrder={renderOrder}>
            <meshBasicMaterial
                ref={materialRef}
                map={texture}
                transparent
                alphaTest={0.01}
                depthWrite={false}
                depthTest
                polygonOffset
                polygonOffsetFactor={isArtworkLayer ? -8 : -4}
                polygonOffsetUnits={isArtworkLayer ? -8 : -4}
                side={FrontSide}
                toneMapped={false}
            />
        </mesh>
    );
}

function LogoZoneGuide({ geometry, logoBounds, motion, motionBounds, meshName }) {
    const materialRef = useRef(null);
    useDressMaterial(materialRef, motion, motionBounds, meshName, geometry);
    const texture = useMemo(() => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const bounds = logoBounds ?? { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
        context.strokeStyle = '#2563eb';
        context.lineWidth = 8;
        context.setLineDash([18, 12]);
        context.strokeRect(
            bounds.x * size + 4,
            bounds.y * size + 4,
            bounds.width * size - 8,
            bounds.height * size - 8,
        );
        const nextTexture = new CanvasTexture(canvas);
        nextTexture.colorSpace = SRGBColorSpace;
        nextTexture.flipY = false;
        nextTexture.needsUpdate = true;
        return nextTexture;
    }, [logoBounds]);

    useEffect(() => () => texture.dispose(), [texture]);

    return (
        <mesh name="active_logo_zone_guide" geometry={geometry} renderOrder={20}>
            <meshBasicMaterial
                ref={materialRef}
                map={texture}
                transparent
                alphaTest={0.01}
                depthWrite={false}
                depthTest
                polygonOffset
                polygonOffsetFactor={-10}
                polygonOffsetUnits={-10}
                side={FrontSide}
                toneMapped={false}
            />
        </mesh>
    );
}

function BoundPrintSurface({ areaId, binding, geometries, application, motion, motionBounds }) {
    const patternTexture = useDesignTexture(areaId, 'pattern');
    const artworkTexture = useDesignTexture(areaId, 'logos');
    const hasPattern = useConfiguratorStore(
        (state) => Boolean(state.patternZones[areaId] && state.selectedPatternId),
    );
    const hasArtwork = useConfiguratorStore(
        (state) => state.designObjects.some(
            (object) => object.areaId === areaId && object.type === 'image',
        ),
    );
    const isActiveLogoArea = useConfiguratorStore(
        (state) => state.isLogoAreaEditing && state.activeDesignAreaId === areaId,
    );

    return (
        <>
            {hasPattern && geometries.pattern && (
                <PrintSurface
                    name={`pattern_${areaId}`}
                    geometry={geometries.pattern}
                    texture={patternTexture}
                    uvBounds={binding.uvBounds}
                    renderOrder={2}
                    application={application}
                    motion={motion}
                    motionBounds={motionBounds}
                    meshName={binding.meshName}
                />
            )}
            {hasArtwork && geometries.artwork && (
                <PrintSurface
                    name={`artwork_${areaId}`}
                    geometry={geometries.artwork}
                    texture={artworkTexture}
                    uvBounds={binding.logoPlacement ? { min: [0, 0], max: [1, 1] } : binding.uvBounds}
                    renderOrder={10}
                    isArtworkLayer
                    motion={motion}
                    motionBounds={motionBounds}
                    meshName={binding.meshName}
                />
            )}
            {isActiveLogoArea && binding.logoPlacement && geometries.artwork && (
                <LogoZoneGuide geometry={geometries.artwork} logoBounds={binding.logoBounds}
                    motion={motion} motionBounds={motionBounds} meshName={binding.meshName} />
            )}
        </>
    );
}

export default function ShirtModel({ controlsRef, interactionRef }) {
    const exportGroupRef = useRef(null);
    const application = useMemo(() => ({ opacity: 1 }), []);
    const previousAzimuth = useRef(null);
    const invalidate = useThree((state) => state.invalidate);
    const product = useConfiguratorStore((state) => state.product);
    const modelConfig = product.model;
    const colors = useConfiguratorStore((state) => state.shirtColors);
    const { scene, nodes } = useGLTF(modelConfig.url);
    const modelScene = useMemo(() => cloneModelScene(scene), [scene]);
    const motion = useMemo(() => new DressMotionController({
        ...(typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4
            ? { strength: 0.055, maxSway: 0.12 } : {}),
        ...modelConfig.dressMotion,
    }), [modelConfig]);
    const motionEnabled = modelConfig.dressMotion?.enabled === true;
    const animateDress = motionEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const printMeshes = useMemo(() => {
        scene.updateMatrixWorld(true);

        const entries = Object.entries(modelConfig.printAreas).map(([areaId, binding]) => {
            const node = nodes[binding.meshName];

            if (!node?.geometry) {
                throw new Error(
                    `The product GLB is missing the ${binding.meshName} mesh required for the ${areaId} artwork area.`,
                );
            }

            const pattern = createOutwardPrintGeometry(
                node.geometry,
                { ...binding, logoPlacement: null },
                node.matrixWorld,
            );
            const canProjectArtwork = binding.logoPlacement?.type === 'surface'
                || binding.projection?.type !== 'box'
                || binding.logoProjection?.type === 'planar';
            const artwork = canProjectArtwork
                ? createOutwardPrintGeometry(
                    node.geometry,
                    {
                        ...binding,
                        projection: binding.logoPlacement
                            ? null
                            : binding.logoProjection ?? binding.projection,
                    },
                    node.matrixWorld,
                )
                : null;

            return [areaId, { pattern, artwork }];
        });

        return Object.fromEntries(entries);
    }, [modelConfig, nodes, scene]);

    const modelTransform = useMemo(() => {
        modelScene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(modelScene);
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const safeHeight = Math.max(size.y, 0.0001);

        return {
            center: center.toArray(),
            scale: (modelConfig.fitHeight ?? 2.45) / safeHeight,
            bounds,
        };
    }, [modelConfig.fitHeight, modelScene]);

    useLayoutEffect(() => {
        previousAzimuth.current = null;
        if (!animateDress) return;
        motion.init(modelScene, modelTransform.bounds);
        invalidate();
        return () => motion.dispose();
    }, [animateDress, invalidate, modelScene, modelTransform, motion, printMeshes]);

    useFrame((_, delta) => {
        const azimuth = controlsRef?.current?.getAzimuthalAngle();
        if (!motionEnabled || azimuth === undefined || motion.materials.length === 0) return;
        const previous = previousAzimuth.current ?? azimuth;
        previousAzimuth.current = azimuth;
        // Wrap at +/- pi. Divide by real frame time before clamping the spring
        // step; zoom/pan and camera preset transitions must not excite the dress.
        const change = Math.atan2(Math.sin(azimuth - previous), Math.cos(azimuth - previous));
        const interaction = interactionRef?.current;
        const turning = interaction?.active || performance.now() - (interaction?.lastEnd ?? -Infinity) < 600;
        motion.setRotationVelocity(turning && delta > 0 && delta < 1 ? -change / delta : 0);
        if (motion.update(delta)) invalidate();
    }, -0.5);

    useEffect(
        () => () => {
            Object.values(printMeshes).forEach((geometries) => {
                geometries.pattern?.dispose();
                geometries.artwork?.dispose();
            });
        },
        [printMeshes],
    );

    useEffect(() => registerModelExporter(async () => {
        if (!exportGroupRef.current) {
            throw new Error('The configured model is not ready to export.');
        }

        const exportRoot = exportGroupRef.current.clone(true);
        const guides = [];
        const exportMaterials = [];
        exportRoot.traverse((node) => {
            if (node.name === 'active_logo_zone_guide') guides.push(node);
            // An export during the transfer always contains the final design.
            if (node.isMesh && node.name.startsWith('pattern_')) {
                node.material = node.material.clone();
                node.material.opacity = 1;
                exportMaterials.push(node.material);
            }
        });
        guides.forEach((guide) => guide.parent?.remove(guide));
        exportRoot.updateMatrixWorld(true);
        try {
            const result = await new GLTFExporter().parseAsync(exportRoot, {
                binary: true,
                onlyVisible: true,
                maxTextureSize: 2048,
            });
            return new Blob([result], { type: 'model/gltf-binary' });
        } finally {
            exportMaterials.forEach((material) => material.dispose());
        }
    }), []);

    useEffect(() => {
        modelScene.traverse((node) => {
            if (!node.isMesh) return;

            const zoneId = modelConfig.meshZones[node.name];
            if (zoneId) setMaterialColor(node.material, colors[zoneId]);
        });

        invalidate();
    }, [colors, invalidate, modelConfig, modelScene]);

    useEffect(
        () => () => {
            modelScene.traverse((node) => {
                if (!node.isMesh) return;

                node.geometry.dispose();
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach((material) => material.dispose());
            });
        },
        [modelScene],
    );

    return (
        <>
            <PatternApplyCloth application={application} controlsRef={controlsRef} />
            <group ref={exportGroupRef} name="configurable_garment" scale={modelTransform.scale}>
                <group position={modelTransform.center.map((value) => -value)}>
                    <primitive object={modelScene} />
                    {Object.entries(modelConfig.printAreas).map(([areaId, binding]) => (
                        <BoundPrintSurface
                            key={areaId}
                            areaId={areaId}
                            binding={binding}
                            geometries={printMeshes[areaId]}
                            application={application}
                            motion={animateDress ? motion : null}
                            motionBounds={modelTransform.bounds}
                        />
                    ))}
                </group>
            </group>
        </>
    );
}
