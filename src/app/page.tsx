'use client';

import { useState } from 'react';
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

type Tool = 'brushes' | 'layers' | 'colors' | 'filters' | 'ai-assistant';

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [canvas, setCanvas] = useState<CanvasSettings | null>(null);
  const [isNewCanvasDialogOpen, setIsNewCanvasDialogOpen] = useState(false);

  const tools: { id: Tool; label: string; icon: React.ElementType; panel: React.ElementType }[] = [
    { id: 'brushes', label: 'Brushes', icon: Brush, panel: BrushPanel },
    { id: 'layers', label: 'Layers', icon: Layers, panel: LayersPanel },
    { id: 'colors', label: 'Color Palette', icon: Palette, panel: ColorPanel },
    { id: 'filters', label: 'Filters & Effects', icon: Settings2, panel: FiltersPanel },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, panel: AiAssistantPanel },
  ];

  const handleCreateCanvas = (settings: CanvasSettings) => {
    setCanvas(settings);
    setIsNewCanvasDialogOpen(false);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-body">
        {/* Left Sidebar for tools */}
        <aside className="flex flex-col items-center space-y-4 p-2 bg-card border-r z-10">
          <h1 className="text-2xl font-headline font-bold text-primary" aria-label="ArtStudio Pro">A</h1>
          <Separator />
          {tools.map((tool) => (
            <Sheet key={tool.id} onOpenChange={(open) => setActiveTool(open ? tool.id : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant={activeTool === tool.id ? 'secondary' : 'ghost'} size="icon" aria-label={tool.label}>
                      <tool.icon className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{tool.label}</p>
                </TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="w-80 p-0 border-r">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="font-headline">{tool.label}</SheetTitle>
                </SheetHeader>
                <tool.panel />
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
                         <NewCanvasPanel onCreate={handleCreateCanvas} />
                      </DialogContent>
                    </Dialog>
              </div>
            ) : (
                <div 
                    className="bg-white rounded-lg shadow-2xl border-2 border-dashed" 
                    style={{ width: canvas.width, height: canvas.height }}
                >
                    {/* This would be the actual canvas component */}
                </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
