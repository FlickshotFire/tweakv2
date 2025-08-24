'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FilePlus } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const formSchema = z.object({
  width: z.coerce.number().min(1, "Width must be at least 1."),
  height: z.coerce.number().min(1, "Height must be at least 1."),
  resolution: z.coerce.number().min(72, "Resolution must be at least 72."),
  colorProfile: z.string(),
});

export type CanvasSettings = z.infer<typeof formSchema>;

interface NewCanvasPanelProps {
  onCreate: (settings: CanvasSettings) => void;
}

export default function NewCanvasPanel({ onCreate }: NewCanvasPanelProps) {
  const form = useForm<CanvasSettings>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      width: 1920,
      height: 1080,
      resolution: 300,
      colorProfile: "sRGB",
    },
  });

  function onSubmit(values: CanvasSettings) {
    onCreate(values);
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution (DPI)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colorProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Profile</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color profile" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sRGB">sRGB IEC61966-2.1</SelectItem>
                      <SelectItem value="display-p3">Display P3</SelectItem>
                      <SelectItem value="cmyk">CMYK</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              <FilePlus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
 