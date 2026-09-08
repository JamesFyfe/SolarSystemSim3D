import { useState } from 'react';
import { Text, useCursor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import CelestialBody from '../classes/CelestialBody';
import { multiplyRGB } from '../utils/UtilFunctions';

interface BodyIndicatorProps {
  body: CelestialBody;
}

const _indicatorPos = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _leftDirection = new THREE.Vector3();

function noRaycast() {}

/**
 * Floating name label beside a body. Clicks bubble up to the body's group in
 * CelestialBodyRenderer, so this component only handles hover feedback.
 */
export default function BodyIndicator({ body }: BodyIndicatorProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const halfWidth = useThree((state) => state.size).width / 2;
  const fovFactor = Math.tan((camera.fov * (Math.PI / 180)) / 4);

  const clickable = body.clickable;
  const fontSize = clickable ? 12 : 8;
  const textColor = multiplyRGB(body.physicalData.color, clickable ? 1.75 : 1);

  const [hovered, setHovered] = useState(false);
  useCursor(hovered && clickable);

  useFrame(() => {
    const indicator = body.indicatorRef.current;
    if (!indicator) {
      return;
    }
    // angle indicator towards camera and set scale so its always the same size
    indicator.getWorldPosition(_indicatorPos);
    const distance = _indicatorPos.distanceTo(camera.position);

    // get x offset from center of screen (0 means middle 1 means edge)
    _screenPos.copy(body.position).project(camera);
    const screenX = (_screenPos.x + 1) * halfWidth;
    const screenXOffset = Math.abs(screenX - halfWidth) / halfWidth;

    const distanceScale = distance / 500;
    const scale = distanceScale / (1 + fovFactor * screenXOffset);

    const distFromBody = scale * body.name.length * (fontSize / 3) + body.physicalData.radius * 1.1;

    // Offset the label to the camera's left
    _leftDirection.set(-1, 0, 0).applyQuaternion(camera.quaternion);

    indicator.scale.setScalar(scale);
    indicator.position.copy(_leftDirection.multiplyScalar(distFromBody));
    indicator.quaternion.copy(camera.quaternion);
  });

  return (
    <Text
      ref={body.indicatorRef}
      name={`${body.name} indicator`}
      color={textColor}
      fontSize={fontSize}
      fillOpacity={0.8}
      outlineColor="black"
      outlineWidth={clickable ? 0.15 : 0.12}
      textAlign="right"
      frustumCulled={false}
      raycast={clickable ? undefined : noRaycast}
      onPointerOver={clickable ? () => setHovered(true) : undefined}
      onPointerOut={clickable ? () => setHovered(false) : undefined}
    >
      {body.name}
    </Text>
  );
}
