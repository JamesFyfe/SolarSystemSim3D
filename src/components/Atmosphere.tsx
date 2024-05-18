import CelestialBody from "../CelestialBody";

export default function Atmosphere({ body }: { body: CelestialBody }) {
  const opacityPerLayer = body.atmosphereData.opacity / body.atmosphereData.layers;
  const layerScaleFactor = 1 + (body.atmosphereData.thickness / body.atmosphereData.layers);

  let layerOpacity = body.atmosphereData.opacity/6;

  const atmosphereLayers: JSX.Element[] = [];

  for(let i=0; i<body.atmosphereData.layers; i++) {
    atmosphereLayers.push(
      <mesh
        key={i}
        scale={Math.pow(layerScaleFactor, i + 2)}
        userData={{ bodyId: body.id }}
      >
        <sphereGeometry args={[body.physicalData.radius, 80, 40]} />
        <meshStandardMaterial
          color={body.atmosphereData.color}
          transparent={true}
          opacity={layerOpacity}
        />
      </mesh>);
    layerOpacity *= 0.92;
  }

  // const atmosphereLayers = Array.from({ length: body.atmosphereData.layers }, (_, i) => (
  //   <mesh
  //     key={i}
  //     scale={Math.pow(layerScaleFactor, i + 2)}
  //     userData={{ bodyId: body.id }}
  //   >
  //     <sphereGeometry args={[body.physicalData.radius, 80, 40]} />
  //     <meshStandardMaterial
  //       color={body.atmosphereData.color}
  //       transparent={true}
  //       opacity={opacityPerLayer}
  //     />
  //   </mesh>
  // ));

  return <group name={`${body.name} atmosphere`} userData={{ bodyId: body.id }}>{atmosphereLayers}</group>;
};
