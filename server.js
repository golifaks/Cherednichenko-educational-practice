const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const keywordUrls = {
    'javascript': [
        'https://developer.mozilla.org/ru/docs/Web/JavaScript',
        'https://learn.javascript.ru/',
        'https://habr.com/ru/hub/javascript/'
    ],
    'nodejs': [
        'https://nodejs.org/ru/',
        'https://expressjs.com/ru/',
        'https://habr.com/ru/hub/nodejs/'
    ],
    'react': [
        'https://react.dev/',
        'https://habr.com/ru/hub/react/',
        'https://ru.reactjs.org/'
    ],
    'python': [
        'https://www.python.org/',
        'https://docs.python.org/3/',
        'https://habr.com/ru/hub/python/'
    ],
    'html': [
        'https://developer.mozilla.org/ru/docs/Web/HTML',
        'https://html.spec.whatwg.org/',
        'https://habr.com/ru/hub/html/'
    ]
};

app.post('/api/urls', (req, res) => {
    const { keyword } = req.body;
    
    if (!keyword) {
        return res.status(400).json({ 
            error: 'Ключевое слово не указано' 
        });
    }

    const normalizedKeyword = keyword.toLowerCase().trim();
    const urls = keywordUrls[normalizedKeyword];

    if (!urls || urls.length === 0) {
        return res.status(404).json({ 
            error: `URL для "${keyword}" не найдены` 
        });
    }

    res.json({ 
        keyword: normalizedKeyword, 
        urls: urls 
    });
});

app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ 
            error: 'URL не указан' 
        });
    }

    try {
        const mockContent = `
========================================
 СКАЧАННЫЙ КОНТЕНТ
========================================
URL: ${url}
Дата: ${new Date().toLocaleString()}
----------------------------------------

Это пример контента, скачанного через сервер.

В реальном приложении здесь был бы:
- HTML-код страницы
- Текстовое содержимое
- JSON-данные
- Или любой другой контент

Но для демонстрации работы прогресса и сохранения
мы используем этот текст-заглушку.

Размер: ~2 KB (эмулировано)
----------------------------------------
 Загрузка завершена успешно!
        `.trim();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        const chunks = [
            JSON.stringify({ progress: 10, status: ' Начинаем загрузку...' }),
            JSON.stringify({ progress: 25, status: ' Подключение к серверу...' }),
            JSON.stringify({ progress: 45, status: ' Получение данных... (45%)' }),
            JSON.stringify({ progress: 65, status: ' Получение данных... (65%)' }),
            JSON.stringify({ progress: 85, status: ' Получение данных... (85%)' }),
            JSON.stringify({ progress: 100, status: ' Готово!', content: mockContent })
        ];

        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 400)); // Имитация задержки
            res.write(chunk + '\n');
        }
        res.end();

    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера при загрузке контента' 
        });
    }
});

app.listen(PORT, () => {
    console.log(` Сервер запущен на http://localhost:${PORT}`);
    console.log(` Статика раздаётся из папки public/`);
    console.log(` Доступные ключевые слова: ${Object.keys(keywordUrls).join(', ')}`);
});