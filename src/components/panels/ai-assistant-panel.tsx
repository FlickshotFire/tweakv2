'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import { getAiSuggestions } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import type { SuggestOptimalSettingsOutput } from '@/ai/flows/suggest-optimal-settings';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  drawingStyleDescription: z.string().min(10, 'Please describe your style in more detail.'),
  exampleArtwork: z.any().optional(),
});

export default function AiAssistantPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SuggestOptimalSettingsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawingStyleDescription: '',
    },
  });

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);

    let exampleArtworkDataUri: string | undefined = undefined;
    if (values.exampleArtwork && values.exampleArtwork.length > 0) {
        try {
            exampleArtworkDataUri = await readFileAsDataURL(values.exampleArtwork[0]);
        } catch (error) {
            console.error("Error reading file:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not process the uploaded image.",
            });
            setIsLoading(false);
            return;
        }
    }
    
    const response = await getAiSuggestions({
        drawingStyleDescription: values.drawingStyleDescription,
        exampleArtworkDataUri
    });

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      toast({
        variant: "destructive",
        title: "AI Assistant Error",
        description: response.error,
      });
    }
    setIsLoading(false);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-2">
            <CardTitle className="font-headline">AI Stylization Assistant</CardTitle>
            <CardDescription>Get personalized brush and canvas recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="drawingStyleDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe your drawing style</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="e.g., 'I create anime-style characters with soft, pastel colors and clean line art.'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exampleArtwork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload an example (optional)</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Get Suggestions
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {isLoading && (
          <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Analyzing your style...</p>
          </div>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Style Analysis</h4>
                <p className="text-sm text-muted-foreground">{result.styleAnalysis}</p>
              </div>
              <div>
                <h4 className="font-semibold">Suggested Brushes</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {result.suggestedBrushes.map(brush => <li key={brush}>{brush}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Suggested Canvas</h4>
                <p className="text-sm text-muted-foreground">
                  {result.suggestedCanvasSettings.size} @ {result.suggestedCanvasSettings.resolution}, {result.suggestedCanvasSettings.colorProfile}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
