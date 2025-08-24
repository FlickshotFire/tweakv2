'use client';

import type { Layer } from '@/app/page';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string | null;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onSetOpacity: (id: string, opacity: number) => void;
}

function LayerThumbnail({ layer }: { layer: Layer }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                const previewSize = 48;
                canvasRef.current.width = previewSize;
                canvasRef.current.height = previewSize;

                const scale = Math.min(previewSize / layer.canvas.width, previewSize / layer.canvas.height);
                const width = layer.canvas.width * scale;
                const height = layer.canvas.height * scale;
                const x = (previewSize - width) / 2;
                const y = (previewSize - height) / 2;
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(0,0, previewSize, previewSize);
                ctx.drawImage(layer.canvas, x, y, width, height);
            }
        }
    }, [layer.canvas.toDataURL(), layer.visible, layer.opacity]); // Redraw when layer canvas changes

    return <canvas ref={canvasRef} className="bg-transparent rounded-md border border-gray-600" />;
}


export default function LayersPanel({
    layers,
    activeLayerId,
    onAddLayer,
    onDeleteLayer,
    onSelectLayer,
    onToggleVisibility,
    onSetOpacity
}: LayersPanelProps) {
  const activeLayer = layers.find(l => l.id === activeLayerId);
  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      <SheetHeader className="p-4 border-b border-gray-700">
        <SheetTitle className="font-headline text-white">Layers</SheetTitle>
      </SheetHeader>
       {activeLayer && (
        <div className="p-4 border-b border-gray-700 space-y-3">
          <Label htmlFor="layer-opacity" className="text-sm font-medium text-gray-400">Opacity</Label>
          <Slider 
            id="layer-opacity" 
            value={[activeLayer.opacity * 100]} 
            onValueChange={(value) => onSetOpacity(activeLayer.id, value[0]/100)}
            max={100} 
            step={1} 
          />
        </div>
       )}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {layers.map((layer) => (
            <div 
              key={layer.id} 
              className={cn(
                "flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 group cursor-pointer",
                layer.id === activeLayerId && 'bg-blue-500/20 hover:bg-blue-500/30'
              )}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-700 rounded-md overflow-hidden border-2 border-transparent group-hover:border-gray-500 transition-colors">
                  <LayerThumbnail layer={layer} />
                </div>
                <p className="font-medium text-sm">{layer.name}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                    onClick={(e) => {
                        e.stopPropagation();
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
      <SheetFooter className="p-2 flex justify-end gap-2 bg-gray-800 border-t border-gray-700">
        <Button variant="ghost" size="icon" onClick={onAddLayer} className="text-gray-400 hover:text-white hover:bg-gray-700"><Plus className="w-5 h-5" /></Button>
        <Button 
            variant="ghost" 
            size="icon" 
            disabled={!activeLayerId || layers.length <= 1}
            onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
            className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
        >
            <Trash2 className="w-5 h-5" />
        </Button>
      </SheetFooter>
    </div>
  );
}

    