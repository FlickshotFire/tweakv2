'use client';

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pen, Pencil, Paintbrush } from "lucide-react";
import { SheetHeader, SheetTitle } from "../ui/sheet";

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
    <div className="flex flex-col h-full bg-card text-white">
      <SheetHeader className="p-4 border-b border-border">
        <SheetTitle className="font-headline text-white">Brushes</SheetTitle>
      </SheetHeader>
      <Separator className="bg-border" />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Brush library items */}
          {brushes.map((brush, index) => (
            <button key={index} className="w-full text-left p-2 rounded-md hover:bg-accent/10 flex items-center gap-3">
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
 