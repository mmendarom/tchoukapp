import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { AppBackupData, BackupValidationResult, parseBackupJson } from '../domain/backup';

export type ImportBackupResult =
  | { canceled: true }
  | { canceled: false; validation: BackupValidationResult; backup?: AppBackupData };

export async function pickAndParseBackupJson(): Promise<ImportBackupResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return { canceled: true };
  }

  const asset = result.assets[0];

  if (!asset) {
    return { canceled: false, validation: { valid: false, error: 'No se pudo importar el backup.' } };
  }

  const json = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const validation = parseBackupJson(json);

  return validation.valid
    ? { canceled: false, validation, backup: validation.backup }
    : { canceled: false, validation };
}
