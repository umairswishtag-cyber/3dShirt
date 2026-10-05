import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShaderLib } from 'three';
import { createAttachmentSampler } from '../../resources/js/features/configurator/three/clothAttachments.js';
import DressMotionController from '../../resources/js/features/configurator/three/DressMotionController.js';

function simulate(controller, velocity, seconds, fps = 60) {
    controller.setRotationVelocity(velocity);
    let active;
    for (let i = 0; i < seconds * fps; i++) active = controller.update(1 / fps);
    return active;
}

test('speed drives sway, direction reverses smoothly, and the spring sleeps after settling', () => {
    const slow = new DressMotionController();
    const fast = new DressMotionController();
    simulate(slow, 0.5, 1);
    simulate(fast, 3, 1);
    assert.ok(Math.abs(fast.sway.value) > Math.abs(slow.sway.value) * 3);
    assert.ok(fast.sway.value < 0);
    const before = fast.sway.value;
    simulate(fast, -3, 1 / 60);
    assert.ok(Math.abs(fast.sway.value - before) < 0.015);
    simulate(fast, -3, 1);
    assert.ok(fast.sway.value > 0);
    assert.equal(simulate(fast, 0, 4), false);
    assert.equal(fast.sway.value, 0);
});

test('spring is stable at mobile frame rates and ignores nonfinite input', () => {
    const values = [30, 60, 120].map((fps) => {
        const controller = new DressMotionController();
        simulate(controller, 2, 1, fps);
        return controller.sway.value;
    });
    assert.ok(Math.max(...values) - Math.min(...values) < 0.001);
    const controller = new DressMotionController();
    controller.setRotationVelocity(Infinity);
    assert.equal(controller.update(10), false);
    simulate(controller, 10000, 1);
    assert.ok(Math.abs(controller.sway.value) < 0.16);
    controller.reset();
    assert.equal(controller.sway.value, 0);
});

test('shader bindings remove viewer transforms and disposal restores the material', () => {
    const model = new Group();
    model.add(new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial()));
    model.children[0].name = 'Body';
    const bounds = new Box3().setFromObject(model);
    const viewer = new Group();
    viewer.scale.setScalar(3);
    viewer.position.set(0, -8, 0);
    viewer.add(model);
    const material = model.children[0].material;
    const original = material.onBeforeCompile;
    const controller = new DressMotionController({ meshParts: { Body: 'upper' } });
    controller.init(model, bounds);
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader };
    material.onBeforeCompile(shader, null);
    assert.equal(shader.uniforms.dressToModel.value.elements[13], 0);
    assert.equal(shader.uniforms.dressToModel.value.elements[0], 1);
    assert.equal(shader.uniforms.dressHeight.value, 2);
    assert.ok(shader.vertexShader.includes('dressFabric'));
    assert.ok(shader.vertexShader.includes('objectNormal = normalize(dressNormalToLocal'));
    assert.equal(shader.uniforms.dressSway, controller.sway);
    controller.dispose();
    assert.equal(material.onBeforeCompile, original);
    assert.equal(controller.materials.length, 0);
    model.children[0].geometry.dispose();
    material.dispose();
});

test('assigned mesh roles and regional strengths reach the shader and overlays', () => {
    const model = new Group();
    const sleeve = new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial());
    sleeve.name = 'SleeveMesh';
    model.add(sleeve);
    const controller = new DressMotionController({ upper: 0, hem: 0.9, sleeves: 0.35,
        hemHeight: 0.3, damping: 24, meshParts: { SleeveMesh: 'sleeves' } });
    const bounds = new Box3().setFromObject(model);
    controller.init(model, bounds);
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader };
    sleeve.material.onBeforeCompile(shader, null);
    assert.equal(shader.uniforms.dressPart.value, 3);
    assert.deepEqual(shader.uniforms.dressWeights.value.toArray(), [0, 0.9, 0.35]);
    assert.equal(shader.uniforms.dressHemHeight.value, 0.3);
    assert.equal(controller.damping, 24);
    controller.unbindMaterial(sleeve.material);
    assert.equal(controller.materials.length, 0);
    controller.dispose();
    sleeve.geometry.dispose();
    sleeve.material.dispose();
});

test('unconnected parts stay untouched and selected hem uses its own bounds', () => {
    const model = new Group();
    const hem = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    hem.name = 'Hem';
    hem.position.y = 3;
    const collar = new Mesh(new BoxGeometry(1, 9, 1), new MeshStandardMaterial());
    collar.name = 'Collar';
    model.add(hem, collar);
    const original = collar.material.onBeforeCompile;
    const controller = new DressMotionController({ meshParts: { Hem: 'hem' } });
    controller.init(model, new Box3().setFromObject(model));
    assert.equal(controller.materials.length, 1);
    assert.equal(collar.material.onBeforeCompile, original);
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader };
    hem.material.onBeforeCompile(shader, null);
    assert.equal(shader.uniforms.dressHeight.value, 1);
    assert.equal(shader.uniforms.dressBottom.value, 2.5);
    assert.equal(shader.uniforms.dressPart.value, 2);
    controller.dispose();
    for (const node of model.children) { node.geometry.dispose(); node.material.dispose(); }
});

