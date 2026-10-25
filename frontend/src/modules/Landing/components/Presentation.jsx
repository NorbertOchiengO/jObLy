import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import personImage from '../../../assets/person.webp';
import shapesImage from '../../../assets/Shapes.svg';

const POPULAR = ['Designer', 'Developer', 'Marketing', 'Support'];

const Presentation = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (location.trim()) params.set('location', location.trim());
    navigate(`/jobs${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="min-h-[min(750px,80vh)] flex flex-col lg:flex-row items-center justify-between gap-8">
      <div className="w-full lg:w-1/2 max-w-2xl mx-auto lg:mx-0">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:leading-none md:text-6xl lg:text-7xl">
          Find your next <span className="text-purple-500">great job</span>
        </h1>
        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg md:text-xl">
          Great platform for the job seeker that searching for new career heights and passionate about startups.
        </p>

        <form onSubmit={handleSubmit} role="search" className="mt-8 flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="sr-only">Job title or keyword</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:border-primary"
              placeholder="Job title or keyword"
            />
          </label>
          <label className="flex-1">
            <span className="sr-only">Location</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:border-primary"
              placeholder="City or country"
            />
          </label>
          <button type="submit" className="px-6 py-3 bg-primary text-white rounded-md hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Search jobs
          </button>
        </form>

        <p className="mt-3 text-sm text-gray-500">
          Popular:{' '}
          {POPULAR.map((p, i) => (
            <span key={p}>
              <Link to={`/jobs?q=${encodeURIComponent(p)}`} className="hover:text-primary hover:underline">{p}</Link>
              {i < POPULAR.length - 1 && ', '}
            </span>
          ))}
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex justify-center items-center relative">
        <img src={shapesImage} alt="" className="absolute inset-0 h-full w-full object-cover z-0" />
        <img src={personImage} alt="Job hunt" className="relative h-64 sm:h-96 w-auto z-10" />
      </div>
    </div>
  );
};

export default Presentation;
