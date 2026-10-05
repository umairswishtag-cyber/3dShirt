import { Box3, Matrix3, Matrix4, Vector3 } from 'three';
import { createAttachmentSampler } from './clothAttachments.js';

// A few traveling modes, evaluated by the existing material shader. This is
// procedural fabric deformation, not a vertex/particle cloth simulation.
const FABRIC_SHADER = `
    attribute vec4 dressAttachment;
    uniform float dressSway;
    uniform float dressWaveEnergy;
    uniform float dressWavePhase;
    uniform vec3 dressLag;
    uniform vec3 dressFoldModes;
    uniform mat4 dressToModel;
    uniform mat4 dressToLocal;
    uniform mat3 dressNormalToModel;
    uniform mat3 dressNormalToLocal;
    uniform vec3 dressCenter;
    uniform float dressHeight;
    uniform float dressWidth;
    uniform float dressBottom;
    uniform float dressPart;
    uniform vec3 dressWeights;
    uniform float dressHemHeight;
    varying vec3 dressViewBaseNormal;
    varying vec3 dressViewFoldNormal;

    void dressFabric(vec3 p, out float weight, out float fold, out vec3 gradient) {
        float h = clamp((p.y - dressBottom) / dressHeight, 0.0, 1.0);
        float start = dressPart == 2.0 ? 0.0 : 0.65;
        float end = dressPart == 2.0 ? dressHemHeight : 1.0;
        float t = clamp((h - start) / (end - start), 0.0, 1.0);
        float strength = dressPart == 1.0 ? dressWeights.x : (dressPart == 2.0 ? dressWeights.y : dressWeights.z);
        float freedom = 1.0 - t * t * (3.0 - 2.0 * t);
        weight = strength * freedom;
        float weightY = -strength * 6.0 * t * (1.0 - t) / ((end - start) * dressHeight);
        vec2 radial = p.xz - dressCenter.xz;
        float radiusSq = max(dot(radial, radial), dressWidth * dressWidth * 0.0025);
        float theta = dot(radial, radial) > dressWidth * dressWidth * 0.00000001 ? atan(radial.x, radial.y) : 0.0;
        float x = (p.x - dressCenter.x) / dressWidth;
        // Different wavelengths prevent the garment looking like one rigid
        // pendulum. The lower modes keep traveling as drag momentum decays.
        float a = x * 15.708 - h * 4.5 - dressWavePhase;
        float b = x * 25.133 + h * 7.0 - dressWavePhase * 1.37;
        float c = theta * 6.0 - h * 3.0 - dressWavePhase * 0.83;
        // Inertial modes carry signed momentum through a reversal. A smaller
        // traveling component supplies flutter while the garment is turning.
        vec3 modes = dressFoldModes / sqrt(vec3(1.0) + dressFoldModes * dressFoldModes * 4.0)
            + dressWaveEnergy * vec3(0.22, 0.12, 0.16);
        float wave = sin(a) * modes.x + sin(b) * modes.y + sin(c) * modes.z;
        vec3 waveGradient = vec3(
            cos(a) * modes.x * 15.708 / dressWidth + cos(b) * modes.y * 25.133 / dressWidth
                + cos(c) * modes.z * 6.0 * radial.y / radiusSq,
            (-cos(a) * modes.x * 4.5 + cos(b) * modes.y * 7.0 - cos(c) * modes.z * 3.0) / dressHeight,
            -cos(c) * modes.z * 6.0 * radial.x / radiusSq
        );
        float amplitude = dressHeight * 0.12;
        // Smoothstep already has zero slope at the attachment. Squaring it
        // again hid most of the folds in the selected moving area.
        fold = amplitude * weight * wave;
        gradient = amplitude * (weight * waveGradient + vec3(0.0, weightY * wave, 0.0));
        gradient = gradient * dressAttachment.x + fold * dressAttachment.yzw;
        fold *= dressAttachment.x;
        weight *= dressAttachment.x;
    }

    float dressTwist(vec3 p, float weight) {
        float h = clamp((p.y - dressBottom) / dressHeight, 0.0, 1.0);
        float loose = 1.0 - clamp(h / (dressPart == 2.0 ? dressHemHeight : 1.0), 0.0, 1.0);
        float angle = loose < 0.5 ? mix(dressLag.x, dressLag.y, loose * 2.0)
            : mix(dressLag.y, dressLag.z, loose * 2.0 - 1.0);
        return angle * weight;
    }

    vec3 dressTurnNormal(vec3 n, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
    }

    vec3 dressFoldDirection(vec3 p) {
        vec3 direction = vec3((p.x - dressCenter.x) * 0.35, 0.0, p.z - dressCenter.z);
        return dot(direction, direction) > 0.0000000001 ? normalize(direction) : vec3(0.0, 0.0, 1.0);
    }

    vec3 dressFoldNormal(vec3 n, vec3 gradient, float weight, vec3 direction) {
        // Analytic surface slope changes lighting with every moving fold;
        // static normals would make ripples almost invisible on solid fabric.
        vec3 tangentSlope = gradient - n * dot(n, gradient);
        vec3 folded = normalize(n - tangentSlope * dot(n, direction));
        return folded;
    }
`;

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
const attachmentCache = new WeakMap();

