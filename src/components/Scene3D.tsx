import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function AbyssDome() {
  return (
    <mesh>
      <sphereGeometry args={[60, 64, 64]} />
      <meshBasicMaterial color="#05060b" side={THREE.BackSide} />
    </mesh>
  );
}

function AbyssRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        radius: 3 + index * 1.2,
        thickness: 0.06 + index * 0.01,
        z: -index * 4 - 4,
        rotation: Math.random() * Math.PI,
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((ring, index) => {
      ring.rotation.z += delta * 0.15;
      ring.position.z += delta * 4.2;
      if (ring.position.z > 6) {
        ring.position.z = -54;
        ring.rotation.z = rings[index].rotation;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, index) => (
        <mesh key={index} position={[0, 0, ring.z]} rotation={[Math.PI / 2.2, 0, ring.rotation]}>
          <torusGeometry args={[ring.radius, ring.thickness, 16, 60]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function AbyssGrid() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = (state.clock.elapsedTime * 2.8) % 16;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[80, 80, 40, 40]} />
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
    </mesh>
  );
}

function AbyssParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={600} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#38bdf8" size={0.08} transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

function AbyssGlows() {
  const groupRef = useRef<THREE.Group>(null);
  const glows = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        position: [
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 12,
          -Math.random() * 40,
        ] as [number, number, number],
        scale: 0.8 + Math.random() * 1.8,
        speed: 0.3 + Math.random() * 0.4,
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((glow, index) => {
      glow.position.y = glows[index].position[1] + Math.sin(state.clock.elapsedTime * glows[index].speed) * 0.6;
      glow.rotation.y = state.clock.elapsedTime * 0.15;
    });
  });

  return (
    <group ref={groupRef}>
      {glows.map((glow, index) => (
        <mesh key={index} position={glow.position} scale={glow.scale}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 2.4, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 1.6, 0.06);
    camera.lookAt(0, 0, -18);
  });

  return null;
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0.5, 6], fov: 60 }} style={{ background: 'transparent' }}>
        <fog attach="fog" args={['#05060b', 8, 48]} />
        <ambientLight intensity={0.35} />
        <AbyssDome />
        <AbyssRings />
        <AbyssGrid />
        <AbyssParticles />
        <AbyssGlows />
        <CameraRig />
      </Canvas>
    </div>
  );
}
