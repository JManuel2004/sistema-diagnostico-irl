import { applyDecorators } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

const PROBLEM =
  'RFC 7807 problem document (`application/problem+json`) with a stable `code`.';

/**
 * The error answers an endpoint can give, documented the same way on every
 * controller. `401` applies to every authenticated route; the others only
 * where listed.
 */
export function ApiErrors(
  ...statuses: readonly (404 | 409 | 422)[]
): MethodDecorator {
  const decorators: MethodDecorator[] = [
    ApiUnauthorizedResponse({
      description: `Missing or invalid access token. ${PROBLEM}`,
    }),
  ];
  if (statuses.includes(404)) {
    decorators.push(
      ApiNotFoundResponse({
        description: `The diagnostic or the resource does not exist. ${PROBLEM}`,
      }),
    );
  }
  if (statuses.includes(409)) {
    decorators.push(
      ApiConflictResponse({
        description: `The diagnostic is not in the state the operation requires. ${PROBLEM}`,
      }),
    );
  }
  if (statuses.includes(422)) {
    decorators.push(
      ApiUnprocessableEntityResponse({
        description: `The request does not satisfy the contract or a domain rule. ${PROBLEM}`,
      }),
    );
  }
  return applyDecorators(...decorators);
}
