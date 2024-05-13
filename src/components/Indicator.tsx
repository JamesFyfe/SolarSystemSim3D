import { Html } from '@react-three/drei';
import CelestialBody from '../CelestialBody';

interface BodyIndicatorProps {
  body: CelestialBody;
  setSelectedBody: Function;
}

export default function BodyIndicator({ body, setSelectedBody }: BodyIndicatorProps) {
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

  const textColor = multiplyRGB(body.physicalData.color);

  const handleClick = () => {
    console.log("got click");
    setSelectedBody(body.id, true);
  };

  return (
    <Html name={`${body.name} indicator`} userData={{ bodyId: body.id }} occlude="blending">
      <div
        className="relative left-2 bottom-3 hover:scale-125 hover:cursor-pointer"
        onClick={handleClick}
      >
        <div style={{
          color: textColor, 
          textShadow: '0 0 2px rgba(0, 0, 0, 1), 0 0 4px rgba(0, 0, 0, 1), 0 0 6px rgba(0, 0, 0, 1)'
        }} 
        className="text-s select-none">{body.name}</div>
      </div>
    </Html>
  );
};
