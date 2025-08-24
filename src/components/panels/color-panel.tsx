'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function ColorCircle() {
  return (
    <div className="relative w-48 h-48 mx-auto my-4 cursor-pointer">
        <div className="absolute inset-0 rounded-full" style={{background: 'conic-gradient(from 90deg at 50% 50%, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)'}}></div>
        <div className="absolute inset-0 rounded-full" style={{background: 'radial-gradient(circle at 50% 50%, white, rgba(255,255,255,0))'}}></div>
        <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent ring-2 ring-black" style={{top: '25%', left: '75%'}}></div>
    </div>
  )
}

function Swatches({ colors }: { colors: string[] }) {
    return (
        <div className="grid grid-cols-5 gap-2">
            {colors.map((color, i) => (
                <div key={i} className="w-full aspect-square rounded-md cursor-pointer transition-transform hover:scale-110" style={{ backgroundColor: color }}></div>
            ))}
        </div>
    )
}

export default function ColorPanel() {
  const classicColors = ["#C2272D", "#F8931F", "#FFFF01", "#009245", "#0193D9", "#0C04ED", "#612F90", "#F06EAA", "#F26D7D", "#999999"];
  const harmonyColors = ["#5B2A86", "#8A2BE2", "#E6E6FA", "#4B0082", "#3D006A"];

  return (
    <div className="p-4">
        <Tabs defaultValue="wheel" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wheel">Wheel</TabsTrigger>
                <TabsTrigger value="palettes">Palettes</TabsTrigger>
                <TabsTrigger value="values">Values</TabsTrigger>
            </TabsList>
            <TabsContent value="wheel" className="mt-4">
                <ColorCircle />
            </TabsContent>
            <TabsContent value="palettes" className="mt-4">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Classic</h4>
                        <Swatches colors={classicColors}/>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm mb-2">Harmony</h4>
                        <Swatches colors={harmonyColors}/>
                    </div>
                    <Button variant="outline" className="w-full">Create new palette</Button>
                </div>
            </TabsContent>
            <TabsContent value="values" className="mt-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="hex-value">Hex</Label>
                        <Input id="hex-value" defaultValue="#4B0082"/>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="r-value">R</Label>
                            <Input id="r-value" type="number" defaultValue="75"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="g-value">G</Label>
                            <Input id="g-value" type="number" defaultValue="0"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="b-value">B</Label>
                            <Input id="b-value" type="number" defaultValue="130"/>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
