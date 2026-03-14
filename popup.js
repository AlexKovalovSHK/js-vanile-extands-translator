let pageContent = "";
let isEditingRaw = false;
let chatHistory = [];
let isEditingTestsRaw = false;
let testContent = "";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Инициализация UI
  await updateEmailUI();

  const email = await storageService.getEmail();
  if (!email) {
    const settingsPanel = document.getElementById("settingsPanel");
    bootstrap.Collapse.getOrCreateInstance(settingsPanel).show();
  }

  // 2. Авто-извлечение текста для первой вкладки
  try {
    pageContent = await extractPageContent();
    renderSourcePreview(pageContent);
  } catch (err) {
    showStatus("Could not read page: " + err.message, "warning");
  }

  // Авто-извлечение текста для вкладки тестов (при загрузке)
  try {
    testContent = await extractPageContent();
    renderTestsPreview(testContent);
  } catch (err) {
    console.error("Test extraction failed", err);
  }

  // 3. Обработчики переводчика
  document
    .getElementById("toggleEditSourceBtn")
    .addEventListener("click", toggleSourceMode);
  document
    .getElementById("saveEmailBtn")
    .addEventListener("click", handleSaveEmail);
  document
    .getElementById("changeEmailBtn")
    .addEventListener("click", handleChangeEmail);
  document
    .getElementById("translateBtn")
    .addEventListener("click", () => handleAction("prod"));
  document
    .getElementById("translateDevBtn")
    .addEventListener("click", () => handleAction("dev"));
  document
    .getElementById("backToEditBtn")
    .addEventListener("click", showEditor);
  document
    .getElementById("toggleEmailVisibility")
    .addEventListener("click", toggleEmail);
  document
    .getElementById("closePopupBtn")
    .addEventListener("click", () => window.close());

  // Обработчики для тестов
  document
    .getElementById("toggleEditTestsBtn")
    .addEventListener("click", toggleTestsSourceMode);
  document
    .getElementById("solveTestsBtn")
    .addEventListener("click", handleSolveTests);
  document
    .getElementById("copyTestsBtn")
    .addEventListener("click", handleCopyTests);

  // 4. Логика EXTRACTOR (Исправлено: вынесено из донатов)
  const btnTxt = document.getElementById("btn-txt");
  const btnMd = document.getElementById("btn-md");
  const btnPdf = document.getElementById("btn-pdf");
  const btnXls = document.getElementById("btn-xls");
  const exportStatusDiv = document.getElementById("export-status");

  function setExportStatus(msg, type = "info") {
    if (!exportStatusDiv) return;
    exportStatusDiv.innerHTML = msg;
    exportStatusDiv.style.color = type === "error" ? "#e74c3c" : "#7f8c8d";
  }

  function sendExportMessage(format) {
    setExportStatus(
      '<span class="spinner-border spinner-border-sm"></span> Processing page...',
    );

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        setExportStatus("Error: no active tab", "error");
        return;
      }
      const activeTab = tabs[0];
      if (
        activeTab.url.startsWith("chrome://") ||
        activeTab.url.startsWith("edge://")
      ) {
        setExportStatus("Cannot save system pages", "error");
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "download", format: format },
        (response) => {
          if (chrome.runtime.lastError) {
            setExportStatus("Refresh the page and try again", "error");
          } else {
            if (response?.status === "success") {
              setExportStatus("✅ Successfully saved!", "success");
              setTimeout(() => setExportStatus(""), 3000);
            } else {
              setExportStatus(
                "❌ Error: " + (response?.message || "Unknown"),
                "error",
              );
            }
          }
        },
      );
    });
  }

  if (btnTxt) btnTxt.addEventListener("click", () => sendExportMessage("txt"));
  if (btnMd) btnMd.addEventListener("click", () => sendExportMessage("md"));
  if (btnPdf) btnPdf.addEventListener("click", () => sendExportMessage("pdf"));
  if (btnXls) btnXls.addEventListener("click", () => sendExportMessage("xls"));

  // 5. Логика донатов
  const donateToggle = document.getElementById("donateToggle");
  const donateContent = document.getElementById("donateContent");

  donateToggle.addEventListener("click", () => {
    const isHidden = donateContent.classList.toggle("d-none");
    if (!isHidden) {
      setTimeout(() => {
        donateContent.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  });

  // 6. Кнопки копирования
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const address = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(address).then(() => {
        const oldText = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.replace("btn-outline-secondary", "btn-success");
        setTimeout(() => {
          btn.textContent = oldText;
          btn.classList.replace("btn-success", "btn-outline-secondary");
        }, 2000);
      });
    });
  });
});

/* ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ПЕРЕВОДЧИКА */

function renderSourcePreview(content) {
  const previewDiv = document.getElementById("sourcePreview");
  const editor = document.getElementById("mdEditor");
  editor.value = content;
  previewDiv.innerHTML = marked.parse(content || "No content found.", {
    breaks: true,
  });
}

function toggleSourceMode() {
  const previewEl = document.getElementById("sourcePreview");
  const editorEl = document.getElementById("mdEditor");
  const btn = document.getElementById("toggleEditSourceBtn");
  isEditingRaw = !isEditingRaw;

  if (isEditingRaw) {
    previewEl.classList.add("d-none");
    editorEl.classList.remove("d-none");
    btn.textContent = "👁️ View Preview";
    editorEl.focus();
  } else {
    pageContent = editorEl.value;
    renderSourcePreview(pageContent);
    previewEl.classList.remove("d-none");
    editorEl.classList.add("d-none");
    btn.textContent = "📝 Edit Raw";
  }
}

async function handleAction(mode) {
  const email = await storageService.getEmail();
  if (!email) {
    showStatus("Save email first", "danger");
    return;
  }

  const currentText = document.getElementById("mdEditor").value;
  if (!currentText.trim()) {
    showStatus("Text is empty", "warning");
    return;
  }

  setLoading(true);
  try {
    const targetLang = document.getElementById("languageSelect").value;
    const fetchFunc = mode === "dev" ? apiFetchDev : apiFetch;
    const data = await fetchFunc("/translate", {
      method: "POST",
      body: JSON.stringify({ text: currentText, targetLanguage: targetLang }),
    });
    showTranslation(data.translatedText);
    showStatus("Translated!", "success");
  } catch (error) {
    showStatus(error.message, "danger");
  } finally {
    setLoading(false);
  }
}

function showTranslation(mdText) {
  document.getElementById("editorArea").classList.add("d-none");
  document.getElementById("resultArea").classList.remove("d-none");
  document.getElementById("backToEditBtn").classList.remove("d-none");
  document.getElementById("translationText").innerHTML = marked.parse(mdText, {
    breaks: true,
  });
}

function showEditor() {
  // Возврат для первой вкладки (Переводчик)
  document.getElementById("editorArea").classList.remove("d-none");
  document.getElementById("resultArea").classList.add("d-none");
  
  // Возврат для третьей вкладки (Тесты)
  document.getElementById("testEditorArea").classList.remove("d-none");
  document.getElementById("testsResultArea").classList.add("d-none");
  
  // Скрываем саму кнопку "Назад"
  document.getElementById("backToEditBtn").classList.add("d-none");
}

async function extractPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("http")) return "Cannot read this page.";

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const main = document.querySelector("main") || document.body;
      const elements = main.querySelectorAll("h1, h2, p, li");
      let text = "";
      elements.forEach((el) => {
        if (el.innerText.trim().length < 10) return;
        if (el.tagName.startsWith("H")) text += `## ${el.innerText.trim()}\n\n`;
        else if (el.tagName === "LI") text += `* ${el.innerText.trim()}\n`;
        else text += `${el.innerText.trim()}\n\n`;
      });
      return text;
    },
  });
  return results[0].result;
}

