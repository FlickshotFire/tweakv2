'use client';

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import Image from 'next/image';

const layers = [
  { name: 'Sketch', visible: true, thumbnail: 'https://placehold.co/40x40.png' },
  { name: 'Line Art', visible: true, thumbnail: 'https://placehold.co/40x40.png' },
  { name: 'Color', visible: false, thumbnail: 'https://placehold.co/40x40.png' },
  { name: 'Shading', visible: true, thumbnail: 'https://placehold.co/40x40.png' },
];

export default function LayersPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <Label htmlFor="layer-opacity">Opacity</Label>
        <Slider id="layer-opacity" defaultValue={[100]} max={100} step={1} className="w-40" />
      </div>
      <ScrollArea className="flex-1 border-y">
        <div className="p-2 space-y-1">
          {layers.map((layer, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-md overflow-hidden border">
                  <Image src={layer.thumbnail} alt={`${layer.name} thumbnail`} width={40} height={40} data-ai-hint="abstract texture" />
                </div>
                <p className="font-medium text-sm">{layer.name}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {layer.visible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 flex justify-end gap-2">
        <Button variant="ghost" size="icon"><Plus className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" disabled><Trash2 className="w-5 h-5" /></Button>
      </div>
    </div>
  );
}
