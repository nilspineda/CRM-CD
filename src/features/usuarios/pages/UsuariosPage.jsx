import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  Settings,
} from "lucide-react";
import Card, { CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input, { Select } from "../../../components/ui/Input";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLES,
  getRoleLabel,
} from "../../auth/permissions";
import { usuariosService } from "../services/usuariosService";

const EMPTY_INVITE = {
  email: "",
  fullName: "",
  roleKey: ROLES.AUXILIAR,
};

const permissionLabels = {
  [PERMISSIONS.DASHBOARD_VIEW]: "Ver dashboard",
  [PERMISSIONS.USUARIOS_MANAGE]: "Administrar usuarios",
  [PERMISSIONS.CLIENTES_VIEW]: "Ver clientes",
  [PERMISSIONS.CLIENTES_CREATE]: "Crear clientes",
  [PERMISSIONS.CLIENTES_EDIT]: "Editar clientes",
  [PERMISSIONS.CLIENTES_DELETE]: "Eliminar clientes",
  [PERMISSIONS.MOVIMIENTOS_VIEW]: "Ver movimientos",
  [PERMISSIONS.MOVIMIENTOS_CREATE]: "Crear movimientos",
  [PERMISSIONS.MOVIMIENTOS_EDIT]: "Editar movimientos",
  [PERMISSIONS.MOVIMIENTOS_DELETE]: "Eliminar movimientos",
  [PERMISSIONS.FACTURAS_VIEW]: "Ver facturas",
  [PERMISSIONS.FACTURAS_CREATE]: "Crear facturas",
  [PERMISSIONS.FACTURAS_EDIT]: "Editar facturas",
  [PERMISSIONS.FACTURAS_CHANGE_STATE]: "Cambiar estado de facturas",
  [PERMISSIONS.CUENTAS_VIEW]: "Ver cuentas",
  [PERMISSIONS.IVA_VIEW]: "Ver IVA",
  [PERMISSIONS.REPORTES_VIEW]: "Ver reportes",
};

const normalizePermissions = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }
  return [];
};

const getRolePermissions = (roles, roleKey) =>
  normalizePermissions(roles.find((role) => role.key === roleKey)?.permissions);

const mergePermissions = (basePermissions, extraPermissions = []) =>
  Array.from(new Set([...(basePermissions || []), ...(extraPermissions || [])]));

function MetricCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <Card className={`border ${tones[tone] || tones.blue}`}>
      <CardContent className="flex items-center gap-3 p-4 sm:p-6">
        <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-70">{label}</p>
          <p className="text-2xl font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function UsuariosPage() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", roleKey: ROLES.AUXILIAR });
  const [editPermissions, setEditPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleSettingsOpen, setRoleSettingsOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [invitePermissions, setInvitePermissions] = useState([]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users],
  );

  const selectedRole = useMemo(
    () => roles.find((role) => role.key === selectedRoleKey) || null,
    [selectedRoleKey, roles],
  );

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [rolesData, usersData] = await Promise.all([
        usuariosService.getRoles(),
        usuariosService.getUsers(),
      ]);

      setRoles(rolesData);
      setUsers(usersData);
    } catch (loadError) {
      console.error("Error cargando usuarios:", loadError);
      setError(loadError.message || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUser, users]);

  useEffect(() => {
    if (!selectedUser) return;

    const rolePerms = getRolePermissions(roles, selectedUser.role_key);
    const customPerms = normalizePermissions(selectedUser.permissions).filter(
      (permission) => !rolePerms.includes(permission),
    );

    setEditForm({
      fullName: selectedUser.full_name || "",
      roleKey: selectedUser.role_key || ROLES.AUXILIAR,
    });
    setEditPermissions(mergePermissions(rolePerms, customPerms));
  }, [roles, selectedUser]);

  useEffect(() => {
    if (!selectedRole) {
      if (roles.length > 0) {
        setSelectedRoleKey(roles[0].key);
      }
      return;
    }

    setRolePermissions(normalizePermissions(selectedRole.permissions));
  }, [roles, selectedRole]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const haystack = [user.email, user.full_name, user.role_key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [searchTerm, users]);

  const summary = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((user) => user.role_key === ROLES.SUPER_ADMIN).length;
    const auxiliars = users.filter((user) => user.role_key === ROLES.AUXILIAR).length;
    return { total, superAdmins, auxiliars };
  }, [users]);

  const handleEditPermissionToggle = (permission) => {
    setEditPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission],
    );
  };

  const handleRolePermissionToggle = (permission) => {
    setRolePermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission],
    );
  };

  const handleInvitePermissionToggle = (permission) => {
    setInvitePermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission],
    );
  };

  const handleSelectedRoleChange = (roleKey) => {
    const defaultPermissions = getRolePermissions(roles, roleKey);
    setEditForm((prev) => ({ ...prev, roleKey }));
    setEditPermissions(defaultPermissions);
  };

  const handleInviteRoleChange = (roleKey) => {
    const defaultPermissions = getRolePermissions(roles, roleKey);
    setInviteForm((prev) => ({ ...prev, roleKey }));
    setInvitePermissions(defaultPermissions);
  };

  const openInvite = () => {
    const defaultRole = ROLES.AUXILIAR;
    setInviteForm(EMPTY_INVITE);
    setInviteForm((prev) => ({ ...prev, roleKey: defaultRole }));
    setInvitePermissions(getRolePermissions(roles, defaultRole));
    setInviteOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    setError("");

    try {
      const updated = await usuariosService.updateUserAccess(selectedUser.id, {
        full_name: editForm.fullName.trim() || null,
        role_key: editForm.roleKey,
        permissions: editPermissions,
      });

      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setSelectedUserId(updated.id);
    } catch (saveError) {
      console.error("Error guardando usuario:", saveError);
      setError(saveError.message || "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError("");

    try {
      const updated = await usuariosService.updateRolePermissions(
        selectedRole.key,
        rolePermissions,
      );

      setRoles((prev) =>
        prev.map((role) => (role.key === updated.key ? updated : role)),
      );
      setSelectedRoleKey(updated.key);
      setRoleSettingsOpen(false);
    } catch (saveError) {
      console.error("Error guardando rol:", saveError);
      setError(saveError.message || "No se pudo guardar el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await usuariosService.inviteUser({
        email: inviteForm.email,
        full_name: inviteForm.fullName,
        role_key: inviteForm.roleKey,
        permissions: invitePermissions,
      });

      setInviteOpen(false);
      setInviteForm(EMPTY_INVITE);
      setInvitePermissions([]);
      await refreshData();
    } catch (inviteError) {
      console.error("Error invitando usuario:", inviteError);
      setError(inviteError.message || "No se pudo enviar la invitación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Usuarios y permisos
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Administra invitaciones reales, roles y permisos por checks.
          </p>
        </div>
        {activeTab === "usuarios" && (
          <Button onClick={openInvite} className="shrink-0">
            <UserPlus size={16} className="mr-2" />
            Invitar usuario
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 px-1">
        <TabButton
          active={activeTab === "usuarios"}
          onClick={() => setActiveTab("usuarios")}
        >
          <Users size={16} className="inline mr-2" />
          Usuarios
        </TabButton>
        <TabButton
          active={activeTab === "roles"}
          onClick={() => setActiveTab("roles")}
        >
          <Settings size={16} className="inline mr-2" />
          Roles y permisos
        </TabButton>
      </div>

      {activeTab === "usuarios" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <MetricCard icon={Users} label="Usuarios" value={summary.total} tone="blue" />
            <MetricCard icon={ShieldCheck} label="SuperAdmins" value={summary.superAdmins} tone="violet" />
            <MetricCard icon={CheckCircle2} label="Auxiliares" value={summary.auxiliars} tone="green" />
          </div>

          {error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Directorio</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Selecciona un usuario para editar su rol y permisos.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por nombre, correo o rol"
                      className="w-full rounded-lg border border-slate-300 bg-white px-9 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/60">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Permisos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-16 text-center text-slate-500">
                            Cargando usuarios...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-16 text-center text-slate-500">
                            No hay usuarios para mostrar
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const userPermissions = mergePermissions(
                            getRolePermissions(roles, user.role_key),
                            normalizePermissions(user.permissions),
                          );
                          const isActive = selectedUserId === user.id;

                          return (
                            <tr
                              key={user.id}
                              onClick={() => setSelectedUserId(user.id)}
                              className={`cursor-pointer transition-colors ${
                                isActive ? "bg-blue-50" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900">{user.full_name || "Sin nombre"}</p>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Mail size={14} />
                                    <span className="break-all">{user.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {getRoleLabel(user.role_key)}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top text-sm text-slate-600">
                                {userPermissions.length} permisos
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editor de acceso</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedUser ? selectedUser.email : "Selecciona un usuario"}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedUser ? (
                  <>
                    <Input
                      label="Nombre completo"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                      placeholder="Nombre del usuario"
                    />

                    <Select
                      label="Rol"
                      name="roleKey"
                      value={editForm.roleKey}
                      onChange={(event) => handleSelectedRoleChange(event.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.label}
                        </option>
                      ))}
                    </Select>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Permisos personalizados</h4>
                        <p className="text-xs text-slate-500">
                          Marca permisos extra o quita los del rol antes de guardar.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.group} className="rounded-2xl border border-slate-200 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {group.group}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {group.permissions.map((permission) => (
                                <label
                                  key={permission}
                                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editPermissions.includes(permission)}
                                    onChange={() => handleEditPermissionToggle(permission)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{permissionLabels[permission] || permission}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveUser} disabled={saving || !selectedUser} className="flex-1">
                        <Save size={16} className="mr-2" />
                        Guardar cambios
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedUserId(null)}
                        className="shrink-0"
                      >
                        <X size={16} className="mr-2" />
                        Limpiar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-500">
                    Selecciona un usuario en la tabla para editar sus permisos.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles del sistema</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Selecciona un rol para editar sus permisos globales.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/60">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Permisos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {roles.map((role) => {
                      const isActive = selectedRoleKey === role.key;
                      const rolePerms = normalizePermissions(role.permissions);

                      return (
                        <tr
                          key={role.key}
                          onClick={() => setSelectedRoleKey(role.key)}
                          className={`cursor-pointer transition-colors ${
                            isActive ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">{role.label}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {rolePerms.includes("*") ? (
                              <span className="font-semibold text-violet-600">Todos</span>
                            ) : (
                              `${rolePerms.length} permisos`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos del rol</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {selectedRole ? selectedRole.label : "Selecciona un rol"}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedRole ? (
                <>
                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.group} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {group.group}
                        </p>
                        <div className="mt-3 grid gap-2">
                          {group.permissions.map((permission) => (
                            <label
                              key={permission}
                              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={rolePermissions.includes(permission)}
                                onChange={() => handleRolePermissionToggle(permission)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{permissionLabels[permission] || permission}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveRole} disabled={saving || !selectedRole} className="flex-1">
                      <Save size={16} className="mr-2" />
                      Guardar permisos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedRoleKey(null)}
                      className="shrink-0"
                    >
                      <X size={16} className="mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-500">
                  Selecciona un rol en la tabla para editar sus permisos.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invitar usuario"
        size="xl"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Correo"
              name="email"
              type="email"
              required
              value={inviteForm.email}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="nuevo.usuario@empresa.com"
            />
            <Input
              label="Nombre completo"
              name="fullName"
              value={inviteForm.fullName}
              onChange={(event) =>
                setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              placeholder="Nombre del invitado"
            />
          </div>

          <Select
            label="Rol inicial"
            name="roleKey"
            value={inviteForm.roleKey}
            onChange={(event) => handleInviteRoleChange(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </Select>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">Permisos a otorgar</p>
            <div className="space-y-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.group} className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {group.group}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={invitePermissions.includes(permission)}
                          onChange={() => handleInvitePermissionToggle(permission)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{permissionLabels[permission] || permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Plus size={16} className="mr-2" />
              Enviar invitación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
