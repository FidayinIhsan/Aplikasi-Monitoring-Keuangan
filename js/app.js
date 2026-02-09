// ===== Main Application =====
class App {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentFilter = 'all';
        this.chart = null;
        this.categories = [];
        this.editingId = null;
        this.deleteCallback = null;
        this.selectedGoalIcon = '💰';
    }

    async init() {
        await db.init();
        await db.initDefaultCategories();
        this.categories = await db.getAllCategories();
        this.setGreeting();
        this.bindEvents();
        this.setDefaultDate();
        await this.refresh();
    }

    setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Selamat Pagi';
        if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
        else if (hour >= 18 || hour < 5) greeting = 'Selamat Malam';
        document.getElementById('greeting').textContent = greeting;
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // FAB
        document.getElementById('fabBtn').addEventListener('click', () => this.toggleFab());
        document.getElementById('fabOverlay').addEventListener('click', () => this.closeFab());
        document.querySelectorAll('.fab-item').forEach(item => {
            item.addEventListener('click', () => this.handleFabAction(item.dataset.action));
        });

        // Transaction Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal('transactionModal'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal('transactionModal'));
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleTransactionSubmit(e));

        // Plan Modal
        document.getElementById('closePlanModal').addEventListener('click', () => this.closeModal('planModal'));
        document.getElementById('cancelPlanBtn').addEventListener('click', () => this.closeModal('planModal'));
        document.getElementById('planForm').addEventListener('submit', (e) => this.handlePlanSubmit(e));

        // Budget Modal
        document.getElementById('addBudgetBtn').addEventListener('click', () => this.openBudgetModal());
        document.getElementById('closeBudgetModal').addEventListener('click', () => this.closeModal('budgetModal'));
        document.getElementById('cancelBudgetBtn').addEventListener('click', () => this.closeModal('budgetModal'));
        document.getElementById('budgetForm').addEventListener('submit', (e) => this.handleBudgetSubmit(e));

        // Goal Modal
        document.getElementById('addGoalBtn').addEventListener('click', () => this.openGoalModal());
        document.getElementById('closeGoalModal').addEventListener('click', () => this.closeModal('goalModal'));
        document.getElementById('cancelGoalBtn').addEventListener('click', () => this.closeModal('goalModal'));
        document.getElementById('goalForm').addEventListener('submit', (e) => this.handleGoalSubmit(e));

        // Icon selector
        document.querySelectorAll('#goalIconSelector .icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#goalIconSelector .icon-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedGoalIcon = btn.dataset.icon;
                document.getElementById('goalIcon').value = btn.dataset.icon;
            });
        });

        // Add to Goal Modal
        document.getElementById('closeAddToGoalModal').addEventListener('click', () => this.closeModal('addToGoalModal'));
        document.getElementById('cancelAddToGoalBtn').addEventListener('click', () => this.closeModal('addToGoalModal'));
        document.getElementById('addToGoalForm').addEventListener('submit', (e) => this.handleAddToGoal(e));

        // Reminder Modal
        document.getElementById('closeReminderModal').addEventListener('click', () => this.closeModal('reminderModal'));
        document.getElementById('cancelReminderBtn').addEventListener('click', () => this.closeModal('reminderModal'));
        document.getElementById('reminderForm').addEventListener('submit', (e) => this.handleReminderSubmit(e));

        // Delete Modal
        document.getElementById('cancelDelete').addEventListener('click', () => this.closeModal('deleteModal'));
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // Collapsible sections
        document.getElementById('togglePlans').addEventListener('click', () => this.toggleSection('planSection'));
        document.getElementById('toggleReminders').addEventListener('click', () => this.toggleSection('reminderSection'));
        document.getElementById('toggleReports').addEventListener('click', () => this.toggleSection('reportSection'));

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    }

    toggleSection(id) {
        const section = document.getElementById(id);
        const header = section.previousElementSibling;
        section.classList.toggle('open');
        header.querySelector('.chevron').classList.toggle('open');
    }

    setDefaultDate() {
        document.getElementById('date').valueAsDate = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        document.getElementById('reminderDueDate').valueAsDate = tomorrow;
    }

    // ===== Navigation =====
    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab).classList.add('active');
    }

    // ===== FAB =====
    toggleFab() {
        const fab = document.getElementById('fabBtn');
        const menu = document.getElementById('fabMenu');
        const overlay = document.getElementById('fabOverlay');
        fab.classList.toggle('active');
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    closeFab() {
        document.getElementById('fabBtn').classList.remove('active');
        document.getElementById('fabMenu').classList.remove('active');
        document.getElementById('fabOverlay').classList.remove('active');
    }

    handleFabAction(action) {
        this.closeFab();
        if (action === 'plan') {
            this.openPlanModal();
        } else if (action === 'reminder') {
            this.openReminderModal();
        } else {
            this.openTransactionModal(action);
        }
    }

    // ===== Modal =====
    openModal(id) { document.getElementById(id).classList.add('active'); }
    closeModal(id) { document.getElementById(id).classList.remove('active'); this.editingId = null; }

    openTransactionModal(type, editData = null) {
        const isIncome = type === 'income';
        document.getElementById('modalTitle').textContent = editData
            ? 'Edit Transaksi'
            : (isIncome ? 'Pemasukan Baru' : 'Pengeluaran Baru');
        document.getElementById('transactionType').value = type;
        document.getElementById('needWantGroup').style.display = isIncome ? 'none' : 'block';

        const cats = this.categories.filter(c => c.type === type);
        const select = document.getElementById('category');
        select.innerHTML = '<option value="">Pilih Kategori</option>' +
            cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

        if (editData) {
            this.editingId = editData.id;
            document.getElementById('amount').value = editData.amount;
            document.getElementById('description').value = editData.description;
            document.getElementById('category').value = editData.category;
            document.getElementById('date').value = editData.date;
            document.querySelector(`input[name="needWant"][value="${editData.needWant}"]`).checked = true;
        } else {
            document.getElementById('transactionForm').reset();
            this.setDefaultDate();
        }
        this.openModal('transactionModal');
    }

    openPlanModal(editData = null) {
        document.getElementById('planModalTitle').textContent = editData ? 'Edit Rencana' : 'Rencana Baru';
        if (editData) {
            this.editingId = editData.id;
            document.getElementById('planName').value = editData.name;
            document.getElementById('planAmount').value = editData.amount;
            document.getElementById('planNote').value = editData.note || '';
            document.querySelector(`input[name="priority"][value="${editData.priority}"]`).checked = true;
            document.querySelector(`input[name="planNeedWant"][value="${editData.needWant}"]`).checked = true;
        } else {
            document.getElementById('planForm').reset();
            document.querySelector('input[name="priority"][value="3"]').checked = true;
        }
        this.openModal('planModal');
    }

    openBudgetModal(editData = null) {
        document.getElementById('budgetModalTitle').textContent = editData ? 'Edit Anggaran' : 'Anggaran Baru';
        const cats = this.categories.filter(c => c.type === 'expense');
        const select = document.getElementById('budgetCategory');
        select.innerHTML = '<option value="">Pilih Kategori</option>' +
            cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

        if (editData) {
            this.editingId = editData.id;
            document.getElementById('budgetCategory').value = editData.categoryId;
            document.getElementById('budgetLimit').value = editData.limit;
        } else {
            document.getElementById('budgetForm').reset();
        }
        this.openModal('budgetModal');
    }

    openGoalModal(editData = null) {
        document.getElementById('goalModalTitle').textContent = editData ? 'Edit Target' : 'Target Baru';
        if (editData) {
            this.editingId = editData.id;
            document.getElementById('goalName').value = editData.name;
            document.getElementById('goalTarget').value = editData.target;
            this.selectedGoalIcon = editData.icon || '💰';
            document.getElementById('goalIcon').value = this.selectedGoalIcon;
            document.querySelectorAll('#goalIconSelector .icon-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.icon === this.selectedGoalIcon);
            });
        } else {
            document.getElementById('goalForm').reset();
            this.selectedGoalIcon = '💰';
            document.getElementById('goalIcon').value = '💰';
            document.querySelectorAll('#goalIconSelector .icon-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.icon === '💰');
            });
        }
        this.openModal('goalModal');
    }

    openAddToGoalModal(goal) {
        document.getElementById('addToGoalId').value = goal.id;
        document.getElementById('addToGoalInfo').textContent = `Menabung untuk: ${goal.name}`;
        document.getElementById('addToGoalAmount').value = '';
        this.openModal('addToGoalModal');
    }

    openReminderModal(editData = null) {
        document.getElementById('reminderModalTitle').textContent = editData ? 'Edit Pengingat' : 'Pengingat Baru';
        if (editData) {
            this.editingId = editData.id;
            document.getElementById('reminderName').value = editData.name;
            document.getElementById('reminderAmount').value = editData.amount;
            document.getElementById('reminderDueDate').value = editData.dueDate;
            document.querySelector(`input[name="reminderRecurring"][value="${editData.recurring ? 'yes' : 'no'}"]`).checked = true;
        } else {
            document.getElementById('reminderForm').reset();
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            document.getElementById('reminderDueDate').valueAsDate = nextWeek;
        }
        this.openModal('reminderModal');
    }

    // ===== Form Handlers =====
    async handleTransactionSubmit(e) {
        e.preventDefault();
        const data = {
            type: document.getElementById('transactionType').value,
            amount: parseInt(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            category: parseInt(document.getElementById('category').value),
            date: document.getElementById('date').value,
            needWant: document.querySelector('input[name="needWant"]:checked').value
        };

        if (this.editingId) {
            await db.updateTransaction(this.editingId, data);
        } else {
            await db.addTransaction(data);
        }
        this.closeModal('transactionModal');
        await this.refresh();
    }

    async handlePlanSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('planName').value,
            amount: parseInt(document.getElementById('planAmount').value),
            priority: parseInt(document.querySelector('input[name="priority"]:checked').value),
            needWant: document.querySelector('input[name="planNeedWant"]:checked').value,
            note: document.getElementById('planNote').value
        };

        if (this.editingId) {
            await db.updatePlan(this.editingId, data);
        } else {
            await db.addPlan(data);
        }
        this.closeModal('planModal');
        await this.refresh();
    }

    async handleBudgetSubmit(e) {
        e.preventDefault();
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const data = {
            categoryId: parseInt(document.getElementById('budgetCategory').value),
            limit: parseInt(document.getElementById('budgetLimit').value),
            month: month
        };

        if (this.editingId) {
            await db.updateBudget(this.editingId, data);
        } else {
            await db.addBudget(data);
        }
        this.closeModal('budgetModal');
        await this.refresh();
    }

    async handleGoalSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('goalName').value,
            target: parseInt(document.getElementById('goalTarget').value),
            icon: this.selectedGoalIcon
        };

        if (this.editingId) {
            const existing = await db.getGoal(this.editingId);
            data.saved = existing.saved || 0;
            data.completed = existing.completed || false;
            await db.updateGoal(this.editingId, data);
        } else {
            await db.addGoal(data);
        }
        this.closeModal('goalModal');
        await this.refresh();
    }

    async handleAddToGoal(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('addToGoalId').value);
        const amount = parseInt(document.getElementById('addToGoalAmount').value);
        await db.addToGoal(id, amount);
        this.closeModal('addToGoalModal');
        await this.refresh();
    }

    async handleReminderSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('reminderName').value,
            amount: parseInt(document.getElementById('reminderAmount').value),
            dueDate: document.getElementById('reminderDueDate').value,
            recurring: document.querySelector('input[name="reminderRecurring"]:checked').value === 'yes'
        };

        if (this.editingId) {
            await db.updateReminder(this.editingId, data);
        } else {
            await db.addReminder(data);
        }
        this.closeModal('reminderModal');
        await this.refresh();
    }

    // ===== Delete =====
    showDeleteConfirm(callback) {
        this.deleteCallback = callback;
        this.openModal('deleteModal');
    }

    async confirmDelete() {
        if (this.deleteCallback) {
            await this.deleteCallback();
            this.deleteCallback = null;
        }
        this.closeModal('deleteModal');
        await this.refresh();
    }

    // ===== Filter =====
    async setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        await this.renderTransactions();
    }

    // ===== Render =====
    async refresh() {
        await this.updateStats();
        await this.renderChart();
        await this.renderCategories();
        await this.renderTransactions();
        await this.renderPlans();
        await this.renderBudgets();
        await this.renderGoals();
        await this.renderReminders();
        await this.renderUpcomingReminders();
        await this.renderReport();
    }

    formatCurrency(amount) {
        return 'Rp ' + amount.toLocaleString('id-ID');
    }

    async updateStats() {
        const stats = await db.getStatistics();
        document.getElementById('currentBalance').textContent = this.formatCurrency(stats.balance);
        document.getElementById('totalIncome').textContent = this.formatCurrency(stats.totalIncome);
        document.getElementById('totalExpense').textContent = this.formatCurrency(stats.totalExpense);
        document.getElementById('needsTotal').textContent = this.formatCurrency(stats.needsExpense);
        document.getElementById('wantsTotal').textContent = this.formatCurrency(stats.wantsExpense);
    }

    async renderChart() {
        const data = await db.getMonthlyData();
        const ctx = document.getElementById('monthlyChart').getContext('2d');

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.label),
                datasets: [
                    {
                        label: 'Masuk',
                        data: data.map(d => d.income),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Keluar',
                        data: data.map(d => d.expense),
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#f43f5e'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            font: { size: 11 },
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.5)' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            callback: v => (v / 1000) + 'k'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    async renderCategories() {
        const stats = await db.getCategoryStatistics();
        const container = document.getElementById('categoryList');

        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Belum ada pengeluaran</p></div>';
            return;
        }

        container.innerHTML = stats.slice(0, 5).map(c => `
            <div class="category-item">
                <div class="category-icon" style="background: ${c.color}15; color: ${c.color}">${c.icon}</div>
                <div class="category-info">
                    <div class="category-name">${c.name}</div>
                    <div class="category-bar"><div class="category-fill" style="width: ${c.percentage}%; background: ${c.color}"></div></div>
                </div>
                <div class="category-amount">${this.formatCurrency(c.amount)}</div>
            </div>
        `).join('');
    }

    async renderTransactions() {
        let txs = await db.getAllTransactions();
        if (this.currentFilter !== 'all') txs = txs.filter(t => t.type === this.currentFilter);

        const container = document.getElementById('transactionList');
        if (txs.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>Belum ada transaksi</p></div>';
            return;
        }

        container.innerHTML = txs.map(t => {
            const cat = this.categories.find(c => c.id === t.category);
            const isIncome = t.type === 'income';
            return `
                <div class="transaction-item" data-id="${t.id}" data-type="${t.type}">
                    <div class="transaction-icon ${t.type}">${cat?.icon || '💰'}</div>
                    <div class="transaction-info">
                        <div class="transaction-desc">${t.description}</div>
                        <div class="transaction-meta">
                            <span>${cat?.name || 'Lainnya'}</span>
                            <span>•</span>
                            <span>${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            ${!isIncome ? `<span class="tag ${t.needWant}">${t.needWant === 'need' ? 'Butuh' : 'Ingin'}</span>` : ''}
                        </div>
                    </div>
                    <div class="transaction-amount ${t.type}">${isIncome ? '+' : '-'}${this.formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.transaction-item').forEach(item => {
            item.addEventListener('click', () => this.onTransactionClick(parseInt(item.dataset.id), item.dataset.type));
        });
    }

    async onTransactionClick(id, type) {
        const t = await db.getTransaction(id);
        if (confirm('Edit atau Hapus?\n\nOK = Edit\nCancel = Hapus')) {
            this.openTransactionModal(type, t);
        } else {
            this.showDeleteConfirm(async () => await db.deleteTransaction(id));
        }
    }

    async renderPlans() {
        const plans = await db.getAllPlans();
        const container = document.getElementById('planList');

        if (plans.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Belum ada rencana</p></div>';
            return;
        }

        container.innerHTML = plans.map(p => `
            <div class="plan-item p${p.priority}" data-id="${p.id}">
                <div class="plan-header">
                    <span class="plan-name">${p.name}</span>
                    <span class="priority-badge p${p.priority}">${p.priority}</span>
                </div>
                <div class="plan-details">
                    <span class="plan-amount">${this.formatCurrency(p.amount)}</span>
                    <span class="tag ${p.needWant}">${p.needWant === 'need' ? '🎯 Butuh' : '💫 Ingin'}</span>
                </div>
                ${p.note ? `<div class="plan-note">${p.note}</div>` : ''}
            </div>
        `).join('');

        container.querySelectorAll('.plan-item').forEach(item => {
            item.addEventListener('click', () => this.onPlanClick(parseInt(item.dataset.id)));
        });
    }

    async onPlanClick(id) {
        const p = await db.getPlan(id);
        if (confirm('Edit atau Hapus?\n\nOK = Edit\nCancel = Hapus')) {
            this.openPlanModal(p);
        } else {
            this.showDeleteConfirm(async () => await db.deletePlan(id));
        }
    }

    async renderBudgets() {
        const budgets = await db.getBudgetProgress();
        const container = document.getElementById('budgetList');

        if (budgets.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>Belum ada anggaran</p><p class="sub">Tap + untuk menambah anggaran</p></div>';
            return;
        }

        container.innerHTML = budgets.map(b => {
            const cat = this.categories.find(c => c.id === b.categoryId);
            const pct = Math.min(b.percentage, 100);
            const status = b.isOver ? 'over' : (b.percentage > 80 ? 'warning' : 'safe');
            return `
                <div class="budget-item ${status}" data-id="${b.id}">
                    <div class="budget-header">
                        <div class="budget-icon">${cat?.icon || '📦'}</div>
                        <div class="budget-info">
                            <span class="budget-name">${cat?.name || 'Lainnya'}</span>
                            <span class="budget-values">${this.formatCurrency(b.spent)} / ${this.formatCurrency(b.limit)}</span>
                        </div>
                        <span class="budget-pct">${Math.round(b.percentage)}%</span>
                    </div>
                    <div class="budget-bar"><div class="budget-fill" style="width: ${pct}%"></div></div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.budget-item').forEach(item => {
            item.addEventListener('click', () => this.onBudgetClick(parseInt(item.dataset.id)));
        });
    }

    async onBudgetClick(id) {
        const b = await db.getBudget(id);
        if (confirm('Edit atau Hapus?\n\nOK = Edit\nCancel = Hapus')) {
            this.openBudgetModal(b);
        } else {
            this.showDeleteConfirm(async () => await db.deleteBudget(id));
        }
    }

    async renderGoals() {
        const goals = await db.getAllGoals();
        const container = document.getElementById('goalList');

        if (goals.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">💎</div><p>Belum ada target tabungan</p><p class="sub">Tap + untuk menambah target</p></div>';
            return;
        }

        container.innerHTML = goals.map(g => {
            const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
            return `
                <div class="goal-item ${g.completed ? 'completed' : ''}" data-id="${g.id}">
                    <div class="goal-icon">${g.icon || '💰'}</div>
                    <div class="goal-content">
                        <div class="goal-header">
                            <span class="goal-name">${g.name}</span>
                            ${g.completed ? '<span class="goal-badge">✓</span>' : ''}
                        </div>
                        <div class="goal-progress">
                            <div class="goal-bar"><div class="goal-fill" style="width: ${pct}%"></div></div>
                            <span class="goal-pct">${Math.round(pct)}%</span>
                        </div>
                        <div class="goal-values">
                            <span>${this.formatCurrency(g.saved || 0)}</span>
                            <span>/ ${this.formatCurrency(g.target)}</span>
                        </div>
                    </div>
                    ${!g.completed ? `<button class="btn-add-goal" data-id="${g.id}">+</button>` : ''}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.goal-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-add-goal')) {
                    this.onGoalClick(parseInt(item.dataset.id));
                }
            });
        });

        container.querySelectorAll('.btn-add-goal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const goal = await db.getGoal(parseInt(btn.dataset.id));
                this.openAddToGoalModal(goal);
            });
        });
    }

    async onGoalClick(id) {
        const g = await db.getGoal(id);
        if (confirm('Edit atau Hapus?\n\nOK = Edit\nCancel = Hapus')) {
            this.openGoalModal(g);
        } else {
            this.showDeleteConfirm(async () => await db.deleteGoal(id));
        }
    }

    async renderReminders() {
        const reminders = await db.getAllReminders();
        const container = document.getElementById('reminderList');

        if (reminders.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Belum ada pengingat</p></div>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        container.innerHTML = reminders.map(r => {
            const isOverdue = r.dueDate < today && !r.isPaid;
            const dueDate = new Date(r.dueDate);
            return `
                <div class="reminder-item ${r.isPaid ? 'paid' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${r.id}">
                    <div class="reminder-icon">${r.isPaid ? '✓' : (isOverdue ? '⚠️' : '🔔')}</div>
                    <div class="reminder-info">
                        <span class="reminder-name">${r.name}</span>
                        <span class="reminder-due">${dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${r.recurring ? '(Bulanan)' : ''}</span>
                    </div>
                    <div class="reminder-amount">${this.formatCurrency(r.amount)}</div>
                    ${!r.isPaid ? `<button class="btn-mark-paid" data-id="${r.id}">✓</button>` : ''}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.reminder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-mark-paid')) {
                    this.onReminderClick(parseInt(item.dataset.id));
                }
            });
        });

        container.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await db.markReminderPaid(parseInt(btn.dataset.id));
                await this.refresh();
            });
        });
    }

    async renderUpcomingReminders() {
        const reminders = await db.getAllReminders();
        const today = new Date().toISOString().split('T')[0];
        const upcoming = reminders.filter(r => !r.isPaid && r.dueDate >= today).slice(0, 3);
        const container = document.getElementById('upcomingReminders');
        const card = document.getElementById('upcomingRemindersCard');

        if (upcoming.length === 0) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        container.innerHTML = upcoming.map(r => {
            const dueDate = new Date(r.dueDate);
            const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
            return `
                <div class="reminder-mini">
                    <span class="reminder-mini-icon">🔔</span>
                    <span class="reminder-mini-name">${r.name}</span>
                    <span class="reminder-mini-due">${diffDays <= 0 ? 'Hari ini' : diffDays + ' hari'}</span>
                </div>
            `;
        }).join('');
    }

    async onReminderClick(id) {
        const r = await db.getReminder(id);
        if (confirm('Edit atau Hapus?\n\nOK = Edit\nCancel = Hapus')) {
            this.openReminderModal(r);
        } else {
            this.showDeleteConfirm(async () => await db.deleteReminder(id));
        }
    }

    async renderReport() {
        const report = await db.getYearlyReport();
        const container = document.getElementById('reportSummary');

        container.innerHTML = `
            <div class="report-year">Laporan ${report.year}</div>
            <div class="report-grid">
                <div class="report-item">
                    <span class="report-label">Total Pemasukan</span>
                    <span class="report-value income">${this.formatCurrency(report.income)}</span>
                </div>
                <div class="report-item">
                    <span class="report-label">Total Pengeluaran</span>
                    <span class="report-value expense">${this.formatCurrency(report.expense)}</span>
                </div>
                <div class="report-item">
                    <span class="report-label">Sisa Saldo</span>
                    <span class="report-value ${report.balance >= 0 ? 'income' : 'expense'}">${this.formatCurrency(report.balance)}</span>
                </div>
                <div class="report-item">
                    <span class="report-label">Transaksi</span>
                    <span class="report-value">${report.transactionCount}x</span>
                </div>
            </div>
            <div class="report-breakdown">
                <div class="breakdown-item">
                    <span>🎯 Kebutuhan</span>
                    <span>${this.formatCurrency(report.needs)}</span>
                </div>
                <div class="breakdown-item">
                    <span>💫 Keinginan</span>
                    <span>${this.formatCurrency(report.wants)}</span>
                </div>
            </div>
        `;
    }

    async exportData() {
        try {
            const csv = await db.exportToCSV();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `keuangan_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Gagal mengexport data');
        }
    }
}

// Initialize app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
