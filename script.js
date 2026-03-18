document.addEventListener('DOMContentLoaded', function() {
    // ===== ЭЛЕМЕНТЫ =====
    const modal = document.getElementById('bookingModal');
    const openModalBtns = document.querySelectorAll('.open-modal');
    const closeModalBtn = document.querySelector('.modal-close');
    const bookingForm = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');
    const navLinks = document.querySelectorAll('.nav_links a, .footer-nav .nav_links a, .works-btn a[href^="#"]');
    
    // ===== ЗАГРУЗКА КОНФИГА =====
    let TELEGRAM_TOKEN = '';
    let CHAT_ID = '';

    // Загружаем конфиг
    function loadConfig() {
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.TELEGRAM_TOKEN) {
                TELEGRAM_TOKEN = CONFIG.TELEGRAM_TOKEN;
                CHAT_ID = CONFIG.CHAT_ID;
                console.log('✅ Конфиг загружен');
                console.log('Chat ID:', CHAT_ID);
                console.log('Token starts with:', TELEGRAM_TOKEN.substring(0, 10) + '...');
                return true;
            } else {
                console.warn('⚠️ CONFIG не найден');
                return false;
            }
        } catch (e) {
            console.error('Ошибка загрузки конфига:', e);
            return false;
        }
    }

    loadConfig();
    
    // ===== МОДАЛЬНОЕ ОКНО =====
    function openModal() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        if (formStatus) {
            formStatus.style.display = 'none';
            formStatus.className = 'form-status';
        }
    }
    
    openModalBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    });
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // ===== ОТПРАВКА В TELEGRAM =====
    async function sendToTelegram(formData) {
        const message = `🔔 НОВАЯ ЗАЯВКА MADEN DETAILING
━━━━━━━━━━━━━━━
👤 Имя: ${formData.name}
📞 Телефон: ${formData.phone}
🚗 Авто: ${formData.car || 'Не указано'}
🔧 Услуга: ${formData.service}
📝 Пожелания: ${formData.notes || '—'}
━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ru-RU')}`;

        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
        console.log('Отправка запроса в Telegram...');
        console.log('URL:', url.replace(TELEGRAM_TOKEN, 'HIDDEN'));
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            const data = await response.json();
            console.log('Ответ от Telegram:', data);
            
            if (!data.ok) {
                throw new Error(data.description || 'Ошибка отправки');
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            throw error;
        }
    }
    
    // ===== ВАЛИДАЦИЯ ТЕЛЕФОНА =====
    function validatePhone(phone) {
        const phoneRegex = /^[\d\s\+\-\(\)]{10,20}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    // ===== ОБРАБОТКА ФОРМЫ =====
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Собираем данные
            const name = this.name.value.trim();
            const phone = this.phone.value.trim();
            const serviceSelect = this.service;
            const service = serviceSelect.options[serviceSelect.selectedIndex]?.text || '';
            const car = this.car.value.trim();
            const notes = this.notes.value.trim();
            
            // Валидация
            if (!name || name.length < 2) {
                showFormStatus('Пожалуйста, введите корректное имя', 'error');
                return;
            }
            
            if (!phone || !validatePhone(phone)) {
                showFormStatus('Пожалуйста, введите корректный номер телефона', 'error');
                return;
            }
            
            if (!service || service === 'Выберите услугу') {
                showFormStatus('Выберите услугу', 'error');
                return;
            }
            
            // Проверка токена
            if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === '') {
                showFormStatus('Ошибка: Telegram не настроен', 'error');
                console.error('TELEGRAM_TOKEN не задан');
                return;
            }
            
            // Блокируем кнопку
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
            
            try {
                showFormStatus('Отправка...', 'info');
                
                const result = await sendToTelegram({
                    name, phone, service, car, notes
                });
                
                if (result.ok) {
                    showFormStatus('✓ Заявка отправлена! Мы свяжемся с вами', 'success');
                    
                    setTimeout(() => {
                        closeModal();
                        this.reset();
                    }, 2000);
                }
            } catch (error) {
                console.error('Детали ошибки:', error);
                
                // Понятное сообщение пользователю
                let errorMessage = '❌ Ошибка отправки. ';
                if (error.message.includes('bot was blocked')) {
                    errorMessage = '❌ Бот заблокирован. Обновите токен.';
                } else if (error.message.includes('bot token')) {
                    errorMessage = '❌ Неверный токен. Обновите токен.';
                } else if (error.message.includes('chat not found')) {
                    errorMessage = '❌ Неверный Chat ID. Проверьте настройки.';
                } else {
                    errorMessage += 'Попробуйте позже.';
                }
                
                showFormStatus(errorMessage, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Показать статус формы
    function showFormStatus(message, type) {
        if (formStatus) {
            formStatus.textContent = message;
            formStatus.className = 'form-status ' + type;
            formStatus.style.display = 'block';
            
            setTimeout(() => {
                formStatus.style.display = 'none';
            }, 5000);
        }
    }
    
    // ===== ПЛАВНАЯ ПРОКРУТКА =====
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            if (targetId && targetId.startsWith('#') && targetId.length > 1) {
                e.preventDefault();
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerOffset = 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // ===== АКТИВНАЯ ССЫЛКА В МЕНЮ =====
    window.addEventListener('scroll', function() {
        const sections = document.querySelectorAll('section[id]');
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });
        
        document.querySelectorAll('.nav_links a').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});