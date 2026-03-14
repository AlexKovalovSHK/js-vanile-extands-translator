/**
 * Translator Service
 * Handles translation API calls
 */

const translatorService = {
    /**
     * Translate text to target language
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language code ('ru', 'de', 'en')
     * @returns {Promise<string>} Translated text
     */
    async translate(text, targetLanguage) {
        if (!text || !text.trim()) {
            throw new Error('No text provided for translation');
        }

        if (!['ru', 'de', 'en'].includes(targetLanguage)) {
            throw new Error('Invalid target language. Must be ru, de, or en');
        }

        try {
            const response = await apiFetch('/translate', {
                method: 'POST',
                body: JSON.stringify({
                    text: text,
                    targetLanguage: targetLanguage
                })
            });

            const data = await response.json();

            // Assuming the API returns { translatedText: string }
            // Adjust based on actual API response format
            return data.translatedText || data.translation || data.result || '';
        } catch (error) {
            console.error('Translation error:', error);
            throw new Error(`Translation failed: ${error.message}`);
        }
    }
};
