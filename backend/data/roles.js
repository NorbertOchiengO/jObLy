// industry -> roles. [title, tags, minSalary, maxSalary (KES/month), type?]
module.exports = {
  Technology: [
    ['Frontend Developer', ['React', 'JavaScript', 'Tailwind CSS'], 120000, 200000],
    ['Backend Engineer (Node.js)', ['Node.js', 'MongoDB', 'REST APIs'], 150000, 240000],
    ['Full-Stack Developer', ['React', 'Node.js', 'MongoDB'], 140000, 230000],
    ['Mobile App Developer', ['React Native', 'Android', 'JavaScript'], 130000, 210000],
    ['DevOps Engineer', ['AWS', 'Docker', 'CI/CD'], 180000, 280000],
    ['Data Analyst', ['SQL', 'Excel', 'Power BI'], 110000, 170000],
    ['QA Engineer', ['Testing', 'Automation', 'Cypress'], 100000, 160000],
    ['IT Support Technician', ['IT Support', 'Networking', 'Windows'], 55000, 90000],
    ['Cybersecurity Analyst', ['Security', 'Networking', 'SIEM'], 150000, 230000],
    ['Software Engineering Intern', ['JavaScript', 'Git', 'Learning'], 20000, 35000, 'Internship']
  ],
  Design: [
    ['UI/UX Designer', ['Figma', 'UX Research', 'Prototyping'], 90000, 150000],
    ['Graphic Designer', ['Photoshop', 'Illustrator', 'CorelDRAW'], 55000, 95000],
    ['Brand Designer', ['Branding', 'Illustrator', 'Typography'], 80000, 130000],
    ['Video Editor', ['Premiere Pro', 'After Effects', 'Storytelling'], 50000, 85000],
    ['Motion Graphics Artist', ['After Effects', 'Animation', 'Illustrator'], 70000, 120000],
    ['Fashion Designer', ['Sketching', 'Pattern Making', 'Textiles'], 60000, 100000]
  ],
  Marketing: [
    ['Digital Marketing Executive', ['SEO', 'Social Media', 'Google Ads'], 70000, 115000],
    ['Content Writer', ['Writing', 'SEO', 'Editing'], 40000, 70000],
    ['Social Media Manager', ['Social Media', 'Branding', 'Analytics'], 80000, 125000],
    ['Email Marketing Specialist', ['Email', 'Analytics', 'Copywriting'], 60000, 95000],
    ['Brand Manager', ['Branding', 'Strategy', 'Campaigns'], 130000, 200000],
    ['Marketing Intern', ['Social Media', 'Writing', 'Learning'], 20000, 30000, 'Internship']
  ],
  Sales: [
    ['Sales Representative', ['Sales', 'B2B', 'Negotiation'], 50000, 100000],
    ['Account Manager', ['Account Management', 'CRM', 'Sales'], 90000, 150000],
    ['Business Development Officer', ['Business Development', 'Lead Generation', 'Sales'], 80000, 140000],
    ['Sales Manager', ['Sales', 'Leadership', 'Forecasting'], 160000, 260000],
    ['Inside Sales Agent', ['Cold Calling', 'CRM', 'Sales'], 45000, 80000]
  ],
  Finance: [
    ['Accountant', ['Accounting', 'Tax', 'QuickBooks'], 80000, 125000],
    ['Financial Analyst', ['Excel', 'Financial Modelling', 'Reporting'], 110000, 180000],
    ['Credit Officer', ['Credit Analysis', 'Risk', 'Excel'], 85000, 135000],
    ['Internal Auditor', ['Audit', 'Compliance', 'Excel'], 110000, 175000],
    ['Payroll Officer', ['Payroll', 'Excel', 'Compliance'], 65000, 105000],
    ['Finance Intern', ['Excel', 'Accounting', 'Learning'], 20000, 30000, 'Internship']
  ],
  Engineering: [
    ['Civil Engineer', ['AutoCAD', 'Construction', 'Project Management'], 110000, 180000],
    ['Electrical Technician', ['Electrical Installation', 'Safety', 'Troubleshooting'], 60000, 100000],
    ['Mechanical Engineer', ['AutoCAD', 'Maintenance', 'Manufacturing'], 100000, 170000],
    ['Site Supervisor', ['Site Management', 'Safety', 'Construction'], 80000, 130000],
    ['Quantity Surveyor', ['Costing', 'Construction', 'Contracts'], 95000, 155000],
    ['Solar Installation Technician', ['Solar PV', 'Electrical Installation', 'Safety'], 55000, 90000]
  ],
  Business: [
    ['Project Manager', ['Project Management', 'Operations', 'Stakeholders'], 140000, 210000],
    ['Operations Manager', ['Operations', 'Leadership', 'Process Improvement'], 150000, 230000],
    ['Business Analyst', ['Analysis', 'Requirements', 'Excel'], 110000, 175000],
    ['Office Administrator', ['Administration', 'Microsoft Office', 'Organisation'], 45000, 75000],
    ['Procurement Officer', ['Procurement', 'Negotiation', 'Supply Chain'], 80000, 130000],
    ['Hotel Front Office Manager', ['Hospitality', 'Customer Care', 'Leadership'], 90000, 140000]
  ],
  'Human Resources': [
    ['HR Assistant', ['Recruitment', 'Administration', 'HR'], 50000, 80000],
    ['HR Manager', ['HR', 'Employee Relations', 'Leadership'], 150000, 230000],
    ['Talent Acquisition Specialist', ['Recruitment', 'Interviewing', 'Sourcing'], 85000, 135000],
    ['Payroll & Benefits Officer', ['Payroll', 'Benefits', 'Compliance'], 70000, 110000]
  ],
  Healthcare: [
    ['Pharmacy Technician', ['Pharmacy', 'Dispensing', 'Inventory'], 55000, 85000],
    ['Nurse Officer', ['Nursing', 'Patient Care', 'Triage'], 70000, 115000],
    ['Clinical Officer', ['Clinical Practice', 'Diagnosis', 'Patient Care'], 90000, 140000],
    ['Laboratory Technician', ['Laboratory', 'Sample Testing', 'Safety'], 65000, 105000],
    ['Pharmacist', ['Pharmacy', 'Compliance', 'Patient Counselling'], 120000, 190000]
  ],
  Education: [
    ['Teaching Assistant (ICT)', ['Teaching', 'ICT', 'Classroom Support'], 30000, 50000, 'Part-Time'],
    ['Mathematics Teacher', ['Teaching', 'Mathematics', 'Lesson Planning'], 55000, 90000],
    ['Curriculum Developer', ['Curriculum', 'Assessment', 'Research'], 80000, 130000],
    ['Academic Coordinator', ['Coordination', 'Planning', 'Leadership'], 85000, 135000]
  ],
  Logistics: [
    ['Warehouse Supervisor', ['Inventory', 'Supervision', 'Safety'], 65000, 100000],
    ['Logistics Coordinator', ['Logistics', 'Coordination', 'Excel'], 70000, 110000],
    ['Delivery Driver', ['Driving', 'Navigation', 'Customer Care'], 35000, 55000],
    ['Fleet Manager', ['Fleet Management', 'Maintenance', 'Leadership'], 110000, 170000],
    ['Customs Clearing Agent', ['Customs', 'Documentation', 'Freight'], 75000, 120000]
  ],
  'Customer Service': [
    ['Customer Support Agent', ['Support', 'Communication', 'CRM'], 40000, 65000],
    ['Call Centre Team Lead', ['Leadership', 'Support', 'Quality Assurance'], 75000, 115000],
    ['Customer Success Manager', ['Customer Success', 'Account Management', 'Communication'], 100000, 160000],
    ['Live Chat Agent', ['Chat Support', 'Typing', 'Communication'], 35000, 55000]
  ]
};
