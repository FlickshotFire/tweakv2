'use server';

import { suggestOptimalSettings, type SuggestOptimalSettingsInput } from '@/ai/flows/suggest-optimal-settings';

export async function getAiSuggestions(data: SuggestOptimalSettingsInput) {
    try {
        const result = await suggestOptimalSettings(data);
        return { success: true, data: result };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: `Failed to get AI suggestions: ${errorMessage}` };
    }
}
