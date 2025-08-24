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

interface DrawingState {
  isDrawing: boolean;
  lastPoint: { x: number; y: number } | null;
}

interface SelectionState {
  selection: { x: number, y: number, width: number, height: number } | null;
  selectionStart: { x: number, y: number } | null;
  isSelecting: boolean;
}

interface HistoryState {
  snapshots: ImageData[];
  currentIndex: number;
}

function Home() {
  // Core state
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectionContextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Layer state with ref for stable access
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const activeLayerIdRef = useRef<string | null>(null);
  
  // Drawing state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    lastPoint: null,
  });
  
  // Selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selection: null,
    selectionStart: null,
    isSelecting: false,
  });
  
  // History state
  const [historyState, setHistoryState] = useState<HistoryState>({
    snapshots: [],
    currentIndex: -1,
  });
  
  // Tool settings
  const [smudgeStrength, setSmudgeStrength] = useState(0.5);
  const [clipboard, setClipboard] = useState<ImageData | null>(null);
  
  // Sync refs with state for stable access
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  
  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);
  
  // Get active layer with stable reference
  const getActiveLayer = useCallback((): Layer | null => {
    return layersRef.current.find(l => l.id === activeLayerIdRef.current) || null;
  }, []);
  
  // Stable canvas operations
  const canvasOperations = useMemo(() => ({
    clearSelectionCanvas: () => {
      if (selectionContextRef.current && selectionCanvasRef.current) {
        selectionContextRef.current.clearRect(
          0, 0, 
          selectionCanvasRef.current.width, 
          selectionCanvasRef.current.height
        );
      }
    },
    
    drawSelection: (x: number, y: number, width: number, height: number) => {
      if (selectionContextRef.current && selectionCanvasRef.current) {
        selectionContextRef.current.clearRect(
          0, 0, 
          selectionCanvasRef.current.width, 
          selectionCanvasRef.current.height
        );
        selectionContextRef.current.strokeRect(x, y, width, height);
      }
    },
    
    compositeLayers: () => {
      if (!contextRef.current || !canvasRef.current) return;
      
      const ctx = contextRef.current;
      const canvas = canvasRef.current;
      
      // Clear and set background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Composite visible layers
      layersRef.current.forEach(layer => {
        if (layer.visible) {
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      });
    },
    
    createLayerCanvas: (width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to create canvas context');
      }
      return { canvas, context };
    },
  }), []);
  
  // History management
  const historyOperations = useMemo(() => ({
    saveState: () => {
      const activeLayer = getActiveLayer();
      if (!activeLayer) return;
      
      try {
        const imageData = activeLayer.context.getImageData(
          0, 0, activeLayer.canvas.width, activeLayer.canvas.height
        );
        
        setHistoryState(prev => {
          const newSnapshots = prev.snapshots.slice(0, prev.currentIndex + 1);
          newSnapshots.push(imageData);
          
          // Limit history size
          if (newSnapshots.length > MAX_HISTORY_SIZE) {
            newSnapshots.shift();
            return {
              snapshots: newSnapshots,
              currentIndex: newSnapshots.length - 1,
            };
          }
          
          return {
            snapshots: newSnapshots,
            currentIndex: newSnapshots.length - 1,
          };
        });
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    },
    
    restoreState: (index: number) => {
      const activeLayer = getActiveLayer();
      if (!activeLayer || index < 0 || index >= historyState.snapshots.length) return;
      
      try {
        const imageData = historyState.snapshots[index];
        if (imageData) {
          activeLayer.context.putImageData(imageData, 0, 0);
          canvasOperations.compositeLayers();
        }
      } catch (error) {
        console.error('Failed to restore state:', error);
      }
    },
    
    undo: () => {
      if (historyState.currentIndex > 0) {
        const newIndex = historyState.currentIndex - 1;
        setHistoryState(prev => ({ ...prev, currentIndex: newIndex }));
        historyOperations.restoreState(newIndex);
      }
    },
    
    redo: () => {
      if (historyState.currentIndex < historyState.snapshots.length - 1) {
        const newIndex = historyState.currentIndex + 1;
        setHistoryState(prev => ({ ...prev, currentIndex: newIndex }));
        historyOperations.restoreState(newIndex);
      }
    },
  }), [getActiveLayer, canvasOperations, historyState]);
  
  // Drawing operations
  const drawingOperations = useMemo(() => ({
    configureContext: (layer: Layer) => {
      const ctx = layer.context;
      ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
    },
    
    smudge: (currentX: number, currentY: number, lastX: number, lastY: number) => {
      const activeLayer = getActiveLayer();
      if (!activeLayer) return;
      
      const ctx = activeLayer.context;
      const brushSize = Math.max(ctx.lineWidth * 2, 10);
      const dist = Math.hypot(currentX - lastX, currentY - lastY);
      const angle = Math.atan2(currentY - lastY, currentX - lastX);
      
      const sampleOffsetX = -Math.cos(angle) * brushSize * 0.5;
      const sampleOffsetY = -Math.sin(angle) * brushSize * 0.5;
      
      for (let i = 0; i < dist; i += 2) {
        const x = lastX + Math.cos(angle) * i;
        const y = lastY + Math.sin(angle) * i;
        
        const sourceX = Math.floor(x + sampleOffsetX - brushSize / 2);
        const sourceY = Math.floor(y + sampleOffsetY - brushSize / 2);
        
        // Bounds checking
        if (
          sourceX < 0 || sourceY < 0 ||
          sourceX + brushSize > activeLayer.canvas.width ||
          sourceY + brushSize > activeLayer.canvas.height ||
          x - brushSize / 2 < 0 || y - brushSize / 2 < 0 ||
          x + brushSize / 2 > activeLayer.canvas.width ||
          y + brushSize / 2 > activeLayer.canvas.height
        ) {
          continue;
        }
        
        try {
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
        } catch (error) {
          console.warn('Smudge operation failed:', error);
        }
      }
      
      canvasOperations.compositeLayers();
    },
  }), [activeTool, getActiveLayer, smudgeStrength, canvasOperations]);
  
  // Layer operations
  const layerOperations = useMemo(() => ({
    addLayer: () => {
      if (!canvas) return;
      
      try {
        const newLayerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { canvas: layerCanvas, context } = canvasOperations.createLayerCanvas(canvas.width, canvas.height);
        
        const newLayer: Layer = {
          id: newLayerId,
          name: `Layer ${layers.length + 1}`,
          canvas: layerCanvas,
          context,
          visible: true,
          opacity: 1,
        };
        
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayerId);
      } catch (error) {
        console.error('Failed to add layer:', error);
      }
    },
    
    deleteLayer: (layerId: string) => {
      setLayers(prev => {
        const newLayers = prev.filter(l => l.id !== layerId);
        if (activeLayerId === layerId && newLayers.length > 0) {
          setActiveLayerId(newLayers[newLayers.length - 1].id);
        } else if (newLayers.length === 0) {
          setActiveLayerId(null);
        }
        return newLayers;
      });
    },
    
    toggleLayerVisibility: (layerId: string) => {
      setLayers(prev =>
        prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
      );
    },
  }), [canvas, layers.length, activeLayerId, canvasOperations]);
  
  // Selection operations
  const selectionOperations = useMemo(() => ({
    clearSelection: () => {
      canvasOperations.clearSelectionCanvas();
      setSelectionState(prev => ({ ...prev, selection: null, isSelecting: false }));
    },
    
    copySelection: () => {
      const { selection } = selectionState;
      const activeLayer = getActiveLayer();
      if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
        try {
          const imageData = activeLayer.context.getImageData(
            selection.x, selection.y, selection.width, selection.height
          );
          setClipboard(imageData);
        } catch (error) {
          console.error('Failed to copy selection:', error);
        }
      }
    },
    
    cutSelection: () => {
      const { selection } = selectionState;
      const activeLayer = getActiveLayer();
      if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
        selectionOperations.copySelection();
        activeLayer.context.clearRect(selection.x, selection.y, selection.width, selection.height);
        canvasOperations.compositeLayers();
        historyOperations.saveState();
        selectionOperations.clearSelection();
      }
    },
    
    deleteSelection: () => {
      const { selection } = selectionState;
      const activeLayer = getActiveLayer();
      if (selection && activeLayer && selection.width > 0 && selection.height > 0) {
        activeLayer.context.clearRect(selection.x, selection.y, selection.width, selection.height);
        canvasOperations.compositeLayers();
        historyOperations.saveState();
        selectionOperations.clearSelection();
      }
    },
    
    pasteSelection: () => {
      const { selection } = selectionState;
      const activeLayer = getActiveLayer();
      if (clipboard && activeLayer && selection) {
        try {
          activeLayer.context.putImageData(clipboard, selection.x, selection.y);
          canvasOperations.compositeLayers();
          historyOperations.saveState();
          selectionOperations.clearSelection();
        } catch (error) {
          console.error('Failed to paste selection:', error);
        }
      }
    },
  }), [selectionState, getActiveLayer, canvasOperations, historyOperations, clipboard]);
  
  // Canvas initialization
  useEffect(() => {
    if (canvas && canvasRef.current && selectionCanvasRef.current) {
      const canvasEl = canvasRef.current;
      const selectionCanvasEl = selectionCanvasRef.current;
      
      // Set canvas dimensions
      canvasEl.width = canvas.width;
      canvasEl.height = canvas.height;
      selectionCanvasEl.width = canvas.width;
      selectionCanvasEl.height = canvas.height;
      
      // Initialize main canvas context
      const mainContext = canvasEl.getContext('2d');
      if (mainContext) {
        contextRef.current = mainContext;
      }
      
      // Initialize selection canvas context
      const selectionContext = selectionCanvasEl.getContext('2d');
      if (selectionContext) {
        selectionContext.strokeStyle = 'rgba(0, 100, 255, 0.7)';
        selectionContext.lineWidth = 1;
        selectionContext.setLineDash([4, 4]);
        selectionContextRef.current = selectionContext;
      }
      
      // Create initial layer
      try {
        const firstLayerId = `layer-${Date.now()}-initial`;
        const { canvas: layerCanvas, context } = canvasOperations.createLayerCanvas(canvas.width, canvas.height);
        
        const initialLayer: Layer = {
          id: firstLayerId,
          name: 'Layer 1',
          canvas: layerCanvas,
          context,
          visible: true,
          opacity: 1,
        };
        
        setLayers([initialLayer]);
        setActiveLayerId(firstLayerId);
        
        // Reset state for new canvas
        setHistoryState({ snapshots: [], currentIndex: -1 });
        setSelectionState({ selection: null, selectionStart: null, isSelecting: false });
        setDrawingState({ isDrawing: false, lastPoint: null });
        setClipboard(null);
        
      } catch (error) {
        console.error('Failed to initialize canvas:', error);
      }
    }
  }, [canvas, canvasOperations]);
  
  // Re-composite layers when they change
  useEffect(() => {
    canvasOperations.compositeLayers();
  }, [layers, canvasOperations]);
  
  // Configure drawing context when tool or active layer changes
  useEffect(() => {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      drawingOperations.configureContext(activeLayer);
    }
  }, [activeTool, activeLayerId, drawingOperations, getActiveLayer]);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const activeLayer = getActiveLayer();
    if (!activeLayer) return;
    
    if (activeTool === 'selection') {
      setSelectionState(prev => ({
        ...prev,
        isSelecting: true,
        selectionStart: { x: offsetX, y: offsetY },
        selection: null,
      }));
      canvasOperations.clearSelectionCanvas();
      return;
    }
    
    if (activeTool === 'smudge') {
      setDrawingState({ isDrawing: true, lastPoint: { x: offsetX, y: offsetY } });
      return;
    }
    
    // Brush and eraser tools
    activeLayer.context.beginPath();
    activeLayer.context.moveTo(offsetX, offsetY);
    setDrawingState({ isDrawing: true, lastPoint: { x: offsetX, y: offsetY } });
  }, [activeTool, getActiveLayer, canvasOperations]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = event.nativeEvent;
    
    if (activeTool === 'selection' && selectionState.isSelecting && selectionState.selectionStart) {
      const { selectionStart } = selectionState;
      const x = Math.min(offsetX, selectionStart.x);
      const y = Math.min(offsetY, selectionStart.y);
      const width = Math.abs(offsetX - selectionStart.x);
      const height = Math.abs(offsetY - selectionStart.y);
      
      const newSelection = { x, y, width, height };
      setSelectionState(prev => ({ ...prev, selection: newSelection }));
      canvasOperations.drawSelection(x, y, width, height);
      return;
    }
    
    if (!drawingState.isDrawing || !drawingState.lastPoint) return;
    
    const activeLayer = getActiveLayer();
    if (!activeLayer) return;
    
    if (activeTool === 'smudge') {
      drawingOperations.smudge(
        offsetX, offsetY,
        drawingState.lastPoint.x, drawingState.lastPoint.y
      );
      setDrawingState(prev => ({ ...prev, lastPoint: { x: offsetX, y: offsetY } }));
      return;
    }
    
    // Brush and eraser tools
    activeLayer.context.lineTo(offsetX, offsetY);
    activeLayer.context.stroke();
    canvasOperations.compositeLayers();
    setDrawingState(prev => ({ ...prev, lastPoint: { x: offsetX, y: offsetY } }));
  }, [activeTool, selectionState, drawingState, getActiveLayer, canvasOperations, drawingOperations]);
  
  const handleMouseUp = useCallback(() => {
    if (activeTool === 'selection') {
      setSelectionState(prev => ({ ...prev, isSelecting: false, selectionStart: null }));
      return;
    }
    
    if (drawingState.isDrawing) {
      const activeLayer = getActiveLayer();
      if (activeLayer && activeTool !== 'smudge') {
        activeLayer.context.closePath();
      }
      historyOperations.saveState();
      setDrawingState({ isDrawing: false, lastPoint: null });
    }
  }, [activeTool, drawingState.isDrawing, getActiveLayer, historyOperations]);
  
  const handleMouseLeave = useCallback(() => {
    if (drawingState.isDrawing) {
      handleMouseUp();
    }
  }, [drawingState.isDrawing, handleMouseUp]);
  
  // Tool change handler
  const handleToolChange = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    if (tool !== 'selection') {
      selectionOperations.clearSelection();
    }
  }, [selectionOperations]);
  
  // Canvas creation handler
  const handleCreateCanvas = useCallback((settings: CanvasSettings) => {
    setCanvas(settings);
    setIsNewCanvasDialogOpen(false);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              historyOperations.redo();
            } else {
              historyOperations.undo();
            }
            break;
          case 'y':
            event.preventDefault();
            historyOperations.redo();
            break;
          case 'c':
            if (selectionState.selection) {
              event.preventDefault();
              selectionOperations.copySelection();
            }
            break;
          case 'x':
            if (selectionState.selection) {
              event.preventDefault();
              selectionOperations.cutSelection();
            }
            break;
          case 'v':
            if (clipboard && selectionState.selection) {
              event.preventDefault();
              selectionOperations.pasteSelection();
            }
            break;
        }
      }
      
      // Delete key for selection
      if (event.key === 'Delete' && selectionState.selection) {
        event.preventDefault();
        selectionOperations.deleteSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyOperations, selectionState, clipboard, selectionOperations]);
  
  // Computed values
  const canUndo = historyState.currentIndex > 0;
  const canRedo = historyState.currentIndex < historyState.snapshots.length - 1;
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-body">
        {/* Left Sidebar */}
        <aside className="flex flex-col items-center space-y-4 p-2 bg-card border-r z-20">
          <h1 className="text-2xl font-headline font-bold text-primary" aria-label="ArtStudio Pro">
            A
          </h1>
          <Separator />
          
          {/* Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={activeTool === 'brush' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => handleToolChange('brush')}
              >
                <Brush />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Brush (B)</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => handleToolChange('eraser')}
              >
                <Eraser />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Eraser (E)</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={activeTool === 'smudge' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => handleToolChange('smudge')}
              >
                <Hand />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Smudge (S)</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={activeTool === 'selection' ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={() => handleToolChange('selection')}
              >
                <SquareDashedMousePointer />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>Selection (V)</p></TooltipContent>
          </Tooltip>
          
          <Separator />
          
          {/* Panels */}
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button variant='ghost' size="icon" aria-label="Brushes">
                    <Brush />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Brushes</p></TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
               <SheetHeader className="p-4 border-b">
                <SheetTitle className="font-headline">Brushes</SheetTitle>
              </SheetHeader>
              <BrushPanel />
            </SheetContent>
          </Sheet>
          
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                 <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Layers />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Layers</p></TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Layers</SheetTitle>
              </SheetHeader>
              <LayersPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onAddLayer={layerOperations.addLayer}
                onDeleteLayer={layerOperations.deleteLayer}
                onSelectLayer={setActiveLayerId}
                onToggleVisibility={layerOperations.toggleLayerVisibility}
              />
            </SheetContent>
          </Sheet>
          
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                 <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Palette />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Color Palette</p></TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Color Palette</SheetTitle>
              </SheetHeader>
              <ColorPanel />
            </SheetContent>
          </Sheet>
          
          <Sheet>
             <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                   <Settings2 />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Filters & Effects</p></TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Filters & Effects</SheetTitle>
              </SheetHeader>
              <FiltersPanel />
            </SheetContent>
          </Sheet>
          
          <Sheet>
             <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Sparkles />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="right"><p>AI Assistant</p></TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-80 p-0 border-r z-50">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>AI Assistant</SheetTitle>
              </SheetHeader>
              <AiAssistantPanel />
            </SheetContent>
          </Sheet>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <h2 className="text-xl font-headline font-semibold">
              {canvas ? 'My Masterpiece' : 'Untitled Canvas'}
            </h2>
            
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={historyOperations.undo} 
                    disabled={!canUndo}
                  >
                    <Undo />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={historyOperations.redo} 
                    disabled={!canRedo}
                  >
                    <Redo />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
              </Tooltip>
              
              {/* File Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">File</Button>
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
                        <DialogDescription>
                          Set up your new canvas dimensions and settings
                        </DialogDescription>
                      </DialogHeader>
                      <NewCanvasPanel onCreate={handleCreateCanvas} />
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuItem disabled>
                    <Import className="mr-2 h-4 w-4" />
                    Import
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Save className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Canvas Area */}
          <main className="flex-1 bg-muted/50 grid place-items-center p-8 overflow-auto">
            {!canvas ? (
              // Welcome Screen
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-24 w-24 opacity-50" />
                <h3 className="mt-4 text-lg font-medium font-headline">
                  Welcome to ArtStudio Pro
                </h3>
                <p className="mt-1 text-sm">
                  Create a new canvas to start drawing.
                </p>
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
                      <DialogDescription>
                        Set up your new canvas dimensions and settings
                      </DialogDescription>
                    </DialogHeader>
                    <NewCanvasPanel onCreate={handleCreateCanvas} />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              // Canvas Area
              <div className="relative">
                {/* Main Canvas */}
                <canvas
                  ref={canvasRef}
                  className="bg-white rounded-lg shadow-2xl border-2 border-dashed cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    cursor: activeTool === 'brush' ? 'crosshair' :
                            activeTool === 'eraser' ? 'grab' :
                            activeTool === 'smudge' ? 'grab' :
                            activeTool === 'selection' ? 'crosshair' : 'default'
                  }}
                />
                
                {/* Selection Overlay Canvas */}
                <canvas
                  ref={selectionCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none z-10 rounded-lg"
                />
                
                {/* Selection Toolbar */}
                {selectionState.selection && selectionState.selection.width > 0 && selectionState.selection.height > 0 && (
                  <div 
                    style={{ 
                      left: selectionState.selection.x, 
                      top: Math.max(0, selectionState.selection.y - 60)
                    }} 
                    className="absolute flex items-center gap-1 bg-card p-2 rounded-md shadow-lg border z-20"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={selectionOperations.copySelection} 
                          className="h-8 w-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Copy (Ctrl+C)</p></TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={selectionOperations.cutSelection} 
                          className="h-8 w-8"
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Cut (Ctrl+X)</p></TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={selectionOperations.deleteSelection} 
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete (Del)</p></TooltipContent>
                    </Tooltip>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={selectionOperations.pasteSelection} 
                          disabled={!clipboard} 
                          className="h-8 w-8"
                        >
                          <ClipboardPaste className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Paste (Ctrl+V)</p></TooltipContent>
                    </Tooltip>
                  </div>
                )}
                
                {/* Smudge Tool Controls */}
                {activeTool === 'smudge' && (
                  <div className="absolute -top-16 left-0 flex items-center gap-3 bg-card px-4 py-2 rounded-md shadow-lg border">
                    <label htmlFor="smudge-strength" className="text-sm font-medium">
                      Strength:
                    </label>
                    <input
                      id="smudge-strength"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={smudgeStrength}
                      onChange={(e) => setSmudgeStrength(parseFloat(e.target.value))}
                      className="w-24 accent-primary"
                    />
                    <span className="text-sm text-muted-foreground min-w-[3rem]">
                      {Math.round(smudgeStrength * 100)}%
                    </span>
                  </div>
                )}
                
                {/* Canvas Info */}
                <div className="absolute -bottom-8 left-0 text-xs text-muted-foreground">
                  {canvas.width} × {canvas.height} px
                </div>
                
                {/* Layer Info */}
                <div className="absolute -bottom-8 right-0 text-xs text-muted-foreground">
                  {layers.length} layer{layers.length !== 1 ? 's' : ''} • 
                  Active: {layers.find(l => l.id === activeLayerId)?.name || 'None'}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Error Boundary Component for Canvas Operations
interface CanvasErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

function CanvasErrorBoundary({ children, onError }: CanvasErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Canvas error:', error);
      setHasError(true);
      onError?.(new Error(error.message));
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);
  
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="text-muted-foreground">
          <h3 className="text-lg font-medium">Canvas Error</h3>
          <p className="text-sm mt-1">Something went wrong with the canvas. Please refresh and try again.</p>
          <Button 
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }} 
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Performance monitoring hook
function usePerformanceMonitoring() {
  const performanceRef = useRef({
    drawOperations: 0,
    lastDrawTime: 0,
    averageDrawTime: 0,
  });
  
  const recordDrawOperation = useCallback((duration: number) => {
    const perf = performanceRef.current;
    perf.drawOperations++;
    perf.lastDrawTime = duration;
    perf.averageDrawTime = (perf.averageDrawTime * (perf.drawOperations - 1) + duration) / perf.drawOperations;
    
    // Log performance warning if operations are taking too long
    if (duration > 16) { // ~60fps threshold
      console.warn(`Slow draw operation detected: ${duration}ms`);
    }
  }, []);
  
  return { recordDrawOperation };
}

