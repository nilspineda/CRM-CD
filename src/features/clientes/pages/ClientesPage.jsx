// filepath: src/features/clientes/pages/ClientesPage.jsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Plus, Search, Users } from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input, { Textarea } from "../../../components/ui/Input";
import { clientesService } from "../services/clientesService";
import { toUpperAll } from "../../../lib/utils";

const emptyForm = {
  nit: "",
  nombre: "",
  telefono: "",
  correo: "",
  direccion: "",
  responsable: "",
  fecha_cumpleaños: "",
  observaciones: "",
  estado: true,
};

const PAGE_SIZE = 20;

function getWhatsAppUrl(phone) {
  if (!phone) return null;

  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  // Si viene sin prefijo y parece numero local de CO (10 digitos), agregar 57.
  const normalized =
    digits.length === 10 && !digits.startsWith("57") ? `57${digits}` : digits;

  return `https://wa.me/${normalized}`;
}

function getGmailComposeUrl(email) {
  if (!email) return null;

  const normalized = String(email).trim();
  if (!normalized) return null;

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(normalized)}`;
}

export default function ClientesPage() {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ["clientes", "stats"],
    queryFn: clientesService.getStats,
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientes = {}, isLoading } = useQuery({
    queryKey: ["clientes", "paginated", page, query],
    queryFn: () =>
      clientesService.getPaginated({
        page,
        pageSize: PAGE_SIZE,
        search: query,
      }),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const totalPages = Math.ceil((clientes.count || 0) / PAGE_SIZE);
  const clientesPaginados = clientes.data || [];

  const crearMutate = useMutation({
    mutationFn: clientesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes", "stats"] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => clientesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes", "stats"] });
    },
  });

  const stats = useMemo(() => {
    return {
      activos: statsData?.activos || 0,
      inactivos: statsData?.inactivos || 0,
    };
  }, [statsData]);

  const openModal = (cliente = null) => {
    setSelectedCliente(cliente);
    setErrors({});
    setForm(
      cliente
        ? {
            nit: cliente.nit || "",
            nombre: cliente.nombre || "",
            telefono: cliente.telefono || "",
            correo: cliente.correo || "",
            direccion: cliente.direccion || "",
            responsable: cliente.responsable || "",
            fecha_cumpleaños: cliente.fecha_cumpleaños || "",
            observaciones: cliente.observaciones || "",
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

    if (!form.nombre) nextErrors.nombre = "El nombre es obligatorio";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      let payload = {
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

      // Normalizar todo a mayúsculas (según regla: nada se guarda en minúsculas)
      payload = toUpperAll(payload);

      if (selectedCliente) {
        await actualizarMutate.mutateAsync({
          id: selectedCliente.id,
          data: payload,
        });
      } else {
        await crearMutate.mutateAsync(payload);
      }

      closeModal();
    } catch (error) {
      console.error("Error guardando cliente:", error);
      alert(error.message || "No se pudo guardar el cliente.");
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

      console.log("Cliente actualizado exitosamente");
    } catch (error) {
      console.error("Error cambiando estado:", error);
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
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
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por NIT, nombre, teléfono o correo..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 table-fixed mobile-card-table">
            <thead className="bg-slate-50 dark:bg-slate-800 hidden sm:table-header-group">
              <tr>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  NIT
                </th>
                <th className="w-[15%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Empresa
                </th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Responsable
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Teléfono
                </th>
                <th className="w-[15%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Correo
                </th>
                <th className="w-[16%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Dirección
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientesPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay clientes para mostrar
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center font-medium">
                      {cliente.nit}
                    </td>
                    <td
                      data-label="Empresa"
                      className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium text-center"
                    >
                      {cliente.nombre}
                    </td>
                    <td
                      data-label="Responsable"
                      className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center"
                    >
                      {cliente.responsable || "-"}
                    </td>
                    <td
                      data-label="Teléfono"
                      className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center"
                    >
                      {cliente.telefono ? (
                        <a
                          href={getWhatsAppUrl(cliente.telefono)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-500/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title="Abrir chat en WhatsApp Web"
                        >
                          <MessageCircle size={14} />
                          <span>{cliente.telefono}</span>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      data-label="Correo"
                      className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center break-all"
                    >
                      {cliente.correo ? (
                        <a
                          href={getGmailComposeUrl(cliente.correo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          title="Enviar correo con Gmail"
                        >
                          <Mail size={14} />
                          <span>{cliente.correo}</span>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      data-label="Dirección"
                      className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center"
                    >
                      {cliente.direccion || "-"}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleToggleState(cliente)}
                          disabled={isMutating}
                          className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            cliente.estado === false
                              ? "bg-slate-300 dark:bg-slate-600"
                              : "bg-green-500 dark:bg-green-600"
                          }`}
                          title={
                            cliente.estado === false
                              ? "Activar cliente"
                              : "Desactivar cliente"
                          }
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              cliente.estado === false
                                ? "translate-x-1"
                                : "translate-x-6"
                            }`}
                          />
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(cliente)}
                          disabled={isMutating}
                        >
                          Editar
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(page * PAGE_SIZE, clientes.count || 0)} de{" "}
              {clientes.count || 0}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
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
        title={selectedCliente ? "Editar cliente" : "Nuevo cliente"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="NIT"
              value={form.nit}
              forceUppercase
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nit: event.target.value }))
              }
              error={errors.nit}
            />
            <Input
              label="Nombre"
              value={form.nombre}
              forceUppercase
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
              forceUppercase
              onChange={(event) =>
                setForm((prev) => ({ ...prev, direccion: event.target.value }))
              }
            />
            <Input
              label="Responsable"
              value={form.responsable}
              forceUppercase
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
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {form.estado ? "Cliente activo" : "Cliente inactivo"}
                </span>
              </label>
            </div>
          </div>

          <Textarea
            label="Observaciones"
            value={form.observaciones}
            forceUppercase
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
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tones[tone] || tones.slate}`}>
          <Users size={20} />
        </div>
        <div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {label}
          </p>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
