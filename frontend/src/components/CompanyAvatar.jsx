import { useState } from 'react';

const COLORS = ['bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700'];

// Shows the company logo when there is one, otherwise coloured initials
const CompanyAvatar = ({ name = '?', size = 'h-12 w-12', logo }) => {
  const [broken, setBroken] = useState(false);

  if (logo && !broken) {
    return <img src={logo} alt={`${name} logo`} onError={() => setBroken(true)} className={`${size} rounded-lg object-contain bg-white border shrink-0`} />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div className={`${size} ${color} rounded-lg flex items-center justify-center font-bold shrink-0`} aria-hidden="true">
      {initials}
    </div>
  );
};

export default CompanyAvatar;
