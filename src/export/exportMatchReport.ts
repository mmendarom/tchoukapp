import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { MatchReportData } from '../domain/reportData';
import { buildMatchReportHtml } from './reportHtml';

export type ExportMatchReportResult = {
  uri: string;
  shared: boolean;
};

const createReportFileName = (report: MatchReportData) => {
  const safeMatch = report.matchLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `reporte-${safeMatch || 'partido'}.pdf`;
};

export async function exportMatchReportPdf(report: MatchReportData): Promise<ExportMatchReportResult> {
  const html = buildMatchReportHtml(report);
  const file = await Print.printToFileAsync({
    html,
    base64: false,
  });
  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Compartir reporte del partido',
    });
  }

  return {
    uri: file.uri,
    shared: sharingAvailable,
  };
}

export { createReportFileName };
