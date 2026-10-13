import { describe, it, expect } from 'vitest'
import {
  estadoDeSede,
  filtrarSedes,
  normalizarDetalle,
  normalizarSede,
  tieneUbicacion,
  urlComoLlegar,
} from './sedesUtils.js'

const sede = (id, nombre, disponibles, total = 100) => ({
  id, nombre, direccion: 'Calle 1', lat: 19.4, lng: -99.1,
  espaciosTotales: total, espaciosDisponibles: disponibles, tarifaHora: 30, horario: '24 horas',
})

describe('estadoDeSede', () => {
  it('clasifica la disponibilidad', () => {
    expect(estadoDeSede(sede(1, 'A', 0))).toBe('lleno')
    expect(estadoDeSede(sede(1, 'A', 19))).toBe('pocos')
    expect(estadoDeSede(sede(1, 'A', 20))).toBe('libre')
  })
})

describe('filtrarSedes', () => {
  const sedes = [sede(1, 'Reforma', 40), sede(2, 'Zócalo', 0)]

  it('sin filtros devuelve todas', () => {
    expect(filtrarSedes(sedes)).toHaveLength(2)
  })
  it('busca por nombre sin importar mayúsculas', () => {
    expect(filtrarSedes(sedes, { busqueda: 'ZÓCALO' }).map((s) => s.id)).toEqual([2])
  })
  it('quita las sedes llenas con soloDisponibles', () => {
    expect(filtrarSedes(sedes, { soloDisponibles: true }).map((s) => s.id)).toEqual([1])
  })
})

describe('normalizarSede', () => {
  it('lee la ubicación desde un GeoPoint', () => {
    const s = normalizarSede('abc', {
      nombre: 'Polanco', ubicacion: { latitude: 19.43, longitude: -99.19 },
      espaciosTotales: 150, espaciosDisponibles: 72, tarifaHora: 55,
    })
    expect(s).toMatchObject({ id: 'abc', lat: 19.43, lng: -99.19, espaciosDisponibles: 72 })
    expect(tieneUbicacion(s)).toBe(true)
  })
  it('lee lat y lng sueltos y acepta capacidad/disponibles', () => {
    const s = normalizarSede('x', { lat: 19.4, lng: -99.1, capacidad: 50, disponibles: 5 })
    expect(s).toMatchObject({ espaciosTotales: 50, espaciosDisponibles: 5 })
  })
  it('marca como sin ubicación a las sedes sin coordenadas', () => {
    expect(tieneUbicacion(normalizarSede('x', { nombre: 'Sin mapa' }))).toBe(false)
  })
})

describe('normalizarDetalle', () => {
  it('ordena los horarios por día de la semana y acepta acentos', () => {
    const d = normalizarDetalle({
      horarios: { domingo: '08:00 – 20:00', lunes: '06:00 – 23:00', sábado: '07:00 – 23:00' },
    })
    expect(d.horarios.map((h) => h.dia)).toEqual(['Lunes', 'Sábado', 'Domingo'])
  })

  it('usa el campo `horario` cuando no hay `horarios`', () => {
    const d = normalizarDetalle({ horario: '24 horas' })
    expect(d.horarios).toEqual([{ dia: 'Todos los días', horas: '24 horas' }])
  })

  it('pone etiquetas legibles a las tarifas y descarta valores inválidos', () => {
    const d = normalizarDetalle({ tarifas: { hora: 40, diaCompleto: 260, mensual: null, extra: 'abc' } })
    expect(d.tarifas).toEqual([
      { concepto: 'Por hora', monto: 40 },
      { concepto: 'Día completo', monto: 260 },
    ])
  })

  it('usa `tarifaHora` cuando no hay `tarifas`', () => {
    expect(normalizarDetalle({ tarifaHora: 35 }).tarifas).toEqual([{ concepto: 'Por hora', monto: 35 }])
  })

  it('acepta reglas como lista o como texto con saltos de línea', () => {
    expect(normalizarDetalle({ reglas: ['A', ' ', 'B'] }).reglas).toEqual(['A', 'B'])
    expect(normalizarDetalle({ reglas: 'A\nB\n\nC' }).reglas).toEqual(['A', 'B', 'C'])
  })

  it('devuelve listas vacías cuando no hay datos', () => {
    expect(normalizarDetalle({})).toEqual({
      referencia: '', telefono: '', horarios: [], tarifas: [], reglas: [], servicios: [],
    })
  })
})

describe('urlComoLlegar', () => {
  it('usa las coordenadas cuando existen', () => {
    expect(urlComoLlegar(sede(1, 'A', 5))).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=19.4,-99.1',
    )
  })
  it('usa la dirección cuando no hay coordenadas', () => {
    const s = { ...sede(1, 'A', 5), lat: NaN, lng: NaN, direccion: 'Av. Juárez 70' }
    expect(urlComoLlegar(s)).toContain('destination=Av.%20Ju%C3%A1rez%2070')
  })
  it('devuelve null si no hay ni coordenadas ni dirección', () => {
    expect(urlComoLlegar({ lat: NaN, lng: NaN, direccion: '' })).toBeNull()
  })
})
