const multer = require('multer');

const MB = 1024 * 1024;
const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']); // no SVG: it can carry scripts

// First bytes of each file type, so a renamed .exe cannot pass as a PDF just because the browser said so
const MAGIC = {
  'application/pdf': [Buffer.from('%PDF')],
  'application/msword': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [Buffer.from('PK')],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/webp': [Buffer.from('RIFF')]
};

// `file` is a multer memory file ({ buffer, mimetype })
const hasValidSignature = (file) => {
  const sigs = file && MAGIC[file.mimetype];
  if (!sigs || !file.buffer) return false;
  return sigs.some((s) => file.buffer.subarray(0, s.length).equals(s));
};

// Files are kept in memory and saved inside MongoDB, so nothing is written to the server's disk
// (works on hosts with an ephemeral filesystem such as Render or Railway).
function createUpload({ field, allowed, maxSize, tooBig, wrongType }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (req, file, cb) => (allowed.has(file.mimetype) ? cb(null, true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', field)))
  });

  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: tooBig });
        if (err instanceof multer.MulterError) return res.status(400).json({ message: wrongType });
        return next(err);
      }
      if (req.file && !hasValidSignature(req.file)) return res.status(400).json({ message: wrongType });
      next();
    });
  };
}

const DOC_MSG = 'must be a PDF or Word document (.pdf, .doc, .docx)';

module.exports = {
  hasValidSignature,
  uploadResume: createUpload({ field: 'resume', allowed: DOC_TYPES, maxSize: 5 * MB, tooBig: 'Resume must be 5 MB or smaller', wrongType: `Resume ${DOC_MSG}` }),
  uploadCv: createUpload({ field: 'cv', allowed: DOC_TYPES, maxSize: 5 * MB, tooBig: 'CV must be 5 MB or smaller', wrongType: `CV ${DOC_MSG}` }),
  uploadLogo: createUpload({ field: 'logo', allowed: IMAGE_TYPES, maxSize: 2 * MB, tooBig: 'Logo must be 2 MB or smaller', wrongType: 'Logo must be a PNG, JPG or WebP image' })
};
