// App State
let appState = {
    currentShift: null,
    inventory: {
        bigBuns: 0,
        smallBuns: 0,
        tacos: 0,
        ribs: 0
    },
    sales: {
        tacos: 0,
        burgers: 0,
        miniburgers: 0,
        ribs: 0
    },
    writeOffs: {
        bigBuns: 0,
        smallBuns: 0,
        tacos: 0,
        ribs: 0
    },
    freeMeals: {
        bigBuns: 0,
        smallBuns: 0,
        tacos: 0,
        ribs: 0
    },
    ribsLossPercent: 15,
    shiftHistory: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadStoredData();
    updateDisplay();
    checkOnlineStatus();
});

// Initialize App
function initializeApp() {
    // Set current date
    document.getElementById('shiftDate').value = new Date().toISOString().split('T')[0];
    
    // Theme toggle
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle();
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Shift management
    document.getElementById('startShift').addEventListener('click', startShift);
    document.getElementById('saveInitialInventory').addEventListener('click', saveInitialInventory);
    document.getElementById('endShift').addEventListener('click', endShift);

    // Ribs loss adjustment
    document.getElementById('ribsLoss').addEventListener('input', updateRibsLoss);
    document.getElementById('applyRibsLoss').addEventListener('click', applyRibsLoss);

    // Write-offs and free meals
    document.getElementById('showWriteOffs').addEventListener('click', () => showModal('writeOffsModal'));
    document.getElementById('showFreeMeals').addEventListener('click', () => showModal('freeMealsModal'));
    document.getElementById('saveWriteOffs').addEventListener('click', saveWriteOffs);
    document.getElementById('saveFreeMeals').addEventListener('click', saveFreeMeals);
    document.getElementById('cancelWriteOffs').addEventListener('click', () => hideModal('writeOffsModal'));
    document.getElementById('cancelFreeMeals').addEventListener('click', () => hideModal('freeMealsModal'));

    // Sales
    setupSalesControls();
    setupQuantityControls();

    // Online/offline status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

// Tab Switching
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    // Update reports if switching to reports tab
    if (tabName === 'reports') {
        updateReports();
    }
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle();
}

function updateThemeToggle() {
    const theme = document.documentElement.getAttribute('data-theme');
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Shift Management
function startShift() {
    const date = document.getElementById('shiftDate').value;
    const location = document.getElementById('location').value;
    const employee1 = document.getElementById('employee1').value;
    const employee2 = document.getElementById('employee2').value;
    const employee3 = document.getElementById('employee3').value;
    const startCash = parseFloat(document.getElementById('startCash').value) || 0;

    if (!date || !location || !employee1 || !employee2) {
        showMessage('Vyplňte všechna povinná pole', 'error');
        return;
    }

    appState.currentShift = {
        id: Date.now(),
        date,
        location,
        employees: [employee1, employee2, employee3].filter(e => e),
        startCash,
        startTime: new Date().toISOString(),
        endTime: null,
        endCash: 0
    };

    document.getElementById('initialInventory').style.display = 'block';
    document.getElementById('startShift').disabled = true;
    updateShiftStatus();
    showMessage('Směna byla započata', 'success');
    saveData();
}

function saveInitialInventory() {
    const bigBuns = parseInt(document.getElementById('initBigBuns').value) || 0;
    const smallBuns = parseInt(document.getElementById('initSmallBuns').value) || 0;
    const tacos = parseInt(document.getElementById('initTacos').value) || 0;
    const ribs = parseFloat(document.getElementById('initRibs').value) || 0;

    appState.inventory = { bigBuns, smallBuns, tacos, ribs };
    
    // Reset sales and write-offs for new shift
    appState.sales = { tacos: 0, burgers: 0, miniburgers: 0, ribs: 0 };
    appState.writeOffs = { bigBuns: 0, smallBuns: 0, tacos: 0, ribs: 0 };
    appState.freeMeals = { bigBuns: 0, smallBuns: 0, tacos: 0, ribs: 0 };

    updateDisplay();
    showMessage('Počáteční stavy byly uloženy', 'success');
    saveData();
}

function endShift() {
    if (!appState.currentShift) {
        showMessage('Žádná aktivní směna', 'error');
        return;
    }

    const endCash = parseFloat(document.getElementById('endCash').value) || 0;
    
    appState.currentShift.endTime = new Date().toISOString();
    appState.currentShift.endCash = endCash;
    appState.currentShift.finalInventory = { ...appState.inventory };
    appState.currentShift.sales = { ...appState.sales };
    appState.currentShift.writeOffs = { ...appState.writeOffs };
    appState.currentShift.freeMeals = { ...appState.freeMeals };

    // Add to history
    appState.shiftHistory.unshift(appState.currentShift);
    
    // Reset current shift
    appState.currentShift = null;
    
    // Reset form
    document.getElementById('startShift').disabled = false;
    document.getElementById('initialInventory').style.display = 'none';
    document.querySelectorAll('input').forEach(input => {
        if (input.type !== 'date') input.value = '';
    });

    updateShiftStatus();
    showMessage('Směna byla ukončena', 'success');
    saveData();
}

// Inventory Management
function updateRibsLoss() {
    const lossPercent = document.getElementById('ribsLoss').value;
    appState.ribsLossPercent = parseFloat(lossPercent);
    document.getElementById('ribsLossDisplay').textContent = lossPercent;
    updateAdjustedRibs();
}

function updateAdjustedRibs() {
    const originalRibs = appState.inventory.ribs;
    const lossPercent = appState.ribsLossPercent;
    const adjustedRibs = originalRibs * (1 - lossPercent / 100);
    document.getElementById('adjustedRibs').textContent = adjustedRibs.toFixed(1) + ' kg';
}

function applyRibsLoss() {
    const originalRibs = appState.inventory.ribs;
    const lossPercent = appState.ribsLossPercent;
    appState.inventory.ribs = originalRibs * (1 - lossPercent / 100);
    
    updateDisplay();
    showMessage(`Aplikován ${lossPercent}% úbytek váhy žebra`, 'success');
    saveData();
}

// Modal Management
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Clear form inputs
    document.querySelectorAll(`#${modalId} input`).forEach(input => input.value = '');
}

