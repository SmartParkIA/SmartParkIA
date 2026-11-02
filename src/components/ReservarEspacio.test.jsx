import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ReservarEspacio from './ReservarEspacio.jsx'
import { crearReservaEspacio } from '../services/reservarEspacioService.js'
import { useUsuario } from '../hooks/useUsuario.js'

// Evita inicializar Firebase y cargar el menú lateral en las pruebas.
vi.mock('../services/reservarEspacioService.js', () => ({ crearReservaEspacio: vi.fn() }))
vi.mock('../hooks/useUsuario.js', () => ({ useUsuario: vi.fn() }))
vi.mock('../layout.js', () => ({}))

const USUARIO = { uid: 'u1', email: 'a@b.c' }

function llenarFormulario({ espacio = 'Cajón #A-12', fecha = '2099-01-01', horario = '10:00' } = {}) {
  fireEvent.change(screen.getByLabelText('Cajón / Espacio Disponible'), { target: { value: espacio } })
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fecha } })
  fireEvent.change(screen.getByLabelText('Hora de Inicio'), { target: { value: horario } })
}

describe('ReservarEspacio', () => {
  beforeEach(() => {
    crearReservaEspacio.mockReset()
    useUsuario.mockReturnValue({ usuario: USUARIO, cargando: false })
    crearReservaEspacio.mockResolvedValue('ABC123')
  })

  it('muestra el formulario con los valores por defecto', () => {
    render(<ReservarEspacio />)
    expect(screen.getByRole('heading', { name: 'Reservar Espacio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Estacionamiento / Zona')).toHaveValue('SmartPark Central - Zona A')
    expect(screen.getByLabelText('Duración (Horas)')).toHaveValue(2)
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled()
  })

  it('avisa y deshabilita el botón cuando no hay sesión', () => {
    useUsuario.mockReturnValue({ usuario: null, cargando: false })
    render(<ReservarEspacio />)
    expect(screen.getByRole('alert')).toHaveTextContent(/inicia sesión para reservar/i)
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeDisabled()
  })

  it('no reserva si falta el cajón', async () => {
    render(<ReservarEspacio />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/estacionamiento y el cajón/i)
    expect(crearReservaEspacio).not.toHaveBeenCalled()
  })

  it('no reserva si la hora ya pasó', async () => {
    render(<ReservarEspacio />)
    llenarFormulario({ fecha: '2020-01-01' })
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya pasó/i)
    expect(crearReservaEspacio).not.toHaveBeenCalled()
  })

  it('reserva con datos válidos, muestra el código y limpia el cajón', async () => {
    render(<ReservarEspacio />)
    llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))

    expect(crearReservaEspacio).toHaveBeenCalledWith({
      usuario: USUARIO,
      estacionamiento: 'SmartPark Central - Zona A',
      espacio: 'Cajón #A-12',
      fecha: '2099-01-01',
      horario: '10:00',
      duracion: '2',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Reserva confirmada. Tu código es ABC123.')
    expect(screen.getByLabelText('Cajón / Espacio Disponible')).toHaveValue('')
  })

  it('muestra el error del servicio (cajón ocupado) y deja intentar de nuevo', async () => {
    crearReservaEspacio.mockRejectedValue(new Error('Ese cajón ya está reservado en ese horario.'))
    render(<ReservarEspacio />)
    llenarFormulario()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya está reservado/i)
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled()
  })
})
