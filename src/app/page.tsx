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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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


type PanelId = 'brushes' | 'layers' | 'colors' | 'filters' | 'ai';
type DrawingTool = 'brush' | 'eraser' | 'selection' | 'smudge';
const MAX_HISTORY_SIZE = 30;

export default function Home() {
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);

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
  
  const saveState = useCallback(() => {
    if (canvasRef.current && contextRef.current) {
      const canvasData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(canvasData);
        
        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        
        return newHistory;
      });
      
      setHistoryIndex(prev => {
        const newHistory = history.slice(0, prev + 1);
        return newHistory.length >= MAX_HISTORY_SIZE ? prev : prev + 1;
      });
    }
  }, [historyIndex, history]);

  const restoreState = useCallback((index: number) => {
    if (contextRef.current && index >= 0 && index < history.length && history[index]) {
      contextRef.current.putImageData(history[index], 0, 0);
    }
  }, [history]);

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
        
        // Save initial state
        const initialData = context.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialData]);
        setHistoryIndex(0);
      }

      const selectionContext = selectionCanvasEl.getContext('2d');
      if (selectionContext) {
        selectionContext.strokeStyle = 'rgba(0, 100, 255, 0.7)';
        selectionContext.lineWidth = 1;
        selectionContext.setLineDash([4, 4]);
        selectionContextRef.current = selectionContext;
      }
    }
  }, [canvas]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    }
  }, [activeTool]);

  const clearSelection = () => {
    if (selectionContextRef.current && selectionCanvasRef.current) {
      selectionContextRef.current.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
    }
    setSelection(null);
  }

  const drawSelection = (x: number, y: number, width: number, height: number) => {
    if (selectionContextRef.current) {
      selectionContextRef.current.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
      selectionContextRef.current.strokeRect(x, y, width, height);
    }
  }

  const smudge = (currentX: number, currentY: number) => {
    if (!contextRef.current || !canvasRef.current || !lastSmudgePoint.current) return;

    const ctx = contextRef.current;
    const brushSize = Math.max(ctx.lineWidth * 2, 10);
    const lastX = lastSmudgePoint.current.x;
    const lastY = lastSmudgePoint.current.y;
    
    const dist = Math.hypot(currentX - lastX, currentY - lastY);
    const angle = Math.atan2(currentY - lastY, currentX - lastX);

    // Sample from behind the brush movement
    const sampleOffsetX = -Math.cos(angle) * brushSize * 0.5;
    const sampleOffsetY = -Math.sin(angle) * brushSize * 0.5;

    for (let i = 0; i < dist; i += 2) {
      const x = lastX + Math.cos(angle) * i;
      const y = lastY + Math.sin(angle) * i;

      // Sample from a point behind the current position
      const sourceX = Math.floor(x + sampleOffsetX - brushSize / 2);
      const sourceY = Math.floor(y + sampleOffsetY - brushSize / 2);

      // Ensure we're within canvas bounds
      if (sourceX < 0 || sourceY < 0 || 
          sourceX + brushSize > canvasRef.current.width || 
          sourceY + brushSize > canvasRef.current.height ||
          x - brushSize / 2 < 0 || y - brushSize / 2 < 0 ||
          x + brushSize / 2 > canvasRef.current.width ||
          y + brushSize / 2 > canvasRef.current.height) {
        continue;
      }

      // Get the image data from the source position
      const imageData = ctx.getImageData(sourceX, sourceY, brushSize, brushSize);
      
      // Create a temporary canvas for blending
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = brushSize;
      tempCanvas.height = brushSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Put the sampled data on temp canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw with blending on main canvas
        ctx.save();
        ctx.globalAlpha = smudgeStrength * 0.3;
        ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
        ctx.restore();
      }
    }
    
    lastSmudgePoint.current = { x: currentX, y: currentY };
  };

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
        // Don't clear selection here, so the user can interact with it
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
    setHistory([]);
    setHistoryIndex(-1);
    setIsNewCanvasDialogOpen(false);
    clearSelection();
    setClipboard(null);
  };

  const handlePanelChange = (panelId: PanelId) => {
    setActivePanel((current) => (current === panelId ? null : panelId));
  };
  
  const renderPanelContent = () => {
    switch(activePanel) {
      case 'brushes':
        return <BrushPanel />;
      case 'layers':
        return <LayersPanel />;
      case 'colors':
        return <ColorPanel />;
      case 'filters':
        return <FiltersPanel />;
      case 'ai':
        return <AiAssistantPanel />;
      default:
        return null;
    }
  };

  const getPanelTitle = () => {
     switch(activePanel) {
      case 'brushes':
        return 'Brushes';
      case 'layers':
        return 'Layers';
      case 'colors':
        return 'Color Palette';
      case 'filters':
        return 'Filters & Effects';
      case 'ai':
        return 'AI Assistant';
      default:
        return '';
    }
  }

  const handleCopy = () => {
    if (selection && contextRef.current) {
      const imageData = contextRef.current.getImageData(selection.x, selection.y, selection.width, selection.height);
      setClipboard(imageData);
    }
  };

  const handleCut = () => {
    if (selection && contextRef.current) {
      handleCopy();
      contextRef.current.fillStyle = 'white';
      contextRef.current.fillRect(selection.x, selection.y, selection.width, selection.height);
      saveState();
      clearSelection();
    }
  };

  const handleDelete = () => {
    if (selection && contextRef.current) {
      contextRef.current.fillStyle = 'white';
      contextRef.current.fillRect(selection.x, selection.y, selection.width, selection.height);
      saveState();
      clearSelection();
    }
  };

  const handlePaste = () => {
    if (clipboard && contextRef.current && selection) {
      contextRef.current.putImageData(clipboard, selection.x, selection.y);
      saveState();
      clearSelection();
    }
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
                <Button variant={activeTool === 'brush' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('brush'); clearSelection(); }} aria-label="Brush">
                    <Brush className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Brush</p></TooltipContent>
          </Tooltip>
           <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('eraser'); clearSelection(); }} aria-label="Eraser">
                    <Eraser className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Eraser</p></TooltipContent>
          </Tooltip>
           <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={activeTool === 'smudge' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setActiveTool('smudge'); clearSelection(); }} aria-label="Smudge Tool">
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

          {/* Panel Triggers */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size="icon" aria-label="Brushes" onClick={() => handlePanelChange('brushes')}>
                <Brush className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Brushes</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size="icon" aria-label="Layers" onClick={() => handlePanelChange('layers')}>
                <Layers className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Layers</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size="icon" aria-label="Color Palette" onClick={() => handlePanelChange('colors')}>
                <Palette className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Color Palette</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size="icon" aria-label="Filters & Effects" onClick={() => handlePanelChange('filters')}>
                <Settings2 className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Filters & Effects</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size="icon" aria-label="AI Assistant" onClick={() => handlePanelChange('ai')}>
                <Sparkles className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>AI Assistant</p></TooltipContent>
          </Tooltip>
        </aside>

        <Sheet open={!!activePanel} onOpenChange={(open) => !open && setActivePanel(null)}>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="font-headline">{getPanelTitle()}</SheetTitle>
              </SheetHeader>
              {renderPanelContent()}
            </SheetContent>
        </Sheet>


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

                    {selection && (
                      <div 
                        className="absolute flex items-center gap-1 bg-card p-2 rounded-md shadow-lg border z-20"
                        style={{ left: selection.x, top: selection.y - 50 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Copy</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleCut} className="h-8 w-8">
                              <Scissors className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Cut</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete</p></TooltipContent>
                        </Tooltip>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handlePaste} disabled={!clipboard} className="h-8 w-8">
                              <ClipboardPaste className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Paste</p></TooltipContent>
                        </Tooltip>
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
