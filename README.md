# Translator AI - Browser Extension

A Chrome/Edge browser extension that translates web page content to Russian, German, or English using AI-powered translation API.

## Features

- 🌐 **Smart Content Extraction**: Uses Mozilla's Readability library to extract main article content, filtering out ads, navigation, and other non-essential elements
- 🔐 **Email-Based Authentication**: Simple authentication using base64-encoded email as Bearer token
- 🌍 **Multi-Language Support**: Translate to Russian (Русский), German (Deutsch), or English
- 🎨 **Modern UI**: Clean Bootstrap 5 interface with loading states and error handling
- ⚡ **Vanilla JavaScript**: No heavy frameworks, fast and lightweight

## Project Structure

```
client_exct_vanile_0.1/
├── manifest.json              # Extension configuration (Manifest V3)
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic and event handlers
├── css/
│   └── popup.css             # Custom styles
├── js/
│   ├── services/
│   │   ├── storage.js        # Email/token storage service
│   │   ├── api.js            # API fetch wrapper with auth
│   │   └── translator.js     # Translation service
│   └── content/
│       └── parser.js         # Content extraction script
├── lib/
│   └── Readability.js        # Mozilla Readability library
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

### 1. Prerequisites

- Chrome or Edge browser
- Backend API running on `http://localhost:8080` (see API Requirements below)

### 2. Load Extension

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `client_exct_vanile_0.1` directory
5. The extension icon should appear in your browser toolbar

## Usage

1. **Enter Email**: Click the extension icon and enter your email address
   - Email is stored locally and encoded to base64
   - Used as Bearer token for API authentication

2. **Select Language**: Choose target language from dropdown:
   - English
   - Russian (Русский)
   - German (Deutsch)

3. **Translate**: Click "Translate Page" button
   - Extension extracts main content from current page
   - Sends content to translation API
   - Displays translated text in popup

## API Requirements

The extension expects a backend API running on `http://localhost:8080` with the following endpoint:

### POST `/translate`

**Request Headers:**
```
Authorization: Bearer <base64_encoded_email>
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Content to translate...",
  "targetLanguage": "ru" | "de" | "en"
}
```

**Response:**
```json
{
  "translatedText": "Translated content..."
}
```

> **Note**: The API service (`js/services/translator.js`) also accepts alternative response formats:
> - `{ translation: "..." }`
> - `{ result: "..." }`

### Sample Request

Here's a real example of what the extension sends to the server when translating an article:

**Request Headers:**
```
Authorization: Bearer dGVzdEB1c2VyLmNvbQ==
Content-Type: application/json
```
> Note: `dGVzdEB1c2VyLmNvbQ==` is base64 encoding of `test@user.com`

**Request Body:**
```json
{
  "text": "Introduction to Machine Learning\n\nMachine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. It uses algorithms to identify patterns and make decisions with minimal human intervention.\n\nTypes of Machine Learning:\n\n1. Supervised Learning - The algorithm learns from labeled training data\n2. Unsupervised Learning - The algorithm finds patterns in unlabeled data\n3. Reinforcement Learning - The algorithm learns through trial and error\n\nApplications include image recognition, natural language processing, recommendation systems, and autonomous vehicles. As data availability increases, machine learning continues to transform industries worldwide.",
  "targetLanguage": "ru"
}
```

**Expected Response:**
```json
{
  "translatedText": "Введение в машинное обучение\n\nМашинное обучение — это подмножество искусственного интеллекта, которое позволяет компьютерам обучаться на данных без явного программирования. Оно использует алгоритмы для выявления закономерностей и принятия решений с минимальным вмешательством человека.\n\nТипы машинного обучения:\n\n1. Обучение с учителем - алгоритм обучается на размеченных обучающих данных\n2. Обучение без учителя - алгоритм находит закономерности в неразмеченных данных\n3. Обучение с подкреплением - алгоритм обучается методом проб и ошибок\n\nПриложения включают распознавание изображений, обработку естественного языка, рекомендательные системы и автономные транспортные средства. По мере увеличения доступности данных машинное обучение продолжает трансформировать отрасли по всему миру."
}
```

## Authentication Flow

1. User enters email in popup
2. Email saved to `chrome.storage.local`
3. On API request:
   - Email retrieved from storage
   - Encoded to base64: `btoa(email)`
   - Sent as `Authorization: Bearer <base64_email>`

## Content Extraction

The extension uses Mozilla's **Readability** library to extract clean article content:

- ✅ Extracts main article text
- ✅ Filters out ads, navigation, sidebars
- ✅ Removes buttons, forms, and interactive elements
- ✅ Handles various article formats and layouts

**Fallback**: If Readability can't parse the page, the extension falls back to extracting all body text.

## Development

### File Overview

#### Core Services

- **`js/services/storage.js`**: Manages email storage in `chrome.storage.local` and token generation
- **`js/services/api.js`**: Generic API fetch wrapper with automatic Bearer token injection
- **`js/services/translator.js`**: Translation-specific API calls

#### Content Script

- **`js/content/parser.js`**: Injected into all web pages, listens for content extraction requests from popup

#### Popup

- **`popup.html`**: Bootstrap 5 UI with email input, language selector, and result display
- **`popup.js`**: Handles user interactions, coordinates content extraction and translation workflow
- **`css/popup.css`**: Custom styling, animations, and responsive design

### Customization

#### Change API Endpoint

Edit `js/services/api.js`:
```javascript
const BASE_URL = 'http://localhost:8080'; // Change to your API URL
```

#### Modify Translation Endpoint

Edit `js/services/translator.js`:
```javascript
const response = await apiFetch('/translate', { // Change endpoint
  method: 'POST',
  body: JSON.stringify({
    text: text,
    targetLanguage: targetLanguage
  })
});
```

#### Add More Languages

1. Edit `popup.html`, add option to language selector:
```html
<option value="fr">French (Français)</option>
```

2. Update validation in `js/services/translator.js`:
```javascript
if (!['ru', 'de', 'en', 'fr'].includes(targetLanguage)) {
  throw new Error('Invalid target language. Must be ru, de, en, or fr');
}
```

## Troubleshooting

### Extension doesn't load
- Check that all files are present in the directory
- Verify `manifest.json` is valid JSON
- Check browser console for errors

### Content extraction fails
- Some pages may not be compatible with Readability
- Try the extension on article/blog pages (works best on content-heavy pages)
- Check browser console for errors

### Translation fails
- Verify backend API is running on `http://localhost:8080`
- Check that email is entered and valid
- Open browser DevTools → Network tab to inspect API requests
- Verify API returns expected response format

### "No content found" error
- Page may not have extractable article content
- Try on different pages (news articles, blogs, documentation)
- Check if page is fully loaded before translating

## Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Edge (Manifest V3)
- ❌ Firefox (requires Manifest V2 adjustments)

## License

MIT

## Credits

- **Mozilla Readability**: Content extraction library
- **Bootstrap 5**: UI framework
# js-vanile-extands-translator
