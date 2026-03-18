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
    let configLoaded = false;

    async function loadConfig() {
        try {
            // Пытаемся загрузить config.js (он уже загружен как скрипт)
            if (typeof CONFIG !== 'undefined') {
                TELEGRAM_TOKEN = CONFIG.TELEGRAM_TOKEN;
                CHAT_ID = CONFIG.CHAT_ID;
                configLoaded = true;
                console.log('✅ Конфиг загружен из глобальной переменной');
            } else {
                // Пробуем загрузить config.json
                const response = await fetch('config.json');
                const config = await response.json();
                TELEGRAM_TOKEN = config.TELEGRAM_TOKEN;
                CHAT_ID = config.CHAT_ID;
                configLoaded = true;
                console.log('✅ Конфиг загружен из config.json');
            }
        } catch (e) {
            console.warn('⚠️ Конфиг не загружен, используется демо-режим');
            console.log('📝 Создайте config.js или config.json с вашими токенами');
        }
    }

    // Загружаем конфиг перед инициализацией
    (async function init() {
        await loadConfig();
        
        // Проверяем настройки после загрузки
        if (!TELEGRAM_TOKEN || !CHAT_ID || TELEGRAM_TOKEN === '' || CHAT_ID === '') {
            console.warn('⚠️ Telegram не настроен! Заявки не будут отправляться.');
            console.log('📝 Инструкция:');
            console.log('1. Напишите @BotFather в Telegram, создайте бота');
            console.log('2. Получите токен и вставьте в config.js');
            console.log('3. Напишите @userinfobot, получите ваш Chat ID');
        } else {
            console.log('✅ Telegram настроен, заявки будут приходить в бота');
        }
    })();
    
    // ===== МОДАЛЬНОЕ ОКНО =====
    function openModal() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Трекинг открытия формы
        console.log('📊 Цель: Открытие формы записи');
        if (typeof gtag !== 'undefined') {
            gtag('event', 'open_booking_form', {
                'event_category': 'engagement',
                'event_label': 'header_button'
            });
        }
    }
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Скрываем статус при закрытии
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
        const message = `
🔔 <b>НОВАЯ ЗАЯВКА MADEN DETAILING</b>
━━━━━━━━━━━━━━━
👤 <b>Имя:</b> ${formData.name}
📞 <b>Телефон:</b> ${formData.phone}
🚗 <b>Авто:</b> ${formData.car || 'Не указано'}
🔧 <b>Услуга:</b> ${formData.service}
📝 <b>Пожелания:</b> ${formData.notes || '—'}
━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ru-RU')}
        `;
        
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        
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
        
        return response.json();
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
            const service = this.service.options[this.service.selectedIndex].text;
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
            
            if (!service) {
                showFormStatus('Выберите услугу', 'error');
                return;
            }
            
            // Блокируем кнопку
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
            
            try {
                // Проверяем настройки Telegram
                if (!TELEGRAM_TOKEN || !CHAT_ID || TELEGRAM_TOKEN === '' || CHAT_ID === '') {
                    console.warn('⚠️ Демо-режим: Telegram не настроен');
                    showFormStatus('✓ Демо: заявка принята! (настройте Telegram в config.js)', 'success');
                    
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        closeModal();
                        this.reset();
                    }, 2000);
                    return;
                }
                
                // Отправка в Telegram
                const result = await sendToTelegram({
                    name, phone, service, car, notes
                });
                
                if (result.ok) {
                    // Трекинг успешной отправки
                    console.log('📊 Конверсия: Отправка формы', service);
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'form_submit_success', {
                            'event_category': 'conversion',
                            'event_label': service
                        });
                    }
                    
                    showFormStatus('✓ Заявка отправлена! Мы свяжемся с вами', 'success');
                    
                    // Закрываем форму через 2 секунды
                    setTimeout(() => {
                        closeModal();
                        this.reset();
                    }, 2000);
                } else {
                    throw new Error(result.description || 'Ошибка отправки');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showFormStatus('❌ Ошибка отправки. Попробуйте позже', 'error');
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
            
            // Автоматически скрыть через 5 секунд
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