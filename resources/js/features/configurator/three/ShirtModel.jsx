import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, FrontSide, Vector3 } from 'three';
import { useDesignTexture } from '../hooks/useDesignTexture';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

function cloneModelScene(scene) {
    const clone = scene.clone(true);

    clone.traverse((node) => {
        if (!node.isMesh) return;

        node.material = Array.isArray(node.material)
            ? node.material.map((material) => material.clone())
            : node.material.clone();
        node.castShadow = true;
        node.receiveShadow = true;
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

function createOutwardPrintGeometry(sourceGeometry, outwardNormalZ, matrixWorld) {
    const geometry = sourceGeometry.clone();
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const sourceIndex = geometry.getIndex();
    const indices = sourceIndex
        ? Array.from(sourceIndex.array)
        : Array.from({ length: position.count }, (_, index) => index);
    const filteredIndices = [];
    const minimumFacing = 0.25;

    for (let index = 0; index < indices.length; index += 3) {
        const a = indices[index];
        const b = indices[index + 1];
        const c = indices[index + 2];
        const averageNormalZ =
            (normal.getZ(a) + normal.getZ(b) + normal.getZ(c)) / 3;

        if (
            outwardNormalZ === null ||
            averageNormalZ * outwardNormalZ > minimumFacing
        ) {
            filteredIndices.push(a, b, c);
        }
    }

    geometry.setIndex(filteredIndices);
    geometry.clearGroups();

    // Lift the print less than a millimetre in model space so it follows the
    // cloth without z-fighting or being depth-shifted through the other side.
    const surfaceOffset = 0.0006;
    for (let index = 0; index < position.count; index += 1) {
        position.setXYZ(
            index,
            position.getX(index) + normal.getX(index) * surfaceOffset,
            position.getY(index) + normal.getY(index) * surfaceOffset,
            position.getZ(index) + normal.getZ(index) * surfaceOffset,
        );
    }
    position.needsUpdate = true;
    geometry.applyMatrix4(matrixWorld);
    geometry.computeBoundingSphere();

    return geometry;
}

function PrintSurface({ geometry, texture, uvBounds, name }) {
    useEffect(() => {
        configurePrintTexture(texture, uvBounds);
    }, [texture, uvBounds]);

    return (
        <mesh name={name} geometry={geometry} renderOrder={2}>
            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.01}
                depthWrite={false}
                depthTest
                side={FrontSide}
                toneMapped={false}
            />
        </mesh>
    );
}

export default function ShirtModel() {
    const invalidate = useThree((state) => state.invalidate);
    const product = useConfiguratorStore((state) => state.product);
    const modelConfig = product.model;
    const colors = useConfiguratorStore((state) => state.shirtColors);
    const frontTexture = useDesignTexture('front');
    const backTexture = useDesignTexture('back');
    const leftSleeveTexture = useDesignTexture('leftSleeve');
    const rightSleeveTexture = useDesignTexture('rightSleeve');
    const { scene, nodes } = useGLTF(modelConfig.url);
    const modelScene = useMemo(() => cloneModelScene(scene), [scene]);
    const printTextures = {
        front: frontTexture,
        back: backTexture,
        leftSleeve: leftSleeveTexture,
        rightSleeve: rightSleeveTexture,
    };

    const printMeshes = useMemo(() => {
        scene.updateMatrixWorld(true);

        const entries = Object.entries(modelConfig.printAreas).map(([areaId, binding]) => {
            const node = nodes[binding.meshName];

            if (!node?.geometry) {
                throw new Error(
                    `The T-shirt GLB is missing the ${binding.meshName} mesh required for the ${areaId} print area.`,
                );
            }

            return [
                areaId,
                createOutwardPrintGeometry(
                    node.geometry,
                    binding.outwardNormalZ,
                    node.matrixWorld,
                ),
            ];
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
        };
    }, [modelConfig.fitHeight, modelScene]);

    useEffect(
        () => () => {
            Object.values(printMeshes).forEach((geometry) => geometry.dispose());
        },
        [printMeshes],
    );

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

                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach((material) => material.dispose());
            });
        },
        [modelScene],
    );

    return (
        <group name="configurable_garment" scale={modelTransform.scale}>
            <group position={modelTransform.center.map((value) => -value)}>
                <primitive object={modelScene} />
                {Object.entries(modelConfig.printAreas).map(([areaId, binding]) => (
                    <PrintSurface
                        key={areaId}
                        name={`print_${areaId}`}
                        geometry={printMeshes[areaId]}
                        texture={printTextures[areaId]}
                        uvBounds={binding.uvBounds}
                    />
                ))}
            </group>
        </group>
    );
}
