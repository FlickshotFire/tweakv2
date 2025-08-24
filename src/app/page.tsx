'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Brush,
  Layers,
  Palette,
  Sparkles,
  FilePlus,
  Settings2,
  ImageIcon,
  Import,
  Save,
  Eraser,
  Undo,
  Redo,
  SquareDashedMousePointer,
  Hand,
  Copy,
  Scissors,
  Trash2,
  ClipboardPaste,
  Wrench,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';


import AiAssistantPanel from '@/components/panels/ai-assistant-panel';
import BrushPanel from '@/components/panels/brush-panel';
import LayersPanel from '@/components/panels/layers-panel';
import ColorPanel from '@/components/panels/color-panel';
import FiltersPanel from '@/components/panels/filters-panel';
import NewCanvasPanel, { type CanvasSettings } from '@/components/panels/new-canvas-panel';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type DrawingTool = 'brush' | 'eraser' | 'selection' | 'smudge';
const MAX_HISTORY_SIZE = 30;

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  visible: boolean;
  opacity: number;
}

function ArtStudioPro() {
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(100);

  const getActiveLayer = useCallback(() => {
    return layers.find(l => l.id === activeLayerId) || null;
  }, [layers, activeLayerId]);

  // Undo/Redo state
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Selection state
  const [selection, setSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);

  // Smudge tool state
  const [smudgeStrength, setSmudgeStrength] = useState(0.5);
  const lastSmudgePoint = useRef<{ x: number, y: number } | null>(null);

  // Clipboard for cut/copy/paste
  const [clipboard, setClipboard] = useState<ImageData | null>(null);
  
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(1);

  const compositeLayers = useCallback(() => {
    if (!contextRef.current || !canvasRef.current) return;
    
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    layers.forEach(layer => {
      if (layer.visible) {
        contextRef.current!.save();
        contextRef.current!.globalAlpha = layer.opacity;
        contextRef.current!.drawImage(layer.canvas, 0, 0);
        contextRef.current!.restore();
      }
    });
  }, [layers]);

  const saveState = useCallback(() => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      const canvasData = activeLayer.context.getImageData(
        0,
        0,
        activeLayer.canvas.width,
        activeLayer.canvas.height
      );
      
      setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(canvasData);
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        return newHistory;
      });

      setHistoryIndex(prev => {
        const newHistoryLength = history.slice(0, prev + 1).length + 1;
        return newHistoryLength > MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE -1 : prev + 1;
      });
    }
  }, [historyIndex, getActiveLayer, history]);

  const restoreState = useCallback((index: number) => {
    const activeLayer = getActiveLayer();
    if (activeLayer && index >= 0 && index < history.length && history[index]) {
      activeLayer.context.putImageData(history[index], 0, 0);
      compositeLayers();
    }
  }, [history, compositeLayers, getActiveLayer]);

  // Initial setup
  useEffect(() => {
    if (canvas && canvasRef.current && selectionCanvasRef.current) {
      const canvasEl = canvasRef.current;
      const selectionCanvasEl = selectionCanvasRef.current;
      
      canvasEl.width = canvas.width;
      canvasEl.height = canvas.height;
      selectionCanvasEl.width = canvas.width;
      selectionCanvasEl.height = canvas.height;
      
      contextRef.current = canvasEl.getContext('2d');
      const selectionContext = selectionCanvasEl.getContext('2d');
      if (selectionContext) {
        selectionContext.strokeStyle = 'rgba(0, 100, 255, 0.7)';
        selectionContext.lineWidth = 1;
        selectionContext.setLineDash([4, 4]);
        selectionContextRef.current = selectionContext;
      }
      
      const firstLayerId = `layer-${Date.now()}`;
      const newLayerCanvas = document.createElement('canvas');
      newLayerCanvas.width = canvas.width;
      newLayerCanvas.height = canvas.height;
      const newLayerContext = newLayerCanvas.getContext('2d')!;
      newLayerContext.fillStyle = 'white';
      newLayerContext.fillRect(0,0,newLayerCanvas.width, newLayerCanvas.height);
      
      setLayers([{
        id: firstLayerId,
        name: 'Layer 1',
        canvas: newLayerCanvas,
        context: newLayerContext,
        visible: true,
        opacity: 1,
      }]);
      setActiveLayerId(firstLayerId);
      
      // Reset history for new canvas
      const initialData = newLayerContext.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryIndex(0);
    }
  }, [canvas]);

  // Re-composite when layers change
  useEffect(() => {
    compositeLayers();
  }, [layers, compositeLayers]);

  // Update brush settings when tool changes
  useEffect(() => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      activeLayer.context.globalCompositeOperation =
        activeTool === 'eraser' ? 'destination-out' : 'source-over';
      activeLayer.context.lineCap = 'round';
      activeLayer.context.strokeStyle = 'black';
      activeLayer.context.lineWidth = brushSize;
      activeLayer.context.globalAlpha = brushOpacity;
    }
  }, [activeTool, activeLayerId, getActiveLayer, brushSize, brushOpacity]);

  const clearSelection = () => {
    if (selectionContextRef.current && selectionCanvasRef.current) {
      selectionContextRef.current.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
    }
    setSelection(null);
  }

  const drawSelection = (x: number, y: number, width: number, height: number) => {
    if (selectionContextRef.current && selectionCanvasRef.current) {
      selectionContextRef.current.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
      selectionContextRef.current.strokeRect(x, y, width, height);
    }
  }

  const smudge = (currentX: number, currentY: number) => {
    const activeLayer = getActiveLayer();
    if (!activeLayer || !lastSmudgePoint.current) return;

    const ctx = activeLayer.context;
    const smudgeBrushSize = brushSize * 2;
    const lastX = lastSmudgePoint.current.x;
    const lastY = lastSmudgePoint.current.y;
    
    const dist = Math.hypot(currentX - lastX, currentY - lastY);
    const angle = Math.atan2(currentY - lastY, currentX - lastX);

    const sampleOffsetX = -Math.cos(angle) * smudgeBrushSize * 0.5;
    const sampleOffsetY = -Math.sin(angle) * smudgeBrushSize * 0.5;

    for (let i = 0; i < dist; i += 2) {
      const x = lastX + Math.cos(angle) * i;
      const y = lastY + Math.sin(angle) * i;

      const sourceX = Math.floor(x + sampleOffsetX - smudgeBrushSize / 2);
      const sourceY = Math.floor(y + sampleOffsetY - smudgeBrushSize / 2);
      
      if (
        sourceX < 0 ||
        sourceY < 0 ||
        sourceX + smudgeBrushSize > activeLayer.canvas.width ||
        sourceY + smudgeBrushSize > activeLayer.canvas.height ||
        x - smudgeBrushSize / 2 < 0 ||
        y - smudgeBrushSize / 2 < 0 ||
        x + smudgeBrushSize / 2 > activeLayer.canvas.width ||
        y + smudgeBrushSize / 2 > activeLayer.canvas.height
      ) {
        continue;
      }
      
      const imageData = ctx.getImageData(sourceX, sourceY, smudgeBrushSize, smudgeBrushSize);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = smudgeBrushSize;
      tempCanvas.height = smudgeBrushSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        ctx.save();
        ctx.globalAlpha = smudgeStrength;
        ctx.drawImage(tempCanvas, x - smudgeBrushSize / 2, y - smudgeBrushSize / 2);
        ctx.restore();
      }
    }
    
    lastSmudgePoint.current = { x: currentX, y: currentY };
    compositeLayers();
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasEl = selectionCanvasRef.current;
    if (!canvasEl) return { offsetX: 0, offsetY: 0};
    
    const rect = canvasEl.getBoundingClientRect();
    const scale = canvasZoom / 100;
    
    return {
      offsetX: (event.clientX - rect.left) / scale,
      offsetY: (event.clientY - rect.top) / scale,
    }
  }

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = getCanvasCoordinates(event);
    const activeLayer = getActiveLayer();
    if (!activeLayer) return;

    if (activeTool === 'selection') {
      setIsDrawing(true);
      setSelectionStart({ x: offsetX, y: offsetY });
      return;
    }
    
    if (activeTool === 'smudge') {
      setIsDrawing(true);
      lastSmudgePoint.current = { x: offsetX, y: offsetY };
      return;
    }

    activeLayer.context.beginPath();
    activeLayer.context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    const activeLayer = getActiveLayer();
    
    if (activeTool === 'selection') {
      setIsDrawing(false);
      setSelectionStart(null);
      return;
    }

    if (activeTool === 'smudge') {
      setIsDrawing(false);
      lastSmudgePoint.current = null;
    }

    if (activeLayer) {
      activeLayer.context.closePath();
      saveState();
    }
    setIsDrawing(false);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCanvasCoordinates(event);
    const activeLayer = getActiveLayer();

    if (activeTool === 'selection') {
      if (!selectionStart) return;
      const x = Math.min(offsetX, selectionStart.x);
      const y = Math.min(offsetY, selectionStart.y);
      const width = Math.abs(offsetX - selectionStart.x);
      const height = Math.abs(offsetY - selectionStart.y);
      setSelection({ x, y, width, height });
      drawSelection(x, y, width, height);
      return;
    }
    
    if (activeTool === 'smudge') {
      smudge(offsetX, offsetY);
      return;
    }

    if (activeLayer) {
      activeLayer.context.lineTo(offsetX, offsetY);
      activeLayer.context.stroke();
      compositeLayers();
    }
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const handleCreateCanvas = (settings: CanvasSettings) => {
    setCanvas(settings);
    setIsNewCanvasDialogOpen(false);
    clearSelection();
    setClipboard(null);
  };
  
  const handleCopy = () => {
    const activeLayer = getActiveLayer();
    if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
      const imageData = activeLayer.context.getImageData(selection.x, selection.y, selection.width, selection.height);
      setClipboard(imageData);
    }
  };

  const handleCut = () => {
    const activeLayer = getActiveLayer();
    if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
      handleCopy();
      activeLayer.context.clearRect(selection.x, selection.y, selection.width, selection.height);
      compositeLayers();
      saveState();
      clearSelection();
    }
  };

  const handleDelete = () => {
    const activeLayer = getActiveLayer();
    if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
      activeLayer.context.clearRect(selection.x, selection.y, selection.width, selection.height);
      compositeLayers();
      saveState();
      clearSelection();
    }
  };

  const handlePaste = () => {
    const activeLayer = getActiveLayer();
    if (clipboard && activeLayer && selection) {
      activeLayer.context.putImageData(clipboard, selection.x, selection.y);
      compositeLayers();
      saveState();
      clearSelection();
    }
  };

  // Layer Management Functions
  const addLayer = () => {
    if (!canvas) return;
    const newLayerId = `layer-${Date.now()}`;
    const newLayerCanvas = document.createElement('canvas');
    newLayerCanvas.width = canvas.width;
    newLayerCanvas.height = canvas.height;
    const newLayerContext = newLayerCanvas.getContext('2d')!;

    const newLayer: Layer = {
      id: newLayerId,
      name: `Layer ${layers.length + 1}`,
      canvas: newLayerCanvas,
      context: newLayerContext,
      visible: true,
      opacity: 1,
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayerId);
  };

  const deleteLayer = (layerId: string) => {
    if(layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (activeLayerId === layerId && layers.length > 1) {
      setActiveLayerId(layers.find(l => l.id !== layerId)!.id);
    } else if (layers.length <= 1) {
      setActiveLayerId(null);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev =>
      prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
    );
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
     setLayers(prev =>
      prev.map(l => l.id === layerId ? { ...l, opacity: opacity } : l)
    );
  }
  
  if (!canvas) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted">
        <Dialog open={!canvas} onOpenChange={(isOpen) => !isOpen && handleCreateCanvas({width: 1920, height: 1080, resolution: 300, colorProfile: 'sRGB'})}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Welcome to ArtStudio Pro</DialogTitle>
              <DialogDescription>Create a new canvas to start your masterpiece.</DialogDescription>
            </DialogHeader>
            <NewCanvasPanel onCreate={handleCreateCanvas} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
        <div className="h-screen w-screen bg-grid-pattern bg-background text-gray-200 font-sans flex flex-col p-4 gap-4">
            {/* Top Bar */}
            <header className="flex justify-between items-center bg-card h-16 px-4 rounded-xl shadow-lg">
                {/* Left Tools */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-gray-300 hover:bg-accent/10 hover:text-white">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Gallery
                    </Button>
                    <Separator orientation="vertical" className="h-8 bg-border" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white"><Wrench className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Actions</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white"><Sparkles className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Adjustments</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant={activeTool === 'selection' ? 'secondary' : 'ghost'} size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white" onClick={() => setActiveTool('selection')}><SquareDashedMousePointer className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Selection</p></TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white"><Hand className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Transform</p></TooltipContent>
                    </Tooltip>
                </div>
                 {/* Center dots - purely decorative */}
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                </div>
                {/* Right Tools */}
                <div className="flex items-center gap-2">
                    <Sheet>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <SheetTrigger asChild>
                                    <Button variant={activeTool === 'brush' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('brush')} className="text-gray-300 hover:bg-accent/10 hover:text-white"><Brush className="w-5 h-5" /></Button>
                                </SheetTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Brushes</p></TooltipContent>
                        </Tooltip>
                         <SheetContent side="right" className="bg-card border-l-border text-white w-96 p-0"><BrushPanel /></SheetContent>
                    </Sheet>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeTool === 'smudge' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('smudge')} className="text-gray-300 hover:bg-accent/10 hover:text-white"><Hand className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Smudge</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('eraser')} className="text-gray-300 hover:bg-accent/10 hover:text-white"><Eraser className="w-5 h-5" /></Button>
                        </TooltipTrigger>
                         <TooltipContent><p>Eraser</p></TooltipContent>
                    </Tooltip>
                    <Sheet>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white"><Layers className="w-5 h-5" /></Button>
                                </SheetTrigger>
                            </TooltipTrigger>
                             <TooltipContent><p>Layers</p></TooltipContent>
                        </Tooltip>
                        <SheetContent side="right" className="bg-card border-l-border text-white w-96 p-0">
                            <LayersPanel
                                layers={layers}
                                activeLayerId={activeLayerId}
                                onAddLayer={addLayer}
                                onDeleteLayer={deleteLayer}
                                onSelectLayer={setActiveLayerId}
                                onToggleVisibility={toggleLayerVisibility}
                                onSetOpacity={setLayerOpacity}
                              />
                        </SheetContent>
                    </Sheet>
                     <Popover>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-gray-300 hover:bg-accent/10 hover:text-white"><Palette className="w-5 h-5" /></Button>
                                </PopoverTrigger>
                            </TooltipTrigger>
                             <TooltipContent><p>Colors</p></TooltipContent>
                        </Tooltip>
                         <PopoverContent className="bg-card border-border text-white w-80"><ColorPanel /></PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Controls */}
                <aside className="flex flex-col justify-between items-center bg-card w-16 p-2 rounded-xl shadow-lg">
                    <div className="flex flex-col items-center justify-center gap-4 w-full px-2">
                         <div className="h-48 w-full py-2">
                              <Label className="text-xs text-muted-foreground ml-1">Size</Label>
                             <Slider 
                                defaultValue={[5]} 
                                max={100} 
                                step={1} 
                                orientation="vertical" 
                                className="h-full mt-2"
                                onValueChange={(value) => setBrushSize(value[0])}
                             />
                         </div>
                         <Separator className="bg-border" />
                          <div className="h-48 w-full py-2">
                              <Label className="text-xs text-muted-foreground ml-1">Opacity</Label>
                              <Slider 
                                defaultValue={[100]} 
                                max={100} 
                                step={1} 
                                orientation="vertical" 
                                className="h-full mt-2"
                                onValueChange={(value) => setBrushOpacity(value[0] / 100)}
                                />
                         </div>
                    </div>
                    <div className="flex flex-col gap-2">
                         <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} className="text-gray-300 hover:bg-accent/10 hover:text-white"><Undo className="w-5 h-5" /></Button>
                            </TooltipTrigger>
                             <TooltipContent side="right"><p>Undo</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="text-gray-300 hover:bg-accent/10 hover:text-white"><Redo className="w-5 h-5" /></Button>
                            </TooltipTrigger>
                             <TooltipContent side="right"><p>Redo</p></TooltipContent>
                        </Tooltip>
                    </div>
                </aside>

                {/* Canvas Area */}
                <div className="flex-1 bg-black/20 rounded-xl shadow-inner grid place-items-center relative overflow-auto">
                    <div 
                      className="relative shadow-2xl transition-transform duration-200"
                      style={{ transform: `scale(${canvasZoom / 100})` }}
                    >
                        <canvas
                            ref={canvasRef}
                            className="bg-white rounded-lg"
                        />
                        <canvas
                            ref={selectionCanvasRef}
                            className="absolute top-0 left-0"
                            onMouseDown={startDrawing}
                            onMouseUp={finishDrawing}
                            onMouseMove={draw}
                            onMouseLeave={finishDrawing}
                        />
                        {selection && selection.width > 0 && selection.height > 0 && (
                          <div style={{ left: selection.x, top: Math.max(0, selection.y - 50) }} className="absolute flex gap-1 bg-card p-2 rounded-md shadow-lg border border-border z-20">
                            <Button variant="ghost" size="icon" onClick={handleCopy} className="text-gray-300 hover:bg-accent/10 hover:text-white h-8 w-8"><Copy className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={handleCut} className="text-gray-300 hover:bg-accent/10 hover:text-white h-8 w-8"><Scissors className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-gray-300 hover:bg-accent/10 hover:text-white h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={handlePaste} disabled={!clipboard} className="text-gray-300 hover:bg-accent/10 hover:text-white h-8 w-8"><ClipboardPaste className="w-4 h-4" /></Button>
                          </div>
                        )}
                    </div>
                     <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-card p-2 rounded-lg shadow-lg border border-border">
                        <ZoomOut className="w-5 h-5 text-muted-foreground" />
                        <Slider 
                            value={[canvasZoom]} 
                            max={400} 
                            min={10}
                            step={1} 
                            className="w-32"
                            onValueChange={(value) => setCanvasZoom(value[0])}
                        />
                        <ZoomIn className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-mono w-12 text-center">{canvasZoom.toFixed(0)}%</span>
                    </div>
                </div>
            </main>
        </div>
    </TooltipProvider>
  );
}

export default ArtStudioPro;

    