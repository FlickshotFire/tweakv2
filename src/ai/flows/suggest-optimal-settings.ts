'use server';

/**
 * @fileOverview Analyzes a user's drawing style and suggests optimal brushes and canvas settings.
 *
 * - suggestOptimalSettings - A function that handles the suggestion of optimal settings based on drawing style.
 * - SuggestOptimalSettingsInput - The input type for the suggestOptimalSettings function.
 * - SuggestOptimalSettingsOutput - The return type for the suggestOptimalSettings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalSettingsInputSchema = z.object({
  drawingStyleDescription: z
    .string()
    .describe(
      'A detailed description of the user’s drawing style, including techniques, preferred subjects, and color preferences.'
    ),
  exampleArtworkDataUri: z
    .string()
    .describe(
      'An example artwork provided as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected description
    )
    .optional(),
});
export type SuggestOptimalSettingsInput = z.infer<typeof SuggestOptimalSettingsInputSchema>;

const SuggestOptimalSettingsOutputSchema = z.object({
  suggestedBrushes: z
    .array(z.string())
    .describe('A list of suggested brush types or specific brush names.'),
  suggestedCanvasSettings: z
    .object({
      resolution: z.string().describe('The suggested canvas resolution.'),
      colorProfile: z.string().describe('The suggested color profile (e.g., RGB, CMYK).'),
      size: z.string().describe('The suggested canvas size (e.g., 1920x1080 pixels).'),
    })
    .describe('Suggested canvas settings based on the drawing style.'),
  styleAnalysis: z
    .string()
    .describe('A brief analysis of the detected drawing style.'),
});
export type SuggestOptimalSettingsOutput = z.infer<typeof SuggestOptimalSettingsOutputSchema>;

export async function suggestOptimalSettings(
  input: SuggestOptimalSettingsInput
): Promise<SuggestOptimalSettingsOutput> {
  return suggestOptimalSettingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalSettingsPrompt',
  input: {schema: SuggestOptimalSettingsInputSchema},
  output: {schema: SuggestOptimalSettingsOutputSchema},
  prompt: `You are an expert art assistant that suggests brushes and canvas settings based on a user's drawing style.

Analyze the provided drawing style description and, if available, an example artwork to suggest optimal brushes and canvas settings.

Drawing Style Description: {{{drawingStyleDescription}}}
{{#if exampleArtworkDataUri}}
Example Artwork: {{media url=exampleArtworkDataUri}}
{{/if}}

Based on this analysis, provide:

*   A list of suggested brush types or specific brush names that would be suitable for this style.
*   Suggested canvas settings, including resolution, color profile, and size.
*   A brief analysis of the detected drawing style.

Ensure the suggestions align with the described style and the provided example, if any.
`, // Added Handlebars if statement
});

const suggestOptimalSettingsFlow = ai.defineFlow(
  {
    name: 'suggestOptimalSettingsFlow',
    inputSchema: SuggestOptimalSettingsInputSchema,
    outputSchema: SuggestOptimalSettingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
