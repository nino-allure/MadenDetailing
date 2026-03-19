document.addEventListener('DOMContentLoaded', function() {
    // ===== ЭЛЕМЕНТЫ =====
    const modal = document.getElementById('bookingModal');
    const openModalBtns = document.querySelectorAll('.open-modal');
    const closeModalBtn = document.querySelector('.modal-close');
    const bookingForm = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');
    const navLinks = document.querySelectorAll('.nav_links a, .footer-nav .nav_links a, .works-btn a[href^="#"]');
    
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
    
    // ===== ВАЛИДАЦИЯ ТЕЛЕФОНА =====
    function validatePhone(phone) {
        const phoneRegex = /^[\d\s\+\-\(\)]{10,20}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    // ===== ОТПРАВКА ЧЕРЕЗ ПРОКСИ =====
    async function sendViaProxy(formData) {
        // Используем публичный CORS-прокси (временное решение)
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = 'https://api.telegram.org/bot8627116730:AAHjtcWbOI7cdLnPxtxA1TCcl9Qs6dH9Ew8/sendMessage';
        
        const message = `🔔 НОВАЯ ЗАЯВКА MADEN DETAILING
━━━━━━━━━━━━━━━
👤 Имя: ${formData.name}
📞 Телефон: ${formData.phone}
🚗 Авто: ${formData.car || 'Не указано'}
🔧 Услуга: ${formData.service}
📝 Пожелания: ${formData.notes || '—'}
━━━━━━━━━━━━━━━
🕐 ${new Date().toLocaleString('ru-RU')}`;

        const response = await fetch(proxyUrl + targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({
                chat_id: '1228800017',
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        return response.json();
    }
    
    // ===== ОБРАБОТКА ФОРМЫ =====
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Собираем данные
            const name = this.name.value.trim();
            const phone = this.phone.value.trim();
            const service = this.service.options[this.service.selectedIndex]?.text || '';
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
            
            // Блокируем кнопку
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
            
            try {
                showFormStatus('Отправка...', 'info');
                
                // Используем прокси для отправки
                const result = await sendViaProxy({
                    name, phone, service, car, notes
                });
                
                console.log('Результат:', result);
                
                if (result.ok) {
                    showFormStatus('✓ Заявка отправлена! Мы свяжемся с вами', 'success');
                    
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