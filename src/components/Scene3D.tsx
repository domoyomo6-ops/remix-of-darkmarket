import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, Center, Float } from '@react-three/drei';
import * as THREE from 'three';

// Matrix rain columns
function MatrixRain() {
  const count = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const { positions, speeds, chars } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const chr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 40 - 20;
      pos[i * 3 + 2] = Math.random() * -50 - 10;
      spd[i] = 0.1 + Math.random() * 0.3;
      chr[i] = Math.random();
    }
    return { positions: pos, speeds: spd, chars: chr };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= speeds[i];
      if (positions[i * 3 + 1] < -25) {
        positions[i * 3 + 1] = 25;
        positions[i * 3] = (Math.random() - 0.5) * 60;
      }
      
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      dummy.scale.setScalar(0.3 + chars[i] * 0.4);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.08, 0.6, 0.02]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// Cyber grid floor with perspective
function CyberGrid() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = (state.clock.elapsedTime * 3) % 20;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -8, 0]}>
      <planeGeometry args={[120, 120, 60, 60]} />
      <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

// Floating particles
function CyberParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 0.2;
        if (positions[i + 2] > 10) {
          positions[i + 2] = -100;
          positions[i] = (Math.random() - 0.5) * 50;
          positions[i + 1] = (Math.random() - 0.5) * 35;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={800} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00ff88" size={0.06} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// Holographic rings
function HoloRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      radius: 5 + i * 2.5,
      z: -i * 8 - 10,
      rotSpeed: 0.1 + Math.random() * 0.1,
    })), []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((ring, i) => {
      ring.rotation.z += delta * rings[i].rotSpeed;
      ring.position.z += delta * 5;
      if (ring.position.z > 15) ring.position.z = -60;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, 0, ring.z]} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[ring.radius, 0.04, 16, 100]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// Glowing orbs
function GlowOrbs() {
  const groupRef = useRef<THREE.Group>(null);
  const orbs = useMemo(() => 
    Array.from({ length: 12 }, () => ({
      pos: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, -Math.random() * 60 - 10] as [number, number, number],
      scale: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.3,
    })), []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((orb, i) => {
      orb.position.y = orbs[i].pos[1] + Math.sin(state.clock.elapsedTime * orbs[i].speed) * 2;
      (orb as THREE.Mesh).scale.setScalar(orbs[i].scale * (1 + Math.sin(state.clock.elapsedTime * 2) * 0.1));
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.pos} scale={orb.scale}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// Data streams
function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);
  const streams = useMemo(() => 
    Array.from({ length: 20 }, () => ({
      pos: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 25, -Math.random() * 80] as [number, number, number],
      length: 3 + Math.random() * 8,
      speed: 3 + Math.random() * 4,
    })), []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((stream, i) => {
      stream.position.z += delta * streams[i].speed;
      if (stream.position.z > 15) {
        stream.position.z = -80;
        stream.position.x = (Math.random() - 0.5) * 40;
        stream.position.y = (Math.random() - 0.5) * 25;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {streams.map((stream, i) => (
        <mesh key={i} position={stream.pos}>
          <boxGeometry args={[0.02, 0.02, stream.length]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// Mouse-following camera
function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 3, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 2, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 10 + Math.sin(state.clock.elapsedTime * 0.2) * 0.5, 0.03);
    camera.lookAt(0, 0, -30);
  });
  return null;
}

// Dome backdrop
function CyberDome() {
  return (
    <mesh>
      <sphereGeometry args={[100, 64, 64]} />
      <meshBasicMaterial color="#020405" side={THREE.BackSide} />
    </mesh>
  );
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} style={{ background: 'transparent' }}>
        <fog attach="fog" args={['#020405', 15, 80]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 10, 10]} intensity={0.5} color="#00ff88" />
        <CyberDome />
        <MatrixRain />
        <CyberGrid />
        <CyberParticles />
        <HoloRings />
        <GlowOrbs />
        <DataStreams />
        <CameraRig />
      </Canvas>
    </div>
  );
}
