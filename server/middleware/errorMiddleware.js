export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? (err.status || 500) : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL invalid input syntax (e.g. invalid integer ID)
  if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input format for request parameter.';
  }

  // Handle Database connection failures
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === '28P01' ||
    err.code === '28000' ||
    err.code === '3D000' ||
    (err.message && err.message.toLowerCase().includes('connect econnrefused')) ||
    (err.message && err.message.toLowerCase().includes('database_url'))
  ) {
    statusCode = 503;
    message = 'Database connection error. Please ensure the database server is running and DATABASE_URL environment variable is set.';
  }

  console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Set explicit CORS header on error response to prevent cross-origin Network Error masking
  if (!res.headersSent) {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const safeMessage = isProduction && statusCode === 500
    ? 'An unexpected server error occurred.'
    : message;

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default {
  notFoundHandler,
  globalErrorHandler,
};