function showStatus(msg, type) {
  const area = document.getElementById("statusArea");
  const message = document.getElementById("statusMessage");
  message.className = `alert alert-${type} p-2 mb-0 small`;
  message.textContent = msg;
  area.classList.remove("d-none");
}

function setLoading(isLoading) {
  document.getElementById("translateBtn").disabled = isLoading;
  document.getElementById("btnSpinner").classList.toggle("d-none", !isLoading);
}

async function updateEmailUI() {
  const email = await storageService.getEmail();
  if (email) {
    document.getElementById("emailInputSection").classList.add("d-none");
    document.getElementById("emailDisplaySection").classList.remove("d-none");
    document.getElementById("displayedEmail").textContent = email;
  } else {
    document.getElementById("emailInputSection").classList.remove("d-none");
    document.getElementById("emailDisplaySection").classList.add("d-none");
  }
}

async function handleSaveEmail() {
  const val = document.getElementById("emailInput").value.trim();
  if (val.includes("@")) {
    await storageService.setEmail(val);
    await updateEmailUI();
  }
}

async function handleChangeEmail() {
  await storageService.clearEmail();
  await updateEmailUI();
}

function toggleEmail() {
  const input = document.getElementById("emailInput");
  input.type = input.type === "password" ? "text" : "password";
}

const sendChatBtn = document.getElementById("sendChatBtn");
if (sendChatBtn) {
  sendChatBtn.addEventListener("click", handleChatSend);
}

const chatInput = document.getElementById("chatInput");
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });
}

async function handleChatSend() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  const btn = document.getElementById("sendChatBtn");
  const spinner = document.getElementById("chatBtnSpinner");

  if (!message) return;

  // 1. Блокируем интерфейс
  input.value = "";
  input.disabled = true;
  btn.disabled = true;
  spinner.classList.remove("d-none");

  // 2. Добавляем сообщение пользователя в UI и в историю
  appendMessage("user", message);

  try {
    // 3. Запрос к бекенду (используем apiFetch, который уже настроен на Bearer token)
    // Если нужно тестировать на локалке, можно временно заменить на apiFetchDev
    const data = await apiFetch("/chat", {
      method: "POST",
      body: JSON.stringify({
        message: message,
        history: chatHistory,
      }),
    });

    const aiResponse = data.content;

    // 4. Добавляем ответ AI в UI
    appendMessage("assistant", aiResponse);

    // 5. Сохраняем в историю для контекста (DeepSeek ожидает role и content)
    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: aiResponse });

    // Ограничиваем историю (например, последние 10 сообщений), чтобы не перегружать токены
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch (error) {
    showStatus("Chat error: " + error.message, "danger");
    appendMessage(
      "assistant",
      "❌ Ошибка: Не удалось получить ответ от сервера.",
    );
  } finally {
    input.disabled = false;
    btn.disabled = false;
    spinner.classList.add("d-none");
    input.focus();
  }
}

