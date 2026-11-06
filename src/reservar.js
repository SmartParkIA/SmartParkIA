// ============================================================
// reservar.js
// ============================================================

// ⚠️ AJUSTA esta ruta a donde esté tu mapa.html, relativa a reservar.html
const RUTA_MAPA = './pages/mapa.html';

const form          = document.getElementById('reservaForm');
const inputEspacio  = document.getElementById('espacio');
const inputFecha    = document.getElementById('fecha');
const inputHorario  = document.getElementById('horario');
const inputDuracion = document.getElementById('duracion');
const inputMarca    = document.getElementById('marca');
const inputModelo   = document.getElementById('modelo');
const inputPlaca    = document.getElementById('placa');
const linkMapa      = document.getElementById('linkMapa');

// Enlace al mapa en modo reserva
linkMapa.href = `${RUTA_MAPA}?modo=reservar`;

// Llenar el cajón elegido en el mapa
const params = new URLSearchParams(window.location.search);
const cajon = params.get('cajon');
if (cajon) inputEspacio.value = cajon;

// Fecha mínima = hoy (en hora local, no UTC)
function hoyLocal() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}
inputFecha.min = hoyLocal();

// Placa siempre en mayúsculas mientras se escribe
inputPlaca.addEventListener('input', () => {
    inputPlaca.value = inputPlaca.value.toUpperCase();
});

function getReservas() {
    try {
        return JSON.parse(localStorage.getItem('reservas')) || [];
    } catch {
        return [];
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const espacio  = inputEspacio.value.trim();
    const fecha    = inputFecha.value;
    const horario  = inputHorario.value;
    const duracion = parseInt(inputDuracion.value, 10);
    const marca    = inputMarca.value.trim();
    const modelo   = inputModelo.value.trim();
    const placa    = inputPlaca.value.trim().toUpperCase();

    if (!espacio) {
        alert('Primero elige un cajón en el mapa.');
        return;
    }

    const inicio = new Date(`${fecha}T${horario}`);
    const fin = new Date(inicio.getTime() + duracion * 60 * 60 * 1000);

    if (fin <= new Date()) {
        alert('El horario seleccionado ya pasó.');
        return;
    }

    const reservas = getReservas();

    // Evitar doble reserva del mismo cajón en horarios que se traslapan
    const choca = reservas.some(r =>
        r.espacio === espacio &&
        inicio.getTime() < r.finTimestamp &&
        fin.getTime() > r.inicioTimestamp
    );
    if (choca) {
        alert('Ese cajón ya está reservado en ese horario. Elige otro.');
        return;
    }

    reservas.push({
        id: Date.now(),
        estacionamiento: document.getElementById('estacionamiento').value,
        espacio, fecha, horario, duracion,
        marca, modelo, placa,
        inicioTimestamp: inicio.getTime(),
        finTimestamp: fin.getTime()
    });

    localStorage.setItem('reservas', JSON.stringify(reservas));

    alert(`¡Reserva confirmada! Cajón ${espacio}`);
    window.location.href = `${RUTA_MAPA}?modo=reservar`;
});
