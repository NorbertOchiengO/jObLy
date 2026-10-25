import NavBar from '../modules/Landing/components/Navbar';

const AuthLayout = ({ title, children }) => (
  <div className="min-h-screen flex flex-col bg-gray-100">
    <NavBar />
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white shadow-md rounded-md">
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
