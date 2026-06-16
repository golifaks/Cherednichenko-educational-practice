
const API_BASE = 'http://localhost:3000/api';

const DOM = {
    keywordInput: document.getElementById('keywordInput'),
    searchBtn: document.getElementById('searchBtn'),
    urlContainer: document.getElementById('urlContainer'),
    downloadStatus: document.getElementById('downloadStatus'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    statusMessage: document.getElementById('statusMessage'),
    savedList: document.getElementById('savedList'),
    contentViewer: document.getElementById('contentViewer'),
    clearAllBtn: document.getElementById('clearAllBtn')
};

let state = {
    currentUrls: [],
    selectedUrl: '',
    isDownloading: false
};

const Storage = {
    getKey() {
        return 'downloadedContent';
    },

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.getKey()) || '[]');
        } catch {
            return [];
        }
    },

    save(item) {
        const items = this.getAll();
        items.push({
            ...item,
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(this.getKey(), JSON.stringify(items));
        return items;
    },

    delete(id) {
        const items = this.getAll().filter(item => item.id !== id);
        localStorage.setItem(this.getKey(), JSON.stringify(items));
        return items;
    },

    clearAll() {
        localStorage.removeItem(this.getKey());
        return [];
    }
};

function showMessage(container, message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message message-${type}`;
    msgDiv.textContent = message;
    container.prepend(msgDiv);
    setTimeout(() => {
        if (msgDiv.parentNode) msgDiv.remove();
    }, 5000);
}

function showError(message) {
    showMessage(DOM.urlContainer, '❌ ' + message, 'error');
}

function showSuccess(message) {
    showMessage(DOM.urlContainer, '✅ ' + message, 'success');
}

function showInfo(message) {
    showMessage(DOM.urlContainer, 'ℹ️ ' + message, 'info');
}

function renderUrlList(urls) {
    if (!urls || urls.length === 0) {
        DOM.urlContainer.innerHTML = '<p style="color:#666;">Нет доступных URL</p>';
        return;
    }

    DOM.urlContainer.innerHTML = `
        <div style="margin-bottom:10px;font-weight:600;color:#333;">
            📋 Найдено URL: ${urls.length}
        </div>
        <div class="url-list">
            ${urls.map(url => `
                <div class="url-item" data-url="${url}">
                    <span class="url-text">${url}</span>
                </div>
            `).join('')}
        </div>
        <button id="downloadSelectedBtn" class="btn btn-success" style="margin-top:15px;">
            ⬇️ Скачать выбранный
        </button>
        <button id="clearUrlsBtn" class="btn btn-danger" style="margin-top:10px;margin-left:10px;">
            🗑️ Очистить список
        </button>
    `;

    document.querySelectorAll('.url-item').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.url-item').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            state.selectedUrl = el.dataset.url;
            showSuccess(`Выбран: ${state.selectedUrl}`);
        });
    });

    document.getElementById('downloadSelectedBtn').addEventListener('click', handleDownload);

    document.getElementById('clearUrlsBtn').addEventListener('click', () => {
        DOM.urlContainer.innerHTML = '';
        state.currentUrls = [];
        state.selectedUrl = '';
    });
}

function renderSavedContent() {
    const items = Storage.getAll();
    
    if (items.length === 0) {
        DOM.savedList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Нет сохранённого контента</p>
                <p style="font-size:0.85rem;color:#aaa;">Скачайте контент, чтобы он появился здесь</p>
            </div>
        `;
        DOM.contentViewer.textContent = '';
        return;
    }

    DOM.savedList.innerHTML = items.map(item => `
        <div class="saved-item" data-id="${item.id}">
            <div class="item-info">
                <span class="item-keyword">🔑 ${item.keyword}</span>
                <span class="item-url">${item.url}</span>
                <span class="item-time">📅 ${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-small view-btn" data-id="${item.id}">👁️ Просмотр</button>
                <button class="btn btn-danger btn-small delete-btn" data-id="${item.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const items = Storage.getAll();
            const item = items.find(i => i.id === id);
            if (item) {
                DOM.contentViewer.textContent = item.content;
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (confirm('Удалить этот сохранённый контент?')) {
                Storage.delete(id);
                renderSavedContent();
                if (DOM.contentViewer.textContent) {
                    DOM.contentViewer.textContent = '';
                }
                showSuccess('Контент удалён');
            }
        });
    });
}

async function handleDownload() {
    if (!state.selectedUrl) {
        showError('Сначала выберите URL из списка');
        return;
    }

    if (state.isDownloading) {
        showInfo('Загрузка уже выполняется...');
        return;
    }

    const keyword = DOM.keywordInput.value.trim() || 'unknown';
    state.isDownloading = true;
    
    DOM.downloadStatus.style.display = 'block';
    DOM.progressFill.style.width = '0%';
    DOM.progressText.textContent = '0%';
    DOM.statusMessage.textContent = '⏳ Подготовка к загрузке...';

    try {
        const response = await fetch(`${API_BASE}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: state.selectedUrl })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Ошибка загрузки контента');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;
                try {
                    const data = JSON.parse(line);
                    
                    if (data.progress !== undefined) {
                        const progress = Math.min(data.progress, 100);
                        DOM.progressFill.style.width = progress + '%';
                        DOM.progressText.textContent = progress + '%';
                        DOM.statusMessage.textContent = data.status || `Загрузка: ${progress}%`;
                    }
                    
                    if (data.content) {
                        fullContent = data.content;
                    }
                } catch (e) {
                }
            }
        }

        if (fullContent) {
            Storage.save({
                keyword: keyword,
                url: state.selectedUrl,
                content: fullContent
            });
            renderSavedContent();
            showSuccess(' Контент успешно сохранён!');
            DOM.statusMessage.textContent = ' Загрузка завершена!';
            
            const items = Storage.getAll();
            const lastItem = items[items.length - 1];
            if (lastItem) {
                DOM.contentViewer.textContent = lastItem.content;
            }
        } else {
            throw new Error('Не удалось получить содержимое');
        }

    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError('Ошибка: ' + error.message);
        DOM.statusMessage.textContent = '❌ ' + error.message;
        DOM.progressFill.style.background = '#ef4444';
    } finally {
        state.isDownloading = false;
    }
}

