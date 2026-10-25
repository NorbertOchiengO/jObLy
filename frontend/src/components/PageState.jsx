// Small shared loading / error / empty blocks for dashboard pages
export const Loading = ({ label = 'Loading...' }) => (
  <div role="status" className="p-8 text-center text-gray-500">{label}</div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div role="alert" className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
    <p className="text-red-700">{message}</p>
    {onRetry && <button onClick={onRetry} className="mt-3 bg-primary text-white py-2 px-4 rounded">Try again</button>}
  </div>
);

export const Empty = ({ title, children }) => (
  <div className="p-8 border border-dashed rounded-lg text-center bg-white">
    <p className="text-lg font-semibold">{title}</p>
    <div className="text-gray-500 mt-1">{children}</div>
  </div>
);

export const Card = ({ title, children, className = '' }) => (
  <section className={`bg-white p-5 sm:p-6 border rounded-lg shadow-sm ${className}`}>
    {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
    {children}
  </section>
);

export const Stat = ({ value, label }) => (
  <div className="bg-white p-5 border rounded-lg shadow-sm text-center">
    <p className="text-3xl font-bold text-primary">{value}</p>
    <p className="text-gray-600 text-sm mt-1">{label}</p>
  </div>
);
