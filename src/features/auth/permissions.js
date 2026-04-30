export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  AUXILIAR: "Auxiliar",
};

export const PERMISSIONS = {
  DASHBOARD_VIEW: "module.dashboard",
  USUARIOS_MANAGE: "module.usuarios",
  CLIENTES_VIEW: "module.clientes",
  MOVIMIENTOS_VIEW: "module.movimientos",
  FACTURAS_VIEW: "module.facturas",
  CUENTAS_VIEW: "module.cuentas",
  IVA_VIEW: "module.iva",
  REPORTES_VIEW: "module.reportes",
  CLIENTES_CREATE: "action.clientes.create",
  CLIENTES_EDIT: "action.clientes.edit",
  CLIENTES_DELETE: "action.clientes.delete",
  MOVIMIENTOS_CREATE: "action.movimientos.create",
  MOVIMIENTOS_EDIT: "action.movimientos.edit",
  MOVIMIENTOS_DELETE: "action.movimientos.delete",
  FACTURAS_CREATE: "action.facturas.create",
  FACTURAS_EDIT: "action.facturas.edit",
  FACTURAS_CHANGE_STATE: "action.facturas.change-state",
};

export const PERMISSION_GROUPS = [
  {
    group: "Acceso general",
    permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.USUARIOS_MANAGE],
  },
  {
    group: "Clientes",
    permissions: [
      PERMISSIONS.CLIENTES_VIEW,
      PERMISSIONS.CLIENTES_CREATE,
      PERMISSIONS.CLIENTES_EDIT,
      PERMISSIONS.CLIENTES_DELETE,
    ],
  },
  {
    group: "Movimientos",
    permissions: [
      PERMISSIONS.MOVIMIENTOS_VIEW,
      PERMISSIONS.MOVIMIENTOS_CREATE,
      PERMISSIONS.MOVIMIENTOS_EDIT,
      PERMISSIONS.MOVIMIENTOS_DELETE,
    ],
  },
  {
    group: "Facturas",
    permissions: [
      PERMISSIONS.FACTURAS_VIEW,
      PERMISSIONS.FACTURAS_CREATE,
      PERMISSIONS.FACTURAS_EDIT,
      PERMISSIONS.FACTURAS_CHANGE_STATE,
    ],
  },
  {
    group: "Finanzas",
    permissions: [
      PERMISSIONS.CUENTAS_VIEW,
      PERMISSIONS.IVA_VIEW,
      PERMISSIONS.REPORTES_VIEW,
    ],
  },
];

const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "SuperAdmin",
  [ROLES.AUXILIAR]: "Auxiliar",
};

const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ["*"],
  [ROLES.AUXILIAR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CLIENTES_VIEW,
    PERMISSIONS.MOVIMIENTOS_VIEW,
    PERMISSIONS.FACTURAS_VIEW,
    PERMISSIONS.CLIENTES_CREATE,
    PERMISSIONS.CLIENTES_EDIT,
    PERMISSIONS.CLIENTES_DELETE,
    PERMISSIONS.MOVIMIENTOS_CREATE,
    PERMISSIONS.MOVIMIENTOS_EDIT,
    PERMISSIONS.MOVIMIENTOS_DELETE,
    PERMISSIONS.FACTURAS_CHANGE_STATE,
  ],
};

const normalizePermissionList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }

  return [];
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || role || "Sin rol";

export const getEffectiveAccess = ({ user, profile } = {}) => {
  const role =
    profile?.role_key || profile?.role || user?.app_metadata?.role || ROLES.AUXILIAR;
  const basePermissions = new Set(
    DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS[ROLES.AUXILIAR],
  );
  const extraPermissions = normalizePermissionList(
    profile?.permissions ??
      profile?.role_permissions ??
      profile?.allowed_permissions ??
      user?.app_metadata?.permissions,
  );

  extraPermissions.forEach((permission) => basePermissions.add(permission));

  const permissions = Array.from(basePermissions);

  return {
    role,
    roleLabel: getRoleLabel(role),
    permissions,
    isSuperAdmin: role === ROLES.SUPER_ADMIN || permissions.includes("*"),
  };
};

export const canPerform = (access, permission) => {
  if (!access) return false;
  if (access.isSuperAdmin) return true;

  return access.permissions?.includes(permission) || false;
};

export const canAccessModule = (access, moduleKey) =>
  canPerform(access, `module.${moduleKey}`);
