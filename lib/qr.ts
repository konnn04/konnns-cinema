import QRCode from 'qrcode';

export async function generateQRCodeSVG(text: string, size: number = 200): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 1.5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code SVG via qrcode library:', err);
    return '';
  }
}

/**
 * Generates a Data URL (base64 image/png) using the official 'qrcode' library.
 */
export async function generateQRCodeDataURL(text: string, size: number = 200): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1.5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code Data URL via qrcode library:', err);
    // Reliable API fallback
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

/**
 * Get instant QR image URL (SVG or API based)
 */
export function getQRCodeApiUrl(text: string, size: number = 200): string {
  if (!text) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(text)}`;
}
