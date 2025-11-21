import { exportarAExcel, exportarPacientes, exportarCitas } from '../../utils/excelExporter';
import * as XLSX from 'xlsx';

// Mock de xlsx
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

describe('Excel Exporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exportarAExcel crea un archivo Excel correctamente', () => {
    const datos = [
      { nombre: 'Test 1', valor: 100 },
      { nombre: 'Test 2', valor: 200 },
    ];
    
    exportarAExcel(datos, 'test_file', 'Test Sheet');
    
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(datos);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), 'test_file.xlsx');
  });

  test('exportarPacientes formatea los datos correctamente', () => {
    const pacientes = [
      { id: 1, nombre: 'Juan Pérez', dni: '12345678', telefono: '987654321' },
      { id: 2, nombre: 'María García', dni: '87654321', telefono: '123456789' },
    ];
    
    exportarPacientes(pacientes);
    
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'ID': 1,
          'Nombre': 'Juan Pérez',
          'DNI': '12345678',
        }),
      ])
    );
  });

  test('exportarCitas formatea los datos correctamente', () => {
    const citas = [
      {
        id: 1,
        paciente_nombre: 'Juan Pérez',
        odontologo_nombre: 'Dr. García',
        fecha: '2024-12-01',
        hora_inicio: '09:00',
        hora_fin: '10:00',
        estado: 'programada',
      },
    ];
    
    exportarCitas(citas);
    
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'ID': 1,
          'Paciente': 'Juan Pérez',
          'Odontólogo': 'Dr. García',
        }),
      ])
    );
  });
});

