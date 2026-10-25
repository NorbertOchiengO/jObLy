import { Link } from "react-router-dom";
import shapesImage from "../../../assets/Shapes.svg";

export const Features = () => {
  return (
    <section>
      <h2 className="text-4xl sm:text-5xl font-bold text-center text-primary py-8">Join Us</h2>
      <div className="relative flex flex-col lg:flex-row items-center gap-8 px-4 sm:px-8 lg:px-12 py-12 rounded-3xl overflow-hidden bg-[#F63C7C]/10">
        <div className="lg:w-1/2 space-y-5 z-10">
          <p className="font-bold text-3xl sm:text-5xl">Your next opportunity is a few clicks away</p>
          <p className="font-medium text-lg sm:text-2xl text-gray-700">
            Create a free account to apply for jobs, or post openings and find the right people for your team.
          </p>
          <Link to="/register" className="inline-block bg-primary text-white py-3 px-6 text-lg rounded-md hover:opacity-90">
            Create a free account
          </Link>
        </div>
        <div className="lg:w-1/2 w-full flex justify-center z-10">
          <div className="w-full max-w-md aspect-[4/3] rounded-3xl border-[5px] border-primary bg-white flex items-center justify-center overflow-hidden">
            <img src={shapesImage} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};
