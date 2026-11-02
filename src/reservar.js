document.addEventListener('DOMContentLoaded', () => {
    // Establecer la fecha actual por defecto en el input de fecha
    const today = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById('fecha');
    if (inputFecha) inputFecha.value = today;
});

document.getElementById('reservaForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Recopilar únicamente los datos del espacio y horario
    const datosReserva = {
        estacionamiento: document.getElementById('estacionamiento').value,
        espacio: document.getElementById('espacio').value,
        fecha: document.getElementById('fecha').value,
        horario: document.getElementById('horario').value,
        duracion: document.getElementById('duracion').value
    };

    const btnReservar = document.getElementById('btnReservar');
    btnReservar.disabled = true;
    btnReservar.textContent = "Procesando reserva...";

    try {
        // Enviar al servidor (el servidor identifica al usuario mediante su sesión/token)
        const respuesta = await fetch('/api/crear-reserva', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Importante para enviar cookies de sesión si las usas
            body: JSON.stringify(datosReserva)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert('¡Reserva confirmada con éxito! Se ha enviado un correo de confirmación a tu cuenta.');
            window.location.href = 'perfil.html';
        } else {
            alert('Error: ' + (resultado.mensaje || 'No se pudo procesar la reserva'));
            btnReservar.disabled = false;
            btnReservar.textContent = "Confirmar Reserva";
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Hubo un error de conexión al intentar procesar la reserva.');
        btnReservar.disabled = false;
        btnReservar.textContent = "Confirmar Reserva";
    }
});