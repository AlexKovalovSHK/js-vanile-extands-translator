// Слушаем сообщения от Попапа
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getText") {
        // Простая логика: берем текст из body, исключая скрипты
        const bodyText = document.body.innerText;
        // Можно ограничить объем текста для начала
        const cleanText = bodyText.substring(0, 3000); 
        sendResponse({ text: cleanText });
    }
    return true; 
});