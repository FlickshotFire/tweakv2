'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus } from "lucide-react";

export default function NewCanvasPanel() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create New Canvas</CardTitle>
        <CardDescription>Set up your canvas dimensions, resolution, and color profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width (px)</Label>
              <Input id="width" type="number" defaultValue="1920" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input id="height" type="number" defaultValue="1080" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution (DPI)</Label>
            <Input id="resolution" type="number" defaultValue="300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color-profile">Color Profile</Label>
            <Select defaultValue="sRGB">
              <SelectTrigger id="color-profile">
                <SelectValue placeholder="Select a color profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sRGB">sRGB IEC61966-2.1</SelectItem>
                <SelectItem value="display-p3">Display P3</SelectItem>
                <SelectItem value="cmyk">CMYK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            <FilePlus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
