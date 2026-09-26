import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../identity/presentation/decorators/public.decorator.js';

/**
 * Health-check endpoints used by orchestrators (Docker, Kubernetes,
 * Jenkins post-deploy hooks).
 *
 * - `GET /health/live`  — process is alive (no external probes).
 * - `GET /health/ready` — process is ready to serve traffic (DB up).
 *
 * Both are `@Public()`: the global `JwtAuthGuard` protects every route by
 * default, and a probe that needs a user token cannot tell an orchestrator
 * whether the process is up.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Public()
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'The process is up.',
  })
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'The database answers.',
  })
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
