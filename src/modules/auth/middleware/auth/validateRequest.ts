import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { IApiResponse } from '../../types/user.interface';

/**
 * Validate Request Middleware
 * Processes validation errors from express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
    }));

    const response: IApiResponse = {
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    };

    res.status(400).json(response);
    return;
  }

  next();
};