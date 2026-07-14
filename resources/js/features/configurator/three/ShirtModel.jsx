import { RoundedBox, useGLTF } from '@react-three/drei';
import { DoubleSide } from 'three';
import { useDesignTexture } from '../hooks/useDesignTexture';
import { useConfiguratorStore } from '../stores/useConfiguratorStore';

function PrintSurface({ texture, side }) {
    const isBack = side === 'back';

    return (
        <mesh
            name={`print_${side}`}
            position={[0, -0.2, isBack ? -0.172 : 0.172]}
            rotation={[0, isBack ? Math.PI : 0, 0]}
            renderOrder={2}
        >
            <planeGeometry args={[1.24, 1.55]} />
            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.01}
                depthWrite={false}
                side={DoubleSide}
                toneMapped={false}
                polygonOffset
                polygonOffsetFactor={-2}
            />
        </mesh>
    );
}

export function ProceduralShirtPlaceholder({ colors, frontTexture, backTexture }) {
    return (
        <group name="procedural_basic_tshirt" position={[0, 0.04, 0]}>
            <RoundedBox
                name="shirt_body"
                args={[1.72, 2.2, 0.34]}
                radius={0.12}
                smoothness={5}
                position={[0, -0.2, 0]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color={colors.body} roughness={0.88} metalness={0} />
            </RoundedBox>

            <RoundedBox
                name="left_sleeve"
                args={[0.76, 0.74, 0.32]}
                radius={0.11}
                smoothness={4}
                position={[-1.03, 0.46, 0]}
                rotation={[0, 0, -0.5]}
                castShadow
            >
                <meshStandardMaterial
                    color={colors.leftSleeve}
                    roughness={0.88}
                    metalness={0}
                />
            </RoundedBox>

            <RoundedBox
                name="right_sleeve"
                args={[0.76, 0.74, 0.32]}
                radius={0.11}
                smoothness={4}
                position={[1.03, 0.46, 0]}
                rotation={[0, 0, 0.5]}
                castShadow
            >
                <meshStandardMaterial
                    color={colors.rightSleeve}
                    roughness={0.88}
                    metalness={0}
                />
            </RoundedBox>

            <mesh name="collar" position={[0, 0.86, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.27, 0.07, 18, 64]} />
                <meshStandardMaterial color={colors.collar} roughness={0.78} metalness={0} />
            </mesh>

            <PrintSurface texture={frontTexture} side="front" />
            <PrintSurface texture={backTexture} side="back" />
        </group>
    );
}

function requireNamedMesh(nodes, name) {
    const node = nodes[name];
    if (!node?.geometry) {
        throw new Error(`The shirt GLB is missing the required named mesh: ${name}`);
    }
    return node;
}

export function GlbShirtModel({ modelUrl, colors, frontTexture, backTexture }) {
    const { nodes } = useGLTF(modelUrl);
    const body = requireNamedMesh(nodes, 'shirt_body');
    const leftSleeve = requireNamedMesh(nodes, 'left_sleeve');
    const rightSleeve = requireNamedMesh(nodes, 'right_sleeve');
    const collar = requireNamedMesh(nodes, 'collar');
    const front = requireNamedMesh(nodes, 'print_front');
    const back = requireNamedMesh(nodes, 'print_back');

    return (
        <group name="basic_tshirt_glb">
            <mesh geometry={body.geometry} castShadow receiveShadow>
                <meshStandardMaterial color={colors.body} roughness={0.88} />
            </mesh>
            <mesh geometry={leftSleeve.geometry} castShadow receiveShadow>
                <meshStandardMaterial color={colors.leftSleeve} roughness={0.88} />
            </mesh>
            <mesh geometry={rightSleeve.geometry} castShadow receiveShadow>
                <meshStandardMaterial color={colors.rightSleeve} roughness={0.88} />
            </mesh>
            <mesh geometry={collar.geometry} castShadow receiveShadow>
                <meshStandardMaterial color={colors.collar} roughness={0.8} />
            </mesh>
            <mesh geometry={front.geometry} renderOrder={2}>
                <meshBasicMaterial map={frontTexture} transparent depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh geometry={back.geometry} renderOrder={2}>
                <meshBasicMaterial map={backTexture} transparent depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

export default function ShirtModel({ modelUrl = null }) {
    const colors = useConfiguratorStore((state) => state.shirtColors);
    const frontTexture = useDesignTexture('front');
    const backTexture = useDesignTexture('back');

    if (modelUrl) {
        return (
            <GlbShirtModel
                modelUrl={modelUrl}
                colors={colors}
                frontTexture={frontTexture}
                backTexture={backTexture}
            />
        );
    }

    return (
        <ProceduralShirtPlaceholder
            colors={colors}
            frontTexture={frontTexture}
            backTexture={backTexture}
        />
    );
}

