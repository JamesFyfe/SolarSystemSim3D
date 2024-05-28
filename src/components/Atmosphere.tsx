import CelestialBody, { AtmosphereParams } from "../classes/CelestialBody";

export default function Atmosphere({ body }: { body: CelestialBody }) {
	const atmosphereData = body.atmosphereData as AtmosphereParams;

  const layerScaleFactor = 1 + (atmosphereData.thickness / atmosphereData.layers);

  let layerOpacity = atmosphereData.opacity/6;

  const atmosphereLayers: JSX.Element[] = [];

  for(let i=0; i<atmosphereData.layers; i++) {
    atmosphereLayers.push(
      <mesh
        key={i}
        scale={Math.pow(layerScaleFactor, i + 2)}
        userData={{ bodyId: body.id }}
      >
        <sphereGeometry args={[body.physicalData.radius, 80, 40]} />
        <meshStandardMaterial
          color={atmosphereData.color}
          transparent={true}
          opacity={layerOpacity}
        />
      </mesh>);
    layerOpacity *= 0.92;
  }

  return <group name={`${body.name} atmosphere`} userData={{ bodyId: body.id }}>{atmosphereLayers}</group>;
};
