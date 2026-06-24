import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { TrainingReportData } from '../domain/trainingReportData';
import { buildTrainingReportHtml } from './trainingReportHtml';

export type ExportTrainingReportResult = {
  uri: string;
  shared: boolean;
};

export const createTrainingReportFileName = (report: TrainingReportData) => {
  const date = new Date(report.createdAt);
  const datePart = Number.isNaN(date.getTime())
    ? 'sin-fecha'
    : date.toISOString().slice(0, 10);

  return `practica-3v3-${datePart}.pdf`;
};

export async function exportTrainingReportPdf(report: TrainingReportData): Promise<ExportTrainingReportResult> {
  const html = buildTrainingReportHtml(report);
  const file = await Print.printToFileAsync({
    html,
    base64: false,
  });
  const reportUri = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${createTrainingReportFileName(report)}`
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
      dialogTitle: 'Compartir reporte de práctica 3v3',
    });
  }

  return {
    uri: reportUri,
    shared: sharingAvailable,
  };
}
