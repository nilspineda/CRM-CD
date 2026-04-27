// filepath: src/components/ui/Card.jsx
export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200/60 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200/60 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-slate-800 ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
