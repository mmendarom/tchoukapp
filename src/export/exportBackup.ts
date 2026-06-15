import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AppBackupData, buildBackupJson, createBackupFileName } from '../domain/backup';

export type ExportBackupResult = {
  uri: string;
  shared: boolean;
};

export async function exportBackupJson(backup: AppBackupData): Promise<ExportBackupResult> {
  const fileName = createBackupFileName(backup.exportedAt);
  const directory = FileSystem.documentDirectory;

  if (!directory) {
    throw new Error('No backup directory available');
  }

  const uri = `${directory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, buildBackupJson(backup), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Compartir backup de datos',
    });
  }

  return {
    uri,
    shared: sharingAvailable,
  };
}
