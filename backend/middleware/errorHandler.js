const notFound = (req, res) => res.status(404).json({ message: 'Not found' });

// Last line of defence: never leak stack traces or internals to clients
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' });
  console.error('Unhandled error:', err && err.message);
  res.status(500).json({ message: 'Something went wrong' });
};

module.exports = { notFound, errorHandler };
