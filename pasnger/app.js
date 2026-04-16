/**
 * Frontend Logic for Travel Buddy MVP
 */

class App {
    constructor() {
        this.currentScreen = 'splash';
        this.activeChatId = null;
        
        // Wait for DOM
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        this.bindEvents();
        
        // Show splash for 2s, then check auth
        setTimeout(() => {
            const user = db.getCurrentUser();
            if (user) {
                if (!user.isSetup) {
                    this.navigate('profile-setup');
                } else {
                    this.navigate('browse');
                }
            } else {
                this.navigate('auth');
            }
        }, 1500);
    }

    bindEvents() {
        // Bottom Nav
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.navigate(target);
            });
        });

        // Auth Tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
                
                e.currentTarget.classList.add('active');
                document.getElementById(e.currentTarget.dataset.target).classList.remove('hidden');
                document.getElementById(e.currentTarget.dataset.target).classList.add('active');
            });
        });

        // Login Form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('login-phone').value;
            const user = db.login(phone);
            if (user) {
                this.showToast('Welcome back!');
                this.navigate(user.isSetup ? 'browse' : 'profile-setup');
            } else {
                this.showToast('User not found. Please sign up.');
            }
        });

        // Signup Form
        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const phone = document.getElementById('signup-phone').value;
            try {
                db.signup(name, phone);
                this.navigate('profile-setup');
            } catch (err) {
                this.showToast(err.message);
            }
        });

        // Profile Setup Form
        document.getElementById('profile-setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                age: document.getElementById('profile-age').value,
                gender: document.getElementById('profile-gender').value,
                style: document.getElementById('profile-style').value,
                bio: document.getElementById('profile-bio').value
            };
            db.updateProfile(data);
            this.showToast('Profile saved!');
            this.navigate('browse');
        });

        // Create Trip Form
        document.getElementById('create-trip-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const tripData = {
                dest: document.getElementById('trip-dest').value,
                start: document.getElementById('trip-start').value,
                end: document.getElementById('trip-end').value,
                budget: document.getElementById('trip-budget').value,
                desc: document.getElementById('trip-desc').value
            };
            db.createTrip(tripData);
            this.showToast('Trip posted successfully!');
            e.target.reset();
            this.navigate('browse');
        });

        // Search Trips
        document.getElementById('search-destination').addEventListener('input', (e) => {
            this.renderTrips(e.target.value);
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => {
            db.logout();
            this.navigate('auth');
        });

        // Chat Form
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (text && this.activeChatId) {
                db.sendMessage(this.activeChatId, text);
                input.value = '';
                this.renderActiveChat(this.activeChatId);
            }
        });

        // Action menu toggle (for report/block)
        document.querySelector('.action-menu-trigger').addEventListener('click', () => {
            const menu = document.querySelector('.action-menu');
            menu.classList.toggle('hidden');
        });
        
        // Report / Block handlers
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showToast('Action recorded (Mocked)');
                document.querySelector('.action-menu').classList.add('hidden');
            });
        });
    }

    navigate(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // Show target screen
        const screen = document.getElementById(`screen-${screenId}`);
        if(screen) screen.classList.add('active');

        // Update bottom nav
        const nav = document.getElementById('bottom-nav');
        if (screen && screen.classList.contains('with-bottom-nav')) {
            nav.classList.remove('hidden');
            document.querySelectorAll('.nav-item').forEach(item => {
                if (item.dataset.target === screenId) item.classList.add('active');
                else item.classList.remove('active');
            });
        } else {
            nav.classList.add('hidden');
        }

        this.currentScreen = screenId;
        this.runScreenLogic(screenId);
    }

    runScreenLogic(screenId) {
        this.updateChatBadge();
        
        if (screenId === 'browse') {
            document.getElementById('search-destination').value = '';
            this.renderTrips();
        } else if (screenId === 'chats') {
            this.renderRequests();
            this.renderChats();
        } else if (screenId === 'profile') {
            this.renderProfile();
        } else if (screenId === 'profile-setup') {
            this.prefillProfile();
        }
    }

    renderTrips(filter = '') {
        const feed = document.getElementById('trips-feed');
        feed.innerHTML = '';
        const trips = db.getTrips(filter);
        const currentUser = db.getCurrentUser();

        if (trips.length === 0) {
            feed.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:40px;">No trips found.</p>';
            return;
        }

        trips.forEach(trip => {
            if(trip.ownerId === currentUser.id) return; // Don't show own trips in feed (optional)
            
            const owner = db.getUser(trip.ownerId);
            const status = db.getRequestStatus(trip.id);
            
            let statusBtnHtml = '';
            if (status === 'pending') statusBtnHtml = '<span class="tag" style="background:var(--warning);color:white">Requested</span>';
            else if (status === 'accepted') statusBtnHtml = '<span class="tag" style="background:var(--secondary);color:white">Accepted</span>';
            else if (status === 'rejected') statusBtnHtml = '<span class="tag" style="background:var(--danger);color:white">Rejected</span>';

            const card = document.createElement('div');
            card.className = 'trip-card';
            card.innerHTML = `
                <div class="trip-card-header">
                    <img src="${owner.avatar}" alt="${owner.name}">
                    <div class="user-info">
                        <h4>${owner.name}</h4>
                        <p>${owner.age} yrs • ${owner.style}</p>
                    </div>
                </div>
                <div class="trip-dest">
                    ${trip.dest}
                </div>
                <div class="trip-details">
                    <span><i class="ri-calendar-line"></i> ${new Date(trip.start).toLocaleDateString()}</span>
                    <span><i class="ri-wallet-3-line"></i> ${trip.budget}</span>
                </div>
                <p class="trip-desc">${trip.desc}</p>
                <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                    ${statusBtnHtml}
                </div>
            `;
            
            card.addEventListener('click', () => this.showTripDetails(trip.id));
            feed.appendChild(card);
        });
    }

    showTripDetails(tripId) {
        const trip = db.getTrip(tripId);
        const owner = db.getUser(trip.ownerId);
        const status = db.getRequestStatus(tripId);
        const content = document.getElementById('trip-details-content');
        const actionBar = document.getElementById('trip-action-bar');
        
        // Reset action menu
        document.querySelector('.action-menu').classList.add('hidden');

        content.innerHTML = `
            <div class="trip-hero">
                <div class="trip-hero-content">
                    <h1>${trip.dest}</h1>
                    <span class="tag" style="background:rgba(255,255,255,0.2); color:white;">${trip.budget} Budget</span>
                </div>
            </div>
            <div class="trip-info-section">
                <div class="creator-profile">
                    <img src="${owner.avatar}" alt="${owner.name}">
                    <div class="creator-info">
                        <h3>${owner.name}</h3>
                        <p>${owner.age} yrs • ${owner.gender} • ${owner.style}</p>
                    </div>
                </div>
                
                <h4 class="section-label">About me</h4>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px; line-height:1.5;">${owner.bio}</p>

                <h4 class="section-label">Trip Details</h4>
                <div class="trip-info-grid">
                    <div class="info-item">
                        <div class="icon-wrapper"><i class="ri-calendar-event-line"></i></div>
                        <div class="text">
                            <small>Start Date</small>
                            <span>${new Date(trip.start).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="icon-wrapper"><i class="ri-calendar-check-line"></i></div>
                        <div class="text">
                            <small>End Date</small>
                            <span>${new Date(trip.end).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <h4 class="section-label">The Plan</h4>
                <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6;">${trip.desc}</p>
            </div>
        `;

        if (!status) {
            actionBar.innerHTML = `<button class="btn btn-primary btn-block" id="btn-join-request">Request to Join</button>`;
            setTimeout(() => {
                document.getElementById('btn-join-request').addEventListener('click', () => {
                    db.requestToJoin(tripId);
                    this.showToast('Join request sent!');
                    this.navigate('browse');
                });
            }, 0);
        } else if (status === 'pending') {
            actionBar.innerHTML = `<button class="btn btn-secondary btn-block" disabled>Request Pending...</button>`;
        } else if (status === 'accepted') {
            actionBar.innerHTML = `<button class="btn btn-primary btn-block" onclick="app.navigate('chats')">Go to Chats</button>`;
        } else {
            actionBar.innerHTML = `<button class="btn btn-secondary btn-block" disabled style="opacity:0.5">Request Rejected</button>`;
        }

        this.navigate('trip-details');
    }

    renderRequests() {
        const list = document.getElementById('requests-list');
        list.innerHTML = '';
        const requests = db.getPendingRequestsForMe();

        if (requests.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No pending requests.</p>';
            return;
        }

        requests.forEach(req => {
            const user = db.getUser(req.fromUserId);
            const trip = db.getTrip(req.tripId);
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <img src="${user.avatar}" alt="${user.name}">
                <div class="list-item-content">
                    <h4>${user.name}</h4>
                    <p>Wants to join: ${trip.dest}</p>
                </div>
                <div class="request-actions">
                    <button class="btn-accept" data-id="${req.id}"><i class="ri-check-line"></i></button>
                    <button class="btn-reject" data-id="${req.id}"><i class="ri-close-line"></i></button>
                </div>
            `;
            list.appendChild(item);
        });

        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', (e) => {
                db.handleRequest(e.currentTarget.dataset.id, 'accepted');
                this.runScreenLogic('chats'); // Refresh
                this.showToast('Request accepted! Chat created.');
            });
        });
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                db.handleRequest(e.currentTarget.dataset.id, 'rejected');
                this.runScreenLogic('chats');
            });
        });
    }

    renderChats() {
        const feed = document.getElementById('chats-feed');
        feed.innerHTML = '';
        const chats = db.getChats();
        const currentUser = db.getCurrentUser();

        if (chats.length === 0) {
            feed.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No active chats yet.</p>';
            return;
        }

        chats.forEach(chat => {
            const otherUserId = chat.users.find(id => id !== currentUser.id);
            const otherUser = db.getUser(otherUserId);
            const trip = db.getTrip(chat.tripId);
            const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'No messages yet';

            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <img src="${otherUser.avatar}" alt="${otherUser.name}">
                <div class="list-item-content">
                    <h4>${otherUser.name} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${trip.dest})</span></h4>
                    <p>${lastMsg}</p>
                </div>
            `;
            item.addEventListener('click', () => this.openChat(chat.id, otherUser));
            feed.appendChild(item);
        });
    }

    openChat(chatId, otherUser) {
        this.activeChatId = chatId;
        document.getElementById('active-chat-user').innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${otherUser.avatar}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">
                <h3 style="font-size:1rem; margin:0;">${otherUser.name}</h3>
            </div>
        `;
        this.renderActiveChat(chatId);
        this.navigate('active-chat');
    }

    renderActiveChat(chatId) {
        const area = document.getElementById('chat-messages-area');
        area.innerHTML = '';
        const chat = db.getChat(chatId);
        const currentUserId = db.getCurrentUser().id;

        chat.messages.forEach(msg => {
            const el = document.createElement('div');
            el.className = `message ${msg.senderId === currentUserId ? 'sent' : 'received'}`;
            el.textContent = msg.text;
            area.appendChild(el);
        });

        // Scroll to bottom
        area.scrollTop = area.scrollHeight;
    }

    updateChatBadge() {
        const requests = db.getPendingRequestsForMe();
        const badge = document.getElementById('chat-badge');
        if (requests.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = requests.length;
        } else {
            badge.style.display = 'none';
        }
    }

    renderProfile() {
        const user = db.getCurrentUser();
        const content = document.getElementById('profile-view-content');
        
        const myTrips = db.getTrips().filter(t => t.ownerId === user.id);
        const myChats = db.getChats();

        content.innerHTML = `
            <div class="profile-header-view">
                <img src="${user.avatar}" alt="Avatar">
                <h3>${user.name}</h3>
                <p>${user.phone}</p>
            </div>
            
            <div class="profile-stats-grid">
                <div class="stat-card">
                    <h4>Trips Created</h4>
                    <span>${myTrips.length}</span>
                </div>
                <div class="stat-card">
                    <h4>Active Chats</h4>
                    <span>${myChats.length}</span>
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h4 class="section-label">My Details</h4>
                <div class="form-container">
                    <p style="margin-bottom:10px;"><strong>Age:</strong> ${user.age}</p>
                    <p style="margin-bottom:10px;"><strong>Gender:</strong> ${user.gender}</p>
                    <p style="margin-bottom:10px;"><strong>Style:</strong> ${user.style}</p>
                    <p><strong>Bio:</strong><br><span style="color:var(--text-muted); font-size:0.9rem;">${user.bio}</span></p>
                </div>
            </div>
        `;
    }

    prefillProfile() {
        const user = db.getCurrentUser();
        if (user && user.isSetup) {
            document.getElementById('profile-age').value = user.age || '';
            document.getElementById('profile-gender').value = user.gender || '';
            document.getElementById('profile-style').value = user.style || '';
            document.getElementById('profile-bio').value = user.bio || '';
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }
}

const app = new App();
