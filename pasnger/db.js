/**
 * Mock Database using LocalStorage
 * Travel Buddy MVP
 */

const DB_KEY = 'travel_buddy_db';

class Database {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(DB_KEY)) {
            const initialData = {
                users: [],
                trips: [],
                requests: [],
                chats: [],
                currentUser: null
            };
            this._save(initialData);
            this._seedDummyData();
        }
    }

    _getData() {
        return JSON.parse(localStorage.getItem(DB_KEY));
    }

    _save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    _generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Auth & User
    login(phone) {
        const data = this._getData();
        const user = data.users.find(u => u.phone === phone);
        if (user) {
            data.currentUser = user.id;
            this._save(data);
            return user;
        }
        return null;
    }

    signup(name, phone) {
        const data = this._getData();
        if (data.users.find(u => u.phone === phone)) {
            throw new Error("Phone number already registered.");
        }
        
        const newUser = {
            id: this._generateId(),
            name,
            phone,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            age: null,
            gender: null,
            bio: '',
            style: '',
            isSetup: false
        };

        data.users.push(newUser);
        data.currentUser = newUser.id;
        this._save(data);
        return newUser;
    }

    logout() {
        const data = this._getData();
        data.currentUser = null;
        this._save(data);
    }

    getCurrentUser() {
        const data = this._getData();
        if (!data.currentUser) return null;
        return data.users.find(u => u.id === data.currentUser);
    }

    getUser(id) {
        return this._getData().users.find(u => u.id === id);
    }

    updateProfile(profileData) {
        const data = this._getData();
        const index = data.users.findIndex(u => u.id === data.currentUser);
        if (index !== -1) {
            data.users[index] = { ...data.users[index], ...profileData, isSetup: true };
            this._save(data);
            return data.users[index];
        }
        return null;
    }

    // Trips
    createTrip(tripData) {
        const data = this._getData();
        const newTrip = {
            id: this._generateId(),
            ownerId: data.currentUser,
            createdAt: new Date().toISOString(),
            ...tripData
        };
        data.trips.push(newTrip);
        this._save(data);
        return newTrip;
    }

    getTrips(filterDest = '') {
        const data = this._getData();
        let trips = data.trips;
        
        if (filterDest) {
            trips = trips.filter(t => t.dest.toLowerCase().includes(filterDest.toLowerCase()));
        }
        
        // Sort newest first
        return trips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getTrip(id) {
        return this._getData().trips.find(t => t.id === id);
    }

    // Join Requests
    requestToJoin(tripId) {
        const data = this._getData();
        const trip = data.trips.find(t => t.id === tripId);
        
        // Check if already requested
        const existing = data.requests.find(r => r.tripId === tripId && r.fromUserId === data.currentUser);
        if (existing) throw new Error("Already requested");

        const req = {
            id: this._generateId(),
            tripId,
            fromUserId: data.currentUser,
            toUserId: trip.ownerId,
            status: 'pending' // pending, accepted, rejected
        };
        data.requests.push(req);
        this._save(data);
        return req;
    }

    getPendingRequestsForMe() {
        const data = this._getData();
        return data.requests.filter(r => r.toUserId === data.currentUser && r.status === 'pending');
    }

    getRequestStatus(tripId) {
        const data = this._getData();
        const req = data.requests.find(r => r.tripId === tripId && r.fromUserId === data.currentUser);
        return req ? req.status : null;
    }

    handleRequest(reqId, action) { // action: 'accepted' or 'rejected'
        const data = this._getData();
        const reqIndex = data.requests.findIndex(r => r.id === reqId);
        if (reqIndex !== -1) {
            data.requests[reqIndex].status = action;

            // If accepted, create a chat
            if (action === 'accepted') {
                const chat = {
                    id: this._generateId(),
                    tripId: data.requests[reqIndex].tripId,
                    users: [data.requests[reqIndex].fromUserId, data.requests[reqIndex].toUserId],
                    messages: [],
                    updatedAt: new Date().toISOString()
                };
                data.chats.push(chat);
            }
            this._save(data);
        }
    }

    // Chats
    getChats() {
        const data = this._getData();
        return data.chats.filter(c => c.users.includes(data.currentUser))
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    getChat(chatId) {
        return this._getData().chats.find(c => c.id === chatId);
    }

    sendMessage(chatId, text) {
        const data = this._getData();
        const chatIndex = data.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
            const msg = {
                id: this._generateId(),
                senderId: data.currentUser,
                text,
                timestamp: new Date().toISOString()
            };
            data.chats[chatIndex].messages.push(msg);
            data.chats[chatIndex].updatedAt = msg.timestamp;
            this._save(data);
            return msg;
        }
        return null;
    }

    // Safety
    reportUser(userId) {
        console.log(`User ${userId} reported by ${this.getCurrentUser().id}`);
        // Mock implementation
    }

    blockUser(userId) {
        console.log(`User ${userId} blocked by ${this.getCurrentUser().id}`);
        // Mock implementation
    }

    // Helper to seed some initial data
    _seedDummyData() {
        const data = this._getData();
        if (data.users.length === 0) {
            const dummyUser = {
                id: 'dummy123',
                name: 'Sarah Ahmed',
                phone: '01000000000',
                avatar: 'https://ui-avatars.com/api/?name=Sarah+Ahmed&background=random',
                age: 26,
                gender: 'Female',
                bio: 'Love hiking and diving. Looking for friends to travel with!',
                style: 'Adventure',
                isSetup: true
            };
            data.users.push(dummyUser);

            const dummyTrip = {
                id: 'trip123',
                ownerId: 'dummy123',
                dest: 'Dahab, Egypt',
                start: '2026-05-10',
                end: '2026-05-15',
                budget: 'Medium',
                desc: 'Planning to go diving and chill by the beach. Let me know if you want to join!',
                createdAt: new Date().toISOString()
            };
            data.trips.push(dummyTrip);
            
            this._save(data);
        }
    }
}

const db = new Database();
