# jObLY – Job Listing Platform

React + Vite + Tailwind frontend, Node/Express + MongoDB backend. Needs Node 20 or newer.

## Run locally
1. **Backend**
   ```bash
   cd backend
   cp .env.example .env      # fill in MONGO_URI and a strong JWT_SECRET (the server refuses to start without them)
   npm install
   npm run seed:all          # demo data: 24 companies, 100 jobs, 25 job seekers (prints demo logins once)
   npm run dev               # http://localhost:5000  (health check: /api/health)
   ```
   `npm run seed` loads only companies + jobs, `npm run seed:seekers` only job seekers (and sample applications if jobs exist). Re-running is safe.
2. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env      # VITE_API_URL=http://localhost:5000
   npm install
   npm run dev               # http://localhost:5173
   ```

## Tests
- `cd backend && npm test` – API, security and CV-parser tests (no database needed)
- `cd frontend && npm test` · `npm run lint` · `npm run build`

## What it does
- **Job seekers** (`/clientdashboard`): search and filter jobs, apply, track application status, and keep a **profile with a CV**. Uploading a CV (PDF or .docx) reads it and suggests headline, phone, location, summary, skills, education and experience; nothing is saved until the user reviews it and clicks Save. A saved CV can be reused when applying.
- **Companies** (`/dashboard`): post, edit, close and delete jobs, review applicants (with headline and skills) and change their status, and maintain a **public company profile** (logo, tagline, about, website, size, founded year, location). Visitors see it at `/employer/:id` together with the company's latest jobs.
- **Everyone**: category explorer on the home page (live counts from open jobs), company directory, job pages.

## Notes
- **Files** (resumes, CVs, logos) are stored inside MongoDB, so nothing depends on the server's disk and it works on hosts like Render or Railway. Limits: resumes/CVs 5 MB (PDF, .doc, .docx), logos 2 MB (PNG, JPG, WebP). Files are checked by content, not just by name. If volumes grow, move them to S3/Cloudinary.
- **CV reading** is rule-based, not AI, so results are suggestions. Older `.doc` files and scanned (image-only) PDFs are stored but cannot be read automatically.
- **Security**: helmet headers, CORS limited to `CLIENT_URL`, rate limits on login/register/uploads, input sanitising against Mongo operator injection, 8+ character passwords, role checks on every employer/job-seeker endpoint.
- Google/GitHub/LinkedIn login only works once the matching `*_CLIENT_ID/SECRET` values are set in `backend/.env` (LinkedIn's old scopes should be migrated to OpenID Connect).
- Never commit `.env` files. Rotate any secret that has been shared in chat or committed.
