import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, UserCog } from 'lucide-react';
import { getCitasPorFecha, getCitas } from '../services/dbService';

function Calendario() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vista, setVista] = useState('mes'); // 'mes', 'semana', 'dia'
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCitas();
  }, [fechaActual, vista]);

  const loadCitas = async () => {
    try {
      setLoading(true);
      let fechaInicio, fechaFin;

      if (vista === 'mes') {
        const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
        fechaInicio = primerDia.toISOString().split('T')[0];
        fechaFin = ultimoDia.toISOString().split('T')[0];
      } else if (vista === 'semana') {
        const inicioSemana = new Date(fechaActual);
        inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        fechaInicio = inicioSemana.toISOString().split('T')[0];
        fechaFin = finSemana.toISOString().split('T')[0];
      } else {
        fechaInicio = fechaActual.toISOString().split('T')[0];
        fechaFin = fechaInicio;
      }

      const data = await getCitas({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      setCitas(data);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    if (vista === 'mes') {
      nuevaFecha.setMonth(fechaActual.getMonth() + direccion);
    } else if (vista === 'semana') {
      nuevaFecha.setDate(fechaActual.getDate() + (direccion * 7));
    } else {
      nuevaFecha.setDate(fechaActual.getDate() + direccion);
    }
    setFechaActual(nuevaFecha);
  };

  const irAHoy = () => {
    setFechaActual(new Date());
  };

  const getDiasMes = () => {
    const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias = [];
    
    // Días del mes anterior
    const mesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 0);
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      dias.push({
        fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, mesAnterior.getDate() - i),
        esDelMes: false,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push({
        fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth(), i),
        esDelMes: true,
      });
    }

    // Completar hasta 42 días (6 semanas)
    const diasRestantes = 42 - dias.length;
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push({
        fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, i),
        esDelMes: false,
      });
    }

    return dias;
  };

  const getCitasDia = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return citas.filter(c => c.fecha === fechaStr);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'programada':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'en_proceso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completada':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const esHoy = (fecha) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  if (vista !== 'mes') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Calendario</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setVista('mes')}
              className={`btn btn-sm ${vista === 'mes' ? 'btn-primary' : 'btn-outline'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setVista('semana')}
              className={`btn btn-sm ${vista === 'semana' ? 'btn-primary' : 'btn-outline'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setVista('dia')}
              className={`btn btn-sm ${vista === 'dia' ? 'btn-primary' : 'btn-outline'}`}
            >
              Día
            </button>
          </div>
        </div>
        <p className="text-gray-600">Vista {vista} en desarrollo. Usa la vista mensual.</p>
      </div>
    );
  }

  const dias = getDiasMes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Calendario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setVista('mes')}
            className={`btn btn-sm ${vista === 'mes' ? 'btn-primary' : 'btn-outline'}`}
          >
            Mes
          </button>
          <button
            onClick={() => setVista('semana')}
            className={`btn btn-sm ${vista === 'semana' ? 'btn-primary' : 'btn-outline'}`}
          >
            Semana
          </button>
          <button
            onClick={() => setVista('dia')}
            className={`btn btn-sm ${vista === 'dia' ? 'btn-primary' : 'btn-outline'}`}
          >
            Día
          </button>
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => cambiarMes(-1)}
            className="btn btn-ghost btn-sm"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {nombresMeses[fechaActual.getMonth()]} {fechaActual.getFullYear()}
            </h2>
            <button
              onClick={irAHoy}
              className="btn btn-sm btn-outline"
            >
              Hoy
            </button>
          </div>

          <button
            onClick={() => cambiarMes(1)}
            className="btn btn-ghost btn-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Encabezados de días */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {nombresDias.map((dia) => (
            <div key={dia} className="p-3 text-center font-semibold text-gray-700 bg-gray-50">
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7">
          {dias.map((dia, index) => {
            const citasDia = getCitasDia(dia.fecha);
            const esHoyDia = esHoy(dia.fecha);

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                  !dia.esDelMes ? 'bg-gray-50' : 'bg-white'
                } ${esHoyDia ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${!dia.esDelMes ? 'text-gray-400' : esHoyDia ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                  {dia.fecha.getDate()}
                </div>
                <div className="space-y-1">
                  {citasDia.slice(0, 3).map((cita) => (
                    <div
                      key={cita.id}
                      className={`text-xs p-1 rounded border ${getEstadoColor(cita.estado)} truncate`}
                      title={`${cita.hora_inicio} - ${cita.paciente_nombre}`}
                    >
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        <span className="font-medium">{cita.hora_inicio}</span>
                      </div>
                      <div className="truncate">{cita.paciente_nombre}</div>
                    </div>
                  ))}
                  {citasDia.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{citasDia.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Leyenda</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-700">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm text-gray-700">En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-sm text-gray-700">Cancelada</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calendario;

