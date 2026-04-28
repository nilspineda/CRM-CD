import { useEffect, useState } from "react";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import { clientesService } from "../../clientes/services/clientesService";
import { formatCurrency, formatDate } from "../../../lib/utils";

export default function ClienteFacturasModal({
  clienteId,
  open,
  onClose,
  onSelect,
}) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clienteId) return;
    loadFacturas();
  }, [open, clienteId]);

  const loadFacturas = async () => {
    try {
      setLoading(true);
      const data = await clientesService.getFacturasPorCliente(clienteId);
      setFacturas(data || []);
    } catch (err) {
      console.error("Error cargando facturas del cliente", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Facturas del cliente"
      size="lg"
    >
      <div className="space-y-3">
        {loading ? (
          <p>Cargando facturas...</p>
        ) : facturas.length === 0 ? (
          <p>No hay facturas para este cliente.</p>
        ) : (
          <div className="space-y-2">
            {facturas.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <p className="font-medium">{f.numero_factura}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(f.fecha)} • {formatCurrency(f.valor_total)}
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelect(f);
                      onClose();
                    }}
                  >
                    Seleccionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
