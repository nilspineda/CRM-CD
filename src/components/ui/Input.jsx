export default function Input({
  label,
  error,
  className = "",
  forceUppercase = false,
  onChange,
  ...props
}) {
  const handleChange = (e) => {
    if (!onChange) return;
    if (forceUppercase && e?.target?.value != null) {
      const ev = {
        ...e,
        target: { ...e.target, value: String(e.target.value).toUpperCase() },
      };
      onChange(ev);
    } else {
      onChange(e);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2.5 sm:px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:border-amber-500 ${
          error
            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-slate-300"
        }`}
        style={{ fontSize: "16px" }}
        onChange={handleChange}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function Select({ label, error, className = "", children, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2.5 sm:px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ${
          error
            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-slate-300"
        }`}
        style={{ fontSize: "16px" }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  forceUppercase = false,
  onChange,
  ...props
}) {
  const handleChange = (e) => {
    if (!onChange) return;
    if (forceUppercase && e?.target?.value != null) {
      const ev = {
        ...e,
        target: { ...e.target, value: String(e.target.value).toUpperCase() },
      };
      onChange(ev);
    } else {
      onChange(e);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2.5 sm:px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ${
          error
            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-slate-300"
        }`}
        style={{ fontSize: "16px" }}
        rows={3}
        onChange={handleChange}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
