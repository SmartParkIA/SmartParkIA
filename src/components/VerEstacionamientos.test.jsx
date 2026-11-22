// Pruebas de visualización del listado, el mapa y la apertura de la ficha.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import VerEstacionamientos from './VerEstacionamientos.jsx'
import { obtenerDetalleSede, obtenerSedes } from '../services/sedesService.js'

// jsdom no puede dibujar mapas reales, así que se simula react-leaflet.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: ({ position, eventHandlers }) => (
    <button type="button" data-testid="marcador" onClick={eventHandlers?.click}>
      {position.join(',')}
    </button>
  ),
  useMap: () => ({ flyTo: vi.fn(), invalidateSize: vi.fn() }),
}))
// Evita inicializar Firebase en las pruebas.
vi.mock('../services/sedesService.js', () => ({
  obtenerSedes: vi.fn(),
  obtenerDetalleSede: vi.fn(),
}))

const SEDES = [
  { id: 'a', nombre: 'Sede Reforma', direccion: 'Av. Reforma 250', lat: 19.42, lng: -99.16, espaciosTotales: 100, espaciosDisponibles: 40, tarifaHora: 40, horario: '24 horas' },
  { id: 'b', nombre: 'Sede Zócalo', direccion: 'Calle 5 de Febrero 12', lat: 19.43, lng: -99.13, espaciosTotales: 60, espaciosDisponibles: 0, tarifaHora: 30, horario: '07:00 – 21:00' },
  { id: 'c', nombre: 'Sede Sin Mapa', direccion: 'Sin coordenadas', lat: NaN, lng: NaN, espaciosTotales: 30, espaciosDisponibles: 10, tarifaHora: 20, horario: '' },
]
const DETALLE = {
  referencia: '', telefono: '',
  horarios: [{ dia: 'Lunes', horas: '06:00 – 23:00' }],
  tarifas: [], reglas: ['Altura máxima de 2.10 m.'], servicios: [],
}

describe('VerEstacionamientos', () => {
  beforeEach(() => {
    obtenerSedes.mockReset()
    obtenerDetalleSede.mockReset()
    obtenerSedes.mockResolvedValue(SEDES)
    obtenerDetalleSede.mockResolvedValue(DETALLE)
  })

  it('muestra el estado de carga y luego la lista de sedes', async () => {
    render(<VerEstacionamientos />)
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i)
    expect(await screen.findByText('Sede Reforma')).toBeInTheDocument()
    expect(screen.getByText('Sede Zócalo')).toBeInTheDocument()
  })

  it('dibuja marcadores solo para las sedes con ubicación', async () => {
    render(<VerEstacionamientos />)
    await screen.findByText('Sede Reforma')
    expect(screen.getAllByTestId('marcador')).toHaveLength(2)
    expect(screen.getByText('Sede Sin Mapa')).toBeInTheDocument()
  })

  it('filtra por texto de búsqueda', async () => {
    render(<VerEstacionamientos />)
    await screen.findByText('Sede Reforma')
    await userEvent.type(screen.getByLabelText(/buscar estacionamiento/i), 'zócalo')
    expect(screen.queryByText('Sede Reforma')).not.toBeInTheDocument()
    expect(screen.getByText('Sede Zócalo')).toBeInTheDocument()
    expect(screen.getAllByTestId('marcador')).toHaveLength(1)
  })

  it('oculta las sedes llenas con el filtro de disponibilidad', async () => {
    render(<VerEstacionamientos />)
    await screen.findByText('Sede Reforma')
    await userEvent.click(screen.getByLabelText(/solo con lugares disponibles/i))
    expect(screen.queryByText('Sede Zócalo')).not.toBeInTheDocument()
  })

  it('avisa cuando los filtros no devuelven resultados', async () => {
    render(<VerEstacionamientos />)
    await screen.findByText('Sede Reforma')
    await userEvent.type(screen.getByLabelText(/buscar estacionamiento/i), 'xyz')
    expect(screen.getByText(/no encontramos estacionamientos/i)).toBeInTheDocument()
  })

  it('avisa cuando todavía no hay sedes registradas', async () => {
    obtenerSedes.mockResolvedValue([])
    render(<VerEstacionamientos />)
    expect(await screen.findByText(/todavía no hay estacionamientos/i)).toBeInTheDocument()
  })

  it('muestra el error y permite reintentar', async () => {
    obtenerSedes.mockRejectedValueOnce(new Error('No se pudieron cargar las sedes.'))
    render(<VerEstacionamientos />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudieron cargar/i)
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    await waitFor(() => expect(screen.getByText('Sede Reforma')).toBeInTheDocument())
  })

  it('abre la ficha de la sede elegida, carga sus detalles y permite volver', async () => {
    render(<VerEstacionamientos />)
    await userEvent.click(await screen.findByRole('button', { name: /sede reforma/i }))

    expect(await screen.findByRole('heading', { name: 'Sede Reforma' })).toBeInTheDocument()
    expect(obtenerDetalleSede).toHaveBeenCalledWith('a')
    expect(await screen.findByText('Altura máxima de 2.10 m.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /volver a la lista/i }))
    expect(screen.getByText('Sede Zócalo')).toBeInTheDocument()
  })

  it('abre la ficha al tocar un marcador del mapa', async () => {
    render(<VerEstacionamientos />)
    await screen.findByText('Sede Reforma')
    await userEvent.click(screen.getAllByTestId('marcador')[1])
    expect(await screen.findByRole('heading', { name: 'Sede Zócalo' })).toBeInTheDocument()
    expect(obtenerDetalleSede).toHaveBeenCalledWith('b')
  })
})
