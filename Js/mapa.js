
        // DOM Elements
        const canvas = document.getElementById('parkingCanvas');
        const ctx = canvas.getContext('2d');
        const toggleSimBtn = document.getElementById('toggleSimBtn');
        const simIcon = document.getElementById('simIcon');
        const simText = document.getElementById('simText');
        const resetParkingBtn = document.getElementById('resetParkingBtn');
        const tooltip = document.getElementById('spotTooltip');
        const tooltipTitle = document.getElementById('tooltipTitle');
        const tooltipStatus = document.getElementById('tooltipStatus');

        // Statistics elements
        const statTotal = document.getElementById('statTotal');
        const statFree = document.getElementById('statFree');
        const statOccupied = document.getElementById('statOccupied');
        const statReserved = document.getElementById('statReserved');
        const occupancyRate = document.getElementById('occupancyRate');
        const occupancyBar = document.getElementById('occupancyBar');
        const carCountEl = document.getElementById('carCount');

        // Simulation state
        let isSimulating = true;
        let animationFrameId = null;

        // Configuration & Dimensions
        let scale = 1;
        const logicalWidth = 1000;
        const logicalHeight = 650;

        // Data Models
        let spots = [];
        let cars = [];

        // Initialize Parking Spots layout
        function initParkingSpots() {
            spots = [];
            
            // Row 1: Top section
            for (let i = 1; i <= 6; i++) {
                spots.push({
                    id: `A-${i < 10 ? '0' + i : i}`,
                    x: 80 + (i - 1) * 75,
                    y: 70,
                    width: 65,
                    height: 100,
                    state: i % 3 === 0 ? 'ocupado' : (i === 2 ? 'reservado' : 'libre'),
                    type: 'vertical'
                });
            }

            // Row 2: Middle-Top section
            for (let i = 1; i <= 6; i++) {
                spots.push({
                    id: `B-${i < 10 ? '0' + i : i}`,
                    x: 80 + (i - 1) * 75,
                    y: 220,
                    width: 65,
                    height: 100,
                    state: i === 1 ? 'ocupado' : (i === 4 ? 'reservado' : 'libre'),
                    type: 'vertical'
                });
            }

            // Row 3: Middle-Bottom section
            for (let i = 1; i <= 6; i++) {
                spots.push({
                    id: `C-${i < 10 ? '0' + i : i}`,
                    x: 80 + (i - 1) * 75,
                    y: 350,
                    width: 65,
                    height: 100,
                    state: i % 2 === 0 ? 'ocupado' : 'libre',
                    type: 'vertical'
                });
            }

            // Row 4: Bottom section
            for (let i = 1; i <= 6; i++) {
                spots.push({
                    id: `D-${i < 10 ? '0' + i : i}`,
                    x: 80 + (i - 1) * 75,
                    y: 500,
                    width: 65,
                    height: 100,
                    state: i === 3 ? 'reservado' : 'libre',
                    type: 'vertical'
                });
            }

            // Side VIP Spots (Horizontal layout)
            for (let i = 1; i <= 3; i++) {
                spots.push({
                    id: `VIP-${i}`,
                    x: 600 + (i - 1) * 110,
                    y: 70,
                    width: 95,
                    height: 60,
                    state: i === 1 ? 'ocupado' : 'reservado',
                    type: 'horizontal'
                });
                spots.push({
                    id: `VIP-${i+3}`,
                    x: 600 + (i - 1) * 110,
                    y: 200,
                    width: 95,
                    height: 60,
                    state: 'libre',
                    type: 'horizontal'
                });
            }
        }

        // Initialize Moving Uber Style Cars
        function initCars() {
            cars = [
                { x: 530, y: 185, vx: 0, vy: 1.6, bodyColor: '#FFFFFF', accentColor: '#000000', angle: Math.PI/2, targetY: 480 },
                { x: 530, y: 480, vx: 0, vy: -1.6, bodyColor: '#242424', accentColor: '#FFFFFF', angle: -Math.PI/2, targetY: 185 },
                { x: 200, y: 335, vx: 1.6, vy: 0, bodyColor: '#FFFFFF', accentColor: '#121212', angle: 0, targetX: 850 },
                { x: 750, y: 335, vx: -1.6, vy: 0, bodyColor: '#333333', accentColor: '#FFFFFF', angle: Math.PI, targetX: 200 }
            ];
        }

        // Update statistics metrics
        function updateStats() {
            const total = spots.length;
            const free = spots.filter(s => s.state === 'libre').length;
            const occupied = spots.filter(s => s.state === 'ocupado').length;
            const reserved = spots.filter(s => s.state === 'reservado').length;
            
            const occupancyPercentage = Math.round(((occupied + reserved) / total) * 100);

            statTotal.textContent = total;
            statFree.textContent = free;
            statOccupied.textContent = occupied;
            statReserved.textContent = reserved;
            carCountEl.textContent = cars.length;

            occupancyRate.textContent = `${occupancyPercentage}%`;
            occupancyBar.style.width = `${occupancyPercentage}%`;
        }

        // Responsive Canvas Scaling
        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
            const scaleX = canvas.width / logicalWidth;
            const scaleY = canvas.height / logicalHeight;
            scale = Math.min(scaleX, scaleY);
        }

        window.addEventListener('resize', resizeCanvas);

        // Main Render Loop
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            // Center logical coordinate frame
            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            // 1. Map Asphalt Floor (#121212)
            ctx.fillStyle = '#121212';
            ctx.fillRect(0, 0, logicalWidth, logicalHeight);

            // Subtle perimeter border
            ctx.strokeStyle = '#242424';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 10, logicalWidth - 20, logicalHeight - 20);

            // Drive Aisles / Road Network (#000000)
            ctx.fillStyle = '#000000';
            // Horizontal main aisle
            ctx.fillRect(40, 325, 880, 50);
            // Vertical main aisle
            ctx.fillRect(510, 50, 50, 550);

            // Entrance gate box (Minimalist White Badge)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(40, 335, 12, 30);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Inter';
            ctx.fillText('ENTRADA', 10, 325);

            // Dashed lane dividers in sutil grey (#333333)
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            
            // Horizontal lane divider
            ctx.beginPath();
            ctx.moveTo(60, 350);
            ctx.lineTo(880, 350);
            ctx.stroke();

            // Vertical lane divider
            ctx.beginPath();
            ctx.moveTo(535, 60);
            ctx.lineTo(535, 590);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash

            // 2. Render Parking Spots with Uber Minimalist Styles
            spots.forEach(spot => {
                ctx.save();
                ctx.translate(spot.x, spot.y);

                if (spot.state === 'libre') {
                    // LIBRE: Clean dark fill with glowing/crisp White border
                    ctx.fillStyle = '#121212';
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(0, 0, spot.width, spot.height, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Subtle inner glow indicator
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.beginPath();
                    ctx.roundRect(2, 2, spot.width - 4, spot.height - 4, 3);
                    ctx.fill();

                    // Text ID in White
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 11px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(spot.id, spot.width / 2, spot.type === 'vertical' ? spot.height - 18 : spot.height / 2);

                } else if (spot.state === 'ocupado') {
                    // OCUPADO: Charcoal dark background with muted grey border
                    ctx.fillStyle = '#000000';
                    ctx.strokeStyle = '#242424';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(0, 0, spot.width, spot.height, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Muted car silhouette / rectangle
                    ctx.fillStyle = '#242424';
                    ctx.strokeStyle = '#333333';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(8, 8, spot.width - 16, spot.height - 16, 3);
                    ctx.fill();
                    ctx.stroke();

                    // Windshield detail in grey
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(spot.width / 2 - 8, 14, 16, 6);

                    // Text ID in muted grey
                    ctx.fillStyle = '#757575';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(spot.id, spot.width / 2, spot.type === 'vertical' ? spot.height - 18 : spot.height / 2);

                } else if (spot.state === 'reservado') {
                    // RESERVADO: Sophisticated mid-grey accent with subtle stripe pattern
                    ctx.fillStyle = '#1A1A1A';
                    ctx.strokeStyle = '#757575';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.roundRect(0, 0, spot.width, spot.height, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Star / Lock emblem
                    ctx.fillStyle = '#E0E0E0';
                    ctx.font = '12px FontAwesome';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('★', spot.width / 2, spot.height / 2 - (spot.type === 'vertical' ? 8 : 0));

                    // Text ID in Light Grey
                    ctx.fillStyle = '#E0E0E0';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(spot.id, spot.width / 2, spot.type === 'vertical' ? spot.height - 18 : spot.height / 2 + 14);
                }

                ctx.restore();
            });

            // 3. Move and Render Sleek Monochromatic Uber Vehicles
            if (isSimulating) {
                cars.forEach(car => {
                    car.x += car.vx;
                    car.y += car.vy;

                    // Traffic loops & routing
                    if (car.vx > 0 && car.x > car.targetX) {
                        car.x = car.targetX;
                        car.vx = 0;
                        car.vy = 1.6;
                        car.angle = Math.PI / 2;
                        car.targetY = car.y > 300 ? 100 : 500;
                    } else if (car.vx < 0 && car.x < car.targetX) {
                        car.x = car.targetX;
                        car.vx = 0;
                        car.vy = -1.6;
                        car.angle = -Math.PI / 2;
                        car.targetY = car.y > 300 ? 100 : 500;
                    }

                    if (car.vy > 0 && car.y > car.targetY) {
                        car.y = car.targetY;
                        car.vy = 0;
                        car.vx = car.x > 500 ? -1.6 : 1.6;
                        car.angle = car.x > 500 ? Math.PI : 0;
                        car.targetX = car.x > 500 ? 150 : 850;
                    } else if (car.vy < 0 && car.y < car.targetY) {
                        car.y = car.targetY;
                        car.vy = 0;
                        car.vx = car.x > 500 ? -1.6 : 1.6;
                        car.angle = car.x > 500 ? Math.PI : 0;
                        car.targetX = car.x > 500 ? 150 : 850;
                    }

                    // Screen boundaries reset
                    if (car.x < 0) car.x = logicalWidth;
                    if (car.x > logicalWidth) car.x = 0;
                    if (car.y < 0) car.y = logicalHeight;
                    if (car.y > logicalHeight) car.y = 0;
                });
            }

            // Draw Uber Minimalist Cars
            cars.forEach(car => {
                ctx.save();
                ctx.translate(car.x, car.y);
                ctx.rotate(car.angle);

                // Drop shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.roundRect(-16, -9, 32, 18, 4);
                ctx.fill();

                // Car Outer Body Frame
                ctx.fillStyle = car.bodyColor;
                ctx.strokeStyle = '#242424';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(-14, -8, 28, 16, 3);
                ctx.fill();
                ctx.stroke();

                // Glass / Roof Contrast
                ctx.fillStyle = car.accentColor;
                ctx.fillRect(-3, -6, 8, 12);

                // LED Headlights
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(11, -6, 2, 3);
                ctx.fillRect(11, 3, 2, 3);

                ctx.restore();
            });

            ctx.restore();
        }

        // Loop execution
        function loop() {
            draw();
            animationFrameId = requestAnimationFrame(loop);
        }

        // Interaction: Click spot to cycle through state
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;

            const logicalX = (mouseX - offsetX) / scale;
            const logicalY = (mouseY - offsetY) / scale;

            for (let spot of spots) {
                if (
                    logicalX >= spot.x &&
                    logicalX <= spot.x + spot.width &&
                    logicalY >= spot.y &&
                    logicalY <= spot.y + spot.height
                ) {
                    // Cycle: libre -> ocupado -> reservado -> libre
                    if (spot.state === 'libre') {
                        spot.state = 'ocupado';
                    } else if (spot.state === 'ocupado') {
                        spot.state = 'reservado';
                    } else {
                        spot.state = 'libre';
                    }
                    updateStats();
                    break;
                }
            }
        });

        // Mouse Hover Tooltip Logic
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const offsetX = (canvas.width - logicalWidth * scale) / 2;
            const offsetY = (canvas.height - logicalHeight * scale) / 2;

            const logicalX = (mouseX - offsetX) / scale;
            const logicalY = (mouseY - offsetY) / scale;

            let hoveredSpot = null;
            for (let spot of spots) {
                if (
                    logicalX >= spot.x &&
                    logicalX <= spot.x + spot.width &&
                    logicalY >= spot.y &&
                    logicalY <= spot.y + spot.height
                ) {
                    hoveredSpot = spot;
                    break;
                }
            }

            if (hoveredSpot) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX + 15}px`;
                tooltip.style.top = `${e.clientY + 15}px`;
                tooltipTitle.textContent = `Cajón ${hoveredSpot.id}`;
                
                let statusText = 'Disponible';
                let statusColor = 'text-white font-bold';
                if (hoveredSpot.state === 'ocupado') {
                    statusText = 'Ocupado';
                    statusColor = 'text-[#757575] font-semibold';
                } else if (hoveredSpot.state === 'reservado') {
                    statusText = 'Reservado (VIP)';
                    statusColor = 'text-[#E0E0E0] font-semibold';
                }
                tooltipStatus.innerHTML = `Estado: <span class="${statusColor}">${statusText}</span>`;
            } else {
                tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        // Toggle Simulation
        toggleSimBtn.addEventListener('click', () => {
            isSimulating = !isSimulating;
            if (isSimulating) {
                simIcon.className = "fa-solid fa-pause text-xs";
                simText.textContent = "Pausar Tráfico";
            } else {
                simIcon.className = "fa-solid fa-play text-xs";
                simText.textContent = "Reanudar Tráfico";
            }
        });

        // Reset Button
        resetParkingBtn.addEventListener('click', () => {
            initParkingSpots();
            updateStats();
        });

        // Initialize App
        window.addEventListener('load', () => {
            resizeCanvas();
            initParkingSpots();
            initCars();
            updateStats();
            loop();
        });
