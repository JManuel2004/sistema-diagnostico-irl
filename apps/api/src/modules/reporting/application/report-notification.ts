export const REPORT_NOTIFICATION = Symbol('REPORT_NOTIFICATION');

/**
 * Where the finished report is mailed. `enabled` is false when no
 * destination or no mail server is configured: the analysis still
 * completes and the report stays on screen.
 */
export interface ReportNotificationSettings {
  readonly enabled: boolean;
  readonly to: string;
  readonly from: string;
}
