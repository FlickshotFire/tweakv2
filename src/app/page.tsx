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
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

type Panel = 'brushes' | 'layers' | 'colors' | 'filters' | 'ai-assistant';
type DrawingTool = 'brush' | 'eraser';

export default function Home() {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveState = useCallback(() => {
    if (canvasRef.current && contextRef.current) {
      const canvasData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(canvasData);
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
    if (canvas && canvasRef.current) {
      const canvasEl = canvasRef.current;
      canvasEl.width = canvas.width;
      canvasEl.height = canvas.height;
      const context = canvasEl.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        contextRef.current = context;
        saveState();
      }
    }
  }, [canvas]);

  useEffect(() => {
     if (contextRef.current) {
        contextRef.current.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
     }
  }, [activeTool]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    saveState();
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
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


  const panels: { id: Panel; label: string; icon: React.ElementType; panel: React.ElementType }[] = [
    { id: 'brushes', label: 'Brushes', icon: Brush, panel: BrushPanel },
    { id: 'layers', label: 'Layers', icon: Layers, panel: LayersPanel },
    { id: 'colors', label: 'Color Palette', icon: Palette, panel: ColorPanel },
    { id: 'filters', label: 'Filters & Effects', icon: Settings2, panel: FiltersPanel },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, panel: AiAssistantPanel },
  ];

  const handleCreateCanvas = (settings: CanvasSettings) => {
    setCanvas(settings);
    setHistory([]);
    setHistoryIndex(-1);
    setIsNewCanvasDialogOpen(false);
  };
  

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-body">
        {/* Left Sidebar for tools */}
        <aside className="flex flex-col items-center space-y-4 p-2 bg-card border-r z-10">
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
          <Separator />
          {panels.map((panel) => (
            <Sheet key={panel.id} onOpenChange={(open) => setActivePanel(open ? panel.id : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant={activePanel === panel.id ? 'secondary' : 'ghost'} size="icon" aria-label={panel.label}>
                      <panel.icon className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{panel.label}</p>
                </TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="w-80 p-0 border-r">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="font-headline">{panel.label}</SheetTitle>
                </SheetHeader>
                <panel.panel />
              </SheetContent>
            </Sheet>
          ))}
        </aside>

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
                      <VisuallyHidden><DialogTitle>Create New Canvas</DialogTitle></VisuallyHidden>
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
                         <VisuallyHidden><DialogTitle>Create New Canvas</DialogTitle></VisuallyHidden>
                         <NewCanvasPanel onCreate={handleCreateCanvas} />
                      </DialogContent>
                    </Dialog>
              </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    className="bg-white rounded-lg shadow-2xl border-2 border-dashed"
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onMouseLeave={finishDrawing}
                >
                </canvas>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
