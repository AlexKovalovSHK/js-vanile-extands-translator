/**
 * Content Parser
 * Extracts main content from web pages using Readability
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
        try {
            const content = extractMainContent();
            sendResponse({ success: true, content: content });
        } catch (error) {
            console.error('Content extraction error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep message channel open for async response
});

/**
 * Extract main content from current page using Readability
 * @returns {string} Extracted text content
 */
function extractMainContent() {
    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true);

    // Check if Readability is available
    if (typeof Readability === 'undefined') {
        throw new Error('Readability library not loaded');
    }

    // Create a new Readability instance
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
        // Fallback: if Readability can't parse, try to get body text
        const bodyText = document.body.innerText || document.body.textContent || '';
        if (!bodyText.trim()) {
            throw new Error('No content found on this page');
        }
        return bodyText.trim();
    }

    // Extract text content from the parsed article
    // article.textContent contains the main text without HTML tags
    const content = article.textContent || article.content || '';

    if (!content.trim()) {
        throw new Error('No readable content found on this page');
    }

    return content.trim();
}

// Log when content script is loaded
console.log('Translator AI: Content parser loaded');
