import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { StatsMatchReport } from '../domain/statsMatchReportData';
import { buildStatsMatchReportHtml } from './statsMatchReportHtml';

export type ExportStatsMatchReportResult = {
  uri: string;
  shared: boolean;
};

export const createStatsMatchReportFileName = (report: StatsMatchReport) => {
  const date = new Date(report.createdAt);
  const datePart = Number.isNaN(date.getTime()) ? 'sin-fecha' : date.toISOString().slice(0, 10);
  const scopePart = report.scope === 'period' && report.periodNumber ? `tiempo-${report.periodNumber}` : 'final';

  return `estadistica-7v7-${datePart}-${scopePart}.pdf`;
};

export async function exportStatsMatchReportPdf(report: StatsMatchReport): Promise<ExportStatsMatchReportResult> {
  const html = buildStatsMatchReportHtml(report);
  const file = await Print.printToFileAsync({ html, base64: false });
  const reportUri = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${createStatsMatchReportFileName(report)}`
    : file.uri;

  if (reportUri !== file.uri) {
    await FileSystem.deleteAsync(reportUri, { idempotent: true });
    await FileSystem.copyAsync({ from: file.uri, to: reportUri });
  }

  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(reportUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Compartir análisis de Estadística 7v7',
    });
  }

  return {
    uri: reportUri,
    shared: sharingAvailable,
  };
}
