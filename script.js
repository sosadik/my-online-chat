// ===== КОНФИГ FIREBASE =====
const firebaseConfig = {
    apiKey: "AIzaSyBGfP59ZHQgMT8yTXfuGDcYqZADGl1haqg",
    authDomain: "chat-online-12.firebaseapp.com", // УБЕДИСЬ ЧТО ЭТО ПРАВИЛЬНО!
    projectId: "chat-online-12",
    storageBucket: "chat-online-12.firebasestorage.app",
    messagingSenderId: "503074236144",
    appId: "1:503074236144:web:01694517bc7210f5708435"
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
console.log("🚀 Запускаю чат...");

try {
    const app = firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase инициализирован");
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // ===== ПЕРЕМЕННЫЕ =====
    let currentUser = null;
    let username = "Гость";
    
    // ===== ЭЛЕМЕНТЫ =====
    const authPanel = document.getElementById('authPanel');
    const chatSection = document.getElementById('chatSection');
    const usernameInput = document.getElementById('username');
    const guestLoginBtn = document.getElementById('guestLogin');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesDiv = document.getElementById('messages');
    const onlineCount = document.getElementById('onlineCount');
    
    // ===== ВХОД В ЧАТ =====
    guestLoginBtn.addEventListener('click', async function() {
        const name = usernameInput.value.trim();
        
        // ПРОВЕРКА ИМЕНИ
        if (!name || name.length < 3) {
            alert("⚠️ Введи имя от 3 символов!");
            usernameInput.focus();
            return;
        }
        
        if (name.length > 20) {
            alert("⚠️ Имя не больше 20 символов!");
            usernameInput.focus();
            return;
        }
        
        username = name;
        console.log("Вхожу как:", username);
        
        try {
            // Пробуем Firebase вход
            const userCredential = await auth.signInAnonymously();
            currentUser = userCredential.user;
            
            console.log("✅ Вход успешен! ID:", currentUser.uid);
            
            // Переключаем на чат
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
            console.error("❌ Ошибка Firebase:", error);
            alert("Ошибка входа. Попробуй обновить страницу.");
        }
    });
    
    // ===== ЗАГРУЗКА СООБЩЕНИЙ =====
    function loadMessages() {
        console.log("📥 Загружаю сообщения...");
        
        db.collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(50)
            .onSnapshot(snapshot => {
                console.log("📨 Получено сообщений:", snapshot.size);
                
                // Очищаем если есть сообщения из Firebase
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
                console.error("❌ Ошибка загрузки:", error);
                addMessage("🤖 Система", "Не удалось загрузить сообщения", false);
            });
    }
    
    // ===== ОТПРАВКА СООБЩЕНИЯ =====
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        console.log("📤 Отправляю:", text);
        
        try {
            await db.collection('messages').add({
                text: text,
                username: username,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            messageInput.value = '';
            console.log("✅ Сообщение отправлено");
            
        } catch (error) {
            console.error("❌ Ошибка отправки:", error);
            alert("Не удалось отправить сообщение");
        }
    }
    
    // ===== ДОБАВЛЕНИЕ СООБЩЕНИЯ =====
    function addMessage(sender, text, isOwn) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        messagesDiv.appendChild(messageDiv);
        
        // Прокрутка вниз
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // ===== ОНЛАЙН ПОЛЬЗОВАТЕЛИ =====
    function listenToOnlineUsers() {
        if (!currentUser) return;
        
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
        
        // Слушаем других
        db.collection('onlineUsers').onSnapshot(snapshot => {
            onlineCount.textContent = snapshot.size;
        });
    }
    
    // ===== СОБЫТИЯ =====
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    // ===== АВТО-ФОКУС =====
    usernameInput.focus();
    
    console.log("✨ Чат готов к работе!");
    
} catch (error) {
    console.error("💥 Критическая ошибка:", error);
    alert("Ошибка загрузки чата. Проверь конфиг Firebase.");
} 
