// filepath: src/features/clientes/pages/ClientesPage.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import Card, { CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Input, { Textarea } from '../../../components/ui/Input';
import { clientesService } from '../services/clientesService';

const emptyForm = {
  nit: '',
  nombre: '',
  telefono: '',
  correo: '',
  direccion: '',
  responsable: '',
  fecha_cumpleaños: '',
  observaciones: '',
  estado: true,
};

const PAGE_SIZE = 20;

export default function ClientesPage() {
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesService.getAll,
  });

  const crearMutate = useMutation({
    mutationFn: clientesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => clientesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  const clientesFiltrados = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return clientes;
    return clientes.filter((cliente) => {
      return [
        cliente.nit,
        cliente.nombre,
        cliente.telefono,
        cliente.correo,
        cliente.responsable,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }, [clientes, query]);

  const totalPages = Math.ceil(clientesFiltrados.length / PAGE_SIZE);
  const clientesPaginados = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return clientesFiltrados.slice(start, start + PAGE_SIZE);
  }, [clientesFiltrados, page]);

  const stats = useMemo(() => {
    return clientes.reduce(
      (acc, cliente) => {
        if (cliente.estado !== false) acc.activos += 1;
        else acc.inactivos += 1;
        return acc;
      },
      { activos: 0, inactivos: 0 },
    );
  }, [clientes]);

  const openModal = (cliente = null) => {
    setSelectedCliente(cliente);
    setErrors({});
    setForm(
      cliente
        ? {
            nit: cliente.nit || '',
            nombre: cliente.nombre || '',
            telefono: cliente.telefono || '',
            correo: cliente.correo || '',
            direccion: cliente.direccion || '',
            responsable: cliente.responsable || '',
            fecha_cumpleaños: cliente.fecha_cumpleaños || '',
            observaciones: cliente.observaciones || '',
            estado: cliente.estado !== false,
          }
        : emptyForm,
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCliente(null);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.nit) nextErrors.nit = 'El NIT es obligatorio';
    if (!form.nombre) nextErrors.nombre = 'El nombre es obligatorio';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const payload = {
        nit: form.nit,
        nombre: form.nombre,
        telefono: form.telefono || null,
        correo: form.correo || null,
        direccion: form.direccion || null,
        responsable: form.responsable || null,
        fecha_cumpleaños: form.fecha_cumpleaños || null,
        observaciones: form.observaciones || null,
        estado: form.estado,
      };

      if (selectedCliente) {
        await actualizarMutate.mutateAsync({ id: selectedCliente.id, data: payload });
      } else {
        await crearMutate.mutateAsync(payload);
      }

      closeModal();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert(error.message || 'No se pudo guardar el cliente.');
    }
  };

  const handleToggleState = async (cliente) => {
    try {
      const newEstado = !cliente.estado;
      console.log(
        `Cambiando estado de ${cliente.nombre} de ${cliente.estado} a ${newEstado}`,
      );

      await actualizarMutate.mutateAsync({
        id: cliente.id,
        data: { ...cliente, estado: newEstado },
      });

      console.log('Cliente actualizado exitosamente');
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert(`Error al cambiar estado del cliente: ${error.message || error}`);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const isMutating = crearMutate.isPending || actualizarMutate.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            NIT, contactos y datos base para facturación
          </p>
        </div>
        <Button onClick={() => openModal()} disabled={isMutating}>
          <Plus size={16} className="mr-1 sm:mr-2" />
          Nuevo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <ClientStatCard label="Activos" value={stats.activos} tone="green" />
        <ClientStatCard
          label="Inactivos"
          value={stats.inactivos}
          tone="slate"
        />
      </div>

      <Card>
        <CardContent>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Buscar por NIT, nombre, teléfono o correo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 table-fixed">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  NIT
                </th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Nombre
                </th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Responsable
                </th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Teléfono
                </th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Correo
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Estado
                </th>
                <th className="w-[16%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientesPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay clientes para mostrar
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center font-medium">
                      {cliente.nit}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 font-medium text-center">
                      {cliente.nombre}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center">
                      {cliente.responsable || '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center">
                      {cliente.telefono || '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center break-all">
                      {cliente.correo || '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Badge
                          className={
                            cliente.estado === false
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-green-100 text-green-700'
                          }
                        >
                          {cliente.estado === false ? 'Inactivo' : 'Activo'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(cliente)}
                          disabled={isMutating}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleState(cliente)}
                          disabled={isMutating}
                          className={
                            cliente.estado === false
                              ? 'border-green-300 text-green-700 hover:bg-green-50'
                              : 'border-red-300 text-red-700 hover:bg-red-50'
                          }
                        >
                          {cliente.estado === false
                            ? 'Activar cliente'
                            : 'Desactivar cliente'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, clientesFiltrados.length)} de {clientesFiltrados.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedCliente ? 'Editar cliente' : 'Nuevo cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="NIT"
              value={form.nit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nit: event.target.value }))
              }
              error={errors.nit}
              required
            />
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
              error={errors.nombre}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, telefono: event.target.value }))
              }
            />
            <Input
              label="Correo"
              type="email"
              value={form.correo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, correo: event.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, direccion: event.target.value }))
              }
            />
            <Input
              label="Responsable"
              value={form.responsable}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  responsable: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha de cumpleaños"
              type="date"
              value={form.fecha_cumpleaños}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  fecha_cumpleaños: event.target.value,
                }))
              }
            />
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.estado}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      estado: event.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  {form.estado ? 'Cliente activo' : 'Cliente inactivo'}
                </span>
              </label>
            </div>
          </div>

          <Textarea
            label="Observaciones"
            value={form.observaciones}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                observaciones: event.target.value,
              }))
            }
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isMutating}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ClientStatCard({ label, value, tone }) {
  const tones = {
    green: 'bg-green-100 text-green-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tones[tone] || tones.slate}`}>
          <Users size={20} />
        </div>
        <div>
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
          <p className="text-base sm:text-xl font-bold text-slate-800">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}