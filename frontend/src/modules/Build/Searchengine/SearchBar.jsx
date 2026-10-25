import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const SearchBar = ({ keyword, setKeyword, location, setLocation, onSubmit }) => (
  <form onSubmit={onSubmit} role="search" className="p-3 bg-white shadow-md rounded-lg mb-4 flex flex-col sm:flex-row gap-3">
    <label className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-3 focus-within:border-primary">
      <FaSearch className="text-gray-400" aria-hidden="true" />
      <span className="sr-only">Job title, keyword or company</span>
      <input
        type="text"
        placeholder="Job title, keyword or company"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full py-2 focus:outline-none"
      />
    </label>
    <label className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-3 focus-within:border-primary">
      <FaMapMarkerAlt className="text-gray-400" aria-hidden="true" />
      <span className="sr-only">Location</span>
      <input
        type="text"
        placeholder="City or country"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full py-2 focus:outline-none"
      />
    </label>
    <button type="submit" className="bg-primary text-white py-2 px-6 rounded-md hover:opacity-90">Search</button>
  </form>
);

export default SearchBar;