export default class DressMotionController {
    constructor({ strength = 0.07, maxSway = 0.14, stiffness = 95, damping = 15,
        upper = 0.15, hem = 1, sleeves = 0.5, hemHeight = 0.45, meshParts = {} } = {}) {
        this.strength = strength;
        this.maxSway = maxSway;
        this.stiffness = stiffness;
        this.damping = damping;
        this.velocity = 0;
        this.sway = { value: 0 };
        this.swayVelocity = 0;
        this.waveEnergy = { value: 0 };
        this.wavePhase = { value: 0 };
        this.lag = { value: new Vector3() };
        this.lagVelocity = new Vector3();
        this.foldModes = { value: new Vector3() };
        this.foldVelocity = new Vector3();
        this.filteredVelocity = 0;
        this.partBounds = new Map();
        this.materials = [];
        this.parts = { upper, hem, sleeves, hemHeight };
        this.meshParts = meshParts;
    }

    init(model, bounds) {
        this.reset();
        const center = bounds.getCenter(new Vector3());
        const height = Math.max(bounds.max.y - bounds.min.y, 0.0001);
        model.updateWorldMatrix(true, true);
        const parentInverse = model.parent ? model.parent.matrixWorld.clone().invert() : new Matrix4();
        // Front/back panels in one group share the same attachment height, so
        // their seam vertices deform together. Sleeves retain individual bounds.
        const groups = new Map();
        const entries = [];
        model.traverse((node) => {
            if (node.isMesh) entries.push({ geometry: node.geometry,
                matrix: node.matrixWorld.clone().premultiply(parentInverse), role: this.meshParts[node.name] ?? 'none' });
        });
        const assignmentKey = JSON.stringify(Object.entries(this.meshParts).sort(([a], [b]) => a.localeCompare(b)));
        const cached = attachmentCache.get(model);
        this.attachments = cached?.key === assignmentKey ? cached.sampler : createAttachmentSampler(entries, height);
        attachmentCache.set(model, { key: assignmentKey, sampler: this.attachments });
        model.traverse((node) => {
            if (!node.isMesh || !['upper', 'hem', 'sleeves'].includes(this.meshParts[node.name])) return;
            if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
            const part = this.meshParts[node.name];
            const key = part === 'sleeves' ? node.name : part;
            const box = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld.clone().premultiply(parentInverse));
            if (!groups.has(key)) groups.set(key, new Box3());
            groups.get(key).union(box);
            this.partBounds.set(node.name, groups.get(key));
        });
        model.traverse((node) => {
            if (!node.isMesh) return;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            const toModel = node.matrixWorld.clone().premultiply(parentInverse);
            const part = this.meshParts[node.name] ?? 'none';
            if (part === 'none') return;
            if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
            const partBounds = this.partBounds.get(node.name);
            this.attachments.bind(node.geometry, toModel);
            for (const material of materials) this.bindMaterial(material, toModel, center, height, bounds.min.y,
                part, partBounds, bounds.max.x - bounds.min.x);
        });
    }

    bindMaterial(material, toModel, center, height, bottom, part = 'none', partBounds = null, width = height) {
        if (!['upper', 'hem', 'sleeves'].includes(part)) return;
        if (this.materials.some((entry) => entry.material === material)) return;
        const previous = material.onBeforeCompile;
        const previousKey = material.customProgramCacheKey;
        const uniforms = {
            dressSway: this.sway,
            dressWaveEnergy: this.waveEnergy,
            dressWavePhase: this.wavePhase,
            dressLag: this.lag,
            dressFoldModes: this.foldModes,
            dressToModel: { value: toModel.clone() },
            dressToLocal: { value: toModel.clone().invert() },
            dressNormalToModel: { value: new Matrix3().getNormalMatrix(toModel) },
            dressNormalToLocal: { value: new Matrix3().getNormalMatrix(toModel).invert() },
            dressCenter: { value: center.clone() },
            dressHeight: { value: Math.max(partBounds ? partBounds.max.y - partBounds.min.y : height, 0.0001) },
            dressBottom: { value: partBounds ? partBounds.min.y : bottom },
            dressWidth: { value: Math.max(width, 0.0001) },
            dressPart: { value: ({ upper: 1, hem: 2, sleeves: 3 })[part] },
            dressWeights: { value: new Vector3(this.parts.upper, this.parts.hem, this.parts.sleeves) },
            dressHemHeight: { value: this.parts.hemHeight },
        };
        material.onBeforeCompile = (shader, renderer) => {
            previous.call(material, shader, renderer);
            Object.assign(shader.uniforms, uniforms);
            shader.vertexShader = `${FABRIC_SHADER}\n${shader.vertexShader}`
            .replace('#include <beginnormal_vertex>', `
                #include <beginnormal_vertex>
                vec3 dressNormalPoint = (dressToModel * vec4(position, 1.0)).xyz;
                vec3 dressOriginalNormal = normalize(dressNormalToModel * objectNormal);
                float dressNormalWeight; float dressNormalFold; vec3 dressNormalGradient;
                dressFabric(dressNormalPoint, dressNormalWeight, dressNormalFold, dressNormalGradient);
                objectNormal = normalize(dressNormalToLocal * dressTurnNormal(dressFoldNormal(dressOriginalNormal, dressNormalGradient, dressNormalWeight, dressFoldDirection(dressNormalPoint)), dressTwist(dressNormalPoint, dressNormalWeight)));
            `).replace('#include <project_vertex>', `
                // Only explicitly connected meshes are patched. Each uses its
                // own height to keep its top anchored and let its lower edge lag.
                vec3 clothPoint = (dressToModel * vec4(transformed, 1.0)).xyz;
                float clothWeight; float clothFold; vec3 clothGradient;
                dressFabric(clothPoint, clothWeight, clothFold, clothGradient);
                vec3 clothNormal = normalize(dressNormalToModel * normal);
                vec3 clothFoldDirection = dressFoldDirection(clothPoint);
                vec3 clothFoldNormal = dressFoldNormal(clothNormal, clothGradient, clothWeight, clothFoldDirection);
                dressViewBaseNormal = normalize(normalMatrix * dressNormalToLocal * clothNormal);
                dressViewFoldNormal = normalize(normalMatrix * dressNormalToLocal * clothFoldNormal);
                float clothAngle = dressTwist(clothPoint, clothWeight);
                vec2 clothXZ = clothPoint.xz - dressCenter.xz;
                float c = cos(clothAngle);
                float s = sin(clothAngle);
                clothPoint.x = dressCenter.x + c * clothXZ.x + s * clothXZ.y
                    + clothAngle * dressHeight * 0.32;
                clothPoint.z = dressCenter.z - s * clothXZ.x + c * clothXZ.y;
                // Coincident inner/outer garment surfaces can have opposite
                // normals. Move them in the same spatial direction to keep the
                // shell, pattern and artwork together instead of splitting it.
                clothPoint += dressTurnNormal(clothFoldDirection, clothAngle) * clothFold;
                // Outward billowing grows with turning speed; the pinned top
                // remains still and the free lower edge trails behind it.
                vec2 outward = clothXZ / max(length(clothXZ), dressWidth * 0.05);
                clothPoint.xz += outward * dressSway * dressSway * dressHeight * clothWeight * 1.5;
                transformed = (dressToLocal * vec4(clothPoint, 1.0)).xyz;
                #include <project_vertex>
            `);
            if (material.isMeshBasicMaterial) {
                // Pattern/logo overlays are deliberately unlit. Add only the
                // changing fold shade so an opaque SVG cannot hide the waves.
                // At rest this multiplier is exactly one, preserving its color.
                shader.fragmentShader = `varying vec3 dressViewBaseNormal;\nvarying vec3 dressViewFoldNormal;\n${shader.fragmentShader}`
                    .replace('#include <opaque_fragment>', `
                        vec3 foldLight = normalize(vec3(0.45, 0.8, 1.0));
                        float foldShade = clamp(1.0 + 1.1 * dot(normalize(dressViewFoldNormal) - normalize(dressViewBaseNormal), foldLight), 0.55, 1.3);
                        outgoingLight *= foldShade;
                        #include <opaque_fragment>
                    `);
            }
        };
        material.customProgramCacheKey = () => `${previousKey.call(material)}:dress-motion-inertia-v3`;
        material.needsUpdate = true;
        this.materials.push({ material, previous, previousKey });
    }

    // OrbitControls rotates the camera, so use the opposite angular velocity
    // for the garment's apparent turn. Positive sway lags that apparent turn.
    setRotationVelocity(velocity) {
        this.velocity = clamp(Number.isFinite(velocity) ? velocity : 0, 12);
    }

    update(deltaTime) {
        let remaining = Number.isFinite(deltaTime) ? Math.min(Math.max(deltaTime, 0), 0.25) : 0;
        const target = clamp(-this.velocity * this.strength, this.maxSway);
        // Small bounded substeps keep the spring stable after dropped frames.
        while (remaining > 0) {
            const dt = Math.min(remaining, 1 / 120);
            this.swayVelocity += ((target - this.sway.value) * this.stiffness - this.swayVelocity * this.damping) * dt;
            this.sway.value += this.swayVelocity * dt;
            const oldVelocity = this.filteredVelocity;
            this.filteredVelocity += (this.velocity - oldVelocity) * (1 - Math.exp(-12 * dt));
            const acceleration = clamp((this.filteredVelocity - oldVelocity) / dt, 30);
            // Three coupled sections, rather than one rigid twist. The hem
            // follows the middle section after it, including after release.
            for (let i = 0; i < 3; i++) {
                const upstream = i === 0 ? this.sway.value : this.lag.value.getComponent(i - 1);
                const position = this.lag.value.getComponent(i);
                const speed = this.lagVelocity.getComponent(i);
                const nextSpeed = speed + ((upstream - position) * (80 - i * 18)
                    - speed * this.damping * 0.48 - acceleration * (0.035 + i * 0.018)) * dt;
                this.lagVelocity.setComponent(i, nextSpeed);
                this.lag.value.setComponent(i, position + nextSpeed * dt);
                // A tiny fixed set of damped fold modes: no vertex simulation,
                // geometry uploads, traversal or allocations in this loop.
                const frequency = 7 + i * 3;
                const fold = this.foldModes.value.getComponent(i);
                const foldSpeed = this.foldVelocity.getComponent(i);
                const force = -acceleration * (1.8 - i * 0.35)
                    + this.filteredVelocity * Math.sin(this.wavePhase.value + i * 1.7) * 7;
                const nextFoldSpeed = foldSpeed + (force - fold * frequency * frequency
                    - foldSpeed * this.damping * 0.28) * dt;
                this.foldVelocity.setComponent(i, nextFoldSpeed);
                this.foldModes.value.setComponent(i, fold + nextFoldSpeed * dt);
            }
            remaining -= dt;
        }
        const dt = Number.isFinite(deltaTime) ? Math.min(Math.max(deltaTime, 0), 0.25) : 0;
        // Ordinary drags, not just extremely fast spins, must visibly excite
        // the fabric. This saturates smoothly while remaining zero at rest.
        const drive = 1 - Math.exp(-Math.abs(this.velocity) * 1.2);
        const rate = drive > this.waveEnergy.value ? 9 : 1.3 + (this.damping - 10) * 0.06;
        this.waveEnergy.value += (drive - this.waveEnergy.value) * (1 - Math.exp(-rate * dt));
        // Phase never resets on a reversal: existing folds keep traveling while
        // the sway spring takes up the new direction. No per-frame allocations.
        if (drive > 0 || this.waveEnergy.value > 0.0001) {
            this.wavePhase.value = (this.wavePhase.value + dt * (5.5 + Math.abs(this.velocity) * 0.45)) % (Math.PI * 200);
        }
        if (Math.abs(this.sway.value) + Math.abs(this.swayVelocity) + Math.abs(target) < 0.0001 && this.waveEnergy.value < 0.002
            && this.lag.value.lengthSq() + this.lagVelocity.lengthSq() + this.foldModes.value.lengthSq() + this.foldVelocity.lengthSq() < 0.000001) {
            this.reset();
            return false;
        }
        return true;
    }

    reset() {
        this.velocity = 0;
        this.sway.value = 0;
        this.swayVelocity = 0;
        this.waveEnergy.value = 0;
        this.wavePhase.value = 0;
        this.lag.value.set(0, 0, 0);
        this.lagVelocity.set(0, 0, 0);
        this.foldModes.value.set(0, 0, 0);
        this.foldVelocity.set(0, 0, 0);
        this.filteredVelocity = 0;
    }

    unbindMaterial(material) {
        const index = this.materials.findIndex((entry) => entry.material === material);
        if (index < 0) return;
        const { previous, previousKey } = this.materials[index];
        material.onBeforeCompile = previous;
        material.customProgramCacheKey = previousKey;
        material.needsUpdate = true;
        this.materials.splice(index, 1);
    }

    dispose() {
        for (const { material, previous, previousKey } of this.materials) {
            material.onBeforeCompile = previous;
            material.customProgramCacheKey = previousKey;
            material.needsUpdate = true;
        }
        this.materials.length = 0;
        this.partBounds.clear();
        this.reset();
    }
}