// Canvas utilities
export const canvasUtils = {
  // Convert canvas to blob for saving
  canvasToBlob: (canvas: HTMLCanvasElement, type = 'image/png', quality = 1): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        },
        type,
        quality
      );
    });
  },
  
  // Download canvas as image
  downloadCanvas: async (canvas: HTMLCanvasElement, filename = 'artwork.png') => {
    try {
      const blob = await canvasUtils.canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download canvas:', error);
      throw error;
    }
  },
  
  // Load image into canvas
  loadImageToCanvas: (
    canvas: HTMLCanvasElement, 
    imageUrl: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  },
  
  // Resize canvas maintaining aspect ratio
  resizeCanvas: (
    canvas: HTMLCanvasElement, 
    newWidth: number, 
    newHeight: number, 
    maintainAspectRatio = true
  ): HTMLCanvasElement => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Store original content
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    
    if (maintainAspectRatio) {
      const aspectRatio = canvas.width / canvas.height;
      if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
    }
    
    // Resize main canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    
    return canvas;
  }
};

// Custom hooks for canvas operations
export function useCanvasExport() {
  const exportCanvas = useCallback(async (
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality = 1
  ) => {
    try {
      const mimeType = `image/${format}`;
      const blob = await canvasUtils.canvasToBlob(canvas, mimeType, quality);
      return blob;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, []);
  
  const downloadCanvas = useCallback(async (
    canvas: HTMLCanvasElement,
    filename = 'artwork',
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality = 1
  ) => {
    try {
      const blob = await exportCanvas(canvas, format, quality);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }, [exportCanvas]);
  
  return { exportCanvas, downloadCanvas };
}

// Keyboard shortcuts hook
export function useCanvasShortcuts(handlers: {
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onSave?: () => void;
  onNew?: () => void;
  onToolChange?: (tool: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              handlers.onRedo?.();
            } else {
              handlers.onUndo?.();
            }
            break;
          case 'y':
            event.preventDefault();
            handlers.onRedo?.();
            break;
          case 'c':
            event.preventDefault();
            handlers.onCopy?.();
            break;
          case 'x':
            event.preventDefault();
            handlers.onCut?.();
            break;
          case 'v':
            event.preventDefault();
            handlers.onPaste?.();
            break;
          case 'a':
            event.preventDefault();
            handlers.onSelectAll?.();
            break;
          case 's':
            event.preventDefault();
            handlers.onSave?.();
            break;
          case 'n':
            event.preventDefault();
            handlers.onNew?.();
            break;
        }
      } else {
        // Tool shortcuts without modifiers
        switch (event.key.toLowerCase()) {
          case 'b':
            if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
              event.preventDefault();
              handlers.onToolChange?.('brush');
            }
            break;
          case 'e':
            if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
              event.preventDefault();
              handlers.onToolChange?.('eraser');
            }
            break;
          case 'v':
            if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
              event.preventDefault();
              handlers.onToolChange?.('selection');
            }
            break;
          case 's':
            if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
              event.preventDefault();
              handlers.onToolChange?.('smudge');
            }
            break;
          case 'delete':
          case 'backspace':
            if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
              event.preventDefault();
              handlers.onDelete?.();
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

// Local storage hook for saving work
export function useCanvasAutoSave(canvas: HTMLCanvasElement | null, layers: Layer[]) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  const saveToLocalStorage = useCallback(async () => {
    if (!canvas || layers.length === 0) return;
    
    try {
      const canvasData = canvas.toDataURL('image/png');
      const saveData = {
        canvasData,
        layers: layers.map(layer => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          data: layer.canvas.toDataURL('image/png'),
        })),
        timestamp: new Date().toISOString(),
      };
      
      localStorage.setItem('artstudio-autosave', JSON.stringify(saveData));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [canvas, layers]);
  
  // Auto-save with debouncing
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveToLocalStorage, 2000);
  }, [saveToLocalStorage]);
  
  // Trigger auto-save when layers change
  useEffect(() => {
    debouncedSave();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [layers, debouncedSave]);
  
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('artstudio-autosave');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load auto-save:', error);
    }
    return null;
  }, []);
  
  const clearAutoSave = useCallback(() => {
    localStorage.removeItem('artstudio-autosave');
    setLastSaved(null);
  }, []);
  
  return {
    lastSaved,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearAutoSave,
  };
}

// Export wrapped component with error boundary
export function ArtStudioPro() {
  return (
    <CanvasErrorBoundary>
      <Home />
    </CanvasErrorBoundary>
  );
}
 export default ArtStudioPro;
