import { Environment, Lightformer } from '@react-three/drei';

export default function ViewerLights() {
    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight
                position={[3.5, 5, 4]}
                intensity={2.2}
            />
            <directionalLight position={[-4, 2, -3]} intensity={1.1} />
            <Environment resolution={128}>
                <Lightformer
                    form="rect"
                    intensity={2.2}
                    position={[0, 4, 2]}
                    scale={[5, 2, 1]}
                />
                <Lightformer
                    form="ring"
                    intensity={1.3}
                    position={[-4, 1, -3]}
                    scale={3}
                />
            </Environment>
        </>
    );
}
