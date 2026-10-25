import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const INPUT = 'w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-primary';

export const Field = ({ id, label, hint, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} className={INPUT} {...props} />
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

export const PasswordField = ({ id, label = 'Password', hint, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} className={`${INPUT} pr-10`} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-800"
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
};

export const SubmitButton = ({ loading, children, loadingText = 'Please wait...' }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full p-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {loading ? loadingText : children}
  </button>
);
