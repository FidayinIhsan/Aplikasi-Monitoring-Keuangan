// ===== IndexedDB Database Manager =====
const DB_NAME = 'FinanceDB';
const DB_VERSION = 2;

class Database {
    constructor() { this.db = null; }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { this.db = request.result; resolve(this.db); };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('transactions')) {
                    const ts = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    ts.createIndex('type', 'type'); ts.createIndex('date', 'date');
                    ts.createIndex('category', 'category'); ts.createIndex('needWant', 'needWant');
                }
                if (!db.objectStoreNames.contains('plans')) {
                    const ps = db.createObjectStore('plans', { keyPath: 'id', autoIncrement: true });
                    ps.createIndex('priority', 'priority'); ps.createIndex('needWant', 'needWant');
                }
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true }).createIndex('type', 'type');
                }
                // New stores for new features
                if (!db.objectStoreNames.contains('budgets')) {
                    const bs = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
                    bs.createIndex('categoryId', 'categoryId');
                    bs.createIndex('month', 'month');
                }
                if (!db.objectStoreNames.contains('goals')) {
                    const gs = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
                    gs.createIndex('completed', 'completed');
                }
                if (!db.objectStoreNames.contains('reminders')) {
                    const rs = db.createObjectStore('reminders', { keyPath: 'id', autoIncrement: true });
                    rs.createIndex('dueDate', 'dueDate');
                    rs.createIndex('isPaid', 'isPaid');
                }
            };
        });
    }

    // ===== Transactions =====
    async addTransaction(t) {
        return this._add('transactions', { ...t, createdAt: new Date().toISOString() });
    }
    async updateTransaction(id, t) { return this._put('transactions', { ...t, id }); }
    async deleteTransaction(id) { return this._delete('transactions', id); }
    async getTransaction(id) { return this._get('transactions', id); }
    async getAllTransactions() {
        const data = await this._getAll('transactions');
        return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ===== Plans =====
    async addPlan(p) {
        return this._add('plans', { ...p, completed: false, createdAt: new Date().toISOString() });
    }
    async updatePlan(id, p) { return this._put('plans', { ...p, id }); }
    async deletePlan(id) { return this._delete('plans', id); }
    async getPlan(id) { return this._get('plans', id); }
    async getAllPlans() {
        const data = await this._getAll('plans');
        return data.sort((a, b) => b.priority - a.priority);
    }

    // ===== Categories =====
    async initDefaultCategories() {
        const cats = await this._getAll('categories');
        if (cats.length === 0) {
            const defaults = [
                { name: 'Gaji', type: 'income', icon: '💼', color: '#10b981' },
                { name: 'Bonus', type: 'income', icon: '🎁', color: '#06b6d4' },
                { name: 'Investasi', type: 'income', icon: '📈', color: '#8b5cf6' },
                { name: 'Lainnya', type: 'income', icon: '💰', color: '#64748b' },
                { name: 'Makanan', type: 'expense', icon: '🍔', color: '#f97316' },
                { name: 'Transportasi', type: 'expense', icon: '🚗', color: '#eab308' },
                { name: 'Belanja', type: 'expense', icon: '🛒', color: '#ec4899' },
                { name: 'Tagihan', type: 'expense', icon: '📄', color: '#8b5cf6' },
                { name: 'Kesehatan', type: 'expense', icon: '💊', color: '#ef4444' },
                { name: 'Hiburan', type: 'expense', icon: '🎮', color: '#6366f1' },
                { name: 'Pendidikan', type: 'expense', icon: '📚', color: '#0ea5e9' },
                { name: 'Lainnya', type: 'expense', icon: '📦', color: '#64748b' }
            ];
            for (const c of defaults) await this._add('categories', c);
        }
    }
    async getAllCategories() { return this._getAll('categories'); }
    async getCategoriesByType(type) {
        const cats = await this._getAll('categories');
        return cats.filter(c => c.type === type);
    }
    async getCategory(id) { return this._get('categories', id); }

    // ===== Budgets =====
    async addBudget(b) {
        return this._add('budgets', { ...b, createdAt: new Date().toISOString() });
    }
    async updateBudget(id, b) { return this._put('budgets', { ...b, id }); }
    async deleteBudget(id) { return this._delete('budgets', id); }
    async getBudget(id) { return this._get('budgets', id); }
    async getAllBudgets() { return this._getAll('budgets'); }
    async getBudgetsByMonth(month) {
        const budgets = await this._getAll('budgets');
        return budgets.filter(b => b.month === month);
    }

    // ===== Goals (Savings) =====
    async addGoal(g) {
        return this._add('goals', { ...g, saved: 0, completed: false, createdAt: new Date().toISOString() });
    }
    async updateGoal(id, g) { return this._put('goals', { ...g, id }); }
    async deleteGoal(id) { return this._delete('goals', id); }
    async getGoal(id) { return this._get('goals', id); }
    async getAllGoals() {
        const data = await this._getAll('goals');
        return data.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    }
    async addToGoal(id, amount) {
        const goal = await this.getGoal(id);
        if (goal) {
            goal.saved = (goal.saved || 0) + amount;
            if (goal.saved >= goal.target) goal.completed = true;
            await this.updateGoal(id, goal);
        }
        return goal;
    }

    // ===== Reminders =====
    async addReminder(r) {
        return this._add('reminders', { ...r, isPaid: false, createdAt: new Date().toISOString() });
    }
    async updateReminder(id, r) { return this._put('reminders', { ...r, id }); }
    async deleteReminder(id) { return this._delete('reminders', id); }
    async getReminder(id) { return this._get('reminders', id); }
    async getAllReminders() {
        const data = await this._getAll('reminders');
        return data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }
    async markReminderPaid(id) {
        const r = await this.getReminder(id);
        if (r) {
            r.isPaid = true;
            r.paidDate = new Date().toISOString();
            await this.updateReminder(id, r);
        }
        return r;
    }

    // ===== Statistics =====
    async getStatistics() {
        const txs = await this.getAllTransactions();
        const now = new Date();
        const current = txs.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const inc = current.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = current.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const needs = current.filter(t => t.type === 'expense' && t.needWant === 'need').reduce((s, t) => s + t.amount, 0);
        const wants = current.filter(t => t.type === 'expense' && t.needWant === 'want').reduce((s, t) => s + t.amount, 0);
        return { totalIncome: inc, totalExpense: exp, balance: inc - exp, needsExpense: needs, wantsExpense: wants };
    }

    async getCategoryStatistics() {
        const txs = await this.getAllTransactions();
        const cats = await this.getAllCategories();
        const now = new Date();
        const current = txs.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && t.type === 'expense';
        });
        const stats = {};
        for (const t of current) {
            if (!stats[t.category]) {
                const cat = cats.find(c => c.id === t.category);
                stats[t.category] = { id: t.category, name: cat?.name || 'Lainnya', icon: cat?.icon || '📦', color: cat?.color || '#64748b', amount: 0 };
            }
            stats[t.category].amount += t.amount;
        }
        const total = Object.values(stats).reduce((s, c) => s + c.amount, 0);
        return Object.values(stats).map(c => ({ ...c, percentage: total > 0 ? c.amount / total * 100 : 0 })).sort((a, b) => b.amount - a.amount);
    }

    async getMonthlyData() {
        const txs = await this.getAllTransactions();
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mt = txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth(); });
            months.push({
                label: date.toLocaleDateString('id-ID', { month: 'short' }),
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                income: mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            });
        }
        return months;
    }

    async getYearlyReport() {
        const txs = await this.getAllTransactions();
        const now = new Date();
        const thisYear = txs.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
        const income = thisYear.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = thisYear.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const needs = thisYear.filter(t => t.type === 'expense' && t.needWant === 'need').reduce((s, t) => s + t.amount, 0);
        const wants = thisYear.filter(t => t.type === 'expense' && t.needWant === 'want').reduce((s, t) => s + t.amount, 0);
        return { year: now.getFullYear(), income, expense, balance: income - expense, needs, wants, transactionCount: thisYear.length };
    }

    async getBudgetProgress() {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const budgets = await this.getBudgetsByMonth(month);
        const catStats = await this.getCategoryStatistics();

        return budgets.map(b => {
            const cat = catStats.find(c => c.id === b.categoryId);
            const spent = cat ? cat.amount : 0;
            const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            return { ...b, spent, percentage, remaining: b.limit - spent, isOver: spent > b.limit };
        });
    }

    // ===== Export =====
    async exportToCSV() {
        const txs = await this.getAllTransactions();
        const cats = await this.getAllCategories();

        const headers = ['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Jumlah', 'Butuh/Ingin'];
        const rows = txs.map(t => {
            const cat = cats.find(c => c.id === t.category);
            return [
                t.date,
                t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                cat?.name || 'Lainnya',
                t.description,
                t.amount,
                t.type === 'expense' ? (t.needWant === 'need' ? 'Butuh' : 'Ingin') : '-'
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    // ===== Helpers =====
    _add(store, data) {
        return new Promise((res, rej) => {
            const r = this.db.transaction(store, 'readwrite').objectStore(store).add(data);
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
    }
    _put(store, data) {
        return new Promise((res, rej) => {
            const r = this.db.transaction(store, 'readwrite').objectStore(store).put(data);
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
    }
    _delete(store, id) {
        return new Promise((res, rej) => {
            const r = this.db.transaction(store, 'readwrite').objectStore(store).delete(id);
            r.onsuccess = () => res(); r.onerror = () => rej(r.error);
        });
    }
    _get(store, id) {
        return new Promise((res, rej) => {
            const r = this.db.transaction(store, 'readonly').objectStore(store).get(id);
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
    }
    _getAll(store) {
        return new Promise((res, rej) => {
            const r = this.db.transaction(store, 'readonly').objectStore(store).getAll();
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
    }
}

const db = new Database();
