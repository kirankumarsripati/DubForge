import type { DeliveryAggregate } from '../domain/delivery-aggregate.js';
import type { ValidationReport } from '../domain/validation-report.js';

export interface DeliveryMetrics {
  readonly exportTimeMs: number;
  readonly exportSizeBytes: number;
  readonly validationScore: number;
  readonly warningCount: number;
}

export class ReportGenerator {
  generateValidationSummary(reports: readonly ValidationReport[]): string {
    const lines = reports.map(
      (report) =>
        `${report.deliverableId}: score=${String(report.score)} playable=${String(report.playable)} warnings=${String(report.warnings.length)}`,
    );
    return lines.join('\n');
  }

  computeMetrics(input: {
    readonly aggregate: DeliveryAggregate;
    readonly exportTimeMs: number;
  }): DeliveryMetrics {
    const warningCount = input.aggregate.validationReports.reduce(
      (total, report) => total + report.warnings.length,
      0,
    );

    const validationScore =
      input.aggregate.validationReports.length === 0
        ? 0
        : Math.round(
            input.aggregate.validationReports.reduce((sum, report) => sum + report.score, 0) /
              input.aggregate.validationReports.length,
          );

    return {
      exportTimeMs: input.exportTimeMs,
      exportSizeBytes: input.aggregate.exportSizeBytes,
      validationScore,
      warningCount,
    };
  }
}

export function createReportGenerator(): ReportGenerator {
  return new ReportGenerator();
}
