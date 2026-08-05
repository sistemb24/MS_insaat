// src/lib/super-admin-auth-error.ts

export type SuperAdminAuthErrorCode =
  // Kimlik hataları
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_NOT_FOUND"
  // Token hataları
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  // OTP hataları
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_RATE_LIMITED"
  // 2FA hataları
  | "TOTP_INVALID"
  | "TOTP_REQUIRED"
  | "BACKUP_CODE_INVALID"
  // Şifre hataları
  | "PASSWORD_TOO_WEAK"
  | "PASSWORD_MISMATCH"
  // Hız sınırlayıcı
  | "RATE_LIMITED"
  // Session hataları
  | "SESSION_EXPIRED"
  | "SESSION_INVALID"
  // Yetki hataları
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  // Kurulum
  | "SETUP_ALREADY_COMPLETE"
  // Bakım
  | "MAINTENANCE_ACTIVE";

export type SuperAdminAuthError = {
  code: SuperAdminAuthErrorCode;
  message: string;
};

export type SuperAdminAuthActionResult =
  | { ok: true }
  | { ok: false; errorCode: SuperAdminAuthErrorCode; message: string };

export const SUPER_ADMIN_AUTH_ERROR_MESSAGES: Record<SuperAdminAuthErrorCode, string> = {
  INVALID_CREDENTIALS: "E-posta veya şifre hatalı.",
  ACCOUNT_LOCKED: "Hesabınız kilitlendi.",
  ACCOUNT_NOT_FOUND: "E-posta veya şifre hatalı.",
  TOKEN_INVALID: "Geçersiz veya süresi dolmuş bağlantı.",
  TOKEN_EXPIRED: "Geçersiz veya süresi dolmuş bağlantı.",
  TOKEN_ALREADY_USED: "Bu bağlantı daha önce kullanıldı veya süresi doldu.",
  OTP_INVALID: "Doğrulama kodu hatalı. Lütfen tekrar deneyin.",
  OTP_EXPIRED: "Doğrulama kodunun süresi doldu.",
  OTP_RATE_LIMITED: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
  TOTP_INVALID: "Doğrulama kodu geçersiz. Uygulamanızdan yeni kodu girin.",
  TOTP_REQUIRED: "İki faktörlü doğrulama gereklidir.",
  BACKUP_CODE_INVALID: "Yedek kod geçersiz.",
  PASSWORD_TOO_WEAK: "Şifre güvenlik gereksinimlerini karşılamıyor.",
  PASSWORD_MISMATCH: "Şifreler eşleşmiyor.",
  RATE_LIMITED: "Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.",
  SESSION_EXPIRED: "Oturum süreniz doldu.",
  SESSION_INVALID: "Geçersiz oturum.",
  UNAUTHORIZED: "Bu sayfaya erişmek için giriş yapmanız gerekiyor.",
  FORBIDDEN: "Bu sayfaya erişim izniniz bulunmuyor.",
  SETUP_ALREADY_COMPLETE: "Süper Admin hesabı zaten oluşturulmuş.",
  MAINTENANCE_ACTIVE: "Sistem şu anda bakım modundadır.",
};

export function createSuperAdminAuthError(
  code: SuperAdminAuthErrorCode,
): SuperAdminAuthError {
  return {
    code,
    message: SUPER_ADMIN_AUTH_ERROR_MESSAGES[code],
  };
}
