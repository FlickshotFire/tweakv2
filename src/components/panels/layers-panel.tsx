'use client';

import type { Layer } from '@/app/page';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string | null;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
}

function LayerThumbnail({ layer }: { layer: Layer }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                // Scale down the layer canvas to fit the thumbnail
                const scale = Math.min(40 / layer.canvas.width, 40 / layer.canvas.height);
                const width = layer.canvas.width * scale;
                const height = layer.canvas.height * scale;
                const x = (40 - width) / 2;
                const y = (40 - height) / 2;
                
                ctx.clearRect(0, 0, 40, 40);
                ctx.drawImage(layer.canvas, x, y, width, height);
            }
        }
    }, [layer.canvas, layer.id]); // Redraw when layer canvas changes

    return <canvas ref={canvasRef} width={40} height={40} className="bg-white rounded-sm" />;
}


export default function LayersPanel({
    layers,
    activeLayerId,
    onAddLayer,
    onDeleteLayer,
    onSelectLayer,
    onToggleVisibility
}: LayersPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <Label htmlFor="layer-opacity">Opacity</Label>
        <Slider id="layer-opacity" defaultValue={[100]} max={100} step={1} className="w-40" />
      </div>
      <ScrollArea className="flex-1 border-y">
        <div className="p-2 space-y-1">
          {layers.map((layer) => (
            <div 
              key={layer.id} 
              className={cn(
                "flex items-center justify-between p-2 rounded-md hover:bg-secondary group cursor-pointer",
                layer.id === activeLayerId && 'bg-secondary'
              )}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-md overflow-hidden border">
                  <LayerThumbnail layer={layer} />
                </div>
                <p className="font-medium text-sm">{layer.name}</p>
              </div>
              <div className="flex items-center gap-2">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent layer selection
                        onToggleVisibility(layer.id)
                    }}
                 >
                  {layer.visible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onAddLayer}><Plus className="w-5 h-5" /></Button>
        <Button 
            variant="ghost" 
            size="icon" 
            disabled={!activeLayerId || layers.length <= 1}
            onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
        >
            <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
