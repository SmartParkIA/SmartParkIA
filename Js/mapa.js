// DOM Elements
        const canvas = document.getElementById('parkingCanvas');
        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('spotTooltip');
        const tooltipTitle = document.getElementById('tooltipTitle');
        const tooltipStatus = document.getElementById('tooltipStatus');

        // Statistics elements
        const statFree = document.getElementById('statFree');
        const statOccupied = document.getElementById('statOccupied');
        const occupancyRate = document.getElementById('occupancyRate');
        const occupancyBar = document.getElementById('occupancyBar');
        const carCountEl = document.getElementById('carCount');
        const selectedSpotBadge = document.getElementById('selectedSpotBadge');
        const cancelSpotBtn = document.getElementById('cancelSpotBtn');
        const userAdviceText = document.getElementById('userAdviceText');

        // Extras Elements
        const timeSimulatorSlider = document.getElementById('timeSimulatorSlider');
        const sliderTimeLabel = document.getElementById('sliderTimeLabel');
        const toastNotification = document.getElementById('toastNotification');
        const toastTitle = document.getElementById('toastTitle');
        const toastDesc = document.getElementById('toastDesc');
        const zoneFilterBtns = document.querySelectorAll('.zone-filter-btn');

        // Analytics Elements
        const filterDaySelect = document.getElementById('filterDay');
        const runQueryBtn = document.getElementById('runQueryBtn');
        const analyticsPeakDay = document.getElementById('analyticsPeakDay');
        const analyticsPeakHour = document.getElementById('analyticsPeakHour');
        const analyticsTableBody = document.getElementById('analyticsTableBody');
        const recordCount = document.getElementById('recordCount');

        let selectedUserSpot = null;
        let currentZoneFilter = 'todos';
        let scale = 1;
        const logicalWidth = 1000;
        const logicalHeight = 650;

        let spots = [];
        let cars = [];

        // Historial analítico de ocupación
        const historicalOccupancyRecords = [
            { day: 'Lunes', slot: '07:00 - 10:00', occupancyAvg: 45 },
            { day: 'Lunes', slot: '10:00 - 13:00', occupancyAvg: 72 },
            { day: 'Martes', slot: '13:00 - 16:00', occupancyAvg: 65 },
            { day: 'Miércoles', slot: '11:00 - 14:00', occupancyAvg: 80 },
            { day: 'Jueves', slot: '14:00 - 17:00', occupancyAvg: 78 },
            { day: 'Viernes', slot: '14:00 - 17:00', occupancyAvg: 94 },
            { day: 'Viernes', slot: '17:00 - 20:00', occupancyAvg: 88 },
            { day: 'Sábado', slot: '12:00 - 15:00', occupancyAvg: 60 }
        ];

        function loadUserAnalytics(filterDay = 'todos') {
            if (!analyticsTableBody) return;
            const filtered = filterDay === 'todos' 
                ? historicalOccupancyRecords 
                : historicalOccupancyRecords.filter(r => r.day === filterDay);

            let peak = historicalOccupancyRecords.reduce((m, c) => c.occupancyAvg > m.occupancyAvg ? c : m, historicalOccupancyRecords[0]);

            if (analyticsPeakDay) analyticsPeakDay.textContent = peak.day;
            if (analyticsPeakHour) analyticsPeakHour.textContent = `${peak.slot} hrs`;

            analyticsTableBody.innerHTML = '';
            filtered.forEach(r => {
                const row = document.createElement('tr');
                row.className = "hover:bg-[#121212] transition-colors";

                let level = "Normal";
                let style = "text-[#757575]";
                if (r.occupancyAvg >= 85) {
                    level = "Muy Alto (Pico)";
                    style = "text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded";
                } else if (r.occupancyAvg >= 70) {
                    level = "Alto";
                    style = "text-yellow-400 font-semibold";
                }

                row.innerHTML = `
                    <td class="px-4 py-3 font-semibold text-white">${r.day}</td>
                    <td class="px-4 py-3 font-mono text-xs">${r.slot}</td>
                    <td class="px-4 py-3 font-mono font-bold">${r.occupancyAvg}%</td>
                    <td class="px-4 py-3"><span class="${style}">${level}</span></td>
                `;
                analyticsTableBody.appendChild(row);
            });

            if (recordCount) recordCount.textContent = `${filtered.length} registros`;
        }

        // Inicializar cajones con categoría de zona
        function initParkingSpots() {
            spots = [];
            for (let i = 1; i <= 6; i++) {
                spots.push({ id: `A-${i < 10 ? '0' + i : i}`, x: 80 + (i - 1) * 75, y: 70, width: 65, height: 100, state: i % 3 === 0 ? 'ocupado' : 'libre', zone: 'general', type: 'vertical' });
            }
            for (let i = 1; i <= 6; i++) {
                spots.push({ id: `B-${i < 10 ? '0' + i : i}`, x: 80 + (i - 1) * 75, y: 220, width: 65, height: 100, state: i === 1 ? 'ocupado' : 'libre', zone: 'general', type: 'vertical' });
            }
            for (let i = 1; i <= 6; i++) {
                spots.push({ id: `C-${i < 10 ? '0' + i : i}`, x: 80 + (i - 1) * 75, y: 350, width: 65, height: 100, state: i % 2 === 0 ? 'ocupado' : 'libre', zone: 'general', type: 'vertical' });
            }
            for (let i = 1; i <= 6; i++) {
                spots.push({ id: `D-${i < 10 ? '0' + i : i}`, x: 80 + (i - 1) * 75, y: 500, width: 65, height: 100, state: 'libre', zone: 'general', type: 'vertical' });
            }
            for (let i = 1; i <= 3; i++) {
                spots.push({ id: `VIP-${i}`, x: 600 + (i - 1) * 110, y: 70, width: 95, height: 60, state: 'reservado', zone: 'vip', type: 'horizontal' });
                spots.push({ id: `VIP-${i+3}`, x: 600 + (i - 1) * 110, y: 200, width: 95, height: 60, state: 'libre', zone: 'vip', type: 'horizontal' });
            }
        }

        function initCars() {
            cars = [
                { x: 530, y: 100, vx: 0, vy: 1.6, bodyColor: '#FFFFFF', accentColor: '#000000', angle: Math.PI/2, targetY: 480 },
                { x: 530, y: 300, vx: 0, vy: -1.6, bodyColor: '#242424', accentColor: '#FFFFFF', angle: -Math.PI/2, targetY: 150 },
                { x: 530, y: 500, vx: 0, vy: 1.2, bodyColor: '#E0E0E0', accentColor: '#121212', angle: Math.PI/2, targetY: 580 },
                { x: 150, y: 335, vx: 1.6, vy: 0, bodyColor: '#FFFFFF', accentColor: '#121212', angle: 0, targetX: 450 },
                { x: 350, y: 335, vx: -1.6, vy: 0, bodyColor: '#333333', accentColor: '#FFFFFF', angle: Math.PI, targetX: 100 },
                { x: 650, y: 335, vx: 1.6, vy: 0, bodyColor: '#CCCCCC', accentColor: '#000000', angle: 0, targetX: 880 },
                { x: 800, y: 335, vx: -1.6, vy: 0, bodyColor: '#FFFFFF', accentColor: '#242424', angle: Math.PI, targetX: 600 },
                { x: 530, y: 220, vx: 0, vy: 1.5, bodyColor: '#1A1A1A', accentColor: '#FFFFFF', angle: Math.PI/2, targetY: 400 },
                { x: 250, y: 335, vx: 1.4, vy: 0, bodyColor: '#888888', accentColor: '#FFFFFF', angle: 0, targetX: 500 },
                { x: 700, y: 335, vx: -1.4, vy: 0, bodyColor: '#FFFFFF', accentColor: '#333333', angle: Math.PI, targetX: 550 }
            ];
            if (carCountEl) carCountEl.textContent = cars.length;
        }

        function updateStats() {
            const total = spots.length;
            const free = spots.filter(s => s.state === 'libre').length;
            const occupied = spots.filter(s => s.state === 'ocupado' || s.state === 'reservado').length;
            const occupancyPercentage = Math.round((occupied / total) * 100);

            statFree.textContent = free;
            statOccupied.textContent = occupied;
            occupancyRate.textContent = `${occupancyPercentage}%`;
            occupancyBar.style.width = `${occupancyPercentage}%`;

            if (userAdviceText) {
                if (occupancyPercentage > 80) {
                    userAdviceText.textContent = "¡Demanda alta! Considera apartar un cajón verde de inmediato.";
                } else {
                    userAdviceText.textContent = "Flujo óptimo. Tienes amplias opciones de cajones verdes disponibles.";
                }
            }
        }

        // Simulador predictivo basado en la hora seleccionada en el Slider
        function simulateParkingByHour(hour) {
            spots.forEach((spot, idx) => {
                if (spot.id === selectedUserSpot) return; // No alterar el cajón que el usuario apartó manualmente

                if (hour >= 13 && hour <= 17) {
                    // Hora pico: mayor ocupación
                    spot.state = (idx % 2 === 0 || idx % 3 === 0) ? 'ocupado' : 'libre';
                } else if (hour >= 8 && hour <= 11) {
                    // Mañana: ocupación moderada
                    spot.state = (idx % 4 === 0) ? 'ocupado' : 'libre';
                } else {
                    // Noche / Temprano: mayor disponibilidad
                    spot.state = (idx === 0) ? 'ocupado' : 'libre';
                }
            });
            updateStats();
        }

        // Mostrar notificación Toast elegante
        function showToast(title, desc) {
            if (!toastNotification) return;
            toastTitle.textContent = title;
            toastDesc.textContent = desc;
            toastNotification.classList.remove('hidden');
            setTimeout(() => {
                toastNotification.classList.remove('translate-y-[-10px]', 'opacity-0');
            }, 50);

            setTimeout(() => {
                toastNotification.classList.add('translate-y-[-10px]', 'opacity-0');
                setTimeout(() => toastNotification.classList.add('hidden'), 300);
            }, 3500);
        }

        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            const scaleX = canvas.width / logicalWidth;
            const scaleY = canvas.height / logicalHeight;
            scale = Math.min(scaleX, scaleY);
        }

        window.addEventListener('resize', resizeCanvas);

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            ctx.fillStyle = '#121212';
            ctx.fillRect(0, 0, logicalWidth, logicalHeight);
            ctx.strokeStyle = '#242424';
            ctx.strokeRect(10, 10, logicalWidth - 20, logicalHeight - 20);

            ctx.fillStyle = '#000000';
            ctx.fillRect(40, 325, 880, 50);
            ctx.fillRect(510, 50, 50, 550);

            spots.forEach(spot => {
                // Aplicar filtro rápido de zona
                if (currentZoneFilter !== 'todos' && spot.zone !== currentZoneFilter) return;

                ctx.save();
                ctx.translate(spot.x, spot.y);

                const isApartado = selectedUserSpot === spot.id;
                let borderColor = '#10B981'; 
                let fillColor = '#121212';
                let textColor = '#10B981';

                if (isApartado) {
                    borderColor = '#FACC15'; 
                    fillColor = 'rgba(250, 204, 21, 0.15)';
                    textColor = '#FACC15';
                } else if (spot.state === 'ocupado' || spot.state === 'reservado') {
                    borderColor = '#F43F5E'; 
                    fillColor = 'rgba(244, 63, 94, 0.15)';
                    textColor = '#F43F5E';
                }

                ctx.fillStyle = fillColor;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = isApartado ? 2.5 : 1.8;
                ctx.beginPath();
                ctx.roundRect(0, 0, spot.width, spot.height, 4);
                ctx.fill();
                ctx.stroke();

                if (spot.state === 'ocupado' || spot.state === 'reservado') {
                    ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
                    ctx.beginPath();
                    ctx.roundRect(8, 8, spot.width - 16, spot.height - 16, 3);
                    ctx.fill();
                }

                ctx.fillStyle = textColor;
                ctx.font = 'bold 11px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(spot.id, spot.width / 2, spot.height / 2);

                ctx.restore();
            });

            cars.forEach(car => {
                car.x += car.vx;
                car.y += car.vy;

                if (car.vx > 0 && car.x > car.targetX) {
                    car.x = car.targetX;
                    car.vx = 0;
                    car.vy = 1.5;
                    car.angle = Math.PI / 2;
                    car.targetY = car.y > 300 ? 100 : 500;
                } else if (car.vx < 0 && car.x < car.targetX) {
                    car.x = car.targetX;
                    car.vx = 0;
                    car.vy = -1.5;
                    car.angle = -Math.PI / 2;
                    car.targetY = car.y > 300 ? 150 : 450;
                }

                if (car.vy > 0 && car.y > car.targetY) {
                    car.y = car.targetY;
                    car.vy = 0;
                    car.vx = car.x > 500 ? -1.5 : 1.5;
                    car.angle = car.x > 500 ? Math.PI : 0;
                    car.targetX = car.x > 500 ? 150 : 850;
                } else if (car.vy < 0 && car.y < car.targetY) {
                    car.y = car.targetY;
                    car.vy = 0;
                    car.vx = car.x > 500 ? -1.5 : 1.5;
                    car.angle = car.x > 500 ? Math.PI : 0;
                    car.targetX = car.x > 500 ? 200 : 800;
                }

                if (car.x < 0) car.x = logicalWidth;
                if (car.x > logicalWidth) car.x = 0;
                if (car.y < 0) car.y = logicalHeight;
                if (car.y > logicalHeight) car.y = 0;
            });

            cars.forEach(car => {
                ctx.save();
                ctx.translate(car.x, car.y);
                ctx.rotate(car.angle);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(-16, -9, 32, 18, 4);
                ctx.fill();

                ctx.fillStyle = car.bodyColor;
                ctx.strokeStyle = '#242424';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(-14, -8, 28, 16, 3);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = car.accentColor;
                ctx.fillRect(-3, -6, 8, 12);

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(11, -6, 2, 3);
                ctx.fillRect(11, 3, 2, 3);

                ctx.restore();
            });

            ctx.restore();
        }

        function loop() {
            draw();
            requestAnimationFrame(loop);
        }

        // Evento de clic en cajón (Apartar)
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;
            const logicalX = (mouseX - offsetX) / scale;
            const logicalY = (mouseY - offsetY) / scale;

            for (let spot of spots) {
                if (currentZoneFilter !== 'todos' && spot.zone !== currentZoneFilter) continue;

                if (logicalX >= spot.x && logicalX <= spot.x + spot.width && logicalY >= spot.y && logicalY <= spot.y + spot.height) {
                    if (spot.state === 'libre') {
                        selectedUserSpot = spot.id;
                        selectedSpotBadge.innerHTML = `Selección: <strong class="text-yellow-400">Cajón ${spot.id} (Apartado)</strong>`;
                        cancelSpotBtn.classList.remove('hidden');
                        showToast("¡Cajón Apartado con Éxito!", `El espacio ${spot.id} ha sido reservado para tu llegada.`);
                    } else {
                        showToast("Cajón No Disponible", "Este espacio ya se encuentra ocupado.");
                    }
                    break;
                }
            }
        });

        // Botón Cancelar Apartado
        if (cancelSpotBtn) {
            cancelSpotBtn.addEventListener('click', () => {
                const canceledId = selectedUserSpot;
                selectedUserSpot = null;
                selectedSpotBadge.innerHTML = `Selección: <strong class="text-white">Ninguno</strong>`;
                cancelSpotBtn.classList.add('hidden');
                showToast("Apartado Cancelado", `Has liberado el cajón ${canceledId}.`);
            });
        }

        // Slider de Simulador de Hora
        if (timeSimulatorSlider) {
            timeSimulatorSlider.addEventListener('input', (e) => {
                const hour = parseInt(e.target.value);
                sliderTimeLabel.textContent = `${hour < 10 ? '0' + hour : hour}:00 hrs`;
                simulateParkingByHour(hour);
            });
        }

        // Filtros rápidos de zona
        zoneFilterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                zoneFilterBtns.forEach(b => {
                    b.classList.remove('bg-white', 'text-black', 'font-semibold');
                    b.classList.add('text-[#757575]');
                });
                e.target.classList.add('bg-white', 'text-black', 'font-semibold');
                e.target.classList.remove('text-[#757575]');

                currentZoneFilter = e.target.getAttribute('data-zone');
            });
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;
            const logicalX = (mouseX - offsetX) / scale;
            const logicalY = (mouseY - offsetY) / scale;

            let hovered = null;
            for (let spot of spots) {
                if (currentZoneFilter !== 'todos' && spot.zone !== currentZoneFilter) continue;
                if (logicalX >= spot.x && logicalX <= spot.x + spot.width && logicalY >= spot.y && logicalY <= spot.y + spot.height) {
                    hovered = spot;
                    break;
                }
            }

            if (hovered) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX + 15}px`;
                tooltip.style.top = `${e.clientY + 15}px`;
                tooltipTitle.textContent = `Cajón ${hovered.id} (${hovered.zone.toUpperCase()})`;
                tooltipStatus.textContent = `Estado: ${hovered.state === 'libre' ? 'Disponible (Verde)' : 'No disponible (Rojo)'}`;
            } else {
                tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

        if (runQueryBtn) {
            runQueryBtn.addEventListener('click', () => {
                loadUserAnalytics(filterDaySelect.value);
            });
        }

        window.addEventListener('load', () => {
            resizeCanvas();
            initParkingSpots();
            initCars();
            updateStats();
            loadUserAnalytics();
            loop();
        });