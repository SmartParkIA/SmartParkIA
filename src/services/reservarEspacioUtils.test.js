import { describe, it, expect } from 'vitest'
import { bloquesDeHora, clave, fechaLocal, rangoDeReserva, validarReservaEspacio } from './reservarEspacioUtils.js'

describe('clave', () => {
  it('ignora mayúsculas, acentos y símbolos', () => {
    expect(clave('Cajón #A-12')).toBe('cajon-a-12')
    expect(clave('  SmartPark Central - Zona A ')).toBe('smartpark-central-zona-a')
  })
  it('devuelve vacío si solo hay símbolos', () => {
    expect(clave('###')).toBe('')
  })
})

describe('bloquesDeHora', () => {
  it('10:30–12:30 ocupa las horas 10, 11 y 12', () => {
    const b = bloquesDeHora(new Date('2026-11-03T10:30'), new Date('2026-11-03T12:30'))
    expect(b).toEqual(['2026110310', '2026110311', '2026110312'])
  })
  it('10:00–12:00 deja libre desde las 12:00', () => {
    const b = bloquesDeHora(new Date('2026-11-03T10:00'), new Date('2026-11-03T12:00'))
    expect(b).toEqual(['2026110310', '2026110311'])
  })
  it('cruza la medianoche sin perder bloques', () => {
    const b = bloquesDeHora(new Date('2026-11-03T23:00'), new Date('2026-11-04T01:00'))
    expect(b).toEqual(['2026110323', '2026110400'])
  })
})

describe('rangoDeReserva y fechaLocal', () => {
  it('calcula el fin sumando las horas', () => {
    const { inicio, fin } = rangoDeReserva({ fecha: '2026-11-03', horario: '10:00', duracion: '3' })
    expect(fin.getTime() - inicio.getTime()).toBe(3 * 60 * 60 * 1000)
  })
  it('da la fecha local con ceros', () => {
    expect(fechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('validarReservaEspacio', () => {
  const ahora = new Date('2026-11-03T09:00').getTime()
  const valida = { estacionamiento: 'SmartPark Central', espacio: 'A-12', fecha: '2026-11-03', horario: '10:00', duracion: '2' }

  it('acepta datos correctos', () => {
    expect(validarReservaEspacio(valida, ahora)).toBeNull()
  })
  it('pide estacionamiento y cajón', () => {
    expect(validarReservaEspacio({ ...valida, espacio: '  ' }, ahora)).toMatch(/estacionamiento y el cajón/i)
  })
  it('pide la hora cuando falta', () => {
    expect(validarReservaEspacio({ ...valida, horario: '' }, ahora)).toMatch(/fecha y la hora/i)
  })
  it('rechaza horas que ya pasaron', () => {
    expect(validarReservaEspacio({ ...valida, horario: '08:00' }, ahora)).toMatch(/ya pasó/i)
  })
  it('rechaza duraciones fuera de 1 a 12 horas o con decimales', () => {
    expect(validarReservaEspacio({ ...valida, duracion: '0' }, ahora)).toMatch(/1 a 12/)
    expect(validarReservaEspacio({ ...valida, duracion: '13' }, ahora)).toMatch(/1 a 12/)
    expect(validarReservaEspacio({ ...valida, duracion: '1.5' }, ahora)).toMatch(/1 a 12/)
  })
})
