'use client';

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pen, Pencil, Paintbrush } from "lucide-react";

const brushes = [
  { name: 'Technical Pen', family: 'Inking', icon: Pen },
  { name: '6B Pencil', family: 'Sketching', icon: Pencil },
  { name: 'Round Brush', family: 'Painting', icon: Paintbrush },
  { name: 'Studio Pen', family: 'Inking', icon: Pen },
  { name: 'Narinder Pencil', family: 'Sketching', icon: Pencil },
  { name: 'Oil Paint', family: 'Painting', icon: Paintbrush },
  { name: 'Airbrush', family: 'Airbrushing', icon: Paintbrush },
];

export default function BrushPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div>
          <Label htmlFor="brush-size" className="mb-2 block">Brush Size</Label>
          <Slider id="brush-size" defaultValue={[50]} max={100} step={1} />
        </div>
        <div>
          <Label htmlFor="brush-opacity" className="mb-2 block">Opacity</Label>
          <Slider id="brush-opacity" defaultValue={[80]} max={100} step={1} />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm font-headline">Brush Library</h3>
          {brushes.map((brush, index) => (
            <button key={index} className="w-full text-left p-2 rounded-md hover:bg-secondary flex items-center gap-3">
              <brush.icon className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium text-sm">{brush.name}</p>
                <p className="text-xs text-muted-foreground">{brush.family}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
