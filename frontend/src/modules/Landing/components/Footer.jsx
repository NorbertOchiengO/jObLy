import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full py-8 px-4 sm:px-8 lg:px-20 bg-[linear-gradient(0deg,#F4E7FF_0%,transparent_100%)]">
      <div className="max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-black text-lg font-bold mb-4">jObLY</h3>
            <p className="text-gray-700">Great platform for the job seeker that passionate about startups. Find your dream job easier.</p>
          </div>
          <div>
            <h3 className="text-black text-lg font-bold mb-4">Explore</h3>
            <ul className="space-y-2 text-gray-700">
              <li><Link to="/jobs" className="hover:text-purple-500">Find jobs</Link></li>
              <li><Link to="/employers" className="hover:text-purple-500">Companies</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-black text-lg font-bold mb-4">Account</h3>
            <ul className="space-y-2 text-gray-700">
              <li><Link to="/login" className="hover:text-purple-500">Log in</Link></li>
              <li><Link to="/register" className="hover:text-purple-500">Sign up</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-300 pt-6 text-center md:text-left">
          <p className="text-black">&copy; jObLY {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
