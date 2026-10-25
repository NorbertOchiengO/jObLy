import NavBar from '../modules/Landing/components/Navbar';
import Footer from '../modules/Landing/components/Footer';

const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <NavBar />
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    <Footer />
  </div>
);

export default Layout;
