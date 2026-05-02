"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ORBIT_PARTICLE_COUNT = 20;

export default function Sun() {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);

  const orbitParticles = useMemo(() => {
    return Array.from({ length: ORBIT_PARTICLE_COUNT }, (_, i) => ({
      angle: (i / ORBIT_PARTICLE_COUNT) * Math.PI * 2,
      radius: 1.6 + Math.random() * 0.4,
      speed: 0.3 + Math.random() * 0.5,
      y: (Math.random() - 0.5) * 0.6,
    }));
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
    if (glowRef.current) {
      const s = 1 + Math.sin(Date.now() * 0.002) * 0.04;
      glowRef.current.scale.setScalar(s);
    }
    if (innerGlowRef.current) {
      const s = 1 + Math.sin(Date.now() * 0.003 + 1) * 0.03;
      innerGlowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={[-7.5, 0.8, -2]}>
      {/* Core sun */}
      <mesh>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshBasicMaterial color="#ff8c00" />
      </mesh>

      {/* Inner hot layer */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.3, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uColor: { value: new THREE.Color("#ff8c00") },
          }}
          vertexShader={/* glsl */ `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform vec3 uColor;
            uniform float uTime;
            void main() {
              float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              fresnel = pow(fresnel, 2.5);
              float alpha = fresnel * 0.45;
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>

      {/* Wider glow shell */}
      <mesh>
        <sphereGeometry args={[1.7, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uColor: { value: new THREE.Color("#ff6600") },
          }}
          vertexShader={/* glsl */ `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec3 vNormal;
            uniform vec3 uColor;
            void main() {
              float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
              fresnel = pow(fresnel, 4.0);
              float alpha = fresnel * 0.2;
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>

      {/* Orbiting light particles */}
      {orbitParticles.map((p, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(p.angle) * p.radius,
            p.y,
            Math.sin(p.angle) * p.radius,
          ]}
        >
          <sphereGeometry args={[0.03, 4, 4]} />
          <meshBasicMaterial color="#ffaa44" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}

      {/* Subtle ring */}
      <mesh rotation={[Math.PI * 0.5, 0, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial
          color="#ff8c00"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
