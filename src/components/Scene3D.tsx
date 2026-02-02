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
          <meshBasicMaterial
            color="#0ea5e9"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function AbyssGrid() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = (state.clock.elapsedTime * 3.4) % 18;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[80, 80, 40, 40]} />
      <meshBasicMaterial
        color="#22d3ee"
        wireframe
        transparent
        opacity={0.16}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function AbyssParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const positions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 2] = -Math.random() * 80;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 0.25;
        if (positions[i + 2] > 6) {
          positions[i + 2] = -80;
          positions[i] = (Math.random() - 0.5) * 36;
          positions[i + 1] = (Math.random() - 0.5) * 28;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={900} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#38bdf8"
        size={0.08}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
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
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function AbyssTunnel() {
  const groupRef = useRef<THREE.Group>(null);
  const segments = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        position: [0, 0, -index * 12] as [number, number, number],
        rotation: Math.random() * Math.PI,
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((segment, index) => {
      segment.position.z += delta * 6.5;
      segment.rotation.z += delta * 0.08;
      if (segment.position.z > 6) {
        segment.position.z = -72;
        segment.rotation.z = segments[index].rotation;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {segments.map((segment, index) => (
        <mesh key={index} position={segment.position} rotation={[0, 0, segment.rotation]}>
          <cylinderGeometry args={[16, 16, 12, 36, 1, true]} />
          <meshBasicMaterial
            color="#0f172a"
            wireframe
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function AbyssBeams() {
  const groupRef = useRef<THREE.Group>(null);
  const beams = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 12,
          -Math.random() * 60,
        ] as [number, number, number],
        rotation: Math.random() * Math.PI,
        scale: 1.5 + Math.random() * 2,
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((beam, index) => {
      beam.position.z += delta * 4.5;
      beam.rotation.z += delta * 0.2;
      if (beam.position.z > 8) {
        beam.position.z = -60;
        beam.position.x = (Math.random() - 0.5) * 20;
        beam.position.y = (Math.random() - 0.5) * 12;
        beam.rotation.z = beams[index].rotation;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {beams.map((beam, index) => (
        <mesh key={index} position={beam.position} rotation={[0, 0, beam.rotation]} scale={beam.scale}>
          <planeGeometry args={[0.2, 8]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
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
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6 + Math.sin(state.clock.elapsedTime * 0.2) * 0.6, 0.04);
    camera.lookAt(0, 0, -22);
  });

  return null;
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0.5, 7], fov: 62 }} style={{ background: 'transparent' }}>
        <fog attach="fog" args={['#05060b', 6, 58]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 6, 6]} intensity={0.6} color="#38bdf8" />
        <pointLight position={[-6, 2, 4]} intensity={0.8} color="#0ea5e9" />
        <AbyssDome />
        <AbyssTunnel />
        <AbyssRings />
        <AbyssGrid />
        <AbyssParticles />
        <AbyssBeams />
        <AbyssGlows />
        <CameraRig />
      </Canvas>
    </div>
  );
}
