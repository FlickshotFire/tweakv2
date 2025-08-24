'use client';

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

const filters = {
  "Blur": [
    { name: "Gaussian Blur", hasSlider: true },
    { name: "Motion Blur", hasSlider: true },
    { name: "Perspective Blur", hasSlider: false },
  ],
  "Sharpen": [
    { name: "Sharpen", hasSlider: true },
    { name: "Unsharp Mask", hasSlider: false },
  ],
  "Noise": [
    { name: "Noise", hasSlider: true },
    { name: "Clouds", hasSlider: false },
  ],
};

export default function FiltersPanel() {
  return (
    <ScrollArea className="h-full">
      <Accordion type="single" collapsible className="w-full p-4">
        {Object.entries(filters).map(([category, items]) => (
          <AccordionItem value={category} key={category}>
            <AccordionTrigger className="font-headline">{category}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.name} className="p-2 rounded-md hover:bg-secondary">
                    <p className="font-medium">{item.name}</p>
                    {item.hasSlider && (
                      <div className="mt-2 px-1">
                        <Slider defaultValue={[30]} max={100} step={1} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="p-4 mt-auto">
        <Button className="w-full">Apply Filter</Button>
      </div>
    </ScrollArea>
  );
}
