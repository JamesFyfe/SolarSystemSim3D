import { Text, useCursor } from '@react-three/drei';
import CelestialBody from '../classes/CelestialBody';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { forwardRef, useState } from 'react';
import useForwardedRef from '../hooks/useForwardedRef';
import { multiplyRGB } from '../utils/UtilFunctions';

interface BodyIndicatorProps {
  body: CelestialBody;
  setSelectedBody: (id: string, transition?: boolean) => void;
}

const BodyIndicator = forwardRef<THREE.Object3D<THREE.Object3DEventMap>, BodyIndicatorProps>(
  ({ body, setSelectedBody }, ref) => {
    const indicatorRef = useForwardedRef(ref);
    const textColor = multiplyRGB(body.physicalData.color, 1.75);
    const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
    const halfWidth = useThree((state) => state.size).width / 2;
    const fovFactor = Math.tan(camera.fov * (Math.PI / 180) / 4);
  
    const [hovered, setHovered] = useState(false);
    useCursor(hovered)
  
    const handleClick = () => {
      setSelectedBody(body.id, true);
    };
  
    useFrame(() => {
      if(!indicatorRef.current) {
        return;
      }
      // angle indicator towards camera and set scale so its always the same size
      const indicatorPos = new THREE.Vector3();
      indicatorRef.current.getWorldPosition(indicatorPos);
      const distance = indicatorPos.distanceTo(camera.position);
  
      // get x offset from center of screen (0 means middle 1 means edge)
      const screenPosition = new THREE.Vector3();
      screenPosition.copy(body.position);
      screenPosition.project(camera);
      const screenX = (screenPosition.x + 1) * halfWidth;
      const screenXOffset = Math.abs(screenX - halfWidth) / halfWidth;
  
      const distanceScale = distance / 500;
      const scale = distanceScale / (1 + fovFactor * screenXOffset);
  
      const distFromBody = scale * body.name.length * 4 + body.physicalData.radius * 1.1;
  
      // Calculate the direction vector pointing to the left of the camera
      const leftDirection = new THREE.Vector3(-1, 0, 0);
      leftDirection.applyQuaternion(camera.quaternion);
  
      const indicator = indicatorRef.current;
      indicator.scale.set(scale, scale, scale);
      indicator.position.set(...leftDirection.multiplyScalar(distFromBody).toArray());
      indicator.quaternion.copy(camera.quaternion);
    });
  
    return (
        <Text
          ref={indicatorRef}
          name={`${body.name} indicator`}
          userData={{ bodyId: body.id }}
          onClick={handleClick}
          color={textColor}
          fontSize={12}
          fillOpacity={0.8}
          outlineColor="black"
          outlineWidth={0.15}
          textAlign='right'
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {body.name}
        </Text>
    );
  }
);

export default BodyIndicator;
