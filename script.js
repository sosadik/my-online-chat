// ========== КОНФИГ FIREBASE ==========
// ⚠️ ЭТОТ КОНФИГ ТВОЙ - ПРОВЕРЬ ЧТО ОН ПРАВИЛЬНЫЙ!
const firebaseConfig = {
    apiKey: "AIzaSyBGfP59ZHQgMT8yTXfuGDcYqZADGl1haqg",
    authDomain: "chat-online-12.firebaseapp.com",
    projectId: "chat-online-12",
    storageBucket: "chat-online-12.firebasestorage.app",
    messagingSenderId: "503074236144",
    appId: "1:503074236144:web:01694517bc7210f5708435"
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
console.log("🚀 Запускаю чат...");

// Проверяем загрузился ли Firebase SDK
if (typeof firebase === 'undefined') {
    console.error("❌ Firebase SDK не загружен!");
    alert("Ошибка: Firebase SDK не загрузился. Проверь интернет.");
} else {
    console.log("✅ Firebase SDK загружен");
}

try {
    // Инициализируем Firebase
    const app = firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase инициализирован");
    
    // Получаем сервисы
    const auth = firebase.auth();
    const db = firebase.firestore();
    console.log("✅ Сервисы Firebase готовы");
    
    // ========== ПЕРЕМЕННЫЕ ==========
    let currentUser = null;
    let username = "Гость";
    
    // ========== ЭЛЕМЕНТЫ DOM ==========
    const authPanel = document.getElementById('authPanel');
    const chatSection = document.getElementById('chatSection');
    const usernameInput = document.getElementById('username');
    const guestLoginBtn = document.getElementById('guestLogin');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesDiv = document.getElementById('messages');
    const onlineCount = document.getElementById('onlineCount');
    
    // ========== ПРОВЕРКА КНОПКИ ==========
    console.log("Кнопка найдена?", !!guestLoginBtn);
    
    // ========== ФУНКЦИЯ ВХОДА ==========
    guestLoginBtn.addEventListener('click', async function() {
        console.log("👉 Кнопка 'Войти как Гость' нажата!");
        
        const name = usernameInput.value.trim();
        
        // Проверяем имя
        if (name.length < 3) {
            alert("⚠️ Имя должно быть от 3 символов!");
            return;
        }
        
        username = name;
        console.log("Пытаюсь войти как:", username);
        
        try {
            // Пробуем анонимный вход в Firebase
            console.log("Пытаюсь выполнить анонимный вход...");
            const userCredential = await auth.signInAnonymously();
            currentUser = userCredential.user;
            
            console.log("✅ Вход успешен! User ID:", currentUser.uid);
            alert("🎉 Вход выполнен как: " + username);
            
            // Переключаем панели
            authPanel.style.display = 'none';
            chatSection.style.display = 'flex';
            
            // Активируем поле ввода
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
            
            // Загружаем сообщения
            loadMessages();
            
            // Слушаем онлайн пользователей
            listenToOnlineUsers();
            
        } catch (error) {
            console.error("❌ Ошибка входа:", error);
            
            // Если Firebase ошибка - используем локальный вход
            if (error.code === 'auth/operation-not-allowed') {
                alert("⚠️ Анонимный вход не включён в Firebase. Использую локальный режим.");
                localLogin();
            } else {
                alert("❌ Ошибка входа: " + error.message + "\n\nПопробую локальный режим...");
                localLogin();
            }
        }
    });
    
    // ========== ЛОКАЛЬНЫЙ ВХОД (если Firebase не работает) ==========
    function localLogin() {
        console.log("🔄 Использую локальный вход");
        
        // Переключаем панели
        authPanel.style.display = 'none';
        chatSection.style.display = 'flex';
        
        // Активируем поле ввода
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
        
        // Добавляем тестовое сообщение
        addMessage("🤖 Система", "Добро пожаловать в локальный режим чата!", false);
        addMessage("🤖 Система", "Firebase не подключён, но чат работает!", false);
        
        onlineCount.textContent = "1 (локально)";
    }
    
    // ========== ЗАГРУЗКА СООБЩЕНИЙ ==========
    function loadMessages() {
        console.log("📥 Загружаю сообщения из Firebase...");
        
        try {
            db.collection('messages')
                .orderBy('timestamp', 'asc')
                .limit(50)
                .onSnapshot(snapshot => {
                    console.log("📨 Получены сообщения:", snapshot.size);
                    
                    // Очищаем только если есть сообщения из Firebase
                    if (snapshot.size > 0) {
                        messagesDiv.innerHTML = '';
                    }
                    
                    snapshot.forEach(doc => {
                        const msg = doc.data();
                        addMessage(msg.username, msg.text, msg.userId === currentUser?.uid);
                    });
                    
                    // Прокрутка вниз
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }, error => {
                    console.error("❌ Ошибка загрузки сообщений:", error);
                    addMessage("🤖 Система", "Не удалось загрузить сообщения из Firebase", false);
                });
                
        } catch (error) {
            console.error("❌ Критическая ошибка Firestore:", error);
        }
    }
    
    // ========== ОТПРАВКА СООБЩЕНИЯ ==========
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        console.log("📤 Отправляю сообщение:", text);
        
        if (currentUser) {
            // Отправка в Firebase
            try {
                await db.collection('messages').add({
                    text: text,
                    username: username,
                    userId: currentUser.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                messageInput.value = '';
                console.log("✅ Сообщение отправлено в Firebase");
                
            } catch (error) {
                console.error("❌ Ошибка отправки в Firebase:", error);
                addMessage(username, text, true); // Локально
                messageInput.value = '';
            }
        } else {
            // Локальная отправка
            addMessage(username, text, true);
            messageInput.value = '';
        }
    }
    
    // ========== ДОБАВЛЕНИЕ СООБЩЕНИЯ НА ЭКРАН ==========
    function addMessage(sender, text, isOwn) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `
            <strong>${sender}:</strong> ${text}
        `;
        messagesDiv.appendChild(messageDiv);
        
        // Прокрутка вниз
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // ========== ОНЛАЙН ПОЛЬЗОВАТЕЛИ ==========
    function listenToOnlineUsers() {
        if (!currentUser) return;
        
        try {
            const userRef = db.collection('onlineUsers').doc(currentUser.uid);
            
            // Отмечаем себя онлайн
            userRef.set({
                username: username,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Удаляем при выходе
            window.addEventListener('beforeunload', () => {
                userRef.delete();
            });
            
            // Слушаем других пользователей
            db.collection('onlineUsers').onSnapshot(snapshot => {
                onlineCount.textContent = snapshot.size;
            });
            
        } catch (error) {
            console.error("❌ Ошибка онлайн-статуса:", error);
        }
    }
    
    // ========== НАСТРОЙКА СОБЫТИЙ ==========
    // Отправка по Enter
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Отправка по кнопке
    sendBtn.addEventListener('click', sendMessage);
    
    // ========== АВТО-ФОКУС ==========
    usernameInput.focus();
    
    // ========== ИНФОРМАЦИЯ В КОНСОЛЬ ==========
    console.log("✨ Чат инициализирован успешно!");
    console.log("👉 Введи ник и нажми 'Войти как Гость'");
    
} catch (error) {
    console.error("💥 КРИТИЧЕСКАЯ ОШИБКА:", error);
    alert("Критическая ошибка инициализации:\n" + error.message);
    
    // Показываем кнопку даже при ошибке
    const guestLoginBtn = document.getElementById('guestLogin');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', function() {
            alert("Firebase не работает, но ты можешь войти локально!");
            document.getElementById('authPanel').style.display = 'none';
            document.getElementById('chatSection').style.display = 'flex';
            document.getElementById('messageInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;
        });
    }
}
// ===== ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Проверяем сохранённую тему или системные настройки
    const savedTheme = localStorage.getItem('chat-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Устанавливаем тему
    let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeButton(currentTheme);
    
    // Обработчик клика
    themeToggle.addEventListener('click', toggleTheme);
    
    console.log("✅ Тема настроена: " + currentTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Меняем тему
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('chat-theme', newTheme);
    
    // Обновляем кнопку
    updateThemeButton(newTheme);
    
    // Анимация
    this.style.transform = 'scale(0.9)';
    setTimeout(() => {
        this.style.transform = 'scale(1)';
    }, 150);
    
    console.log("🌓 Тема изменена на: " + newTheme);
}

function updateThemeButton(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (theme === 'dark') {
        themeToggle.textContent = '☀️';
        themeToggle.title = 'Переключить на светлую тему';
    } else {
        themeToggle.textContent = '🌙';
        themeToggle.title = 'Переключить на тёмную тему';
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    // ... остальной код инициализации
});