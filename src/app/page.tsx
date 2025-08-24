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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

type Panel = 'brushes' | 'layers' | 'colors' | 'filters' | 'ai-assistant';
type DrawingTool = 'brush' | 'eraser' | 'selection' | 'smudge';
const MAX_HISTORY_SIZE = 30;

const panels: { id: Panel; label: string; icon: React.ElementType; panel: React.ElementType }[] = [
    { id: 'brushes', label: 'Brushes', icon: Brush, panel: BrushPanel },
    { id: 'layers', label: 'Layers', icon: Layers, panel: LayersPanel },
    { id: 'colors', label: 'Color Palette', icon: Palette, panel: ColorPanel },
    { id: 'filters', label: 'Filters & Effects', icon: Settings2, panel: FiltersPanel },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, panel: AiAssistantPanel },
];

export default function Home() {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Selection state
  const [selection, setSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);

  // Smudge tool state
  const [smudgeStrength, setSmudgeStrength] = useState(0.5); // Default 50%
  const lastSmudgePoint = useRef<{ x: number, y: number } | null>(null);

  const saveState = useCallback(() => {
    if (canvasRef.current && contextRef.current) {
        const canvasData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(canvasData);

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  const restoreState = useCallback(() => {
    if (contextRef.current && historyIndex >= 0 && history[historyIndex]) {
        contextRef.current.putImageData(history[historyIndex], 0, 0);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    if (canvas && canvasRef.current && selectionCanvasRef.current) {
      const canvasEl = canvasRef.current;
      const selectionCanvasEl = selectionCanvasRef.current;

      canvasEl.width = canvas.width;
      canvasEl.height = canvas.height;
      selectionCanvasEl.width = canvas.width;
      selectionCanvasEl.height = canvas.height;
      
      const context = canvasEl.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        contextRef.current = context;
        
        // Initial blank state
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
      }

      const selectionContext = selectionCanvasEl.getContext('2d');
      if (selectionContext) {
        selectionContext.strokeStyle = 'rgba(0, 100, 255, 0.7)';
        selectionContext.lineWidth = 1;
        selectionContext.setLineDash([4, 4]);
        selectionContextRef.current = selectionContext;
      }
    }
  }, [canvas, saveState]);

  useEffect(() => {
     if (contextRef.current) {
        contextRef.current.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
     }
  }, [activeTool]);

  const clearSelection = () => {
    if (selectionContextRef.current && selectionCanvasRef.current) {
        selectionContextRef.current.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
    }
  }

  const drawSelection = (x: number, y: number, width: number, height: number) => {
    if (selectionContextRef.current) {
      clearSelection();
      selectionContextRef.current.strokeRect(x, y, width, height);
    }
  }

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;

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

    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    
    if (activeTool === 'selection') {
        setIsDrawing(false);
        setSelectionStart(null);
        return;
    }

    if (activeTool === 'smudge') {
        setIsDrawing(false);
        lastSmudgePoint.current = null;
    }

    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    
    if(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'smudge') {
      saveState();
    }
  };

  const smudge = (currentX: number, currentY: number) => {
    if (!contextRef.current || !canvasRef.current || !lastSmudgePoint.current) return;

    const ctx = contextRef.current;
    const brushSize = ctx.lineWidth;
    const lastX = lastSmudgePoint.current.x;
    const lastY = lastSmudgePoint.current.y;
    
    const dist = Math.hypot(currentX - lastX, currentY - lastY);
    const angle = Math.atan2(currentY - lastY, currentX - lastX);

    for (let i = 0; i < dist; i += 1) {
        const x = lastX + Math.cos(angle) * i;
        const y = lastY + Math.sin(angle) * i;

        const sourceX = Math.floor(x - brushSize / 2);
        const sourceY = Math.floor(y - brushSize / 2);

        if (sourceX < 0 || sourceY < 0 || sourceX + brushSize > canvasRef.current.width || sourceY + brushSize > canvasRef.current.height) {
            continue;
        }

        const imageData = ctx.getImageData(sourceX, sourceY, brushSize, brushSize);
        
        ctx.globalAlpha = smudgeStrength * 0.1; // Lower alpha for blending
        ctx.putImageData(imageData, sourceX + Math.cos(angle), sourceY + Math.sin(angle));
        ctx.globalAlpha = 1.0; // Reset alpha
    }
    lastSmudgePoint.current = { x: currentX, y: currentY };
  }


  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;

    if (activeTool === 'selection') {
        if (!selectionStart) return;
        const x = Math.min(offsetX, selectionStart.x);
        const y = Math.min(offsetY, selectionStart.y);
        const width = Math.abs(offsetX - selectionStart.x);
        const height = Math.abs(offsetY - selectionStart.y);
        setSelection({x, y, width, height});
        drawSelection(x, y, width, height);
        return;
    }
    
    if (activeTool === 'smudge') {
        smudge(offsetX, offsetY);
        return;
    }

    if (!contextRef.current) return;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    restoreState();
  }, [historyIndex, restoreState]);

  const handleCreateCanvas = (settings: CanvasSettings) => {
    setCanvas(settings);
    setHistory([]);
    setHistoryIndex(-1);
    setIsNewCanvasDialogOpen(false);
    setSelection(null);
    clearSelection();
  };

  const handlePanelChange = (panelId: Panel) => {
    setActivePanel(prev => (prev === panelId ? null : panelId));
  };
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-body">
        {/* Left Sidebar for tools */}
        <aside className="flex flex-col items-center space-y-4 p-2 bg-card border-r z-20">
          <h1 className="text-2xl font-headline font-bold text-primary" aria-label="ArtStudio Pro">A</h1>
          <Separator />
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'brush' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('brush')} aria-label="Brush">
                    <Brush className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Brush</p></TooltipContent>
          </Tooltip>
           <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('eraser')} aria-label="Eraser">
                    <Eraser className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Eraser</p></TooltipContent>
          </Tooltip>
           <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'smudge' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('smudge')} aria-label="Smudge Tool">
                    <Hand className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Smudge</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'selection' ? 'secondary' : 'ghost'} size="icon" onClick={() => setActiveTool('selection')} aria-label="Selection Tool">
                    <SquareDashedMousePointer className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Selection</p></TooltipContent>
          </Tooltip>
          <Separator />
          {panels.map(({ id, label, icon: Icon }) => (
             <Tooltip key={id}>
               <TooltipTrigger asChild>
                 <Button variant={activePanel === id ? 'secondary' : 'ghost'} size="icon" aria-label={label} onClick={() => handlePanelChange(id)}>
                   <Icon className="h-6 w-6" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent side="right">
                 <p>{label}</p>
               </TooltipContent>
             </Tooltip>
          ))}
        </aside>

        {/* Panel Content */}
        {panels.map(({ id, label, panel: PanelComponent }) => (
            <Sheet key={id} open={activePanel === id} onOpenChange={() => handlePanelChange(id)}>
              <SheetContent side="left" className="w-80 p-0 border-r z-50">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="font-headline">{label}</SheetTitle>
                </SheetHeader>
                <PanelComponent />
              </SheetContent>
            </Sheet>
        ))}


        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <h2 className="text-xl font-headline font-semibold">{canvas ? 'My Masterpiece' : 'Untitled Canvas'}</h2>
            <div className="flex items-center gap-2">
               <Tooltip>
                 <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                        <Undo />
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent><p>Undo</p></TooltipContent>
               </Tooltip>
               <Tooltip>
                 <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                        <Redo />
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent><p>Redo</p></TooltipContent>
               </Tooltip>
               <Separator orientation="vertical" className="h-8 mx-2" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="outline">
                    File
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <Dialog open={isNewCanvasDialogOpen} onOpenChange={setIsNewCanvasDialogOpen}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        New Canvas
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Canvas</DialogTitle>
                        <DialogDescription>Set up your canvas dimensions, resolution, and color profile.</DialogDescription>
                      </DialogHeader>
                      <NewCanvasPanel onCreate={handleCreateCanvas} />
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuItem><Import className="mr-2 h-4 w-4" />Import</DropdownMenuItem>
                  <DropdownMenuItem><Save className="mr-2 h-4 w-4" />Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Canvas Area */}
          <main className="flex-1 bg-muted/50 grid place-items-center p-8 overflow-auto">
            {!canvas ? (
               <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-24 w-24 opacity-50" />
                  <h3 className="mt-4 text-lg font-medium font-headline">Welcome to ArtStudio Pro</h3>
                  <p className="mt-1 text-sm">Create a new canvas to start drawing.</p>
                   <Dialog open={isNewCanvasDialogOpen} onOpenChange={setIsNewCanvasDialogOpen}>
                      <DialogTrigger asChild>
                         <Button className="mt-4">
                          <FilePlus className="mr-2 h-4 w-4" />
                          New Canvas
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                         <DialogHeader>
                           <DialogTitle>Create New Canvas</DialogTitle>
                           <DialogDescription>Set up your canvas dimensions, resolution, and color profile.</DialogDescription>
                         </DialogHeader>
                         <NewCanvasPanel onCreate={handleCreateCanvas} />
                      </DialogContent>
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
                </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
