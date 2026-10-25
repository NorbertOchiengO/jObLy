import { Features } from "./components/Features";
import Footer from "./components/Footer";
import NavBar from "./components/Navbar";
import Presentation from "./components/Presentation";
import Explore from "./components/explore";
import FeaturedJobs from "./components/FeaturedJobs";
import LatestJobs from "./components/LatestJobs";

export const LandingPage = () => {
  return (
    <div className="min-w-screen overflow-y-auto">
      <div className="max-w-screen overflow-x-hidden flex justify-center items-center flex-col">
        <NavBar />
        <div className="w-full px-4 sm:px-8 lg:px-20 py-8 lg:py-14 max-w-[1500px] space-y-12">
          <Presentation />
          <Explore />
          <FeaturedJobs />
          <LatestJobs />
          <Features />
        </div>
        <Footer />
      </div>
    </div>
  );
};
