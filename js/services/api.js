//const BASE_URL_DEV = 'http://localhost:8080';
const BASE_URL_DEV = 'http://localhost:5009';
//const BASE_URL = 'https://bun-translator.shk.solutions';
const BASE_URL = 'http://localhost:5009';


// Базовая функция запроса (оставляем как есть)
async function apiFetch(url, options = {}, isDev = false) {
    const token = await storageService.getToken();
    const baseUrl = isDev ? BASE_URL_DEV : BASE_URL;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка сервера');
    }
    return response.json();
}

// ВЫНОСИМ ЛОГИКУ ЗАПРОСОВ СЮДА:
const apiService = {
    // Запрос на перевод
    async translate(text, targetLang, mode = 'prod') {
        return apiFetch('/translate', {
            method: 'POST',
            body: JSON.stringify({ text, targetLanguage: targetLang }),
        }, mode === 'dev');
    },

    // Запрос в чат
    async sendChat(message, history, mode = 'prod') {
        return apiFetch('/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history }),
        }, mode === 'dev');
    },

     async solveTests(pageText, mode = 'prod') {
        const prompt = `
            Ты — профессиональный ассистент по обучению. 
            Твоя задача: 
            1. Проанализировать текст веб-страницы ниже.
            2. Найти в нем все вопросы, тесты или задачи.
            3. Для каждого вопроса дай правильный ответ.
            4. Если это тест с вариантами (A, B, C, D), укажи правильную букву и текст.
            5. Дай краткое пояснение, почему этот ответ верен.
            
            Текст страницы:
            ${pageText}
        `;

        // Мы отправляем это как обычное сообщение в чат
        return apiFetch('/chat', {
            method: 'POST',
            body: JSON.stringify({ message: prompt, history: [] }),
        }, mode === 'dev');
    }
};