import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchEntitlement, requestEmailOtp, verifyEmailOtp } from '../backend/accountService';
import { isBackendConfigured } from '../backend/config';
import { validateProfileInput } from '../domain/session';
import { useSessionStore } from '../store/useSessionStore';
import { fontSize, spacing } from '../utils/responsive';
import { APP_NAME, APP_TAGLINE, colors } from '../utils/theme';

const appLogo = require('../../assets/logo.png');

type OnlineStep = 'form' | 'code';

const RESEND_COOLDOWN_SECONDS = 30;

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const login = useSessionStore((state) => state.login);
  const loginWithAccount = useSessionStore((state) => state.loginWithAccount);
  const lastLoginName = useSessionStore((state) => state.lastLoginName);
  const lastLoginEmail = useSessionStore((state) => state.lastLoginEmail);
  const backendEnabled = isBackendConfigured();
  const [step, setStep] = useState<OnlineStep>('form');
  const [name, setName] = useState(lastLoginName ?? '');
  const [email, setEmail] = useState(lastLoginEmail ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  const codeReady = code.trim().length >= 6;

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleLocalLogin = () => {
    const result = login({ name, email });

    if (!result.success) {
      setError(result.error);
    }
  };

  const handleSendCode = async () => {
    if (busy || resendCooldown > 0) {
      return;
    }

    const trimmedEmail = email.trim();
    const validation = validateProfileInput({ name, email: trimmedEmail });

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (!trimmedEmail) {
      setError('Ingresá tu email para recibir el código.');
      return;
    }

    clearMessages();
    setBusy(true);

    const result = await requestEmailOtp(trimmedEmail);

    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setNotice(`Te enviamos un código a ${trimmedEmail}.`);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setStep('code');
  };

  const handleVerifyCode = async () => {
    if (busy) {
      return;
    }

    if (code.trim().length < 6) {
      setError('Ingresá el código que te llegó por email.');
      return;
    }

    clearMessages();
    setBusy(true);

    const verification = await verifyEmailOtp(email, code);

    if (!verification.success) {
      setBusy(false);
      setError(verification.error);
      return;
    }

    const entitlementResult = await fetchEntitlement();

    setBusy(false);

    const result = loginWithAccount({
      name,
      email: email.trim(),
      accountId: verification.accountId,
      entitlement: entitlementResult.success ? entitlementResult.entitlement : undefined,
    });

    if (!result.success) {
      setError(result.error);
    }
  };

  const handleBackToForm = () => {
    clearMessages();
    setCode('');
    setStep('form');
  };

  // Permite entrar con un código ya recibido sin pedir otro (el SMTP default
  // de Supabase tiene un límite bajo de envíos por hora).
  const handleUseExistingCode = () => {
    const trimmedEmail = email.trim();
    const validation = validateProfileInput({ name, email: trimmedEmail });

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (!trimmedEmail) {
      setError('Ingresá el email al que te llegó el código.');
      return;
    }

    clearMessages();
    setNotice(`Ingresá el código que te llegó a ${trimmedEmail}.`);
    setStep('code');
  };

  const onlineFormStep = (
    <>
      <Text style={styles.cardTitle}>Bienvenido</Text>
      <Text style={styles.cardCopy}>Ingresá con tu email: te enviamos un código para entrar.</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={(value) => {
            setName(value);
            clearMessages();
          }}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={name}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            clearMessages();
          }}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={email}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={handleSendCode}
        style={({ pressed }) => [styles.submit, busy && styles.submitDisabled, pressed && styles.submitPressed]}
      >
        <Text style={styles.submitLabel}>{busy ? 'Enviando...' : 'Enviar código'}</Text>
      </Pressable>

      <View style={styles.secondaryActions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={handleUseExistingCode}>
          <Text style={styles.linkLabel}>Ya tengo un código</Text>
        </Pressable>
      </View>
    </>
  );

  const onlineCodeStep = (
    <>
      <Text style={styles.cardTitle}>Revisá tu email</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Código</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="one-time-code"
          autoFocus
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={(value) => {
            setCode(value);
            setError('');
          }}
          placeholder="12345678"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.codeInput]}
          textContentType="oneTimeCode"
          value={code}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy || !codeReady}
        onPress={handleVerifyCode}
        style={({ pressed }) => [
          styles.submit,
          (busy || !codeReady) && styles.submitDisabled,
          pressed && styles.submitPressed,
        ]}
      >
        <Text style={styles.submitLabel}>{busy ? 'Verificando...' : 'Entrar'}</Text>
      </Pressable>

      <View style={styles.secondaryActions}>
        <Pressable accessibilityRole="button" disabled={busy || resendCooldown > 0} onPress={handleSendCode}>
          <Text style={[styles.linkLabel, resendCooldown > 0 && styles.linkLabelDisabled]}>
            {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={handleBackToForm}>
          <Text style={styles.linkLabel}>Cambiar email</Text>
        </Pressable>
      </View>
    </>
  );

  const localForm = (
    <>
      <Text style={styles.cardTitle}>Bienvenido</Text>
      <Text style={styles.cardCopy}>Creá tu perfil para empezar. Tus datos quedan guardados en este dispositivo.</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={(value) => {
            setName(value);
            setError('');
          }}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={name}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email (opcional)</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setError('');
          }}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={email}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleLocalLogin}
        style={({ pressed }) => [styles.submit, pressed && styles.submitPressed]}
      >
        <Text style={styles.submitLabel}>Comenzar</Text>
      </Pressable>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View pointerEvents="none" style={styles.decorTop} />
      <View pointerEvents="none" style={styles.decorBottom} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, spacing.lg) + spacing.xl,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={appLogo} resizeMode="contain" style={styles.logo} />
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        <View style={styles.card}>
          {backendEnabled ? (step === 'form' ? onlineFormStep : onlineCodeStep) : localForm}
        </View>

        <Text style={styles.footnote}>Funciona sin conexión durante los torneos</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  decorTop: {
    position: 'absolute',
    top: -140,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.blue,
    opacity: 0.34,
  },
  decorBottom: {
    position: 'absolute',
    bottom: -170,
    left: -130,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.sky,
    opacity: 0.16,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    width: 124,
    height: 124,
    marginBottom: spacing.sm,
  },
  appName: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 3,
  },
  tagline: {
    color: colors.textOnDarkSoft,
    fontSize: fontSize.body,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  cardCopy: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
    fontWeight: '600',
    lineHeight: 18,
  },
  notice: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
    lineHeight: 18,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
  codeInput: {
    letterSpacing: 6,
    fontWeight: '900',
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  submit: {
    marginTop: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.blue,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitPressed: {
    backgroundColor: colors.blueDark,
  },
  submitDisabled: {
    opacity: 0.62,
  },
  submitLabel: {
    color: colors.white,
    fontSize: fontSize.button,
    fontWeight: '900',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  linkLabel: {
    color: colors.blue,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  linkLabelDisabled: {
    color: colors.textSecondary,
  },
  footnote: {
    color: colors.sky,
    fontSize: fontSize.small,
    fontWeight: '800',
    textAlign: 'center',
  },
});