function appendMessage(role, text) {
  const container = document.getElementById("chatMessages");

  // Убираем заглушку "Начните диалог", если она есть
  if (container.querySelector(".text-muted")) {
    container.innerHTML = "";
  }

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${role === "user" ? "msg-user" : "msg-ai"}`;

  // Используем marked для рендеринга Markdown из ответа нейронки
  msgDiv.innerHTML = marked.parse(text);

  container.appendChild(msgDiv);

  // Прокрутка вниз
  container.scrollTop = container.scrollHeight;
}

const solveTestsBtn = document.getElementById("solveTestsBtn");
if (solveTestsBtn) {
  solveTestsBtn.addEventListener("click", handleSolveTests);
}

function setLoadingTests(isLoading) {
  const btn = document.getElementById("solveTestsBtn");
  const spinner = document.getElementById("testsBtnSpinner");
  btn.disabled = isLoading;
  spinner.classList.toggle("d-none", !isLoading);
  document.getElementById("testsBtnText").textContent = isLoading
    ? "Анализирую..."
    : "🔍 Найти ответы на странице";
}

const copyTestsBtn = document.getElementById("copyTestsBtn");
if (copyTestsBtn) {
  copyTestsBtn.addEventListener("click", handleCopyTests);
}

async function handleCopyTests() {
  const resultDiv = document.getElementById("testsHelperText");
  const btn = document.getElementById("copyTestsBtn");

  // Получаем текстовое содержимое (без HTML тегов)
  const textToCopy = resultDiv.innerText;

  if (!textToCopy) return;

  try {
    await navigator.clipboard.writeText(textToCopy);

    // Визуальный фидбек на кнопке (как у вас в донатах)
    const oldText = btn.innerHTML;
    btn.innerHTML = "✅ Скопировано!";
    btn.classList.replace("btn-outline-secondary", "btn-success");

    setTimeout(() => {
      btn.innerHTML = oldText;
      btn.classList.replace("btn-success", "btn-outline-secondary");
    }, 2000);
  } catch (err) {
    console.error("Ошибка копирования:", err);
    showStatus("Не удалось скопировать", "danger");
  }
}

// Рендеринг превью для тестов
function renderTestsPreview(content) {
  const previewDiv = document.getElementById("testSourcePreview");
  const editor = document.getElementById("testMdEditor");
  editor.value = content;
  previewDiv.innerHTML = marked.parse(content || "Текст не найден. Вставьте его вручную.", { breaks: true });
}

// Переключение режимов (Превью / Редактирование)
function toggleTestsSourceMode() {
  const previewEl = document.getElementById("testSourcePreview");
  const editorEl = document.getElementById("testMdEditor");
  const btn = document.getElementById("toggleEditTestsBtn");
  isEditingTestsRaw = !isEditingTestsRaw;

  if (isEditingTestsRaw) {
    previewEl.classList.add("d-none");
    editorEl.classList.remove("d-none");
    btn.textContent = "👁️ Просмотр";
    editorEl.focus();
  } else {
    testContent = editorEl.value; // Сохраняем то, что отредактировал пользователь
    renderTestsPreview(testContent);
    previewEl.classList.remove("d-none");
    editorEl.classList.add("d-none");
    btn.textContent = "📝 Редактировать текст";
  }
}

// Обновленная функция отправки (берет текст из редактора, а не с активной вкладки)
async function handleSolveTests() {
  // 1. Берем актуальное значение из textarea
  const editorEl = document.getElementById("testMdEditor");
  testContent = editorEl.value.trim();

  if (!testContent) {
    showStatus("Текст тестов пуст!", "warning");
    return;
  }

  const resultArea = document.getElementById("testsResultArea");
  const resultText = document.getElementById("testsHelperText");
  const testEditorArea = document.getElementById("testEditorArea"); // Блок с исходником
  const backBtn = document.getElementById("backToEditBtn"); // Кнопка "Назад"

  setLoadingTests(true);
  resultArea.classList.add("d-none");

  try {
    const data = await apiService.solveTests(testContent, 'dev');

    // --- ВОТ ЭТИ СТРОКИ СКРЫВАЮТ ИСХОДНИК И ПОКАЗЫВАЮТ РЕЗУЛЬТАТ ---
    testEditorArea.classList.add("d-none"); // Скрываем редактор тестов
    resultText.innerHTML = marked.parse(data.content);
    resultArea.classList.remove("d-none"); // Показываем результат
    backBtn.classList.remove("d-none"); // Показываем кнопку "Назад" в шапке
    // -------------------------------------------------------------

    resultArea.scrollIntoView({ behavior: 'smooth', block: 'end' });

  } catch (error) {
    showStatus("Ошибка: " + error.message, "danger");
  } finally {
    setLoadingTests(false);
  }
}