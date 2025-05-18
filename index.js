let todos = [];
let currentFilter = 'all';
const todoList = document.getElementById('todo-list');
const itemCountSpan = document.getElementById('item-count');
const uncheckedCountSpan = document.getElementById('unchecked-count');
const completedCountSpan = document.getElementById('completed-count');
const progressBar = document.getElementById('progress-bar');

document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    loadTheme();
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        new bootstrap.Modal(modal);
    });
});

document.getElementById('showAll').addEventListener('click', () => applyFilter('all'));
document.getElementById('showActive').addEventListener('click', () => applyFilter('active'));
document.getElementById('showCompleted').addEventListener('click', () => applyFilter('completed'));
document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
document.getElementById('clearCompleted').addEventListener('click', clearCompleted);
document.getElementById('saveTodoBtn').addEventListener('click', saveNewTodo);
document.getElementById('updateTodoBtn').addEventListener('click', updateTodo);
document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteTodo);
document.getElementById('viewEditTodoBtn').addEventListener('click', () => {
    const todoId = document.getElementById('viewTodoModal').getAttribute('data-id');
    bootstrap.Modal.getInstance(document.getElementById('viewTodoModal')).hide();
    setTimeout(() => editTodoModal(todoId), 400);
});

function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
    } else {
        todos = [];
        saveTodos();
    }
    render();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function formatDate(dateString) {
    if (!dateString) return 'Не встановлено';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateOnly(dateString) {
    if (!dateString) return 'Не встановлено';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getDeadlineStatus(deadline) {
    if (!deadline) return '';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'deadline-close';
    if (diffDays <= 3) return 'deadline-close';
    if (diffDays <= 7) return 'deadline-approaching';
    return 'deadline-safe';
}

function render() {
    updateStats();
    const filteredTodos = filterTodos();
    todoList.innerHTML = '';
    if (filteredTodos.length === 0) {
        todoList.innerHTML = `
            <li class="list-group-item text-center text-muted py-5">
                <i class="fas fa-clipboard-list fa-2x mb-3"></i>
                <p>Список справ порожній</p>
            </li>
        `;
        return;
    }
    filteredTodos.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    filteredTodos.forEach(todo => {
        const listItem = document.createElement('li');
        listItem.className = `list-group-item d-flex align-items-center priority-${todo.priority}`;
        if (todo.completed) {
            listItem.classList.add('bg-light');
        }
        listItem.setAttribute('data-id', todo.id);
        const deadlineClass = !todo.completed && todo.deadline && getDeadlineStatus(todo.deadline) === 'deadline-close' ? 'glow-effect' : '';
        const deadlineStatus = getDeadlineStatus(todo.deadline);
        const deadlineText = todo.deadline ? `<div class="todo-deadline ${deadlineStatus}">
            <i class="far fa-calendar-alt me-1"></i>${formatDateOnly(todo.deadline)}
        </div>` : '';
        listItem.innerHTML = `
            <div class="form-check flex-grow-1 d-flex align-items-center todo-item-content ${deadlineClass}">
                <input class="form-check-input me-2" type="checkbox" id="check-${todo.id}" 
                    ${todo.completed ? 'checked' : ''} onchange="checkTodo('${todo.id}')">
                <div class="flex-grow-1">
                    <label class="form-check-label" for="check-${todo.id}">
                        <span class="todo-text ${todo.completed ? 'text-completed' : ''}">${todo.text}</span>
                    </label>
                    ${deadlineText}
                    <div class="todo-date">
                        <i class="far fa-clock me-1"></i>Створено: ${formatDate(todo.createdAt).split(',')[0]}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="btn btn-sm btn-info action-button" onclick="viewTodo('${todo.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary action-button" onclick="editTodoModal('${todo.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger action-button" onclick="deleteTodoModal('${todo.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        todoList.appendChild(listItem);
        setTimeout(() => {
            listItem.classList.add('slide-fade-in');
        }, 10);
    });
}

function filterTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return [...todos];
    }
}

function applyFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-buttons button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`show${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
    render();
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const uncompleted = total - completed;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    itemCountSpan.textContent = total;
    completedCountSpan.textContent = completed;
    uncheckedCountSpan.textContent = uncompleted;
    progressBar.style.width = `${completionPercentage}%`;
}

function saveNewTodo() {
    const todoText = document.getElementById('todoText').value.trim();
    if (!todoText) {
        shakeTodoText();
        return;
    }
    const todoDescription = document.getElementById('todoDescription').value.trim();
    const todoPriority = document.getElementById('todoPriority').value;
    const todoDeadline = document.getElementById('todoDeadline').value;
    const newTodo = {
        id: Date.now().toString(),
        text: todoText,
        description: todoDescription,
        completed: false,
        priority: todoPriority,
        createdAt: new Date().toISOString(),
        deadline: todoDeadline ? new Date(todoDeadline).toISOString() : null
    };
    todos.unshift(newTodo);
    saveTodos();
    bootstrap.Modal.getInstance(document.getElementById('addTodoModal')).hide();
    document.getElementById('newTodoForm').reset();
    applyFilter('all');
    showToast('Справу успішно додано!', 'success');
}

function checkTodo(id) {
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex !== -1) {
        todos[todoIndex].completed = !todos[todoIndex].completed;
        const listItem = document.querySelector(`li[data-id="${id}"]`);
        const todoText = listItem.querySelector('.todo-text');
        if (todos[todoIndex].completed) {
            todoText.classList.add('text-completed');
            listItem.classList.add('bg-light');
        } else {
            todoText.classList.remove('text-completed');
            listItem.classList.remove('bg-light');
        }
        saveTodos();
        updateStats();
    }
}

function editTodoModal(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        document.getElementById('editTodoId').value = todo.id;
        document.getElementById('editTodoText').value = todo.text;
        document.getElementById('editTodoDescription').value = todo.description || '';
        document.getElementById('editTodoPriority').value = todo.priority;
        if (todo.deadline) {
            const deadlineDate = new Date(todo.deadline);
            const formattedDate = deadlineDate.toISOString().split('T')[0];
            document.getElementById('editTodoDeadline').value = formattedDate;
        } else {
            document.getElementById('editTodoDeadline').value = '';
        }
        bootstrap.Modal.getInstance(document.getElementById('editTodoModal')).show();
    }
}

function updateTodo() {
    const todoId = document.getElementById('editTodoId').value;
    const todoText = document.getElementById('editTodoText').value.trim();
    if (!todoText) {
        const editTodoText = document.getElementById('editTodoText');
        editTodoText.classList.add('shake');
        setTimeout(() => {
            editTodoText.classList.remove('shake');
        }, 500);
        return;
    }
    const todoIndex = todos.findIndex(todo => todo.id === todoId);
    if (todoIndex !== -1) {
        const todoDescription = document.getElementById('editTodoDescription').value.trim();
        const todoPriority = document.getElementById('editTodoPriority').value;
        const todoDeadline = document.getElementById('editTodoDeadline').value;
        todos[todoIndex] = {
            ...todos[todoIndex],
            text: todoText,
            description: todoDescription,
            priority: todoPriority,
            deadline: todoDeadline ? new Date(todoDeadline).toISOString() : null
        };
        saveTodos();
        bootstrap.Modal.getInstance(document.getElementById('editTodoModal')).hide();
        render();
        showToast('Справу успішно оновлено!', 'info');
    }
}

function deleteTodoModal(id) {
    document.getElementById('deleteTodoId').value = id;
    bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal')).show();
}

function confirmDeleteTodo() {
    const todoId = document.getElementById('deleteTodoId').value;
    const listItem = document.querySelector(`li[data-id="${todoId}"]`);
    if (listItem) {
        listItem.classList.add('slide-fade-out');
        setTimeout(() => {
            todos = todos.filter(todo => todo.id !== todoId);
            saveTodos();
            bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal')).hide();
            render();
            showToast('Справу успішно видалено!', 'danger');
        }, 300);
    } else {
        todos = todos.filter(todo => todo.id !== todoId);
        saveTodos();
        bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal')).hide();
        render();
        showToast('Справу успішно видалено!', 'danger');
    }
}

function viewTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        document.getElementById('viewTodoModal').setAttribute('data-id', todo.id);
        document.getElementById('viewTodoTitle').textContent = todo.text;
        const priorityBadge = document.getElementById('viewTodoPriority');
        priorityBadge.textContent = getPriorityText(todo.priority);
        priorityBadge.className = `badge bg-${getPriorityColor(todo.priority)}`;
        const completedBadge = document.getElementById('viewTodoCompleted');
        completedBadge.textContent = todo.completed ? 'Виконано' : 'Не виконано';
        completedBadge.className = `badge ${todo.completed ? 'bg-success' : 'bg-secondary'}`;
        document.getElementById('viewTodoDescription').textContent = todo.description || 'Немає опису';
        document.getElementById('viewTodoCreatedAt').textContent = formatDate(todo.createdAt);
        const deadlineElement = document.getElementById('viewTodoDeadline');
        if (todo.deadline) {
            deadlineElement.textContent = formatDate(todo.deadline);
            deadlineElement.className = getDeadlineStatus(todo.deadline);
        } else {
            deadlineElement.textContent = 'Не встановлено';
            deadlineElement.className = '';
        }
        bootstrap.Modal.getInstance(document.getElementById('viewTodoModal')).show();
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'Високий';
        case 'medium': return 'Середній';
        case 'low': return 'Низький';
        default: return 'Середній';
    }
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'warning';
    }
}

