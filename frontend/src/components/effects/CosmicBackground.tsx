// Background Effects — Three.js 3D privacy-themed scene + grid overlay

import { FC, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei/core/MeshDistortMaterial';
import { Float } from '@react-three/drei/core/Float';
import * as THREE from 'three';

// Encrypted data streams — vertical lines of "data" flowing through the scene
const DataStreams: FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const streamCount = 24;

  const streams = useMemo(() => {
    const arr: { x: number; z: number; speed: number; height: number; delay: number }[] = [];
    for (let i = 0; i < streamCount; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 30,
        z: (Math.random() - 0.5) * 15 - 5,
        speed: 0.3 + Math.random() * 0.8,
        height: 2 + Math.random() * 4,
        delay: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const s = streams[i];
      child.position.y = ((t * s.speed + s.delay) % 12) - 6;
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const fade = 1 - Math.abs(child.position.y) / 6;
      mat.opacity = Math.max(0, fade * 0.15);
    });
  });

  return (
    <group ref={groupRef}>
      {streams.map((s, i) => (
        <mesh key={i} position={[s.x, 0, s.z]}>
          <boxGeometry args={[0.02, s.height, 0.02]} />
          <meshBasicMaterial color="#d4bbff" transparent opacity={0.1} />
        </mesh>
      ))}
    </group>
  );
};

// Connected network nodes — floating points with connections
const NetworkNodes: FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const nodeCount = 40;

  const nodes = useMemo(() => {
    const arr: { pos: [number, number, number]; speed: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      arr.push({
        pos: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10 - 5],
        speed: 0.1 + Math.random() * 0.3,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      if (i < nodeCount) {
        const n = nodes[i];
        child.position.y = n.pos[1] + Math.sin(t * n.speed + i) * 0.5;
      }
    });
  });

  const connections = useMemo(() => {
    const lines: { from: number; to: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const d = Math.sqrt(
          (nodes[i].pos[0] - nodes[j].pos[0]) ** 2 +
          (nodes[i].pos[1] - nodes[j].pos[1]) ** 2 +
          (nodes[i].pos[2] - nodes[j].pos[2]) ** 2
        );
        if (d < 5) lines.push({ from: i, to: j });
      }
    }
    return lines;
  }, [nodes]);

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <mesh key={`n${i}`} position={n.pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#d4bbff" transparent opacity={0.25} />
        </mesh>
      ))}
      {connections.map((c, i) => {
        const from = nodes[c.from].pos;
        const to = nodes[c.to].pos;
        const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
        const len = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2);
        const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh key={`c${i}`} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.005, 0.005, len, 4]} />
            <meshBasicMaterial color="#d4bbff" transparent opacity={0.06} />
          </mesh>
        );
      })}
    </group>
  );
};

// Triple-layer rotating wireframe shield
const PrivacyShield: FC = () => {
  const outerRef = useRef<THREE.Mesh>(null);
  const middleRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.05;
      outerRef.current.rotation.x = Math.sin(t * 0.03) * 0.1;
    }
    if (middleRef.current) {
      middleRef.current.rotation.y = -t * 0.07;
      middleRef.current.rotation.z = Math.cos(t * 0.04) * 0.08;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = t * 0.09;
      innerRef.current.rotation.x = Math.cos(t * 0.05) * 0.06;
    }
  });

  return (
    <group>
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[4.5, 1]} />
        <meshBasicMaterial color="#d4bbff" wireframe transparent opacity={0.04} />
      </mesh>
      <mesh ref={middleRef}>
        <icosahedronGeometry args={[3.2, 2]} />
        <meshBasicMaterial color="#7dffa2" wireframe transparent opacity={0.03} />
      </mesh>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color="#d4bbff" wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
};

// Particle field
const ParticleField: FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const count = 600;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#d4bbff" transparent opacity={0.2} sizeAttenuation depthWrite={false} />
    </points>
  );
};

// Main background
export const ThreeBackground: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
    <Canvas
      camera={{ position: [0, 0, 10], fov: 55 }}
      gl={{ antialias: false, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.15} />
      <ParticleField />
      <PrivacyShield />
      <NetworkNodes />
      <DataStreams />
    </Canvas>
  </div>
);

// Grid overlay background
export const GridBackground: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
    <div className="absolute inset-0 grid-overlay" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]/80" />
  </div>
);

// HUD decorative elements
export const HudDecorations: FC = () => (
  <>
    <div className="hidden xl:block fixed top-1/2 left-4 -translate-y-1/2 -rotate-90 pointer-events-none z-10">
      <span className="text-[10px] font-mono text-primary/30 tracking-[1em] uppercase">
        SECURE_PROTOCOL_ACCESS_GRANTED
      </span>
    </div>
    <div className="hidden xl:block fixed bottom-10 right-10 pointer-events-none z-10">
      <div className="flex items-end gap-2">
        <div className="w-1 h-32 bg-gradient-to-t from-primary/20 to-transparent" />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-secondary">ENCRYPTION: 100%</span>
          <span className="text-[10px] font-mono text-primary/40 tracking-tighter">0XAA93...F422</span>
        </div>
      </div>
    </div>
  </>
);

export const AnimatedCounter: FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <span className={className} key={value}>{value}</span>
);

// ——— Hero 3D — Organic glowing blob (UI-Layouts R3F Blob approach) ———

// Main organic blob — glowing distorted sphere with premium material
const PrivacyBlob: FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.06;
    }
  });

  return (
    <mesh ref={meshRef} scale={[2.2, 2.2, 2.2]}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color="#1a0e2e"
        emissive="#d4bbff"
        emissiveIntensity={0.4}
        roughness={0.2}
        metalness={0.8}
        distort={0.3}
        speed={1.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

// Inner accent blob — smaller green glow
const InnerGlow: FC = () => (
  <mesh scale={[1.1, 1.1, 1.1]}>
    <sphereGeometry args={[1, 32, 32]} />
    <MeshDistortMaterial
      color="#0a1a10"
      emissive="#7dffa2"
      emissiveIntensity={0.25}
      roughness={0.3}
      metalness={0.6}
      distort={0.25}
      speed={2.0}
      transparent
      opacity={0.35}
    />
  </mesh>
);

// Subtle shield wireframe outline overlay
const ShieldOutline: FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const shieldShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -2.8);
    s.bezierCurveTo(1.0, -1.8, 2.0, -0.2, 2.1, 1.0);
    s.bezierCurveTo(2.15, 1.8, 1.5, 2.3, 0, 2.6);
    s.bezierCurveTo(-1.5, 2.3, -2.15, 1.8, -2.1, 1.0);
    s.bezierCurveTo(-2.0, -0.2, -1.0, -1.8, 0, -2.8);
    return s;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.5]} scale={[1.1, 1.1, 1]}>
      <shapeGeometry args={[shieldShape]} />
      <meshBasicMaterial color="#d4bbff" wireframe transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Single glowing ring around the blob
const GlowRing: FC = () => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[2.6, 0.015, 16, 100]} />
      <meshBasicMaterial color="#7dffa2" transparent opacity={0.3} />
    </mesh>
  );
};

// Exported Hero 3D component
export const HeroShield: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full h-full ${className}`}>
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 5]} intensity={1.5} color="#d4bbff" distance={12} />
      <pointLight position={[-3, 2, 3]} intensity={0.5} color="#7dffa2" distance={10} />
      <pointLight position={[2, -2, 2]} intensity={0.3} color="#d4bbff" distance={8} />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <PrivacyBlob />
        <InnerGlow />
        <ShieldOutline />
        <GlowRing />
      </Float>
    </Canvas>
  </div>
);
