import CelestialBody from "../CelestialBody";

export default function Atmosphere({ body }: { body: CelestialBody }) {
  const opacityPerLayer = body.atmosphereData.opacity / body.atmosphereData.layers;
  const layerScaleFactor = 1 + (body.atmosphereData.thickness / body.atmosphereData.layers);

  const atmosphereLayers = Array.from({ length: body.atmosphereData.layers }, (_, i) => (
    <mesh
      key={i}
      scale={Math.pow(layerScaleFactor, i + 1)}
      userData={{ bodyId: body.id }}
    >
      <sphereGeometry args={[body.physicalData.radius, 80, 40]} />
      <meshStandardMaterial
        color={body.atmosphereData.color}
        transparent={true}
        opacity={opacityPerLayer}
      />
    </mesh>
  ));

  return <group name={`${body.name} atmosphere`} userData={{ bodyId: body.id }}>{atmosphereLayers}</group>;
};
