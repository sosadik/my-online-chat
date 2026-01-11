// ===== КОНФИГ FIREBASE =====
const firebaseConfig = {
    apiKey: "AIzaSyBGfP59ZHQgMT8yTXfuGDcYqZADGl1haqg",
    authDomain: "chat-online-12.firebaseapp.com",
    projectId: "chat-online-12",
    storageBucket: "chat-online-12.firebasestorage.app",
    messagingSenderId: "503074236144",
    appId: "1:503074236144:web:01694517bc7210f5708435"
};

// ===== ОСНОВНОЙ КОД =====
try {
    const app = firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase подключен");
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Переменные
    let currentUser = null;
    let username = "";
    let nameCheckTimeout = null;
    
    // Элементы
    const authPanel = document.getElementById('authPanel');
    const chatSection = document.getElementById('chatSection');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const onlineCount = document.getElementById('onlineCount');
    
    // ===== УВЕДОМЛЕНИЯ =====
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // ===== ПЕРЕКЛЮЧЕНИЕ ФОРМ =====
    document.getElementById('showRegister').addEventListener('click', function(e) {
        e.preventDefault();
        console.log("🔄 Переключение на регистрацию");
        
        // Скрываем форму входа
        document.getElementById('loginForm').style.display = 'none';
        
        // Показываем форму регистрации
        document.getElementById('registerForm').style.display = 'block';
        
        // Очищаем поля регистрации
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regPasswordConfirm').value = '';
        
        // Сбрасываем статус имени
        const regNameStatus = document.getElementById('regNameStatus');
        regNameStatus.textContent = '';
        regNameStatus.className = 'name-status';
        regNameStatus.style.display = 'none';
        
        // Блокируем кнопку регистрации
        document.getElementById('registerBtn').disabled = true;
        
        // Фокусируемся на поле имени
        document.getElementById('regUsername').focus();
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        console.log("🔄 Переключение на вход");
        
        // Скрываем форму регистрации
        document.getElementById('registerForm').style.display = 'none';
        
        // Показываем форму входа
        document.getElementById('loginForm').style.display = 'block';
        
        // Фокусируемся на поле имени
        document.getElementById('username').focus();
    });
    
    // ===== ПРОВЕРКА ИМЕНИ В FIRESTORE =====
    async function checkUsernameInFirestore(username) {
        console.log(`🔍 Проверяю имя "${username}" в Firestore...`);
        
        try {
            // Проверяем в коллекции registeredUsers
            const usersRef = db.collection('registeredUsers');
            const snapshot = await usersRef.where('username', '==', username).limit(1).get();
            
            if (!snapshot.empty) {
                console.log(`❌ Имя "${username}" уже зарегистрировано в Firestore`);
                return { available: false, message: `Имя "${username}" уже занято` };
            }
            
            console.log(`✅ Имя "${username}" свободно в Firestore`);
            return { available: true, message: `Имя "${username}" свободно` };
            
        } catch (error) {
            console.error("❌ Ошибка проверки имени в Firestore:", error);
            showNotification("Ошибка подключения к базе данных", 'error');
            return { available: false, message: "Ошибка проверки имени" };
        }
    }
    
    // ===== РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ В FIRESTORE =====
    async function registerUserInFirestore(username, passwordHash) {
        console.log(`📝 Регистрирую пользователя "${username}" в Firestore...`);
        
        try {
            // Проверяем еще раз на всякий случай
            const checkResult = await checkUsernameInFirestore(username);
            if (!checkResult.available) {
                throw new Error(checkResult.message);
            }
            
            // Регистрируем пользователя
            await db.collection('registeredUsers').add({
                username: username,
                passwordHash: passwordHash,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: null
            });
            
            console.log(`✅ Пользователь "${username}" зарегистрирован в Firestore`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка регистрации в Firestore:", error);
            throw error;
        }
    }
    
    // ===== ПРОВЕРКА ВХОДА В FIRESTORE =====
    async function verifyLoginInFirestore(username, passwordHash) {
        console.log(`🔐 Проверяю вход для "${username}" в Firestore...`);
        
        try {
            const usersRef = db.collection('registeredUsers');
            const snapshot = await usersRef
                .where('username', '==', username)
                .where('passwordHash', '==', passwordHash)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                console.log(`❌ Неверное имя пользователя или пароль`);
                return { success: false, message: "Неверное имя пользователя или пароль" };
            }
            
            // Обновляем время последнего входа
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Вход успешен для "${username}"`);
            return { success: true, message: "Вход успешен" };
            
        } catch (error) {
            console.error("❌ Ошибка проверки входа:", error);
            return { success: false, message: "Ошибка проверки входа" };
        }
    }
    
    // ===== ПРОСТАЯ СИСТЕМА ХЭШИРОВАНИЯ =====
    function simpleHash(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    // ===== ОБРАБОТЧИК ВВОДА ИМЕНИ ПРИ РЕГИСТРАЦИИ =====
    document.getElementById('regUsername').addEventListener('input', function() {
        clearTimeout(nameCheckTimeout);
        const username = this.value.trim();
        const regNameStatus = document.getElementById('regNameStatus');
        const registerBtn = document.getElementById('registerBtn');
        
        // Сбрасываем статус при коротком имени
        if (username.length < 3) {
            regNameStatus.textContent = '';
            regNameStatus.className = 'name-status';
            regNameStatus.style.display = 'none';
            registerBtn.disabled = true;
            return;
        }
        
        // Показываем статус проверки
        regNameStatus.textContent = "⏳ Проверяем имя...";
        regNameStatus.className = "name-status checking";
        regNameStatus.style.display = "block";
        registerBtn.disabled = true;
        
        // Запускаем проверку через 500мс
        nameCheckTimeout = setTimeout(async () => {
            try {
                const result = await checkUsernameInFirestore(username);
                
                if (result.available) {
                    regNameStatus.textContent = `✅ ${result.message}`;
                    regNameStatus.className = "name-status available";
                    registerBtn.disabled = false;
                } else {
                    regNameStatus.textContent = `❌ ${result.message}`;
                    regNameStatus.className = "name-status taken";
                    registerBtn.disabled = true;
                }
            } catch (error) {
                regNameStatus.textContent = "❌ Ошибка проверки";
                regNameStatus.className = "name-status taken";
                registerBtn.disabled = true;
            }
        }, 500);
    });
    
    // ===== РЕГИСТРАЦИЯ =====
    document.getElementById('registerBtn').addEventListener('click', async function() {
        console.log("🖱️ Нажата кнопка регистрации");
        
        const regUsername = document.getElementById('regUsername').value.trim();
        const regPassword = document.getElementById('regPassword').value;
        const regPasswordConfirm = document.getElementById('regPasswordConfirm').value;
        const registerBtn = this;
        
        // Проверки
        if (!regUsername || regUsername.length < 3) {
            showNotification('Имя должно быть от 3 символов', 'error');
            return;
        }
        
        if (!regPassword || regPassword.length < 4) {
            showNotification('Пароль должен быть от 4 символов', 'error');
            return;
        }
        
        if (regPassword !== regPasswordConfirm) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        // Отключаем кнопку на время регистрации
        const originalText = registerBtn.textContent;
        registerBtn.disabled = true;
        registerBtn.textContent = "⏳ Регистрация...";
        
        try {
            // Хэшируем пароль
            const passwordHash = simpleHash(regPassword);
            
            // Регистрируем в Firestore
            await registerUserInFirestore(regUsername, passwordHash);
            
            showNotification('✅ Регистрация успешна! Теперь войдите', 'success');
            
            // Переключаем на вход
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
            
            // Заполняем поля
            document.getElementById('username').value = regUsername;
            document.getElementById('password').value = regPassword;
            document.getElementById('password').focus();
            
        } catch (error) {
            showNotification(`❌ ${error.message}`, 'error');
            console.error("Ошибка регистрации:", error);
        } finally {
            // Восстанавливаем кнопку
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
        }
    });
    
    // ===== ВХОД =====
    document.getElementById('loginBtn').addEventListener('click', async function() {
        console.log("🖱️ Нажата кнопка входа");
        
        const name = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const loginBtn = this;
        
        if (!name || !password) {
            showNotification('Введите имя и пароль', 'error');
            return;
        }
        
        // Отключаем кнопку на время проверки
        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = "⏳ Проверка...";
        
        try {
            // Хэшируем пароль
            const passwordHash = simpleHash(password);
            
            // Проверяем в Firestore
            const loginResult = await verifyLoginInFirestore(name, passwordHash);
            
            if (!loginResult.success) {
                showNotification(loginResult.message, 'error');
                return;
            }
            
            // Проверяем, не в чате ли уже пользователь с таким именем
            const onlineSnapshot = await db.collection('onlineUsers')
                .where('username', '==', name)
                .limit(1)
                .get();
            
            if (!onlineSnapshot.empty) {
                showNotification('Это имя уже используется в чате', 'error');
                return;
            }
            
            // Сохраняем если нужно
            if (rememberMe) {
                localStorage.setItem('chat_saved_name', name);
            }
            
            // Входим в чат
            username = name;
            await enterChat();
            
        } catch (error) {
            showNotification('Ошибка входа. Попробуйте снова.', 'error');
            console.error("Ошибка входа:", error);
        } finally {
            // Восстанавливаем кнопку
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    });
    
    // ===== ВХОД В ЧАТ =====
    async function enterChat() {
        console.log("Вхожу как:", username);
        
        try {
            // Входим в Firebase анонимно
            const userCredential = await auth.signInAnonymously();
            currentUser = userCredential.user;
            
            console.log("✅ Вход успешен!");
            showNotification(`Добро пожаловать, ${username}!`, 'success');
            
            // Записываем себя в onlineUsers
            await db.collection('onlineUsers').doc(currentUser.uid).set({
                username: username,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                registeredUser: true
            });
            
            // Переключаем на чат
            authPanel.style.display = 'none';
            chatSection.style.display = 'flex';
            
            // Активируем поле ввода
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
            
            // Загружаем сообщения
            loadMessages();
            
            // Отслеживаем онлайн
            trackOnlineUsers();
            
        } catch (error) {
            console.error("Ошибка входа:", error);
            showNotification("Ошибка подключения к чату", 'error');
        }
    }
    
    // ===== ЗАГРУЗКА СООБЩЕНИЙ =====
    function loadMessages() {
        console.log("Загружаю сообщения...");
        
        db.collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(50)
            .onSnapshot(snapshot => {
                messagesDiv.innerHTML = '';
                
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    addMessage(msg.username, msg.text, msg.userId === currentUser?.uid);
                });
                
                // Прокрутка вниз
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
    }
    
    // ===== ОТПРАВКА СООБЩЕНИЯ =====
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentUser) return;
        
        try {
            await db.collection('messages').add({
                text: text,
                username: username,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            messageInput.value = '';
            messageInput.focus();
            
        } catch (error) {
            console.error("Ошибка отправки:", error);
            showNotification("Не удалось отправить сообщение", 'error');
        }
    }
    
    // ===== ДОБАВЛЕНИЕ СООБЩЕНИЯ НА ЭКРАН =====
    function addMessage(sender, text, isOwn) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        messagesDiv.appendChild(messageDiv);
        
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // ===== ОНЛАЙН ПОЛЬЗОВАТЕЛИ =====
    function trackOnlineUsers() {
        if (!currentUser) return;
        
        const userRef = db.collection('onlineUsers').doc(currentUser.uid);
        
        // Обновляем статус каждые 10 секунд
        const updateOnlineStatus = () => {
            userRef.update({
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        };
        
        // Первое обновление
        updateOnlineStatus();
        
        // Периодическое обновление
        const intervalId = setInterval(updateOnlineStatus, 10000);
        
        // Удаляем при выходе
        window.addEventListener('beforeunload', async () => {
            clearInterval(intervalId);
            try {
                await userRef.delete();
            } catch (error) {
                console.error("Ошибка при выходе:", error);
            }
        });
        
        // Слушаем других
        db.collection('onlineUsers').onSnapshot(snapshot => {
            onlineCount.textContent = snapshot.size;
        });
    }
    
    // ===== СОБЫТИЯ =====
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    // ===== АВТО-ВХОД ПРИ СОХРАНЁННОМ ИМЕНИ =====
    window.addEventListener('load', function() {
        const savedName = localStorage.getItem('chat_saved_name');
        if (savedName) {
            document.getElementById('username').value = savedName;
            document.getElementById('rememberMe').checked = true;
            document.getElementById('password').focus();
        }
        console.log("✨ Чат готов к работе!");
    });
    
} catch (error) {
    console.error("💥 Ошибка:", error);
    alert("Ошибка загрузки чата");
                                                             }
 
