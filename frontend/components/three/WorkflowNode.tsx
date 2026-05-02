"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type GeometryType = "box" | "octahedron" | "icosahedron" | "sphere";

interface WorkflowNodeProps {
  geometry: GeometryType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

const GEOMETRY_MAP: Record<GeometryType, { geo: THREE.BufferGeometry; wireframe: boolean }> = {
  box: { geo: new THREE.BoxGeometry(0.55, 0.55, 0.55, 2, 2, 2), wireframe: false },
  octahedron: { geo: new THREE.OctahedronGeometry(0.5, 0), wireframe: false },
  icosahedron: { geo: new THREE.IcosahedronGeometry(0.5, 0), wireframe: false },
  sphere: { geo: new THREE.SphereGeometry(0.45, 24, 24), wireframe: false },
};

export default function WorkflowNode({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  active = false,
  onClick,
  onHover,
}: WorkflowNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const { geo } = useMemo(() => GEOMETRY_MAP[geometry], [geometry]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x += delta * 0.2;
    groupRef.current.rotation.y += delta * 0.3;

    if (pulseRef.current && active) {
      const s = 1 + Math.sin(Date.now() * 0.004) * 0.15;
      pulseRef.current.scale.setScalar(s);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.2 + Math.sin(Date.now() * 0.004) * 0.15;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Main geometry */}
      <mesh
        ref={groupRef as unknown as React.Ref<THREE.Mesh>}
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover?.(false);
          document.body.style.cursor = "";
        }}
      >
        <meshStandardMaterial
          color={active ? "#06b6d4" : "#555555"}
          roughness={0.3}
          metalness={0.1}
          emissive={active ? "#06b6d4" : "#333333"}
          emissiveIntensity={active ? 0.8 : 0.1}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh geometry={geo}>
        <meshBasicMaterial
          color={active ? "#22d3ee" : "#555555"}
          wireframe
          transparent
          opacity={active ? 0.35 : 0.1}
        />
      </mesh>

      {/* Pulse ring for active node */}
      {active && (
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.7, 0.75, 48]} />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
