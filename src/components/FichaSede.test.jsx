// Tareas 025 y 026: ficha técnica y carga dinámica de detalles.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import FichaSede from './FichaSede.jsx'
import { obtenerDetalleSede } from '../services/sedesService.js'

// Evita inicializar Firebase en las pruebas.
vi.mock('../services/sedesService.js', () => ({ obtenerDetalleSede: vi.fn() }))

const SEDE_A = { id: 'a', nombre: 'Sede Reforma', direccion: 'Av. Reforma 250', lat: 19.42, lng: -99.16, espaciosTotales: 100, espaciosDisponibles: 40, tarifaHora: 40, horario: '24 horas' }
const SEDE_B = { id: 'b', nombre: 'Sede Alameda', direccion: 'Av. Juárez 70', lat: 19.43, lng: -99.14, espaciosTotales: 80, espaciosDisponibles: 6, tarifaHora: 35, horario: '' }

const DETALLE = {
  referencia: 'Frente al Ángel',
  telefono: '5555550101',
  horarios: [{ dia: 'Lunes', horas: '06:00 – 23:00' }],
  tarifas: [{ concepto: 'Por hora', monto: 40 }, { concepto: 'Día completo', monto: 260 }],
  reglas: ['Altura máxima de 2.10 m.'],
  servicios: ['Techado'],
}
const VACIO = { referencia: '', telefono: '', horarios: [], tarifas: [], reglas: [], servicios: [] }

describe('FichaSede', () => {
  beforeEach(() => {
    obtenerDetalleSede.mockReset()
    obtenerDetalleSede.mockResolvedValue(DETALLE)
  })

  it('muestra enseguida el resumen y luego carga horarios, precios y reglas', async () => {
    render(<FichaSede sede={SEDE_A} onVolver={() => {}} onVerMapa={() => {}} />)

    // Antes de que lleguen los detalles ya se ve lo básico
    expect(screen.getByRole('heading', { name: 'Sede Reforma' })).toBeInTheDocument()
    expect(screen.getByText('Av. Reforma 250')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/cargando información/i)

    // Después aparecen las secciones
    expect(await screen.findByRole('heading', { name: 'Horarios' })).toBeInTheDocument()
    expect(screen.getByText('06:00 – 23:00')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Precios' })).toBeInTheDocument()
    expect(screen.getByText(/\$260/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /reglas/i })).toBeInTheDocument()
    expect(screen.getByText('Altura máxima de 2.10 m.')).toBeInTheDocument()
    expect(screen.getByText('Techado')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('pide los detalles de la sede seleccionada', async () => {
    render(<FichaSede sede={SEDE_A} onVolver={() => {}} onVerMapa={() => {}} />)
    await screen.findByRole('heading', { name: 'Horarios' })
    expect(obtenerDetalleSede).toHaveBeenCalledWith('a')
  })

  it('carga los detalles de la nueva sede cuando cambia la selección', async () => {
    const { rerender } = render(<FichaSede sede={SEDE_A} onVolver={() => {}} onVerMapa={() => {}} />)
    await screen.findByRole('heading', { name: 'Horarios' })

    obtenerDetalleSede.mockResolvedValue({ ...VACIO, reglas: ['Regla de Alameda'] })
    rerender(<FichaSede sede={SEDE_B} onVolver={() => {}} onVerMapa={() => {}} />)

    expect(await screen.findByText('Regla de Alameda')).toBeInTheDocument()
    expect(obtenerDetalleSede).toHaveBeenLastCalledWith('b')
    expect(screen.queryByText('Altura máxima de 2.10 m.')).not.toBeInTheDocument()
  })

  it('muestra el enlace Cómo llegar con las coordenadas de la sede', async () => {
    render(<FichaSede sede={SEDE_A} onVolver={() => {}} onVerMapa={() => {}} />)
    const enlace = screen.getByRole('link', { name: /cómo llegar/i })
    expect(enlace).toHaveAttribute('href', expect.stringContaining('destination=19.42,-99.16'))
    expect(enlace).toHaveAttribute('target', '_blank')
    await screen.findByRole('heading', { name: 'Horarios' })
  })

  it('muestra el error y permite reintentar sin perder el resumen', async () => {
    obtenerDetalleSede.mockRejectedValueOnce(new Error('No se pudo cargar la información de la sede.'))
    render(<FichaSede sede={SEDE_A} onVolver={() => {}} onVerMapa={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo cargar/i)
    expect(screen.getByRole('heading', { name: 'Sede Reforma' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('heading', { name: 'Horarios' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa cuando la sede no tiene más información', async () => {
    obtenerDetalleSede.mockResolvedValue(VACIO)
    render(<FichaSede sede={SEDE_B} onVolver={() => {}} onVerMapa={() => {}} />)
    expect(await screen.findByText(/todavía no tiene más información/i)).toBeInTheDocument()
  })

  it('avisa a la pantalla principal al volver y al pedir el mapa', async () => {
    const onVolver = vi.fn()
    const onVerMapa = vi.fn()
    render(<FichaSede sede={SEDE_A} onVolver={onVolver} onVerMapa={onVerMapa} />)
    await screen.findByRole('heading', { name: 'Horarios' })

    await userEvent.click(screen.getByRole('button', { name: /volver a la lista/i }))
    await userEvent.click(screen.getByRole('button', { name: /ver en el mapa/i }))
    expect(onVolver).toHaveBeenCalledTimes(1)
    expect(onVerMapa).toHaveBeenCalledTimes(1)
  })
})
