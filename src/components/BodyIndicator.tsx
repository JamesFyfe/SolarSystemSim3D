import { Text, useCursor } from '@react-three/drei';
import CelestialBody from '../CelestialBody';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { forwardRef, useRef, useState } from 'react';
import useForwardedRef from '../hooks/useForwardedRef';

interface BodyIndicatorProps {
  body: CelestialBody;
  setSelectedBody: Function;
}

const BodyIndicator = forwardRef<THREE.Object3D<THREE.Object3DEventMap>, BodyIndicatorProps>(
  ({ body, setSelectedBody }, ref) => {
    const indicatorRef = useForwardedRef(ref);
    const textColor = multiplyRGB(body.physicalData.color);
    const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
    const halfWidth = useThree((state) => state.size).width / 2;
    const fovFactor = Math.tan(camera.fov * (Math.PI / 180) / 4);
  
    const [hovered, setHovered] = useState(false);
    useCursor(hovered)
  
    const handleClick = () => {
      setSelectedBody(body.id, true);
    };
  
    function multiplyRGB(colorString: string): string {
      const rgbValues = colorString.substring(4, colorString.length - 1).split(", ");
      let [r, g, b] = rgbValues.map(Number);
    
      r = Math.floor(r * 1.75);
      g = Math.floor(g * 1.75);
      b = Math.floor(b * 1.75);
    
      r = Math.min(r, 255);
      g = Math.min(g, 255);
      b = Math.min(b, 255);
    
      return `rgb(${r}, ${g}, ${b})`;
    }
  
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
  
      const distFromBody = scale * 18 + body.physicalData.radius * 1.1;
  
      // Calculate the direction vector pointing to the left of the camera
      const leftDirection = new THREE.Vector3(-1, 0, 0);
      leftDirection.applyQuaternion(camera.quaternion);
  
      const indicator = indicatorRef.current;
      indicator.scale.set(scale, scale, scale);
      indicator.position.set(...leftDirection.multiplyScalar(distFromBody).toArray());
      indicator.quaternion.copy(camera.quaternion);
    });
  
    return (
      // <Html name={`${body.name} indicator`} userData={{ bodyId: body.id }} occlude="blending">
      //   <div
      //     className="relative left-2 bottom-3 hover:scale-125 hover:cursor-pointer"
      //     onClick={handleClick}
      //   >
      //     <div style={{
      //       color: textColor, 
      //       textShadow: '0 0 2px rgba(0, 0, 0, 1), 0 0 4px rgba(0, 0, 0, 1), 0 0 6px rgba(0, 0, 0, 1)'
      //     }} 
      //     className="text-s select-none">{body.name}</div>
      //   </div>
      // </Html>
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
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {body.name}
        </Text>
    );
  }
);

export default BodyIndicator;
