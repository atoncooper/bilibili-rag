"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Earth() {
  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);

  // Small orbiting moon
  const moonOrbit = useMemo(() => ({
    radius: 1.5,
    speed: 0.5,
    angle: 0,
  }), []);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.25;
    }
    moonOrbit.angle += delta * moonOrbit.speed;
  });

  return (
    <group ref={groupRef} position={[7.5, -0.5, -1.5]}>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[0.65, 48, 48]} />
        <meshStandardMaterial
          color="#1e90ff"
          roughness={0.4}
          metalness={0.1}
          emissive="#0a3d6b"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Landmass hint — green tinted wireframe */}
      <mesh>
        <sphereGeometry args={[0.67, 32, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[0.82, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uColor: { value: new THREE.Color("#4dc9f6") },
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
              fresnel = pow(fresnel, 3.0);
              float alpha = fresnel * 0.5;
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>

      {/* Outer atmosphere */}
      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uColor: { value: new THREE.Color("#06b6d4") },
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
              fresnel = pow(fresnel, 5.0);
              float alpha = fresnel * 0.25;
              gl_FragColor = vec4(uColor, alpha);
            }
          `}
        />
      </mesh>

      {/* Orbiting moon */}
      <mesh
        position={[
          Math.cos(moonOrbit.angle) * moonOrbit.radius,
          0,
          Math.sin(moonOrbit.angle) * moonOrbit.radius,
        ]}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#d4d4d8"
          roughness={0.6}
          metalness={0.1}
          emissive="#222222"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Subtle ring around earth */}
      <mesh rotation={[Math.PI * 0.4, 0, 0]}>
        <ringGeometry args={[1.0, 1.03, 64]} />
        <meshBasicMaterial
          color="#4dc9f6"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
