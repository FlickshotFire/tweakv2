'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function ColorWheel({ value, onChange, className }: ColorPickerProps) {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });

  const hsvToRgb = (h: number, s: number, v: number) => {
    let r=0, g=0, b=0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };
  
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  const handleColorPick = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!wheelRef.current) return;
    
    const rect = wheelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = rect.width / 2;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= radius) {
      const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
      const hue = angle / (Math.PI * 2);
      const saturation = distance / radius;
      
      const [r, g, b] = hsvToRgb(hue, saturation, 1.0);
      onChange(rgbToHex(r, g, b));
      
      setPickerPosition({ x, y });
    }
  }, [onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    handleColorPick(e);
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      handleColorPick(moveEvent);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  return (
    <div 
      ref={wheelRef}
      className={cn("relative w-48 h-48 mx-auto my-4 cursor-pointer", className)}
      style={{
        background: 'conic-gradient(from 90deg at 50% 50%, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
      }}
      onMouseDown={handleMouseDown}
    >
        <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(circle at 50% 50%, white, rgba(255,255,255,0))'}}></div>
        <div 
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent ring-2 ring-black" 
          style={{ 
            top: pickerPosition.y, 
            left: pickerPosition.x,
            backgroundColor: value
          }}
        ></div>
    </div>
  )
}

function Swatches({ colors, onSelect }: { colors: string[]; onSelect: (color: string) => void }) {
    return (
        <div className="grid grid-cols-5 gap-2">
            {colors.map((color, i) => (
                <div 
                  key={i} 
                  className="w-full aspect-square rounded-md cursor-pointer transition-transform hover:scale-110" 
                  style={{ backgroundColor: color }}
                  onClick={() => onSelect(color)}
                ></div>
            ))}
        </div>
    )
}

export default function ColorPanel({ color, onChange }: { color: string; onChange: (newColor: string) => void; }) {
  const classicColors = ["#C2272D", "#F8931F", "#FFFF01", "#009245", "#0193D9", "#0C04ED", "#612F90", "#F06EAA", "#F26D7D", "#999999"];
  const harmonyColors = ["#5B2A86", "#8A2BE2", "#E6E6FA", "#4B0082", "#3D006A"];
  
  const [hexValue, setHexValue] = useState(color);

  useEffect(() => {
    setHexValue(color);
  }, [color]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexValue(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
      onChange(e.target.value);
    }
  };

  const handleSwatchSelect = (newColor: string) => {
    onChange(newColor);
  };
  
  const [r, g, b] = useMemo(() => {
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
      ]
    }
    return [0,0,0];
  }, [color]);

  const handleRgbChange = (part: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { r, g, b, [part]: value };
    const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };


  return (
    <div className="p-4">
        <Tabs defaultValue="wheel" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wheel">Wheel</TabsTrigger>
                <TabsTrigger value="palettes">Palettes</TabsTrigger>
                <TabsTrigger value="values">Values</TabsTrigger>
            </TabsList>
            <TabsContent value="wheel" className="mt-4">
                <ColorWheel value={color} onChange={onChange} />
            </TabsContent>
            <TabsContent value="palettes" className="mt-4">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Classic</h4>
                        <Swatches colors={classicColors} onSelect={handleSwatchSelect}/>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm mb-2">Harmony</h4>
                        <Swatches colors={harmonyColors} onSelect={handleSwatchSelect}/>
                    </div>
                    <Button variant="outline" className="w-full">Create new palette</Button>
                </div>
            </TabsContent>
            <TabsContent value="values" className="mt-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="hex-value">Hex</Label>
                        <Input id="hex-value" value={hexValue} onChange={handleHexChange} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="r-value">R</Label>
                            <Input id="r-value" type="number" value={r} onChange={e => handleRgbChange('r', parseInt(e.target.value))} max={255} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="g-value">G</Label>
                            <Input id="g-value" type="number" value={g} onChange={e => handleRgbChange('g', parseInt(e.target.value))} max={255}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="b-value">B</Label>
                            <Input id="b-value" type="number" value={b} onChange={e => handleRgbChange('b', parseInt(e.target.value))} max={255}/>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
