"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import WorkflowNode, { GeometryType } from "./WorkflowNode";

interface NodeDef {
  id: string;
  geometry: GeometryType;
  label: string;
  angle: number;
  description: string;
}

const NODES: NodeDef[] = [
  { id: "sync", geometry: "box", label: "同步", angle: Math.PI * 0.5, description: "接入 B 站收藏夹数据" },
  { id: "extract", geometry: "octahedron", label: "提炼", angle: 0, description: "ASR 语音转文本提取内容" },
  { id: "vectorize", geometry: "icosahedron", label: "向量化", angle: Math.PI * 1.5, description: "文本切片 → Embedding 写入 ChromaDB" },
  { id: "chat", geometry: "sphere", label: "对话", angle: Math.PI, description: "语义检索 + LLM 生成回答" },
];

const RING_RADIUS = 3.2;
const FLOW_PARTICLE_COUNT = 10;

export default function WorkflowRing() {
  const ringRef = useRef<THREE.Group>(null);
  const flowParticlesRef = useRef<THREE.Group>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const lineCurve = useMemo(() => {
    const pts: THREE.Vector3[] = NODES.map((node) => {
      const x = Math.cos(node.angle) * RING_RADIUS;
      const z = Math.sin(node.angle) * RING_RADIUS;
      return new THREE.Vector3(x, 0, z);
    });
    pts.push(pts[0].clone());
    return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  }, []);

  const tubePoints = useMemo(() => lineCurve.getPoints(120), [lineCurve]);

  const nodePositions = useMemo(() => {
    return NODES.map((node) => {
      const x = Math.cos(node.angle) * RING_RADIUS;
      const z = Math.sin(node.angle) * RING_RADIUS;
      return [x, 0, z] as [number, number, number];
    });
  }, []);

  // Flow particle initial offsets (0-1 around the curve)
  const flowOffsets = useMemo(() => {
    return Array.from({ length: FLOW_PARTICLE_COUNT }, (_, i) => i / FLOW_PARTICLE_COUNT);
  }, []);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.y += delta * 0.06;

    // Move flow particles along the curve
    if (flowParticlesRef.current) {
      const speed = delta * 0.12;
      for (let i = 0; i < flowOffsets.length; i++) {
        flowOffsets[i] = (flowOffsets[i] + speed) % 1;
        const pt = lineCurve.getPointAt(flowOffsets[i]);
        const child = flowParticlesRef.current.children[i];
        if (child) {
          child.position.copy(pt);
        }
      }
    }
  });

  return (
    <group ref={ringRef}>
      {/* Connecting lines — cyan-tinted */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(tubePoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#06b6d4" transparent opacity={0.18} />
      </line>

      {/* Brighter ring line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(tubePoints.flatMap((p) => [p.x, p.y + 0.002, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.12} />
      </line>

      {/* Flow particles along the curve */}
      <group ref={flowParticlesRef}>
        {flowOffsets.map((_, i) => (
          <mesh key={i} position={lineCurve.getPointAt(flowOffsets[i])}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Nodes */}
      {NODES.map((node, i) => (
        <group key={node.id} position={nodePositions[i]}>
          <WorkflowNode
            geometry={node.geometry}
            position={[0, 0, 0]}
            label={node.label}
            active={activeNodeId === node.id || hoveredNodeId === node.id}
            onClick={() =>
              setActiveNodeId((prev) => (prev === node.id ? null : node.id))
            }
            onHover={(hovered) =>
              setHoveredNodeId(hovered ? node.id : null)
            }
          />

          {/* Label above node */}
          <Html
            position={[0, 0.7, 0]}
            center
            style={{ pointerEvents: "none" }}
            distanceFactor={8}
            occlude={[ringRef as React.RefObject<THREE.Object3D>]}
          >
            <div
              style={{
                color: activeNodeId === node.id ? "#06b6d4" : "#94a3b8",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
                textShadow: "0 0 8px rgba(6,182,212,0.3)",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {node.label}
            </div>
          </Html>

          {/* Hover description */}
          {(hoveredNodeId === node.id || activeNodeId === node.id) && (
            <Html
              position={[0, -0.65, 0]}
              center
              style={{ pointerEvents: "none" }}
              distanceFactor={9}
            >
              <div
                style={{
                  color: activeNodeId === node.id ? "#e2e8f0" : "#8b949e",
                  fontSize: "11px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.15)",
                  transition: "all 0.2s",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {node.description}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
