// Функция для преобразования Unicode-escape в читаемый текст
function unicodeToChar(text) {
    return text.replace(
      /\\u[\dA-F]{4}/gi,
      match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
    );
  }
  
  document.addEventListener('DOMContentLoaded', () => {
  
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
              const iteration_id = chartovaItems.getAttribute('data-iteration');
              console.log('Найден data-iteration:', iteration_id);
              resolve(iteration_id);
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
  
    // Функция отправки одного голоса с указанием порядка (count)
    function sendVote(count = 1) {
      return new Promise(async (resolve, reject) => {
        try {
          const statusElement = document.getElementById(`status${count}`);
          const responseElement = document.getElementById(`response${count}`);
          
          statusElement.textContent = '⌛ Отправка голоса...';
          statusElement.className = 'status pending';
  
          // Получаем текущий номер голосования
          const iteration_id = await getdata_iterationXHR();
          // id Casual
          const track_id = '2105';
          
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://www.nashe.ru/chartova/vote', true);
          //xhr.withCredentials = true;
  
          xhr.onload = function() {
            if (xhr.status === 200) {
              let serverResponse;
              try {
                serverResponse = JSON.parse(xhr.responseText);
                if (typeof serverResponse === 'string') {
                  serverResponse = JSON.parse(serverResponse);
                }
              } catch (e) {
                serverResponse = { message: xhr.responseText };
              }
  
              // Декодируем Unicode-строки
              if (serverResponse.message) {
                serverResponse.message = unicodeToChar(serverResponse.message);
              }
  
              // Проверяем ответ сервера
              const successPhrase = 'вы проголосовали';
              const responseMessage = serverResponse.message ? serverResponse.message.toLowerCase() : '';
              
              if (responseMessage.includes(successPhrase)) {
                statusElement.textContent = `✅ Голос №${count} в голосовании №${iteration_id} за Casual (id=${track_id}) успешно отправлен!`;
                statusElement.className = 'success';
                responseElement.style.display = 'block';
                responseElement.textContent = serverResponse.message;
                responseElement.className = 'response success';
                resolve();
              } else {
                throw new Error(serverResponse.message || 'Неизвестный ответ сервера');
              }
            } else {
              throw new Error(`HTTP ошибка: ${xhr.status}`);
            }
          };
  
          xhr.onerror = function() {
            throw new Error('Ошибка сети при отправке голоса');
          };
  
          const formData = new FormData();
          formData.append('track_id', track_id);
          formData.append('iteration_id', iteration_id);
          xhr.send(formData);
  
        } catch (error) {
          const statusElement = document.getElementById(`status${count}`);
          const responseElement = document.getElementById(`response${count}`);
          
          statusElement.textContent = `❌ Ошибка в голосе №${count}`;
          statusElement.className = 'error';
          responseElement.style.display = 'block';
          responseElement.textContent = error.message;
          responseElement.className = 'response error';
          reject(error);
        }
      });
    }
  
    // Последовательно отправляем 3 голоса с задержкой
    async function sendAllVotes() {
      await sendVote(1);
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      await sendVote(2);
      await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
      await sendVote(3);
    }
  
    // Генератор случайной задержки от 900 до 1500 мс
    function getRandomDelay() {
      return Math.floor(Math.random() * (1500 - 900 + 1)) + 900;
    }
  
    // Запускаем процесс голосования
    sendAllVotes();
  });