function saveWriteOffs() {
    const bigBuns = parseInt(document.getElementById('writeOffBigBuns').value) || 0;
    const smallBuns = parseInt(document.getElementById('writeOffSmallBuns').value) || 0;
    const tacos = parseInt(document.getElementById('writeOffTacos').value) || 0;
    const ribs = parseFloat(document.getElementById('writeOffRibs').value) || 0;

    // Update write-offs
    appState.writeOffs.bigBuns += bigBuns;
    appState.writeOffs.smallBuns += smallBuns;
    appState.writeOffs.tacos += tacos;
    appState.writeOffs.ribs += ribs;

    // Update inventory
    appState.inventory.bigBuns = Math.max(0, appState.inventory.bigBuns - bigBuns);
    appState.inventory.smallBuns = Math.max(0, appState.inventory.smallBuns - smallBuns);
    appState.inventory.tacos = Math.max(0, appState.inventory.tacos - tacos);
    appState.inventory.ribs = Math.max(0, appState.inventory.ribs - ribs);

    hideModal('writeOffsModal');
    updateDisplay();
    showMessage('Odpisy byly zaznamenány', 'success');
    saveData();
}

function saveFreeMeals() {
    const bigBuns = parseInt(document.getElementById('freeMealBigBuns').value) || 0;
    const smallBuns = parseInt(document.getElementById('freeMealSmallBuns').value) || 0;
    const tacos = parseInt(document.getElementById('freeMealTacos').value) || 0;
    const ribs = parseFloat(document.getElementById('freeMealRibs').value) || 0;

    // Update free meals
    appState.freeMeals.bigBuns += bigBuns;
    appState.freeMeals.smallBuns += smallBuns;
    appState.freeMeals.tacos += tacos;
    appState.freeMeals.ribs += ribs;

    // Update inventory
    appState.inventory.bigBuns = Math.max(0, appState.inventory.bigBuns - bigBuns);
    appState.inventory.smallBuns = Math.max(0, appState.inventory.smallBuns - smallBuns);
    appState.inventory.tacos = Math.max(0, appState.inventory.tacos - tacos);
    appState.inventory.ribs = Math.max(0, appState.inventory.ribs - ribs);

    hideModal('freeMealsModal');
    updateDisplay();
    showMessage('Svačiny zdarma byly zaznamenány', 'success');
    saveData();
}

// Sales Management
function setupSalesControls() {
    document.querySelectorAll('.btn-sale').forEach(btn => {
        btn.addEventListener('click', () => processSale(btn.dataset.item));
    });
}

function setupQuantityControls() {
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.dataset.item;
            const action = btn.dataset.action;
            const qtyElement = document.getElementById(`${item}Qty`);
            let currentQty = parseInt(qtyElement.textContent);

            if (action === 'increase') {
                currentQty++;
            } else if (action === 'decrease' && currentQty > 1) {
                currentQty--;
            }

            qtyElement.textContent = currentQty;
        });
    });
}

