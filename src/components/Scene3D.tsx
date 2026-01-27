import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function GridPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z = (state.clock.elapsedTime * 2) % 10;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[40, 40, 40, 40]} />
      <meshBasicMaterial 
        color="#22c55e" 
        wireframe 
        transparent 
        opacity={0.15}
      />
    </mesh>
  );
}

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        color="#22c55e" 
        size={0.05} 
        transparent 
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function DataLines() {
  const linesRef = useRef<THREE.Group>(null);
  
  const lines = useMemo(() => {
    const lineData = [];
    for (let i = 0; i < 8; i++) {
      const points = [];
      const startX = (Math.random() - 0.5) * 15;
      const startY = (Math.random() - 0.5) * 10;
      const startZ = (Math.random() - 0.5) * 10;
      
      points.push(new THREE.Vector3(startX, startY, startZ));
      points.push(new THREE.Vector3(startX + (Math.random() - 0.5) * 5, startY + (Math.random() - 0.5) * 3, startZ - 5));
      points.push(new THREE.Vector3(startX + (Math.random() - 0.5) * 8, startY + (Math.random() - 0.5) * 5, startZ - 10));
      
      lineData.push(points);
    }
    return lineData;
  }, []);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={linesRef}>
      {lines.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#22c55e" transparent opacity={0.3} />
        </line>
      ))}
    </group>
  );
}

function FloatingCubes() {
  const groupRef = useRef<THREE.Group>(null);
  
  const cubes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8 - 5
      ] as [number, number, number],
      scale: 0.3 + Math.random() * 0.4,
      rotationSpeed: 0.2 + Math.random() * 0.3
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((cube, i) => {
        cube.rotation.x = state.clock.elapsedTime * cubes[i].rotationSpeed;
        cube.rotation.y = state.clock.elapsedTime * cubes[i].rotationSpeed * 0.7;
        cube.position.y = cubes[i].position[1] + Math.sin(state.clock.elapsedTime + i) * 0.5;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {cubes.map((cube, i) => (
        <mesh key={i} position={cube.position} scale={cube.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial 
            color="#22c55e" 
            wireframe 
            transparent 
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <GridPlane />
        <FloatingParticles />
        <DataLines />
        <FloatingCubes />
      </Canvas>
    </div>
  );
}
