// Функция для преобразования Unicode-escape в читаемый текст
function unicodeToChar(text) {
    return text.replace(/\\u[\dA-F]{4}/gi, 
        match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
}

document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const responseElement = document.getElementById('server-response');

    // Парсит страницу голосования в поисках data-iteration (номера голосования)
    function getdata_iterationXHR() {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', 'https://www.nashe.ru/chartova', true);
          
          xhr.onload = function() {
            if (xhr.status === 200) {
              const html = xhr.responseText;
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const chartovaItems = doc.querySelector('div.chartova__items');
              if (chartovaItems) {
                const data_iteration = chartovaItems.getAttribute('data-iteration');
                console.log('Найден data-iteration:', data_iteration);
                resolve(data_iteration);
              } else {
                reject(new Error('Элемент div.chartova__items не найден'));
              }
            } else {
              reject(new Error(`Ошибка загрузки: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Ошибка сети'));
          };
          
          xhr.send();
        });
    }

    // Основная функция отправки голоса
    async function sendVote() {
        try {
            // Получаем текущий номер голосования
            const data_iteration = await getdata_iterationXHR();
            
            // id Casual
            const data_track = '2105';
            
            const formData = new FormData();
            formData.append('data_track', data_track);
            formData.append('data_iteration', data_iteration);

            const response = await fetch('https://www.nashe.ru/chartova/vote', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const responseText = await response.text();
            let serverResponse;
            
            try {
                serverResponse = JSON.parse(responseText);
                // Обрабатываем случай двойного JSON (если сервер возвращает JSON в строке)
                if (typeof serverResponse === 'string') {
                    serverResponse = JSON.parse(serverResponse);
                }
            } catch (e) {
                serverResponse = { message: responseText };
            }

            // Декодируем Unicode-строки
            if (serverResponse.message) {
                serverResponse.message = unicodeToChar(serverResponse.message);
            }

            // Проверяем, содержит ли ответ подтверждение успешного голосования
            const successPhrase = "Вы проголосовали";
            if (!serverResponse.message || 
                !serverResponse.message.toLowerCase().includes(successPhrase)) {
                throw new Error(serverResponse.message || "Неизвестный ответ сервера");
            }

            // Успешный голос
            statusElement.textContent = `✅ Голос в голосовании № ${data_iteration} за Casual (id=${data_track}) успешно отправлен!`;
            statusElement.className = 'success';
            
            responseElement.style.display = 'block';
            responseElement.textContent = 'Ответ сервера: ' + serverResponse.message;

        } catch (error) {
            statusElement.textContent = `❌ Ошибка: ${error.message}`;
            statusElement.className = 'error';
            
            responseElement.style.display = 'block';
            responseElement.textContent = 'Подробности ошибки:\n' + error.message;
        } finally {
            // Закрываем страницу через 10 секунд
            setTimeout(() => {
                window.close();
            }, 10000);
        }
    }

    // Запускаем процесс голосования
    sendVote();
});
