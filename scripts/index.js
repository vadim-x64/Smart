let todos = [];
let currentFilter = 'all';
const FIREBASE_URL = "https://smartapp-2d7fa-default-rtdb.firebaseio.com/";
let isOnline = true;
const todoList = document.getElementById('todo-list');
const itemCountSpan = document.getElementById('item-count');
const uncheckedCountSpan = document.getElementById('unchecked-count');
const completedCountSpan = document.getElementById('completed-count');
const progressBar = document.getElementById('progress-bar');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorAlert = document.getElementById('errorAlert');
const firebaseConfigForm = document.getElementById('firebaseConfigForm');
const mainApp = document.getElementById('mainApp');

async function connectToFirebase() {
    try {
        showLoading('Підключення до Firebase...');
        const response = await fetch(`${FIREBASE_URL}/test.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        mainApp.style.display = 'block';
        await loadTodosFromFirebase();
        showToast('Успішно підключено до Firebase!', 'success');
    } catch (error) {
        console.error('Firebase connection error:', error);
        showError('Помилка підключення до Firebase: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function addTodo(todoData) {
    try {
        showLoading('Додавання справи...');
        const response = await fetch(`${FIREBASE_URL}/todos.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todoData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.name;
    } catch (error) {
        console.error('Error adding todo:', error);
        showError('Помилка при додаванні справи: ' + error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

async function getTodos() {
    try {
        showLoading('Завантаження справ...');
        const response = await fetch(`${FIREBASE_URL}/todos.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data) {
            return [];
        }
        const todosArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        return todosArray;
    } catch (error) {
        console.error('Error getting todos:', error);
        showError('Помилка при завантаженні справ: ' + error.message);
        return [];
    } finally {
        hideLoading();
    }
}

async function updateTodoInFirebase(id, todoData) {
    try {
        showLoading('Оновлення справи...');
        const response = await fetch(`${FIREBASE_URL}/todos/${id}.json`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(todoData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating todo:', error);
        showError('Помилка при оновленні справи: ' + error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

async function deleteTodoFromFirebase(id) {
    try {
        showLoading('Видалення справи...');
        const response = await fetch(`${FIREBASE_URL}/todos/${id}.json`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('Error deleting todo:', error);
        showError('Помилка при видаленні справи: ' + error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

function showLoading(message = 'Завантаження...') {
    document.getElementById('loadingText').textContent = message;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    errorAlert.style.display = 'none';
}

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
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

async function loadTodosFromFirebase() {
    try {
        todos = await getTodos();
        render();
    } catch (error) {
        console.error('Error loading todos:', error);
        showError('Помилка завантаження справ');
    }
}

async function refreshData() {
    await loadTodosFromFirebase();
    showToast('Дані оновлено!', 'info');
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
        const priorityOrder = {high: 0, medium: 1, low: 2};
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
    let buttonId;
    switch(filter) {
        case 'all':
            buttonId = 'showAll';
            break;
        case 'active':
            buttonId = 'showActive';
            break;
        case 'completed':
            buttonId = 'showCompleted';
            break;
    }
    document.getElementById(buttonId).classList.add('active');
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

async function saveNewTodo() {
    const todoText = document.getElementById('todoText').value.trim();
    if (!todoText) {
        shakeTodoText();
        return;
    }
    const todoDescription = document.getElementById('todoDescription').value.trim();
    const todoPriority = document.getElementById('todoPriority').value;
    const todoDeadline = document.getElementById('todoDeadline').value;
    const newTodo = {
        text: todoText,
        description: todoDescription,
        completed: false,
        priority: todoPriority,
        createdAt: new Date().toISOString(),
        deadline: todoDeadline ? new Date(todoDeadline).toISOString() : null
    };
    try {
        const firebaseId = await addTodo(newTodo);
        newTodo.id = firebaseId;
        todos.unshift(newTodo);
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTodoModal'));
        modal.hide();
        document.getElementById('newTodoForm').reset();
        applyFilter('all');
        showToast('Справу успішно додано!', 'success');
    } catch (error) {
        console.error('Error saving todo:', error);
    }
}

async function checkTodo(id) {
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex !== -1) {
        const newCompletedStatus = !todos[todoIndex].completed;
        try {
            await updateTodoInFirebase(id, { completed: newCompletedStatus });
            todos[todoIndex].completed = newCompletedStatus;
            const listItem = document.querySelector(`li[data-id="${id}"]`);
            const todoText = listItem.querySelector('.todo-text');
            if (todos[todoIndex].completed) {
                todoText.classList.add('text-completed');
                listItem.classList.add('bg-light');
            } else {
                todoText.classList.remove('text-completed');
                listItem.classList.remove('bg-light');
            }
            updateStats();
        } catch (error) {
            const checkbox = document.getElementById(`check-${id}`);
            checkbox.checked = !newCompletedStatus;
        }
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
        const modal = new bootstrap.Modal(document.getElementById('editTodoModal'));
        modal.show();
    }
}

async function updateTodo() {
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
        const updatedData = {
            text: todoText,
            description: todoDescription,
            priority: todoPriority,
            deadline: todoDeadline ? new Date(todoDeadline).toISOString() : null
        };
        try {
            await updateTodoInFirebase(todoId, updatedData);
            todos[todoIndex] = {
                ...todos[todoIndex],
                ...updatedData
            };
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTodoModal'));
            modal.hide();
            render();
            showToast('Справу успішно оновлено!', 'info');
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    }
}

function deleteTodoModal(id) {
    document.getElementById('deleteTodoId').value = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteTodoModal'));
    modal.show();
}

async function confirmDeleteTodo() {
    const todoId = document.getElementById('deleteTodoId').value;
    const listItem = document.querySelector(`li[data-id="${todoId}"]`);
    try {
        await deleteTodoFromFirebase(todoId);
        if (listItem) {
            listItem.classList.add('slide-fade-out');
            setTimeout(() => {
                todos = todos.filter(todo => todo.id !== todoId);
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal'));
                modal.hide();
                render();
                showToast('Справу успішно видалено!', 'danger');
            }, 300);
        } else {
            todos = todos.filter(todo => todo.id !== todoId);
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal'));
            modal.hide();
            render();
            showToast('Справу успішно видалено!', 'danger');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteTodoModal'));
        modal.hide();
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
        const modal = new bootstrap.Modal(document.getElementById('viewTodoModal'));
        modal.show();
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

async function clearCompleted() {
    const completedTodos = todos.filter(todo => todo.completed);
    if (completedTodos.length > 0) {
        const clearCompletedModal = new bootstrap.Modal(document.getElementById('clearCompletedModal'));
        clearCompletedModal.show();
    } else {
        showToast('Немає виконаних справ для видалення', 'warning');
    }
}

async function executeClearCompleted() {
    const completedTodos = todos.filter(todo => todo.completed);
    try {
        showLoading('Видалення виконаних справ...');
        await Promise.all(completedTodos.map(todo => deleteTodoFromFirebase(todo.id)));
        todos = todos.filter(todo => !todo.completed);
        render();
        showToast('Виконані справи видалено!', 'info');
    } catch (error) {
        console.error('Error clearing completed todos:', error);
        showError('Помилка при видаленні виконаних справ');
    } finally {
        hideLoading();
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('clearCompletedModal'));
        if (modalInstance) {
            modalInstance.hide();
        }
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
        document.getElementById('toggleTheme').innerHTML = '<i class="fas fa-sun me-2"></i>Світла тема';
    } else {
        themeIcon.className = 'fas fa-moon me-2';
        document.getElementById('toggleTheme').innerHTML = '<i class="fas fa-moon me-2"></i>Темна тема';
    }
}

function loadTheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('toggleTheme').innerHTML = '<i class="fas fa-sun me-2"></i>Світла тема';
    }
}

function exportTodos() {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Справи успішно експортовано!', 'success');
}



document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('importConfirmModal')) {
        document.body.insertAdjacentHTML('beforeend', importConfirmModalHTML);
    }
});

let tempImportedTodos = null;

async function importTodos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return; // [cite: 189]
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsedTodos = JSON.parse(event.target.result);
                if (Array.isArray(parsedTodos)) {
                    tempImportedTodos = parsedTodos;
                    const generalImportConfirmModal = new bootstrap.Modal(document.getElementById('generalImportConfirmModal'));
                    generalImportConfirmModal.show();
                } else {
                    showToast('Помилка: неправильний формат файлу', 'danger');
                }
            } catch (err) {
                hideLoading();
                showToast('Помилка при читанні файлу', 'danger');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
async function proceedWithActualImport() {
    if (!tempImportedTodos) return;
    const importedTodosToProcess = tempImportedTodos;
    tempImportedTodos = null;
    try {
        showLoading('Імпорт справ...');
        let addedCount = 0;
        let updatedCount = 0;
        for (const importedTodo of importedTodosToProcess) {
            const existingTodoIndex = todos.findIndex(todo =>
                todo.text.toLowerCase().trim() === importedTodo.text.toLowerCase().trim()
            );
            if (existingTodoIndex !== -1) {
                const existingTodo = todos[existingTodoIndex];
                const updatedData = {
                    text: importedTodo.text,
                    description: importedTodo.description || '',
                    priority: importedTodo.priority || 'medium',
                    completed: importedTodo.completed || false,
                    deadline: importedTodo.deadline || null
                };
                try {
                    await updateTodoInFirebase(existingTodo.id, updatedData);
                    todos[existingTodoIndex] = {
                        ...existingTodo,
                        ...updatedData
                    };
                    updatedCount++;
                } catch (error) {
                    console.error('Error updating existing todo:', error);
                }
            } else {
                const { id, ...todoData } = importedTodo;
                const newTodoData = {
                    text: todoData.text,
                    description: todoData.description || '',
                    completed: todoData.completed || false,
                    priority: todoData.priority || 'medium',
                    createdAt: todoData.createdAt || new Date().toISOString(),
                    deadline: todoData.deadline || null
                };
                try {
                    const firebaseId = await addTodo(newTodoData);
                    todos.push({ id: firebaseId, ...newTodoData });
                    addedCount++;
                } catch (error) {
                    console.error('Error adding new todo:', error);
                }
            }
        }
        render();
        hideLoading();
        let message = 'Справи успішно імпортовано! ';
        if (addedCount > 0) message += `Додано: ${addedCount}. `;
        if (updatedCount > 0) message += `Оновлено: ${updatedCount}.`;
        showToast(message, 'success');
    } catch (err) {
        hideLoading();
        showToast('Помилка під час імпорту справ.', 'danger');
        console.error("Error during import process:", err);
    } finally {
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('generalImportConfirmModal'));
        if (modalInstance) {
            modalInstance.hide();
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {

    loadTheme();
    connectToFirebase();
    document.getElementById('showAll').addEventListener('click', () => applyFilter('all'));
    document.getElementById('showActive').addEventListener('click', () => applyFilter('active'));
    document.getElementById('showCompleted').addEventListener('click', () => applyFilter('completed'));
    document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
    document.getElementById('clearCompleted').addEventListener('click', clearCompleted);
    document.getElementById('refreshData').addEventListener('click', refreshData);
    document.getElementById('saveTodoBtn').addEventListener('click', saveNewTodo);
    document.getElementById('updateTodoBtn').addEventListener('click', updateTodo);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteTodo);
    document.getElementById('viewEditTodoBtn').addEventListener('click', () => {
        const todoId = document.getElementById('viewTodoModal').getAttribute('data-id');
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewTodoModal'));
        viewModal.hide();
        setTimeout(() => editTodoModal(todoId), 400);
    });
    document.getElementById('todoText').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('saveTodoBtn').click();
        }
    });
    document.getElementById('confirmClearCompletedBtn').addEventListener('click', executeClearCompleted);
    document.getElementById('proceedWithImportBtn').addEventListener('click', proceedWithActualImport);
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
    if (!document.getElementById('importConfirmModal')) {
        document.body.insertAdjacentHTML('beforeend', importConfirmModalHTML);
    }
});

window.connectToFirebase = connectToFirebase;
window.checkTodo = checkTodo;
window.editTodoModal = editTodoModal;
window.deleteTodoModal = deleteTodoModal;
window.viewTodo = viewTodo;
window.hideError = hideError;