// ============================================================================
// TO-DO LIST APP - VANILLA JAVASCRIPT
// ============================================================================

// State Management
const app = {
    tasks: [],
    notificationsEnabled: false,
    editingTaskId: null,
    checkInterval: null,

    // Initialize the app
    init() {
        this.loadTasks();
        this.loadTheme();
        this.setupEventListeners();
        this.setDefaultDate();
        this.checkNotificationPermission();
        this.startNotificationCheck();
        this.render();
    },

    // ========================================================================
    // SETUP & EVENT LISTENERS
    // ========================================================================

    setupEventListeners() {
        // Form submission
        const taskForm = document.getElementById('taskForm');
        taskForm.addEventListener('submit', (e) => this.handleAddTask(e));

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => this.toggleTheme());

        // Notification prompt
        const enableBtn = document.getElementById('enableNotifications');
        const skipBtn = document.getElementById('skipNotifications');
        enableBtn.addEventListener('click', () => this.requestNotificationPermission());
        skipBtn.addEventListener('click', () => this.hideNotificationPrompt());

        // Sort
        const sortSelect = document.getElementById('sortBy');
        sortSelect.addEventListener('change', (e) => this.sortTasks(e.target.value));

        // Edit modal
        const closeBtn = document.querySelector('.close');
        const cancelEditBtn = document.getElementById('cancelEdit');
        const editForm = document.getElementById('editForm');
        
        closeBtn.addEventListener('click', () => this.closeEditModal());
        cancelEditBtn.addEventListener('click', () => this.closeEditModal());
        editForm.addEventListener('submit', (e) => this.handleEditTask(e));
        
        // Close modal when clicking outside
        const modal = document.getElementById('editModal');
        window.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditModal();
        });
    },

    setDefaultDate() {
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('taskDate').value = dateString;
    },

    // ========================================================================
    // THEME MANAGEMENT
    // ========================================================================

    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            document.getElementById('themeToggle').textContent = '🌙';
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            document.getElementById('themeToggle').textContent = '☀️';
        }
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const html = document.documentElement;
        
        if (savedTheme === 'dark') {
            html.classList.add('dark');
            document.getElementById('themeToggle').textContent = '☀️';
        } else {
            html.classList.remove('dark');
            document.getElementById('themeToggle').textContent = '🌙';
        }
    },

    // ========================================================================
    // TASK MANAGEMENT
    // ========================================================================

    handleAddTask(e) {
        e.preventDefault();

        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const date = document.getElementById('taskDate').value;
        const time = document.getElementById('taskTime').value;

        if (!title || !date || !time) {
            alert('Please fill in all required fields');
            return;
        }

        const task = {
            id: Date.now(),
            title,
            description,
            date,
            time,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        this.tasks.push(task);
        this.saveTasks();
        this.render();

        // Reset form
        document.getElementById('taskForm').reset();
        this.setDefaultDate();
    },

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.render();
        }
    },

    toggleTaskCompletion(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
        }
    },

    openEditModal(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        this.editingTaskId = id;
        document.getElementById('editTitle').value = task.title;
        document.getElementById('editDescription').value = task.description;
        document.getElementById('editDate').value = task.date;
        document.getElementById('editTime').value = task.time;

        document.getElementById('editModal').classList.add('open');
    },

    closeEditModal() {
        document.getElementById('editModal').classList.remove('open');
        this.editingTaskId = null;
    },

    handleEditTask(e) {
        e.preventDefault();

        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;

        task.title = document.getElementById('editTitle').value.trim();
        task.description = document.getElementById('editDescription').value.trim();
        task.date = document.getElementById('editDate').value;
        task.time = document.getElementById('editTime').value;

        this.saveTasks();
        this.closeEditModal();
        this.render();
    },

    sortTasks(sortBy) {
        if (sortBy === 'date') {
            this.tasks.sort((a, b) => {
                const aDateTime = new Date(`${a.date}T${a.time}`);
                const bDateTime = new Date(`${b.date}T${b.time}`);
                return aDateTime - bDateTime;
            });
        } else if (sortBy === 'title') {
            this.tasks.sort((a, b) => a.title.localeCompare(b.title));
        }
        this.render();
    },

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    checkNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.notificationsEnabled = true;
                this.hideNotificationPrompt();
            } else if (Notification.permission === 'denied') {
                this.hideNotificationPrompt();
            } else {
                // default state - show prompt
                this.showNotificationPrompt();
            }
        }
    },

    showNotificationPrompt() {
        const prompt = document.getElementById('notificationPrompt');
        if (prompt) {
            prompt.classList.remove('hidden');
        }
    },

    hideNotificationPrompt() {
        const prompt = document.getElementById('notificationPrompt');
        if (prompt) {
            prompt.classList.add('hidden');
        }
    },

    requestNotificationPermission() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.notificationsEnabled = true;
                    this.showNotification('✓ Notifications Enabled', 'You will receive alerts for upcoming tasks');
                }
                this.hideNotificationPrompt();
            });
        }
    },

    startNotificationCheck() {
        // Check for due tasks every minute
        this.checkInterval = setInterval(() => {
            this.checkDueTasks();
        }, 60000); // Check every minute
        
        // Also check immediately
        this.checkDueTasks();
    },

    checkDueTasks() {
        if (!this.notificationsEnabled) return;

        const now = new Date();
        const nowString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

        this.tasks.forEach(task => {
            if (task.completed) return;

            const taskDateTime = `${task.date}T${task.time}`;
            
            // Check if task time matches current time (within 1-minute window)
            if (taskDateTime === nowString) {
                this.showNotification(`Task Due: ${task.title}`, task.description || 'Your task is due now!');
                this.playNotificationSound();
            }
        });
    },

    showNotification(title, body = '') {
        if (!this.notificationsEnabled) return;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '✓',
                badge: '📋',
                tag: 'todo-notification',
                requireInteraction: false,
            });
        }
    },

    playNotificationSound() {
        try {
            const audio = document.getElementById('notificationSound');
            // Create a simple beep sound programmatically
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Fallback if audio context fails
            console.log('[v0] Notification sound not available');
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    render() {
        this.renderTaskList();
    },

    renderTaskList() {
        const taskList = document.getElementById('taskList');

        if (this.tasks.length === 0) {
            taskList.innerHTML = '<p class="empty-state">No tasks yet. Add one above!</p>';
            return;
        }

        taskList.innerHTML = this.tasks
            .map(task => this.createTaskElement(task))
            .join('');

        // Add event listeners to task elements
        this.tasks.forEach(task => {
            const checkbox = document.querySelector(`[data-task-id="${task.id}"] .task-checkbox`);
            const editBtn = document.querySelector(`[data-task-id="${task.id}"] .edit-btn`);
            const deleteBtn = document.querySelector(`[data-task-id="${task.id}"] .delete-btn`);

            if (checkbox) {
                checkbox.addEventListener('change', () => this.toggleTaskCompletion(task.id));
            }
            if (editBtn) {
                editBtn.addEventListener('click', () => this.openEditModal(task.id));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
            }
        });
    },

    createTaskElement(task) {
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const now = new Date();
        const timeDiff = taskDateTime - now;
        const hoursUntilDue = timeDiff / (1000 * 60 * 60);

        let statusClass = '';
        let timeLabel = this.formatDateTime(task.date, task.time);

        if (timeDiff < 0) {
            statusClass = 'overdue';
            timeLabel += ' (OVERDUE)';
        } else if (hoursUntilDue <= 24) {
            statusClass = 'due-soon';
            timeLabel += ' (DUE SOON)';
        }

        return `
            <div class="task-card ${statusClass} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <input 
                            type="checkbox" 
                            class="task-checkbox" 
                            ${task.completed ? 'checked' : ''}
                            aria-label="Mark task as complete"
                        >
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                    </div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-datetime ${statusClass}">
                        📅 ${timeLabel}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn edit-btn" title="Edit task" aria-label="Edit task">✎</button>
                    <button class="task-action-btn delete delete-btn" title="Delete task" aria-label="Delete task">✕</button>
                </div>
            </div>
        `;
    },

    formatDateTime(date, time) {
        const dateObj = new Date(`${date}T${time}`);
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return dateObj.toLocaleDateString('en-US', options);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ========================================================================
    // STORAGE
    // ========================================================================

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    },

    loadTasks() {
        try {
            const saved = localStorage.getItem('tasks');
            this.tasks = saved ? JSON.parse(saved) : [];
            // Sort by date by default
            this.sortTasks('date');
        } catch (e) {
            console.error('Error loading tasks:', e);
            this.tasks = [];
        }
    },
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app.checkInterval) {
        clearInterval(app.checkInterval);
    }
});
