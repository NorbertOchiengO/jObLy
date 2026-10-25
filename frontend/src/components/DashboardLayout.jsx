import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// Shared shell for both dashboards: responsive sidebar + header + the page (<Outlet />)
const DashboardLayout = ({ nav, subtitle, action }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r p-6 transform transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Dashboard navigation"
      >
        <Link to="/" className="block text-3xl font-bold mb-8">jObL<span className="text-primary">Y</span></Link>
        <nav>
          <ul className="space-y-2">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `block px-4 py-2 rounded ${isActive ? 'bg-primary text-white font-semibold' : 'text-gray-600 hover:bg-purple-50'}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex flex-wrap gap-3 justify-between items-center bg-white p-4 sm:p-6 border-b">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 text-xl"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <FaTimes /> : <FaBars />}
            </button>
            <div>
              <h1 className="text-xl font-bold">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
              <p className="text-gray-500 text-sm">{subtitle}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {action}
            <button
              onClick={() => { signOut(); navigate('/'); }}
              className="border border-primary text-primary px-4 py-2 rounded hover:bg-primary hover:text-white"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
};

export default DashboardLayout;
