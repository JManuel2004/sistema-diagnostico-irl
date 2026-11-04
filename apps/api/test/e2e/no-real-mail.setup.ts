/**
 * Setup of the `e2e` Jest project: no suite mails with the `.env` settings.
 *
 * Several suites complete a deep analysis, which mails the report to
 * INNLAB. With a developer's `.env` that would reach a real inbox. An
 * environment variable wins over the env files, so emptying these two turns
 * the mail off for every suite; the mail suites set their own settings
 * (the test inbox) before booting the app.
 */
process.env.REPORT_NOTIFY_TO = '';
process.env.SMTP_HOST = '';