async function handleSearch() {
    const keyword = DOM.keywordInput.value.trim();
    
    if (!keyword) {
        showError('Введите ключевое слово');
        return;
    }

    DOM.searchBtn.disabled = true;
    DOM.searchBtn.textContent = '⏳ Поиск...';

    try {
        const response = await fetch(`${API_BASE}/urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения URL');
        }

        const data = await response.json();
        state.currentUrls = data.urls;
        state.selectedUrl = '';
        renderUrlList(data.urls);
        showSuccess(`Найдено ${data.urls.length} URL для "${data.keyword}"`);

    } catch (error) {
        console.error('Ошибка поиска:', error);
        showError(error.message);
        DOM.urlContainer.innerHTML = '';
    } finally {
        DOM.searchBtn.disabled = false;
        DOM.searchBtn.textContent = '🔍 Найти URL';
    }
}

function handleClearAll() {
    if (confirm('Удалить ВСЕ сохранённые данные?')) {
        Storage.clearAll();
        renderSavedContent();
        DOM.contentViewer.textContent = '';
        showSuccess('Все данные очищены');
    }
}

function init() {
    renderSavedContent();

    // Обработчики событий
    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.clearAllBtn.addEventListener('click', handleClearAll);
    
    DOM.keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    console.log(' Доступные ключевые слова: javascript, nodejs, react, python, html');
    
    if (Storage.getAll().length === 0) {
        showInfo('Введите ключевое слово и нажмите "Найти URL"');
    }
}

document.addEventListener('DOMContentLoaded', init);