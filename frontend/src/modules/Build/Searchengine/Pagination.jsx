
const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  const btn = 'px-4 py-2 border rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary';
  return (
    <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Pagination">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="text-sm text-gray-600">Page {page} of {pages}</span>
      <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
};

export default Pagination;
