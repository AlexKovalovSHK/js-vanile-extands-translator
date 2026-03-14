/* global Readability, TurndownService, jsPDF */

// Функция для скачивания файла
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Функция для генерации метаданных
function getMetadata(title) {
    const url = window.location.href;
    const date = new Date().toLocaleString('ru-RU');
    return {
        txt: `\n\n---\Source: ${url}\nGenerated on: ${date}`,
        md: `\n\n---\n**Source**: [${url}](${url})\n\n**Generated on**: ${date}`,
        html: `<div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #777;">
             <p><strong>Source:</strong> <a href="${url}">${url}</a></p>
             <p><strong>Generated on:</strong> ${date}</p>
           </div>`
    };
}

// Переключатели состояния сообщения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download') {
        try {
            // 1. Создаем клон документа для парсинга, чтобы не ломать текущую страницу
            const documentClone = document.cloneNode(true);

            // --- Очистка от медиа (img, svg, picture, video) ДО парсинга ---
            const mediaSelectors = ['img', 'svg', 'picture', 'video', 'figure', 'source'];
            mediaSelectors.forEach(selector => {
                const elements = documentClone.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            // 2. Используем Readability для парсинга
            // Проверяем наличие библиотеки
            if (typeof Readability === 'undefined') {
                throw new Error('Библиотека Readability не загружена.');
            }

            const reader = new Readability(documentClone);
            const article = reader.parse();

            if (!article) {
                throw new Error('Не удалось извлечь контент. Возможно, страница недостаточно текстовая.');
            }

            const title = article.title || 'downloaded_content';
            const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 50);
            const metadata = getMetadata(title);

            switch (request.format) {
                case 'txt':
                    const txtContent = article.textContent + metadata.txt;
                    downloadFile(txtContent, `${safeTitle}.txt`, 'text/plain;charset=utf-8');
                    break;

                case 'md':
                    if (typeof TurndownService === 'undefined') {
                        throw new Error('Библиотека Turndown не загружена.');
                    }
                    const turndownService = new TurndownService();
                    // Дополнительная страховка: удаляем img, если они вдруг остались
                    turndownService.remove(['img', 'picture', 'svg']);
                    const markdown = turndownService.turndown(article.content) + metadata.md;
                    downloadFile(markdown, `${safeTitle}.md`, 'text/markdown;charset=utf-8');
                    break;

                case 'xls':
                    if (typeof XLSX === 'undefined') {
                        throw new Error('Библиотека SheetJS (XLSX) не загружена.');
                    }

                    const wb = XLSX.utils.book_new();
                    let sheetCount = 0;

                    // --- 1. Обработка стандартных таблиц <table> ---
                    const tables = document.getElementsByTagName('table');
                    for (let i = 0; i < tables.length; i++) {
                        if (tables[i].rows.length >= 3) {
                            const ws = XLSX.utils.table_to_sheet(tables[i]);
                            sheetCount++;
                            XLSX.utils.book_append_sheet(wb, ws, `Table ${sheetCount}`);
                        }
                    }

                    // --- 2. Обработка div-таблиц (Pseudo-tables) ---
                    const pseudoSelectors = '[data-ref="tableInner"], [class*="table__tbody"], [class*="product-table"]';
                    const pseudoTables = document.querySelectorAll(pseudoSelectors);

                    pseudoTables.forEach((container) => {
                        // Считаем прямых потомков за строки
                        const rows = Array.from(container.children);

                        // Фильтр: минимум 3 строки
                        if (rows.length < 3) return;

                        const tableData = [];

                        rows.forEach(row => {
                            const rowData = [];
                            // Собираем ячейки (прямые потомки строки)
                            const cells = Array.from(row.children);

                            cells.forEach(cell => {
                                // Чистим текст: убираем лишние пробелы и переносы
                                let text = cell.textContent || '';
                                text = text.replace(/\s+/g, ' ').trim();
                                rowData.push(text);
                            });

                            if (rowData.length > 0) {
                                tableData.push(rowData);
                            }
                        });

                        if (tableData.length >= 3) {
                            const ws = XLSX.utils.aoa_to_sheet(tableData);
                            sheetCount++;
                            XLSX.utils.book_append_sheet(wb, ws, `DivTable ${sheetCount}`);
                        }
                    });

                    if (sheetCount === 0) {
                        sendResponse({ status: 'warning', message: 'Tables not found (standard or div-based with rows >= 3)' });
                        return;
                    }

                    // Генерация файла и скачивание
                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    downloadFile(wbout, `${safeTitle}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    break;

                case 'pdf':
                    // Способ через window.print() для максимальной совместимости с кириллицей и стилями
                    printPDF(article.title, article.content, metadata.html);
                    break;
            }

            sendResponse({ status: 'success' });
        } catch (error) {
            console.error('Ошибка расширения:', error);
            sendResponse({ status: 'error', message: error.message });
        }
    }
    return true; // Для асинхронного ответа
});

function printPDF(title, contentHTML, metadataHTML) {
    // Создаем iframe для печати, чтобы не менять текущую страницу
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        img { max-width: 100%; height: auto; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; }
        a { color: #007bff; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${contentHTML}
      ${metadataHTML}
    </body>
    </html>
  `);
    doc.close();

    // Ждем загрузки картинок (опционально, можно просто тайм-аут)
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Удаляем iframe после печати (можно увеличить таймаут, чтобы пользователь успел нажать печать)
        // Но window.print() блокирует выполнение JS в Chrome, так что удаление произойдет после закрытия диалога.
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 100);
    }, 500);
}
