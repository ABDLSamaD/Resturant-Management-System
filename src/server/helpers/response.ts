export class AppError extends Error {
  statusCode: number;
  errors: any[];
  constructor(message: string, statusCode: number, errors: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const formatSuccess = (message: string, data: any = {}, meta: any = {}) => ({
  success: true,
  message,
  data,
  meta
});
