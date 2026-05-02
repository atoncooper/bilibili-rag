"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ParticleField from "./ParticleField";
import WorkflowRing from "./WorkflowRing";
import Sun from "./Sun";
import Earth from "./Earth";
import MeteorShower from "./MeteorShower";

interface ThreeJSSceneProps {
  dimmed?: boolean;
}

export default function ThreeJSScene({ dimmed = false }: ThreeJSSceneProps) {
  return (
    <div className="three-scene-container" style={{ flex: 1, width: "100%", height: "100%" }}>
      <Canvas
        style={{
          pointerEvents: dimmed ? "none" : "auto",
        }}
        camera={{ position: [0, 0, 12], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.25} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#ffffff" />
        <pointLight position={[-5, -3, 3]} intensity={0.35} color="#888888" />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#06b6d4" />
        {/* Warm light from sun direction */}
        <directionalLight position={[-7.5, 0.8, -2]} intensity={0.4} color="#ffaa66" />
        <ParticleField />
        <WorkflowRing />
        <Sun />
        <Earth />
        <MeteorShower />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI * 0.7}
          enabled={!dimmed}
        />
      </Canvas>
      {dimmed && <div className="scene-overlay" />}
    </div>
  );
}