test('traveling folds gain energy from rotation and decay after release without resetting phase', () => {
    const controller = new DressMotionController();
    simulate(controller, 4, 0.5);
    const energy = controller.waveEnergy.value;
    const phase = controller.wavePhase.value;
    assert.ok(energy > 0.5);
    simulate(controller, -4, 1 / 60);
    assert.ok(controller.wavePhase.value > phase);
    const releasePhase = controller.wavePhase.value;
    assert.equal(simulate(controller, 0, 0.5), true);
    assert.ok(controller.waveEnergy.value > 0 && controller.waveEnergy.value < energy);
    assert.ok(controller.wavePhase.value > releasePhase);
    assert.equal(simulate(controller, 0, 4), false);
    assert.equal(controller.waveEnergy.value, 0);
    controller.reset();
    assert.equal(controller.wavePhase.value, 0);
});

test('opaque pattern overlays share wave uniforms and receive changing fold shading', () => {
    const model = new Group();
    const pattern = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
    pattern.name = 'Body';
    model.add(pattern);
    const controller = new DressMotionController({ meshParts: { Body: 'hem' } });
    controller.init(model, new Box3().setFromObject(model));
    const shader = { uniforms: {}, vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader };
    pattern.material.onBeforeCompile(shader, null);
    assert.equal(shader.uniforms.dressWaveEnergy, controller.waveEnergy);
    assert.equal(shader.uniforms.dressWavePhase, controller.wavePhase);
    assert.ok(shader.fragmentShader.includes('outgoingLight *= foldShade'));
    controller.dispose();
    pattern.geometry.dispose();
    pattern.material.dispose();
});

test('ordinary drag speeds visibly excite waves, including slow render frames', () => {
    const normal = new DressMotionController();
    simulate(normal, 0.6, 0.75);
    assert.ok(normal.waveEnergy.value > 0.45);
    const delayed = new DressMotionController();
    simulate(delayed, 0.6, 0.75, 10);
    assert.ok(delayed.waveEnergy.value > 0.4);
    simulate(normal, 0, 0.5);
    assert.ok(normal.waveEnergy.value > 0.2);
    assert.equal(simulate(normal, 0, 5), false);
});

test('attached parts remain pinned while loose fabric and matching print layers can move', () => {
    const body = new PlaneGeometry(1, 2, 20, 20).translate(-0.5, 0, 0);
    const sleeve = new PlaneGeometry(1, 2, 20, 20).translate(0.5, 0, 0);
    const sampler = createAttachmentSampler([
        { geometry: body, matrix: new Matrix4(), role: 'upper' },
        { geometry: sleeve, matrix: new Matrix4(), role: 'sleeves' },
    ], 2);
    assert.ok(sampler.seamCount > 0);
    const print = sleeve.toNonIndexed();
    for (const geometry of [body, sleeve, print]) {
        sampler.bind(geometry, new Matrix4());
        const position = geometry.attributes.position;
        const attachment = geometry.attributes.dressAttachment;
        for (let i = 0; i < position.count; i++) {
            if (position.getX(i) === 0) assert.equal(attachment.getX(i), 0, 'shared shoulder is pinned for every layer');
            if (Math.abs(position.getX(i)) > 0.2) assert.equal(attachment.getX(i), 1, 'loose area remains free');
        }
    }
    const sourceMask = sleeve.attributes.dressAttachment;
    for (let i = 0; i < print.attributes.position.count; i++) {
        const source = sleeve.index.getX(i);
        for (let component = 0; component < 4; component++) {
            assert.equal(print.attributes.dressAttachment.array[i * 4 + component], sourceMask.array[source * 4 + component]);
        }
    }
    [body, sleeve, print].forEach((geometry) => geometry.dispose());
});

test('lower sections carry momentum after reversal and all inertial modes settle', () => {
    const controller = new DressMotionController();
    simulate(controller, 2, 0.3);
    assert.ok(controller.lag.value.distanceTo(controller.foldModes.value) > 0.01);
    assert.ok(Math.abs(controller.lag.value.x - controller.lag.value.z) > 0.005);
    const previous = controller.lag.value.clone();
    simulate(controller, -2, 1 / 120);
    assert.ok(previous.distanceTo(controller.lag.value) < 0.025, 'no snap on reversal');
    simulate(controller, 0, 0.2);
    assert.ok(controller.foldModes.value.length() > 0.001, 'folds keep their own momentum after release');
    assert.equal(simulate(controller, 0, 8), false);
    assert.equal(controller.lag.value.lengthSq() + controller.foldModes.value.lengthSq(), 0);
});
