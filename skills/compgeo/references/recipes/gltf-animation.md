# GLTF Animation

glTF supports three types of animation: transform animations (translation, rotation, scale of nodes over time), morph target animations (per-vertex deformation for facial expressions and shape blending), and skeletal animations (bones driving vertex positions via skin weights). All three use the same underlying system: animation clips containing channels, where each channel targets a specific node property with a keyframe track. Understanding this structure prevents confusion when clips don't play, targets don't move, or morph targets appear to do nothing.

## How glTF Animations Work

An animation clip is a named collection of channels. Each channel specifies:

- **Target node**: which node in the scene graph to animate
- **Target property**: `translation`, `rotation`, `scale`, or `weights` (morph targets)
- **Sampler**: keyframe timestamps paired with values, plus an interpolation mode (`LINEAR`, `STEP`, `CUBICSPLINE`)

A single glTF file can contain multiple animation clips (e.g., "Idle", "Walk", "Run"). Each clip can animate multiple nodes simultaneously. The animation system is declarative: the clip says "at time 0.5s, node X should be at position Y" and the runtime interpolates.

```
Animation "Walk"
  Channel 0: Bone_Hips -> rotation -> [0.0s: quat_a, 0.5s: quat_b, 1.0s: quat_a]
  Channel 1: Bone_LeftLeg -> rotation -> [0.0s: quat_c, 0.5s: quat_d, 1.0s: quat_c]
  Channel 2: Root -> translation -> [0.0s: pos_a, 0.5s: pos_b, 1.0s: pos_a]
```

## Playing Animations in three.js

### AnimationMixer

`AnimationMixer` is the animation engine. It manages playback of one or more clips on a scene graph.

```typescript
import * as THREE from "three";

// After loading a glTF
const mixer = new THREE.AnimationMixer(gltf.scene);

// Get a clip by name
const clip = THREE.AnimationClip.findByName(gltf.animations, "Walk");
const action = mixer.clipAction(clip);
action.play();
```

### The Update Loop

The mixer must be updated every frame with the elapsed time since the last frame:

```typescript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  mixer.update(delta);
  renderer.render(scene, camera);
}
animate();
```

Without `mixer.update(delta)`, nothing moves. This is the most common "my animation doesn't play" bug.

### Multiple Clips and Crossfading

When transitioning between animations (e.g., idle to walk), crossfading blends smoothly:

```typescript
const idleAction = mixer.clipAction(idleClip);
const walkAction = mixer.clipAction(walkClip);

// Start idle
idleAction.play();

// Transition to walk over 0.5 seconds
function transitionToWalk() {
  walkAction.reset();
  walkAction.play();
  idleAction.crossFadeTo(walkAction, 0.5, true);
}
```

The `warping` parameter (third argument, `true`) scales the playback speed during the crossfade to match animation durations, preventing jarring speed changes.

### Loop Modes

```typescript
action.setLoop(THREE.LoopRepeat, Infinity);  // default: loop forever
action.setLoop(THREE.LoopOnce, 1);           // play once and stop
action.setLoop(THREE.LoopPingPong, Infinity); // play forward, then backward

// Clamp at last frame instead of resetting (useful for LoopOnce)
action.clampWhenFinished = true;
```

### Pausing and Stopping

```typescript
action.paused = true;   // freeze at current time
action.paused = false;  // resume

action.stop();           // reset to beginning and remove from mixer
action.reset();          // reset time to 0 but keep playing
action.timeScale = 0.5;  // half speed
action.timeScale = -1;   // play in reverse
```

## react-drei

### useAnimations

The `useAnimations` hook wraps `AnimationMixer` boilerplate. It returns a map of actions keyed by clip name.

```tsx
import { useAnimations, useGLTF } from "@react-three/drei";
import { useRef } from "react";

function Character() {
  const ref = useRef<THREE.Group>(null!);
  const gltf = useGLTF("/character.glb");
  const { actions, mixer } = useAnimations(gltf.animations, ref);

  useEffect(() => {
    // Play the "Idle" clip
    actions["Idle"]?.play();

    return () => {
      // Cleanup: stop all actions
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  return <primitive ref={ref} object={gltf.scene} />;
}
```

### Crossfading with useAnimations

```tsx
function transitionTo(clipName: string) {
  const current = Object.values(actions).find((a) => a?.isRunning());
  const next = actions[clipName];
  if (!next) return;

  if (current) {
    current.crossFadeTo(next, 0.3, true);
  }
  next.reset().play();
}
```

### useFrame for Mixer Update

In React Three Fiber, the mixer created by `useAnimations` is automatically updated. You do not need to call `mixer.update(delta)` manually -- the hook handles this. If you create a mixer manually (without `useAnimations`), you do need `useFrame`:

```tsx
import { useFrame } from "@react-three/fiber";

useFrame((_, delta) => {
  mixer.update(delta);
});
```

## threlte

threlte provides animation support through its core and extras packages.

