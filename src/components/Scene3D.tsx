import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============ WARHOL/BASQUIAT INSPIRED ARTISTIC ELEMENTS ============

// Pop Art Floating Cubes - Warhol inspired color blocks
function PopArtCubes() {
  const groupRef = useRef<THREE.Group>(null);
  const cubes = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 30,
        -Math.random() * 60 - 15
      ] as [number, number, number],
      scale: 1 + Math.random() * 3,
      rotSpeed: 0.1 + Math.random() * 0.2,
      color: ['#FF1493', '#00FFFF', '#FFD700', '#FF4500', '#39FF14', '#FF00FF'][i % 6],
    })), []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((cube, i) => {
      cube.rotation.x += cubes[i].rotSpeed * 0.01;
      cube.rotation.y += cubes[i].rotSpeed * 0.015;
      cube.position.y = cubes[i].pos[1] + Math.sin(state.clock.elapsedTime * 0.5 + i) * 2;
    });
  });

  return (
    <group ref={groupRef}>
      {cubes.map((cube, i) => (
        <mesh key={i} position={cube.pos} scale={cube.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={cube.color} transparent opacity={0.15} wireframe />
        </mesh>
      ))}
    </group>
  );
}

// Basquiat Crown Elements - Iconic crown shapes
function BasquiatCrowns() {
  const groupRef = useRef<THREE.Group>(null);
  const crowns = useMemo(() => 
    Array.from({ length: 6 }, () => ({
      pos: [
        (Math.random() - 0.5) * 40,
        Math.random() * 15 + 5,
        -Math.random() * 40 - 20
      ] as [number, number, number],
      scale: 0.8 + Math.random() * 1.2,
      rotY: Math.random() * Math.PI * 2,
    })), []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((crown, i) => {
      crown.rotation.y = crowns[i].rotY + state.clock.elapsedTime * 0.1;
      crown.position.y = crowns[i].pos[1] + Math.sin(state.clock.elapsedTime * 0.3 + i * 2) * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {crowns.map((crown, i) => (
        <group key={i} position={crown.pos} scale={crown.scale}>
          {/* Crown base */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3, 0.3, 0.1]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.4} />
          </mesh>
          {/* Crown spikes */}
          {[-1, 0, 1].map((x, j) => (
            <mesh key={j} position={[x, 0.8, 0]}>
              <coneGeometry args={[0.3, 1.2, 3]} />
              <meshBasicMaterial color="#FFD700" transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Neon Scribble Lines - Basquiat style raw energy
function NeonScribbles() {
  const linesRef = useRef<THREE.Group>(null);
  const lines = useMemo(() => 
    Array.from({ length: 20 }, () => {
      const points = [];
      let x = (Math.random() - 0.5) * 30;
      let y = (Math.random() - 0.5) * 20;
      const z = -Math.random() * 50 - 10;
      
      for (let i = 0; i < 8; i++) {
        points.push(new THREE.Vector3(x, y, z));
        x += (Math.random() - 0.5) * 4;
        y += (Math.random() - 0.5) * 4;
      }
      
      return {
        points,
        color: ['#00ff88', '#FF1493', '#00FFFF', '#FFD700', '#FF4500'][Math.floor(Math.random() * 5)],
      };
    }), []
  );

  useFrame((state) => {
    if (!linesRef.current) return;
    linesRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
  });

  return (
    <group ref={linesRef}>
      {lines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={line.points.length}
              array={new Float32Array(line.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={line.color} transparent opacity={0.3} linewidth={2} />
        </line>
      ))}
    </group>
  );
}

// Pop Art Dollar Signs - Warhol money art reference
function DollarSigns() {
  const groupRef = useRef<THREE.Group>(null);
  const signs = useMemo(() => 
    Array.from({ length: 8 }, () => ({
      pos: [
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 25,
        -Math.random() * 50 - 15
      ] as [number, number, number],
      scale: 1 + Math.random() * 2,
      rotSpeed: 0.05 + Math.random() * 0.1,
    })), []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((sign, i) => {
      sign.rotation.y = state.clock.elapsedTime * signs[i].rotSpeed;
      sign.position.z = signs[i].pos[2] + Math.sin(state.clock.elapsedTime * 0.2 + i) * 2;
    });
  });

  return (
    <group ref={groupRef}>
      {signs.map((sign, i) => (
        <group key={i} position={sign.pos} scale={sign.scale}>
          {/* S shape approximation */}
          <mesh position={[0, 0.5, 0]}>
            <torusGeometry args={[0.4, 0.08, 8, 16, Math.PI]} />
            <meshBasicMaterial color="#39FF14" transparent opacity={0.35} />
          </mesh>
          <mesh position={[0, -0.5, 0]} rotation={[0, Math.PI, 0]}>
            <torusGeometry args={[0.4, 0.08, 8, 16, Math.PI]} />
            <meshBasicMaterial color="#39FF14" transparent opacity={0.35} />
          </mesh>
          {/* Vertical line */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 2.5, 0.08]} />
            <meshBasicMaterial color="#39FF14" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============ MATRIX/CYBER ELEMENTS ============

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
      <meshBasicMaterial color="#00ff88" transparent opacity={0.5} />
    </instancedMesh>
  );
}

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
      <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.12} />
    </mesh>
  );
}

function CyberParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
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
        positions[i + 2] += 0.15;
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
        <bufferAttribute attach="attributes-position" count={600} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00ff88" size={0.06} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function HoloRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      radius: 5 + i * 3,
      z: -i * 10 - 10,
      rotSpeed: 0.08 + Math.random() * 0.08,
    })), []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((ring, i) => {
      ring.rotation.z += delta * rings[i].rotSpeed;
      ring.position.z += delta * 4;
      if (ring.position.z > 15) ring.position.z = -60;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, 0, ring.z]} rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[ring.radius, 0.03, 16, 100]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

// Floating geometric shapes - Street art vibe
function StreetArtShapes() {
  const groupRef = useRef<THREE.Group>(null);
  const shapes = useMemo(() => 
    Array.from({ length: 15 }, () => ({
      pos: [
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 25,
        -Math.random() * 60 - 10
      ] as [number, number, number],
      type: Math.floor(Math.random() * 4), // 0: triangle, 1: circle, 2: star shape, 3: X
      scale: 0.5 + Math.random() * 1.5,
      color: ['#FF1493', '#00FFFF', '#FFD700', '#00ff88', '#FF4500', '#9400D3'][Math.floor(Math.random() * 6)],
      rotSpeed: 0.02 + Math.random() * 0.05,
    })), []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((shape, i) => {
      shape.rotation.z += shapes[i].rotSpeed;
      shape.position.y = shapes[i].pos[1] + Math.sin(state.clock.elapsedTime * 0.5 + i) * 1.5;
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((shape, i) => (
        <mesh key={i} position={shape.pos} scale={shape.scale}>
          {shape.type === 0 && <coneGeometry args={[1, 1.5, 3]} />}
          {shape.type === 1 && <ringGeometry args={[0.5, 1, 32]} />}
          {shape.type === 2 && <octahedronGeometry args={[1]} />}
          {shape.type === 3 && <tetrahedronGeometry args={[1]} />}
          <meshBasicMaterial color={shape.color} transparent opacity={0.2} wireframe />
        </mesh>
      ))}
    </group>
  );
}

// Camera rig with mouse following
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

// Backdrop dome
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
        
        {/* Background */}
        <CyberDome />
        
        {/* Matrix/Cyber elements */}
        <MatrixRain />
        <CyberGrid />
        <CyberParticles />
        <HoloRings />
        
        {/* Warhol/Basquiat artistic elements */}
        <PopArtCubes />
        <BasquiatCrowns />
        <NeonScribbles />
        <DollarSigns />
        <StreetArtShapes />
        
        {/* Camera */}
        <CameraRig />
      </Canvas>
    </div>
  );
}
