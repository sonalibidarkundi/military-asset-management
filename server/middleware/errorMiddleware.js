export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? (err.status || 500) : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL specific errors
  if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input format for request parameter.';
  } else if (err.code === '42P01') {
    statusCode = 500;
    message = 'Database table missing. Please execute schema.sql on your PostgreSQL database.';
  } else if (err.code === '28P01' || err.code === '28000') {
    statusCode = 500;
    message = 'Database authentication failed. Please update your PostgreSQL password in server/.env DATABASE_URL.';
  } else if (err.code === '3D000') {
    statusCode = 500;
    message = 'Database does not exist. Please create database "aegis_mams" in PostgreSQL.';
  } else if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code?.startsWith('08') ||
    (err.message && err.message.toLowerCase().includes('connect econnrefused')) ||
    (err.message && err.message.toLowerCase().includes('database_url'))
  ) {
    statusCode = 503;
    message = 'Database connection error. Please ensure PostgreSQL server is running and DATABASE_URL in server/.env is correct.';
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
