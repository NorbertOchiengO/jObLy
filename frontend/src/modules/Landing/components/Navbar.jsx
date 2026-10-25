import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { dashboardPathFor } from '../../../services/api';

const NavBar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const links = user
    ? [{ to: '/jobs', label: 'Find Jobs' }, { to: '/employers', label: 'Browse Companies' }, { to: dashboardPathFor(user.role), label: 'Dashboard' }]
    : [{ to: '/jobs', label: 'Find Jobs' }, { to: '/employers', label: 'Browse Companies' }, { to: '/login', label: 'Login' }];

  const logout = () => { setOpen(false); signOut(); navigate('/'); };

  return (
    <nav className="relative w-full py-4 sm:py-6 px-4 sm:px-8 lg:px-20 bg-[linear-gradient(180deg,#F4E7FF_0%,transparent_100%)]" aria-label="Main">
      <div className="flex justify-between items-center">
        <Link to="/" onClick={() => setOpen(false)}>
          <span className="text-3xl font-bold">jObL<span className="text-primary">Y</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => <Link key={l.to} to={l.to} className="text-gray-600 hover:text-primary">{l.label}</Link>)}
          {user
            ? <button onClick={logout} className="border border-primary text-primary py-2 px-4 rounded hover:bg-primary hover:text-white">Log out</button>
            : <Link to="/register" className="bg-primary text-white py-2 px-4 rounded hover:opacity-90">Sign Up</Link>}
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-2xl text-gray-700"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden absolute left-0 right-0 top-full z-30 bg-white shadow-lg px-4 py-4 flex flex-col gap-3">
          {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-gray-700 hover:text-primary">{l.label}</Link>)}
          {user
            ? <button onClick={logout} className="bg-primary text-white py-2 px-4 rounded">Log out</button>
            : <Link to="/register" onClick={() => setOpen(false)} className="bg-primary text-white py-2 px-4 rounded text-center">Sign Up</Link>}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
