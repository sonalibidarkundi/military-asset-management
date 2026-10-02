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

  console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err.message);

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