function processSale(item) {
    if (!appState.currentShift) {
        showMessage('Nejprve začněte směnu', 'error');
        return;
    }

    let quantity, canProcess = true, message = '';

    switch (item) {
        case 'tacos':
            quantity = parseInt(document.getElementById('tacosQty').textContent);
            const requiredTacos = quantity * 3; // 1 tacos = 3 placky
            if (appState.inventory.tacos >= requiredTacos) {
                appState.inventory.tacos -= requiredTacos;
                appState.sales.tacos += quantity;
                message = `Prodáno ${quantity}x tacos`;
            } else {
                canProcess = false;
                message = 'Nedostatek tacos placek';
            }
            break;

        case 'burger':
            quantity = parseInt(document.getElementById('burgerQty').textContent);
            if (appState.inventory.bigBuns >= quantity) {
                appState.inventory.bigBuns -= quantity;
                appState.sales.burgers += quantity;
                message = `Prodáno ${quantity}x burger`;
            } else {
                canProcess = false;
                message = 'Nedostatek velkých bulek';
            }
            break;

        case 'miniburger':
            quantity = parseInt(document.getElementById('miniburgerQty').textContent);
            const requiredSmallBuns = quantity * 3; // 1 miniburger = 3 malé bulky
            if (appState.inventory.smallBuns >= requiredSmallBuns) {
                appState.inventory.smallBuns -= requiredSmallBuns;
                appState.sales.miniburgers += quantity;
                message = `Prodáno ${quantity}x miniburger`;
            } else {
                canProcess = false;
                message = 'Nedostatek malých bulek';
            }
            break;

        case 'ribs':
            const weight = parseFloat(document.getElementById('ribsWeight').value);
            if (!weight || weight <= 0) {
                showMessage('Zadejte platnou váhu žebra', 'error');
                return;
            }
            if (appState.inventory.ribs >= weight) {
                appState.inventory.ribs -= weight;
                appState.sales.ribs += weight;
                message = `Prodáno ${weight} kg žebra`;
                document.getElementById('ribsWeight').value = '';
            } else {
                canProcess = false;
                message = 'Nedostatek żebra';
            }
            break;
    }

    if (canProcess) {
        updateDisplay();
        showMessage(message, 'success');
        saveData();
    } else {
        showMessage(message, 'error');
    }
}

// Display Updates
function updateDisplay() {
    // Update stock display
    document.getElementById('stockBigBuns').textContent = appState.inventory.bigBuns;
    document.getElementById('stockSmallBuns').textContent = appState.inventory.smallBuns;
    document.getElementById('stockTacos').textContent = appState.inventory.tacos;
    document.getElementById('stockRibs').textContent = appState.inventory.ribs.toFixed(1);
    
    // Update adjusted ribs
    updateAdjustedRibs();
}

function updateShiftStatus() {
    const statusElement = document.getElementById('shiftStatus');
    if (appState.currentShift) {
        statusElement.textContent = `Aktivní směna: ${appState.currentShift.location}`;
    } else {
        statusElement.textContent = 'Žádná aktivní směna';
    }
}

// Reports and Charts
function updateReports() {
    updateShiftHistory();
    createSalesChart();
    createWriteOffsChart();
}

