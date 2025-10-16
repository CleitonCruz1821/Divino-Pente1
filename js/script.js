// Banco de dados local usando IndexedDB
        const DB_NAME = 'DivinoPenteDB';
        const DB_VERSION = 1;
        const USER_STORE = 'users';
        const SERVICE_STORE = 'services';
        const BOOKING_STORE = 'bookings';
        const SETTINGS_STORE = 'settings';

        let db;
        let currentUser = null;
        let isAdminLoggedIn = false;

        // Elementos DOM
        const authButtons = document.getElementById('authButtons');
        const authModal = document.getElementById('authModal');
        const userProfile = document.getElementById('userProfile');
        const adminPanel = document.getElementById('adminPanel');
        const servicesContainer = document.getElementById('servicesContainer');
        const serviceSelect = document.getElementById('serviceSelect');
        const adminServicesList = document.getElementById('adminServicesList');
        const usersList = document.getElementById('usersList');
        const userBookings = document.getElementById('userBookings');
        const closeModalBtn = document.querySelector('.close-modal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const bookingForm = document.getElementById('bookingForm');
        const addServiceForm = document.getElementById('addServiceForm');
        const whatsappForm = document.getElementById('whatsappForm');
        const adminTabs = document.querySelectorAll('.admin-tab');
        const modalTabs = document.querySelectorAll('.modal-tab');
        const alertContainer = document.getElementById('alertContainer');
        const currentWhatsappConfig = document.getElementById('currentWhatsappConfig');

        // Inicializar banco de dados
        function initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    db = request.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Criar store de usuários
                    if (!db.objectStoreNames.contains(USER_STORE)) {
                        const userStore = db.createObjectStore(USER_STORE, { keyPath: 'id', autoIncrement: true });
                        userStore.createIndex('email', 'email', { unique: true });
                    }
                    
                    // Criar store de serviços
                    if (!db.objectStoreNames.contains(SERVICE_STORE)) {
                        const serviceStore = db.createObjectStore(SERVICE_STORE, { keyPath: 'id', autoIncrement: true });
                        serviceStore.createIndex('name', 'name', { unique: false });
                    }
                    
                    // Criar store de agendamentos
                    if (!db.objectStoreNames.contains(BOOKING_STORE)) {
                        const bookingStore = db.createObjectStore(BOOKING_STORE, { keyPath: 'id', autoIncrement: true });
                        bookingStore.createIndex('userId', 'userId', { unique: false });
                        bookingStore.createIndex('serviceId', 'serviceId', { unique: false });
                        bookingStore.createIndex('date', 'date', { unique: false });
                    }
                    
                    // Criar store de configurações
                    if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                        const settingsStore = db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
                    }
                };
            });
        }

        // Funções para operações no banco de dados
        function addData(storeName, data) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        function getAllData(storeName) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        function getDataByIndex(storeName, indexName, value) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.get(value);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        function updateData(storeName, id, data) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put({ ...data, id });
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        function deleteData(storeName, id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
        }

        // Funções de usuário
        async function registerUser(userData) {
            // Verificar se o e-mail já existe
            const existingUser = await getDataByIndex(USER_STORE, 'email', userData.email);
            if (existingUser) {
                throw new Error('E-mail já cadastrado');
            }
            
            // Adicionar data de criação
            userData.createdAt = new Date().toISOString();
            userData.isAdmin = false;
            
            return await addData(USER_STORE, userData);
        }

        async function loginUser(email, password) {
            // Primeiro verifica se é o admin
            if (email === 'divino@pente.com' && password === 'Pente') {
                return {
                    id: 0,
                    name: 'Administrador Divino Pente',
                    email: 'divino@pente.com',
                    phone: '(11) 99999-9999',
                    isAdmin: true,
                    note: document.getElementById('bookingNote') ? document.getElementById('bookingNote').value : '',\n                createdAt: new Date().toISOString()
                };
            }
            
            // Se não for admin, busca no banco de dados
            const user = await getDataByIndex(USER_STORE, 'email', email);
            
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            
            if (user.password !== password) {
                throw new Error('Senha incorreta');
            }
            
            return user;
        }

        async function getUserBookings(userId) {
            const allBookings = await getAllData(BOOKING_STORE);
            return allBookings.filter(booking => booking.userId === userId);
        }

        // Funções de serviços
        async function loadServices() {
            const services = await getAllData(SERVICE_STORE);
            
            // Se não houver serviços, adicionar alguns padrão
            if (services.length === 0) {
                const defaultServices = [
                    { name: "Corte de Cabelo", price: "R$ 25,00", description: "Corte moderno e estilizado" },
                    { name: "Barba", price: "R$ 15,00", description: "Aparar e modelar a barba" },
                    { name: "Corte + Barba", price: "R$ 35,00", description: "Pacote completo" },
                    { name: "Hidratação", price: "R$ 20,00", description: "Hidratação profunda" }
                ];
                
                for (const service of defaultServices) {
                    await addData(SERVICE_STORE, service);
                }
                
                return await getAllData(SERVICE_STORE);
            }
            
            return services;
        }

        // Funções de WhatsApp
        async function getWhatsAppConfig() {
            const settings = await getAllData(SETTINGS_STORE);
            const whatsappConfig = settings.find(s => s.id === 'whatsapp');
            return whatsappConfig || null;
        }

        async function saveWhatsAppConfig(config) {
            return await updateData(SETTINGS_STORE, 'whatsapp', { 
                id: 'whatsapp', 
                ...config 
            });
        }

        
        async function sendWhatsAppNotification(bookingDetails) {
            // Envia os dados para o endpoint do servidor que fará o envio via UltraMsg
            try {
                const payload = {
                    to: bookingDetails.ownerNumber || '',
                    clientName: bookingDetails.clientName,
                    serviceName: bookingDetails.serviceName,
                    date: bookingDetails.date,
                    time: bookingDetails.time,
                    phone: bookingDetails.phone,
                    note: bookingDetails.note || ''
                };
                
                const res = await fetch('/api/send_whatsapp.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await res.json();
                console.log('WhatsApp API response:', result);
                
                if (!result.success) {
                    console.warn('Falha ao enviar notificação via WhatsApp:', result.message || result);
                }
            } catch (err) {
                console.error('Erro ao chamar o endpoint de WhatsApp:', err);
            }
        }

        // Funções de interface
        function showAlert(message, type = 'success') {
            alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }

        function updateAuthUI() {
            if (currentUser) {
                authButtons.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                        <span>Olá, ${currentUser.name.split(' ')[0]}</span>
                    </div>
                    <button class="auth-btn" id="logoutBtn">Sair</button>
                `;
                
                document.getElementById('logoutBtn').addEventListener('click', logout);
                
                // Mostrar perfil do usuário (apenas se não for admin)
                if (!currentUser.isAdmin) {
                    userProfile.style.display = 'block';
                    document.getElementById('profileName').textContent = currentUser.name;
                    document.getElementById('profileEmail').textContent = currentUser.email;
                    document.getElementById('profilePhone').textContent = currentUser.phone;
                    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
                    
                    // Carregar agendamentos do usuário
                    loadUserBookings();
                } else {
                    userProfile.style.display = 'none';
                }
                
                // Mostrar painel admin se for admin
                if (currentUser.isAdmin) {
                    isAdminLoggedIn = true;
                    adminPanel.style.display = 'block';
                    loadAdminServices();
                    loadUsers();
                    loadWhatsAppConfig();
                }
            } else {
                authButtons.innerHTML = `
                    <button class="auth-btn" id="loginBtn">Entrar</button>
                    <button class="auth-btn" id="signupBtn">Criar Conta</button>
                `;
                
                document.getElementById('loginBtn').addEventListener('click', () => {
                    authModal.style.display = 'flex';
                    switchModalTab('login-tab');
                });
                
                document.getElementById('signupBtn').addEventListener('click', () => {
                    authModal.style.display = 'flex';
                    switchModalTab('register-tab');
                });
                
                // Ocultar perfil do usuário e painel admin
                userProfile.style.display = 'none';
                adminPanel.style.display = 'none';
            }
        }

        function switchModalTab(tabId) {
            // Remover classe active de todas as abas e conteúdos
            modalTabs.forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Adicionar classe active à aba e conteúdo selecionados
            document.querySelector(`.modal-tab[data-tab="${tabId}"]`).classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }

        async function loadUserBookings() {
            if (!currentUser || currentUser.isAdmin) return;
            
            const bookings = await getUserBookings(currentUser.id);
            const services = await getAllData(SERVICE_STORE);
            
            userBookings.innerHTML = '';
            
            if (bookings.length === 0) {
                userBookings.innerHTML = '<p>Você ainda não fez nenhum agendamento.</p>';
                return;
            }
            
            bookings.forEach(booking => {
                const service = services.find(s => s.id === booking.serviceId);
                const bookingDate = new Date(booking.date).toLocaleDateString('pt-BR');
                
                const bookingElement = document.createElement('div');
                bookingElement.className = 'booking-item';
                bookingElement.innerHTML = `
                    <div class="booking-service">${service ? service.name : 'Serviço não encontrado'}</div>
                    <div class="booking-date">${bookingDate} às ${booking.time}</div>
                    <div>Status: <strong>${booking.status || 'Confirmado'}</strong></div>
                `;
                
                userBookings.appendChild(bookingElement);
            });
        }

        function logout() {
            currentUser = null;
            isAdminLoggedIn = false;
            adminPanel.style.display = 'none';
            updateAuthUI();
        }

        // Event Listeners
        closeModalBtn.addEventListener('click', () => {
            authModal.style.display = 'none';
        });

        modalTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                switchModalTab(tabId);
            });
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const user = await loginUser(email, password);
                currentUser = user;
                
                updateAuthUI();
                authModal.style.display = 'none';
                showAlert('Login realizado com sucesso!', 'success');
                
                // Limpar formulário
                loginForm.reset();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const phone = document.getElementById('registerPhone').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showAlert('As senhas não coincidem', 'error');
                return;
            }
            
            try {
                await registerUser({ name, email, phone, password });
                showAlert('Conta criada com sucesso! Faça login para continuar.', 'success');
                switchModalTab('login-tab');
                registerForm.reset();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentUser) {
                showAlert('Faça login para agendar um serviço', 'error');
                authModal.style.display = 'flex';
                return;
            }
            
            const serviceId = parseInt(serviceSelect.value);
            const service = (await getAllData(SERVICE_STORE)).find(s => s.id === serviceId);
            
            if (!service) {
                showAlert('Por favor, selecione um serviço válido.', 'error');
                return;
            }
            
            const bookingDetails = {
                userId: currentUser.id,
                serviceId: serviceId,
                serviceName: service.name,
                clientName: document.getElementById('clientName').value,
                phone: document.getElementById('clientPhone').value,
                date: document.getElementById('bookingDate').value,
                time: document.getElementById('bookingTime').value,
                status: 'Confirmado',
                note: document.getElementById('bookingNote') ? document.getElementById('bookingNote').value : '',\n                createdAt: new Date().toISOString()
            };
            
            try {
                await addData(BOOKING_STORE, bookingDetails);
                
                // Enviar notificação via WhatsApp
                await sendWhatsAppNotification(bookingDetails);
                
                // Limpar formulário
                bookingForm.reset();
                
                // Atualizar lista de agendamentos
                loadUserBookings();
                
                showAlert('Agendamento realizado com sucesso!', 'success');
            } catch (error) {
                showAlert('Erro ao realizar agendamento: ' + error.message, 'error');
            }
        });

        addServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('serviceName').value;
            const price = document.getElementById('servicePrice').value;
            const description = document.getElementById('serviceDescription').value;
            
            try {
                await addData(SERVICE_STORE, { name, price, description });
                addServiceForm.reset();
                loadServicesToUI();
                loadAdminServices();
                showAlert('Serviço adicionado com sucesso!', 'success');
            } catch (error) {
                showAlert('Erro ao adicionar serviço: ' + error.message, 'error');
            }
        });

        whatsappForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const number = document.getElementById('whatsappNumber').value;
            const message = document.getElementById('whatsappMessage').value;
            
            try {
                await saveWhatsAppConfig({ number, message });
                await loadWhatsAppConfig();
                showAlert('Configurações do WhatsApp salvas com sucesso!', 'success');
            } catch (error) {
                showAlert('Erro ao salvar configurações: ' + error.message, 'error');
            }
        });

        // Navegação entre abas do painel administrativo
        adminTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remover classe active de todas as abas
                adminTabs.forEach(t => t.classList.remove('active'));
                // Adicionar classe active à aba clicada
                tab.classList.add('active');
                
                // Esconder todo o conteúdo
                document.querySelectorAll('.admin-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Mostrar o conteúdo correspondente
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
                
                // Carregar configurações do WhatsApp se for a aba correspondente
                if (tabId === 'whatsapp-tab') {
                    loadWhatsAppConfig();
                }
            });
        });

        // Funções para carregar dados na UI
        async function loadServicesToUI() {
            const services = await loadServices();
            
            servicesContainer.innerHTML = '';
            serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';
            
            services.forEach(service => {
                // Adicionar ao grid de serviços
                const serviceCard = document.createElement('div');
                serviceCard.className = 'service-card';
                serviceCard.innerHTML = `
                    <h3 class="service-name">${service.name}</h3>
                    <div class="service-price">${service.price}</div>
                    <p class="service-description">${service.description}</p>
                    <button class="btn select-service" data-id="${service.id}">Selecionar</button>
                `;
                servicesContainer.appendChild(serviceCard);
                
                // Adicionar ao select do formulário
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.name} - ${service.price}`;
                serviceSelect.appendChild(option);
            });
            
            // Adicionar eventos aos botões de seleção
            document.querySelectorAll('.select-service').forEach(button => {
                button.addEventListener('click', function() {
                    serviceSelect.value = this.getAttribute('data-id');
                    document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
                });
            });
        }

        async function loadAdminServices() {
            const services = await getAllData(SERVICE_STORE);
            adminServicesList.innerHTML = '';
            
            services.forEach(service => {
                const serviceItem = document.createElement('li');
                serviceItem.className = 'service-item';
                serviceItem.innerHTML = `
                    <div>
                        <strong>${service.name}</strong> - ${service.price}
                        <div>${service.description}</div>
                    </div>
                    <div class="service-actions">
                        <button class="btn btn-danger delete-service" data-id="${service.id}">Excluir</button>
                    </div>
                `;
                adminServicesList.appendChild(serviceItem);
            });
            
            // Adicionar eventos aos botões de exclusão
            document.querySelectorAll('.delete-service').forEach(button => {
                button.addEventListener('click', async function() {
                    const serviceId = parseInt(this.getAttribute('data-id'));
                    try {
                        await deleteData(SERVICE_STORE, serviceId);
                        loadServicesToUI();
                        loadAdminServices();
                        showAlert('Serviço excluído com sucesso!', 'success');
                    } catch (error) {
                        showAlert('Erro ao excluir serviço: ' + error.message, 'error');
                    }
                });
            });
        }

        async function loadUsers() {
            const users = await getAllData(USER_STORE);
            usersList.innerHTML = '';
            
            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'service-item';
                userItem.innerHTML = `
                    <div>
                        <strong>${user.name}</strong>
                        <div>${user.email} | ${user.phone}</div>
                        <div>Cadastrado em: ${new Date(user.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="service-actions">
                        ${user.isAdmin ? '<span class="btn" style="background-color: var(--accent-dark);">Admin</span>' : ''}
                    </div>
                `;
                usersList.appendChild(userItem);
            });
        }

        // Inicialização
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                await initDB();
                await loadServicesToUI();
                updateAuthUI();
                
                // Preencher data mínima como hoje
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('bookingDate').min = today;
                
                console.log('Sistema inicializado com sucesso!');
            } catch (error) {
                console.error('Erro ao inicializar o sistema:', error);
                showAlert('Erro ao carregar o sistema. Recarregue a página.', 'error');
            }
        });