function clearCompleted() {
    if (todos.some(todo => todo.completed)) {
        if (confirm('Ви впевнені, що хочете видалити всі виконані справи?')) {
            todos = todos.filter(todo => !todo.completed);
            saveTodos();
            render();
            showToast('Виконані справи видалено!', 'info');
        }
    } else {
        showToast('Немає виконаних справ для видалення', 'warning');
    }
}

function shakeTodoText() {
    const todoText = document.getElementById('todoText');
    todoText.classList.add('shake');
    setTimeout(() => {
        todoText.classList.remove('shake');
    }, 500);
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    const themeIcon = document.querySelector('#toggleTheme i');
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.className = 'fas fa-sun me-2';
        document.getElementById('toggleTheme').textContent = '';
        document.getElementById('toggleTheme').appendChild(themeIcon);
        document.getElementById('toggleTheme').appendChild(document.createTextNode('Світла тема'));
    } else {
        themeIcon.className = 'fas fa-moon me-2';
        document.getElementById('toggleTheme').textContent = '';
        document.getElementById('toggleTheme').appendChild(themeIcon);
        document.getElementById('toggleTheme').appendChild(document.createTextNode('Темна тема'));
    }
}

function loadTheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        const themeIcon = document.querySelector('#toggleTheme i');
        themeIcon.className = 'fas fa-sun me-2';
        document.getElementById('toggleTheme').textContent = '';
        document.getElementById('toggleTheme').appendChild(themeIcon);
        document.getElementById('toggleTheme').appendChild(document.createTextNode('Світла тема'));
    }
}

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast bg-${type} text-white animate__animated animate__fadeInUp`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    const toastInstance = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    toastInstance.show();
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

document.getElementById('todoText').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('saveTodoBtn').click();
    }
});

function exportTodos() {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Справи успішно експортовано!', 'success');
}

function importTodos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedTodos = JSON.parse(event.target.result);
                if (Array.isArray(importedTodos)) {
                    if (confirm('Імпортувати справи? Це замінить всі поточні справи.')) {
                        todos = importedTodos;
                        saveTodos();
                        render();
                        showToast('Справи успішно імпортовано!', 'success');
                    }
                } else {
                    showToast('Помилка: неправильний формат файлу', 'danger');
                }
            } catch (err) {
                showToast('Помилка при читанні файлу', 'danger');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

document.addEventListener('DOMContentLoaded', () => {
    const controlsContainer = document.querySelector('.stats-card .d-grid');
    if (controlsContainer) {
        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group mt-2';
        btnGroup.setAttribute('role', 'group');
        btnGroup.innerHTML = `
            <button id="exportTodos" class="btn btn-outline-success">
                <i class="fas fa-download me-2"></i>Експорт
            </button>
            <button id="importTodos" class="btn btn-outline-info">
                <i class="fas fa-upload me-2"></i>Імпорт
            </button>
        `;
        controlsContainer.appendChild(btnGroup);
        document.getElementById('exportTodos').addEventListener('click', exportTodos);
        document.getElementById('importTodos').addEventListener('click', importTodos);
    }
});