threlte animation docs: [threlte.xyz/docs](https://threlte.xyz/docs)

```svelte
<script>
  import { useGltf } from "@threlte/extras";
  import { useTask, useThrelte } from "@threlte/core";
  import { AnimationMixer } from "three";

  const gltf = useGltf("/character.glb");

  let mixer: AnimationMixer | undefined;

  $effect(() => {
    if ($gltf) {
      mixer = new AnimationMixer($gltf.scene);
      const clip = $gltf.animations[0];
      if (clip) {
        mixer.clipAction(clip).play();
      }
    }
  });

  useTask((delta) => {
    mixer?.update(delta);
  });
</script>

{#if $gltf}
  <T is={$gltf.scene} />
{/if}
```

The `useTask` callback runs once per frame, similar to `useFrame` in React Three Fiber. It receives `delta` (seconds since last frame) as its argument.

## Morph Targets

Morph targets (also called blend shapes) are per-vertex displacement arrays. Each morph target stores an offset for every vertex in the mesh. By blending between morph targets at runtime, you get smooth deformation -- used for facial expressions, lip sync, shape keys, and procedural deformation.

### Accessing Morph Targets

```typescript
// After loading a glTF with morph targets
gltf.scene.traverse((child) => {
  if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
    console.log("Morph targets:", child.morphTargetDictionary);
    // e.g., { "Smile": 0, "Frown": 1, "LeftEyeBlink": 2 }

    // Set a morph target influence (0 = off, 1 = fully applied)
    const smileIndex = child.morphTargetDictionary!["Smile"];
    child.morphTargetInfluences[smileIndex] = 0.8;
  }
});
```

### Animating Morph Weights

Morph targets can be keyframed in glTF animations just like transforms. The `weights` property on a mesh is the animation target:

```typescript
// Morph target animations are automatically handled by AnimationMixer
// if the glTF file contains animation clips targeting "weights"
const action = mixer.clipAction(morphClip);
action.play();
```

For programmatic animation (not from a glTF clip):

```typescript
// In the render loop
mesh.morphTargetInfluences![smileIndex] =
  Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5;
```

### Creating Morph Targets in Python

```python
import pygltflib
import numpy as np

# Build morph target data
# Base positions: (N, 3)
base_positions = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=np.float32)

# Morph target: displacement from base (same shape as positions)
smile_displacement = np.array([[0, 0.1, 0], [0, 0.1, 0], [0, 0, 0]], dtype=np.float32)

# Use pygltflib to construct the glTF with morph targets
# (pygltflib requires manual buffer/accessor construction -- see its docs)
```

pygltflib docs: [gitlab.com/dodgyville/pygltflib](https://gitlab.com/dodgyville/pygltflib)

## Skeletal Animation (Skinning)

Skeletal animation uses a hierarchy of bones (an armature or skeleton) to drive vertex positions. Each vertex has bone weights that determine which bones influence it and by how much. The GPU applies bone transforms to vertices using these weights, deforming the mesh to match the skeleton pose.

### Concepts

- **Bones**: a tree of transforms. Each bone has a parent (except the root) and a local transform.
- **Skin weights**: each vertex references up to 4 bones with weights summing to 1.0. `weights = [0.6, 0.3, 0.1, 0.0]` means bone 0 has 60% influence, bone 1 has 30%, bone 2 has 10%.
- **`SkinnedMesh`**: a three.js mesh type that uses a `Skeleton` to deform its geometry on the GPU.

### Accessing Bones from glTF

```typescript
gltf.scene.traverse((child) => {
  if (child instanceof THREE.Bone) {
    console.log("Bone:", child.name, "Parent:", child.parent?.name);
  }
});

// Find a specific bone
const head = gltf.scene.getObjectByName("Bone_Head") as THREE.Bone;

// Programmatic bone manipulation (for IK or procedural animation)
head.rotation.set(0.2, 0, 0); // tilt head forward
```

### Programmatic Bone Manipulation

For inverse kinematics (IK) or procedural animation, modify bone transforms directly:

```typescript
import { useFrame } from "@react-three/fiber";

function ProceduralHead({ target }: { target: THREE.Vector3 }) {
  const headBone = useRef<THREE.Bone>(null!);

  useFrame(() => {
    // Look-at for a bone (simple single-axis case)
    headBone.current.lookAt(target);
  });

  // ... attach headBone ref to the correct bone in the skeleton
}
```

Be careful: programmatic bone transforms and animation clip transforms conflict. If a clip is animating a bone, your manual rotation will be overwritten each frame. Either exclude that bone from the clip or stop the clip before taking manual control.

## Exporting Animated glTF from Python

### pygltflib

`pygltflib` lets you build glTF files programmatically, including animation channels. This is useful for generating animations from simulation data, motion capture, or procedural systems.

```python
import pygltflib
import numpy as np

gltf = pygltflib.GLTF2(
    scene=0,
    scenes=[pygltflib.Scene(nodes=[0])],
    nodes=[pygltflib.Node(translation=[0, 0, 0])],
)

# Build keyframe data
times = np.array([0.0, 0.5, 1.0], dtype=np.float32)
translations = np.array([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
], dtype=np.float32)

# Add buffers, buffer views, and accessors for the keyframe data
# Then add an animation with a channel targeting node 0's translation
# (See pygltflib docs for full buffer construction)

gltf.animations = [
    pygltflib.Animation(
        channels=[
            pygltflib.AnimationChannel(
                sampler=0,
                target=pygltflib.AnimationChannelTarget(node=0, path="translation"),
            )
        ],
        samplers=[
            pygltflib.AnimationSampler(
                input=0,   # accessor index for timestamps
                output=1,  # accessor index for values
                interpolation="LINEAR",
            )
        ],
    )
]
```

### Limitations

- **trimesh** does not support animation export. It can load animated glTFs but strips the animation data.
- **pygltflib** works but requires manual buffer/accessor management. For complex skeletal animations, consider using the Blender Python API (`bpy`) to construct the animation and export via Blender's glTF exporter.
- **Blender bpy**: the most capable option for complex animations. Run Blender in headless mode (`blender --background --python script.py`) to generate animated glTFs from Python scripts.
