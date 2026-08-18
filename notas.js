document.addEventListener("DOMContentLoaded", () => {
    const vaultInput = document.getElementById('vault-input');
    const saveStatus = document.getElementById('save-status');
    const clearBtn = document.getElementById('clear-btn');

    // Cargar datos previos
    const savedNotes = localStorage.getItem('kairi_vault_notes');
    if (savedNotes) {
        vaultInput.value = savedNotes;
    }

    let saveTimeout;

    // Auto-guardado al escribir
    vaultInput.addEventListener('input', () => {
        saveStatus.style.color = '#ffcc00';
        saveStatus.innerText = 'Guardando cambios...';
        
        clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(() => {
            localStorage.setItem('kairi_vault_notes', vaultInput.value);
            saveStatus.style.color = '#00ff88';
            saveStatus.innerText = 'Todos los cambios guardados';
            
            setTimeout(() => {
                saveStatus.innerText = 'Sistema de auto-guardado ACTIVO';
            }, 2000);
        }, 800); // Guardar 800ms después de dejar de escribir
    });

    // Purgar datos
    clearBtn.addEventListener('click', () => {
        if (confirm("⚠️ ADVERTENCIA: ¿Estás seguro de que deseas eliminar permanentemente todas las notas de la Bóveda Local?")) {
            localStorage.removeItem('kairi_vault_notes');
            vaultInput.value = '';
            saveStatus.style.color = '#ff3333';
            saveStatus.innerText = 'SISTEMA PURGADO';
            
            setTimeout(() => {
                saveStatus.style.color = '#00ff88';
                saveStatus.innerText = 'Sistema de auto-guardado ACTIVO';
            }, 3000);
        }
    });
});
