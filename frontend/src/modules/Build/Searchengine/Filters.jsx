
const Select = ({ id, label, value, onChange, options, placeholder }) => (
  <div>
    <label htmlFor={id} className="block text-sm text-gray-600 mb-1">{label}</label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </div>
);

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'salary-high', label: 'Highest salary' }
];

const Filters = ({ values, meta, onChange, onClear, hasFilters }) => (
  <div className="p-4 bg-white shadow-md rounded-lg mb-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Select id="f-type" label="Job type" placeholder="All types" value={values.type} onChange={(v) => onChange({ type: v })} options={meta.types} />
      <Select id="f-mode" label="Work mode" placeholder="Any" value={values.workMode} onChange={(v) => onChange({ workMode: v })} options={meta.workModes} />
      <Select id="f-industry" label="Industry" placeholder="All industries" value={values.industry} onChange={(v) => onChange({ industry: v })} options={meta.industries} />
      <Select id="f-sort" label="Sort by" placeholder="Newest first" value={values.sort} onChange={(v) => onChange({ sort: v })} options={SORTS.slice(1)} />
    </div>
    {hasFilters && (
      <button onClick={onClear} className="mt-3 text-sm text-primary hover:underline">Clear all filters</button>
    )}
  </div>
);

export default Filters;
