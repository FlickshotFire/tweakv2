'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

export default function Home() {
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
  const [smudgeStrength, setSmudgeStrength] = useState(0.5); // Default 50%
  const lastSmudgePoint = useRef<{ x: number, y: number } | null>(null);

  // Clipboard for cut/copy/paste
  const [clipboard, setClipboard] = useState<ImageData | null>(null);
  
  const compositeLayers = useCallback(() => {
    if (!contextRef.current || !canvasRef.current) return;
    
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    contextRef.current.fillStyle = 'white';
    contextRef.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    layers.forEach(layer => {
      if (layer.visible) {
        contextRef.current!.globalAlpha = layer.opacity;
        contextRef.current!.drawImage(layer.canvas, 0, 0);
      }
    });
    contextRef.current.globalAlpha = 1.0;
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

      setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    }
  }, [historyIndex, getActiveLayer]);

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
      setHistory([]);
      setHistoryIndex(-1);
      
      compositeLayers();
    }
  }, [canvas, compositeLayers]);

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
      activeLayer.context.lineWidth = 5;
    }
  }, [activeTool, getActiveLayer]);

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
    const brushSize = Math.max(ctx.lineWidth * 2, 10);
    const lastX = lastSmudgePoint.current.x;
    const lastY = lastSmudgePoint.current.y;
    
    const dist = Math.hypot(currentX - lastX, currentY - lastY);
    const angle = Math.atan2(currentY - lastY, currentX - lastX);

    const sampleOffsetX = -Math.cos(angle) * brushSize * 0.5;
    const sampleOffsetY = -Math.sin(angle) * brushSize * 0.5;

    for (let i = 0; i < dist; i += 2) {
      const x = lastX + Math.cos(angle) * i;
      const y = lastY + Math.sin(angle) * i;

      const sourceX = Math.floor(x + sampleOffsetX - brushSize / 2);
      const sourceY = Math.floor(y + sampleOffsetY - brushSize / 2);
      
      if (
        sourceX < 0 ||
        sourceY < 0 ||
        sourceX + brushSize > activeLayer.canvas.width ||
        sourceY + brushSize > activeLayer.canvas.height ||
        x - brushSize / 2 < 0 ||
        y - brushSize / 2 < 0 ||
        x + brushSize / 2 > activeLayer.canvas.width ||
        y + brushSize / 2 > activeLayer.canvas.height
      ) {
        continue;
      }
      
      const imageData = ctx.getImageData(sourceX, sourceY, brushSize, brushSize);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = brushSize;
      tempCanvas.height = brushSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        ctx.save();
        ctx.globalAlpha = smudgeStrength * 0.3;
        ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
        ctx.restore();
      }
    }
    
    lastSmudgePoint.current = { x: currentX, y: currentY };
    compositeLayers();
  };

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
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

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
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
    setLayers([]); // This will be reset in useEffect
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
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (activeLayerId === layerId && layers.length > 1) {
      setActiveLayerId(layers[layers.length - 2].id);
    } else if (layers.length <= 1) {
      setActiveLayerId(null);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev =>
      prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-body">
        {/* Left Sidebar */}
        <aside className="flex flex-col items-center space-y-4 p-2 bg-card border-r z-20">
          <h1 className="text-2xl font-headline font-bold text-primary" aria-label="ArtStudio Pro">A</h1>
          <Separator />
          {/* Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={activeTool === 'brush' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('brush'); clearSelection(); }}><Brush /></Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Brush</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('eraser'); clearSelection(); }}><Eraser /></Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Eraser</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={activeTool === 'smudge' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('smudge'); clearSelection(); }}><Hand /></Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Smudge</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={activeTool === 'selection' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('selection')}><SquareDashedMousePointer /></Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Selection</p></TooltipContent>
          </Tooltip>
          <Separator />
          {/* Panels */}
          {/* Brushes */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon"><Brush /></Button></TooltipTrigger>
                <TooltipContent side="right"><p>Brushes</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r z-50"><SheetHeader className="p-4 border-b"><SheetTitle>Brushes</SheetTitle></SheetHeader><BrushPanel /></SheetContent>
          </Sheet>
          {/* Layers */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon"><Layers /></Button></TooltipTrigger>
                <TooltipContent side="right"><p>Layers</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b"><SheetTitle>Layers</SheetTitle></SheetHeader>
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onAddLayer={addLayer}
                onDeleteLayer={deleteLayer}
                onSelectLayer={setActiveLayerId}
                onToggleVisibility={toggleLayerVisibility}
              />
            </SheetContent>
          </Sheet>
          {/* Color */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon"><Palette /></Button></TooltipTrigger>
                <TooltipContent side="right"><p>Color Palette</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r z-50"><SheetHeader className="p-4 border-b"><SheetTitle>Color Palette</SheetTitle></SheetHeader><ColorPanel /></SheetContent>
          </Sheet>
          {/* Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon"><Settings2 /></Button></TooltipTrigger>
                <TooltipContent side="right"><p>Filters & Effects</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r z-50"><SheetHeader className="p-4 border-b"><SheetTitle>Filters & Effects</SheetTitle></SheetHeader><FiltersPanel /></SheetContent>
          </Sheet>
          {/* AI Assistant */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon"><Sparkles /></Button></TooltipTrigger>
                <TooltipContent side="right"><p>AI Assistant</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r z-50"><SheetHeader className="p-4 border-b"><SheetTitle>AI Assistant</SheetTitle></SheetHeader><AiAssistantPanel /></SheetContent>
          </Sheet>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <h2 className="text-xl font-headline font-semibold">{canvas ? 'My Masterpiece' : 'Untitled Canvas'}</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}><Undo /></Button>
              <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline">File</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <Dialog open={isNewCanvasDialogOpen} onOpenChange={setIsNewCanvasDialogOpen}>
                    <DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><FilePlus className="mr-2 h-4 w-4" /> New Canvas</DropdownMenuItem></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Create New Canvas</DialogTitle><DialogDescription>Setup canvas</DialogDescription></DialogHeader><NewCanvasPanel onCreate={handleCreateCanvas} /></DialogContent>
                  </Dialog>
                  <DropdownMenuItem><Import className="mr-2 h-4 w-4" /> Import</DropdownMenuItem>
                  <DropdownMenuItem><Save className="mr-2 h-4 w-4" /> Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 bg-muted/50 grid place-items-center p-8 overflow-auto">
            {!canvas ? (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-24 w-24 opacity-50" />
                <h3 className="mt-4 text-lg font-medium font-headline">Welcome to ArtStudio Pro</h3>
                <p className="mt-1 text-sm">Create a new canvas to start drawing.</p>
                <Dialog open={isNewCanvasDialogOpen} onOpenChange={setIsNewCanvasDialogOpen}>
                  <DialogTrigger asChild><Button className="mt-4"><FilePlus className="mr-2 h-4 w-4" /> New Canvas</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Create New Canvas</DialogTitle><DialogDescription>Setup canvas</DialogDescription></DialogHeader><NewCanvasPanel onCreate={handleCreateCanvas} /></DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="bg-white rounded-lg shadow-2xl border-2 border-dashed"
                  onMouseDown={startDrawing}
                  onMouseUp={finishDrawing}
                  onMouseMove={draw}
                  onMouseLeave={finishDrawing}
                />
                <canvas
                  ref={selectionCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none z-10"
                />
                {selection && (
                  <div style={{ left: selection.x, top: selection.y - 50 }} className="absolute flex items-center gap-1 bg-card p-2 rounded-md shadow-lg border z-20">
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8"><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Copy</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleCut} className="h-8 w-8"><Scissors className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Cut</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handlePaste} disabled={!clipboard} className="h-8 w-8"><ClipboardPaste className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Paste</p></TooltipContent></Tooltip>
                  </div>
                )}
                {activeTool === 'smudge' && (
                  <div className="absolute -top-12 left-0 flex items-center gap-2 bg-card px-3 py-1 rounded-md shadow-sm">
                    <label htmlFor="smudge-strength" className="text-sm">Strength:</label>
                    <input
                      id="smudge-strength"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={smudgeStrength}
                      onChange={(e) => setSmudgeStrength(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">{Math.round(smudgeStrength * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