function updateShiftHistory() {
    const historyContainer = document.getElementById('shiftHistory');
    historyContainer.innerHTML = '';

    if (appState.shiftHistory.length === 0) {
        historyContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Žádná historie směn</p>';
        return;
    }

    appState.shiftHistory.forEach(shift => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const startDate = new Date(shift.startTime).toLocaleDateString('cs-CZ');
        const endDate = shift.endTime ? new Date(shift.endTime).toLocaleDateString('cs-CZ') : 'Neukončeno';
        
        historyItem.innerHTML = `
            <h4>${startDate} - ${shift.location}</h4>
            <p><strong>Zaměstnanci:</strong> ${shift.employees.join(', ')}</p>
            <p><strong>Prodeje:</strong> ${shift.sales?.tacos || 0} tacos, ${shift.sales?.burgers || 0} burgerů, ${shift.sales?.miniburgers || 0} miniburgerů, ${(shift.sales?.ribs || 0).toFixed(1)} kg žebra</p>
            <p><strong>Kasa:</strong> ${shift.startCash} Kč → ${shift.endCash} Kč</p>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}

function createSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (window.salesChart) {
        window.salesChart.destroy();
    }

    const data = {
        labels: ['Tacos', 'Burgery', 'Miniburgery', 'Žebra (kg)'],
        datasets: [{
            label: 'Prodeje',
            data: [
                appState.sales.tacos,
                appState.sales.burgers,
                appState.sales.miniburgers,
                appState.sales.ribs
            ],
            backgroundColor: [
                '#FF6B35',
                '#F7931E',
                '#FFD23F',
                '#4CAF50'
            ],
            borderColor: [
                '#FF6B35',
                '#F7931E',
                '#FFD23F',
                '#4CAF50'
            ],
            borderWidth: 2,
            borderRadius: 8
        }, {
            label: 'Odpisy',
            data: [
                appState.writeOffs.tacos,
                appState.writeOffs.bigBuns,
                appState.writeOffs.smallBuns,
                appState.writeOffs.ribs
            ],
            backgroundColor: [
                'rgba(244, 67, 54, 0.7)',
                'rgba(244, 67, 54, 0.7)',
                'rgba(244, 67, 54, 0.7)',
                'rgba(244, 67, 54, 0.7)'
            ],
            borderColor: '#F44336',
            borderWidth: 2,
            borderRadius: 8
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: '#FF6B35',
                borderWidth: 1,
                cornerRadius: 8
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0,0,0,0.1)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    };

    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

function createWriteOffsChart() {
    const ctx = document.getElementById('writeOffsChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (window.writeOffsChart) {
        window.writeOffsChart.destroy();
    }

    const total = appState.writeOffs.bigBuns + appState.writeOffs.smallBuns + 
                 appState.writeOffs.tacos + appState.writeOffs.ribs;

    if (total === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    const data = {
        labels: ['Velké bulky', 'Malé bulky', 'Tacos', 'Žebra (kg)'],
        datasets: [{
            data: [
                appState.writeOffs.bigBuns,
                appState.writeOffs.smallBuns,
                appState.writeOffs.tacos,
                appState.writeOffs.ribs
            ],
            backgroundColor: [
                '#FF6B35',
                '#F7931E',
                '#FFD23F',
                '#F44336'
            ],
            borderColor: '#FFFFFF',
            borderWidth: 3
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: '#FF6B35',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        const value = context.parsed;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    };

    window.writeOffsChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: options
    });
}

// Data Management
function saveData() {
    try {
        localStorage.setItem('foodTruckData', JSON.stringify(appState));
    } catch (error) {
        console.error('Error saving data:', error);
        showMessage('Chyba při ukládání dat', 'error');
    }
}

function loadStoredData() {
    try {
        const storedData = localStorage.getItem('foodTruckData');
        if (storedData) {
            appState = { ...appState, ...JSON.parse(storedData) };
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Chyba při načítání dat', 'warning');
    }
}

// Export Data
function exportData() {
    const csvData = generateCSV();
    downloadCSV(csvData, `food-truck-data-${new Date().toISOString().split('T')[0]}.csv`);
    showMessage('Data byla exportována', 'success');
}

function generateCSV() {
    let csv = 'Datum,Místo,Zaměstnanci,Prodeje Tacos,Prodeje Burgery,Prodeje Miniburgery,Prodeje Žebra (kg),Odpisy Velké bulky,Odpisy Malé bulky,Odpisy Tacos,Odpisy Žebra (kg),Počáteční kasa,Konečná kasa\n';
    
    appState.shiftHistory.forEach(shift => {
        csv += `${shift.date},"${shift.location}","${shift.employees.join(', ')}",${shift.sales?.tacos || 0},${shift.sales?.burgers || 0},${shift.sales?.miniburgers || 0},${(shift.sales?.ribs || 0).toFixed(1)},${shift.writeOffs?.bigBuns || 0},${shift.writeOffs?.smallBuns || 0},${shift.writeOffs?.tacos || 0},${(shift.writeOffs?.ribs || 0).toFixed(1)},${shift.startCash},${shift.endCash}\n`;
    });
    
    return csv;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Online/Offline Status
function checkOnlineStatus() {
    updateOnlineStatus();
}

function updateOnlineStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (navigator.onLine) {
        statusElement.textContent = '🟢 Online';
        statusElement.style.color = 'var(--success-color)';
        syncData();
    } else {
        statusElement.textContent = '🔴 Offline';
        statusElement.style.color = 'var(--error-color)';
    }
}

// Data Synchronization (placeholder for future implementation)
function syncData() {
    // This would sync data with a server when online
    console.log('Data sync would happen here');
}

// Utility Functions
function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    // Find the first card in the active tab
    const activeTab = document.querySelector('.tab-content.active');
    const firstCard = activeTab?.querySelector('.card');
    
    if (firstCard) {
        firstCard.insertBefore(messageDiv, firstCard.firstChild);
        
        // Auto-remove message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

