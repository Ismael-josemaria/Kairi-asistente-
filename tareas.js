document.addEventListener("DOMContentLoaded", () => {
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarDays = document.getElementById('calendar-days');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const eventList = document.getElementById('event-list');
    const newEventText = document.getElementById('new-event-text');
    const btnAddEvent = document.getElementById('btn-add-event');

    let currentDate = new Date();
    let selectedDate = new Date(); // La fecha actualmente seleccionada en la vista
    
    // El formato será: { "YYYY-MM-DD": ["evento 1", "evento 2"] }
    let events = JSON.parse(localStorage.getItem('kairi_events')) || {};

    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    function saveEvents() {
        localStorage.setItem('kairi_events', JSON.stringify(events));
    }

    function formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function renderCalendar() {
        calendarDays.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthYearDisplay.innerText = `${monthNames[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Celdas vacías
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDiv);
        }

        // Celdas con días
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const dateKey = formatDateKey(dateObj);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            if (events[dateKey] && events[dateKey].length > 0) {
                dayDiv.classList.add('has-events');
            }
            if (formatDateKey(selectedDate) === dateKey) {
                dayDiv.classList.add('selected');
            }

            dayDiv.innerHTML = `<div class="day-number">${i}</div>`;
            
            if (events[dateKey] && events[dateKey].length > 0) {
                dayDiv.innerHTML += `<div class="event-indicator"></div>`;
            }

            dayDiv.addEventListener('click', () => {
                selectedDate = dateObj;
                renderCalendar(); // repinta para mover el 'selected'
                renderEvents();
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    function renderEvents() {
        const dateKey = formatDateKey(selectedDate);
        selectedDateDisplay.innerText = `FECHA: ${dateKey}`;
        eventList.innerHTML = '';

        if (!events[dateKey] || events[dateKey].length === 0) {
            eventList.innerHTML = '<p style="color:#a0aec0; font-style:italic;">No hay eventos registrados para este día.</p>';
            return;
        }

        events[dateKey].forEach((ev, index) => {
            const div = document.createElement('div');
            div.className = 'event-item';
            div.innerHTML = `
                <p>${ev}</p>
                <button class="btn-delete-event" data-index="${index}">X</button>
            `;
            eventList.appendChild(div);
        });

        // Add delete listeners
        document.querySelectorAll('.btn-delete-event').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                events[dateKey].splice(idx, 1);
                if (events[dateKey].length === 0) delete events[dateKey];
                saveEvents();
                renderEvents();
                renderCalendar(); // Repinta para quitar el puntito azul si se queda vacío
            });
        });
    }

    // Botones del mes
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Añadir evento
    btnAddEvent.addEventListener('click', () => {
        const text = newEventText.value.trim();
        if (text) {
            const dateKey = formatDateKey(selectedDate);
            if (!events[dateKey]) events[dateKey] = [];
            events[dateKey].push(text);
            saveEvents();
            newEventText.value = '';
            renderEvents();
            renderCalendar();
        }
    });

    newEventText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnAddEvent.click();
    });

    // Iniciar
    renderCalendar();
    renderEvents();
});
