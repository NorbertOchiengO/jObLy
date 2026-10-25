// 25 fictional demo job seekers, generated from a few archetypes. Emails: seeker01@joblisting.local ...
const archetypes = [
  { headline: 'Frontend Developer', skills: ['React', 'JavaScript', 'Tailwind CSS', 'HTML', 'CSS', 'Git'], degree: 'BSc Computer Science', roles: ['Frontend Developer', 'Junior Web Developer'], cos: ['Savannah Labs', 'Duka Digital'], about: 'builds fast, accessible interfaces and enjoys turning designs into polished products' },
  { headline: 'Backend Developer', skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs', 'Git', 'Docker'], degree: 'BSc Software Engineering', roles: ['Backend Developer', 'Software Engineer'], cos: ['Savannah Labs', 'Mara Analytics'], about: 'designs reliable APIs and cares about clean, tested code' },
  { headline: 'Graphic Designer', skills: ['Photoshop', 'Illustrator', 'CorelDRAW', 'Branding', 'Canva'], degree: 'Diploma in Graphic Design', roles: ['Graphic Designer', 'Junior Designer'], cos: ['Pixel & Pine', 'Nuru Creative Studio'], about: 'creates logos, print and social media designs for small businesses' },
  { headline: 'UI/UX Designer', skills: ['Figma', 'Prototyping', 'UX Research', 'Wireframing'], degree: 'BSc Information Technology', roles: ['UI/UX Designer', 'Product Designer'], cos: ['Pixel & Pine', 'Brightpath Media'], about: 'designs simple, user-tested experiences for web and mobile apps' },
  { headline: 'Digital Marketing Specialist', skills: ['SEO', 'Social Media', 'Google Ads', 'Content Writing', 'Analytics'], degree: 'BCom Marketing', roles: ['Digital Marketing Executive', 'Social Media Manager'], cos: ['Brightpath Media', 'Zuri Fashion House'], about: 'grows audiences with practical, data-led campaigns' },
  { headline: 'Accountant', skills: ['Accounting', 'QuickBooks', 'Excel', 'Tax', 'Financial Reporting'], degree: 'BCom Accounting (CPA)', roles: ['Accountant', 'Accounts Assistant'], cos: ['Mizani Finance', 'Tembo Capital'], about: 'keeps accurate books and supports audits and tax filings' },
  { headline: 'Sales Executive', skills: ['Sales', 'B2B', 'CRM', 'Negotiation', 'Lead Generation'], degree: 'BCom Business Administration', roles: ['Sales Representative', 'Account Manager'], cos: ['Soko Retail Group', 'Twiga Telecom'], about: 'consistently meets targets by building honest customer relationships' },
  { headline: 'Customer Support Specialist', skills: ['Customer Support', 'Communication', 'CRM', 'Chat Support', 'Problem Solving'], degree: 'Diploma in Business Management', roles: ['Customer Support Agent', 'Call Centre Agent'], cos: ['HelpDesk Africa', 'Twiga Telecom'], about: 'resolves customer issues quickly and keeps people happy' },
  { headline: 'HR Officer', skills: ['Recruitment', 'Payroll', 'HR', 'Administration', 'Employee Relations'], degree: 'BA Human Resource Management', roles: ['HR Assistant', 'HR Officer'], cos: ['Kazi Staffing', 'Mizani Finance'], about: 'supports hiring, onboarding and day-to-day people operations' },
  { headline: 'Registered Nurse', skills: ['Nursing', 'Patient Care', 'Triage', 'First Aid', 'Record Keeping'], degree: 'BSc Nursing', roles: ['Nurse Officer', 'Staff Nurse'], cos: ['Lakeview Hospital', 'Afya Bora Pharmacy'], about: 'provides safe, compassionate care and works well in busy wards' },
  { headline: 'Civil Engineer', skills: ['AutoCAD', 'Construction', 'Site Management', 'Project Management', 'Surveying'], degree: 'BSc Civil Engineering', roles: ['Civil Engineer', 'Site Engineer'], cos: ['Ujenzi Builders', 'Kilele Logistics'], about: 'supervises building and road projects from design to handover' },
  { headline: 'Logistics Coordinator', skills: ['Logistics', 'Inventory', 'Excel', 'Supervision', 'Documentation'], degree: 'Diploma in Supply Chain Management', roles: ['Logistics Coordinator', 'Warehouse Supervisor'], cos: ['Kilele Logistics', 'Pwani Freight'], about: 'keeps stock and deliveries moving on time' },
  { headline: 'Data Analyst', skills: ['SQL', 'Excel', 'Power BI', 'Python', 'Reporting'], degree: 'BSc Statistics', roles: ['Data Analyst', 'Reporting Analyst'], cos: ['Mara Analytics', 'Mizani Finance'], about: 'turns messy data into clear dashboards that managers use' },
  { headline: 'IT Support Technician', skills: ['IT Support', 'Networking', 'Windows', 'Troubleshooting', 'Hardware'], degree: 'Diploma in Information Technology', roles: ['IT Support Technician', 'Helpdesk Officer'], cos: ['Kilele Logistics', 'Kijani Cloud'], about: 'keeps teams working by fixing hardware, network and software problems' }
];

const names = [
  'Wanjiru Kamau', 'Brian Otieno', 'Amina Hassan', 'Kevin Mwangi', 'Faith Chebet', 'Dennis Kiprop', 'Grace Achieng', 'Peter Njoroge', 'Mercy Wambui', 'Samuel Mutua',
  'Esther Naliaka', 'Collins Omondi', 'Lucy Wairimu', 'Victor Kibet', 'Joy Atieno', 'Daniel Karanja', 'Naomi Jepkoech', 'Hassan Abdi', 'Beatrice Mwikali', 'Allan Ouma',
  'Cynthia Muthoni', 'Felix Barasa', 'Rose Akinyi', 'George Maina', 'Sharon Cherono'
];
const schools = ['University of Nairobi', 'Kenyatta University', 'Moi University', 'JKUAT', 'Strathmore University', 'Maseno University', 'Egerton University', 'Technical University of Kenya', 'Mount Kenya University', 'Multimedia University of Kenya'];
const cities = ['Nairobi, Kenya', 'Nairobi, Kenya', 'Mombasa, Kenya', 'Kisumu, Kenya', 'Nakuru, Kenya', 'Eldoret, Kenya', 'Thika, Kenya', 'Nyeri, Kenya'];

module.exports = names.map((name, i) => {
  const a = archetypes[i % archetypes.length];
  const gradYear = 2012 + ((i * 3) % 12);
  const n = String(i + 1).padStart(2, '0');
  const years = 2025 - gradYear;
  const midYear = gradYear + Math.max(1, Math.floor(years / 2));
  return {
    name,
    email: `seeker${n}@joblisting.local`,
    headline: a.headline,
    phone: `0700 000 0${n}`,
    location: cities[i % cities.length],
    summary: `${name.split(' ')[0]} is a ${a.headline.toLowerCase()} with ${Math.max(1, years)} year${years === 1 ? '' : 's'} of experience who ${a.about}.`,
    skills: a.skills,
    education: [{ school: schools[i % schools.length], degree: a.degree, year: String(gradYear) }],
    experience: [
      { title: a.roles[0], company: a.cos[0], period: `${midYear} - Present`, description: `Day-to-day ${a.headline.toLowerCase()} work at ${a.cos[0]}, collaborating with the wider team.` },
      ...(years > 3 ? [{ title: a.roles[1], company: a.cos[1], period: `${gradYear} - ${midYear}`, description: `Started out as ${a.roles[1].toLowerCase()} at ${a.cos[1]} and grew into more responsibility.` }] : [])
    ]
  };
});
