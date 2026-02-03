import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Deep space dome backdrop
function AbyssDome() {
  return (
    <mesh>
      <sphereGeometry args={[80, 64, 64]} />
      <meshBasicMaterial color="#030508" side={THREE.BackSide} />
    </mesh>
  );
}

// Subtle rotating rings with depth
function AbyssRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        radius: 4 + index * 1.5,
        thickness: 0.03 + index * 0.008,
        z: -index * 5 - 6,
        rotation: Math.random() * Math.PI,
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((ring, index) => {
      ring.rotation.z += delta * 0.08;
      ring.position.z += delta * 3.5;
      if (ring.position.z > 8) {
        ring.position.z = -60;
        ring.rotation.z = rings[index].rotation;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, index) => (
        <mesh key={index} position={[0, 0, ring.z]} rotation={[Math.PI / 2.2, 0, ring.rotation]}>
          <torusGeometry args={[ring.radius, ring.thickness, 16, 80]} />
          <meshBasicMaterial color="#1e293b" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// Subtle perspective grid floor
function AbyssGrid() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = (state.clock.elapsedTime * 2) % 20;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -5, 0]}>
      <planeGeometry args={[100, 100, 50, 50]} />
      <meshBasicMaterial color="#334155" wireframe transparent opacity={0.08} />
    </mesh>
  );
}

// Floating dust particles
function AbyssParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 0.15;
        if (positions[i + 2] > 8) {
          positions[i + 2] = -80;
          positions[i] = (Math.random() - 0.5) * 40;
          positions[i + 1] = (Math.random() - 0.5) * 30;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={400} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#64748b" size={0.05} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

// Ambient glow orbs for atmosphere
function AbyssGlows() {
  const groupRef = useRef<THREE.Group>(null);
  const glows = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        position: [
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 16,
          -Math.random() * 50,
        ] as [number, number, number],
        scale: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.3,
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((glow, index) => {
      glow.position.y = glows[index].position[1] + Math.sin(state.clock.elapsedTime * glows[index].speed) * 0.4;
      glow.rotation.y = state.clock.elapsedTime * 0.1;
    });
  });

  return (
    <group ref={groupRef}>
      {glows.map((glow, index) => (
        <mesh key={index} position={glow.position} scale={glow.scale}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

// Volumetric light beams
function AbyssBeams() {
  const groupRef = useRef<THREE.Group>(null);
  const beams = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        position: [
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 15,
          -Math.random() * 70,
        ] as [number, number, number],
        rotation: Math.random() * Math.PI,
        scale: 2 + Math.random() * 3,
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((beam, index) => {
      beam.position.z += delta * 3;
      beam.rotation.z += delta * 0.1;
      if (beam.position.z > 10) {
        beam.position.z = -70;
        beam.position.x = (Math.random() - 0.5) * 25;
        beam.position.y = (Math.random() - 0.5) * 15;
        beam.rotation.z = beams[index].rotation;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {beams.map((beam, index) => (
        <mesh key={index} position={beam.position} rotation={[0, 0, beam.rotation]} scale={beam.scale}>
          <planeGeometry args={[0.15, 10]} />
          <meshBasicMaterial
            color="#64748b"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Smooth camera movement following mouse
function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 1.5, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 1, 0.04);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 8 + Math.sin(state.clock.elapsedTime * 0.15) * 0.4, 0.03);
    camera.lookAt(0, 0, -25);
  });

  return null;
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0.5, 8], fov: 55 }} style={{ background: 'transparent' }}>
        <fog attach="fog" args={['#030508', 10, 60]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 10, 10]} intensity={0.3} color="#475569" />
        <AbyssDome />
        <AbyssRings />
        <AbyssGrid />
        <AbyssParticles />
        <AbyssGlows />
        <AbyssBeams />
        <CameraRig />
      </Canvas>
    </div>
  );
}
