import { API_URL } from './config';

/**
 * İki adımlı upload — Expo/RN FormData bug'ından kurtarır.
 * Adım 1: /providers/upload/document (public multipart) → fileUrl döner
 * Adım 2: caller fileUrl'i JSON body ile hedef endpoint'e gönderir
 *
 * XMLHttpRequest kullanır çünkü RN'de fetch+FormData bazı iOS sürümlerinde
 * 'Unsupported FormDataPart implementation' hatası verir.
 */
export async function uploadFile(
  uri: string,
  opts?: { mimeType?: string; fileName?: string },
): Promise<{ fileUrl: string; originalName: string; size: number }> {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType =
    opts?.mimeType ??
    (ext === 'png' ? 'image/png'
      : ext === 'heic' ? 'image/heic'
      : ext === 'webp' ? 'image/webp'
      : ext === 'pdf' ? 'application/pdf'
      : 'image/jpeg');
  const fileName = opts?.fileName ?? `upload-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);

    xhr.open('POST', `${API_URL}/providers/upload/document`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            fileUrl: data.fileUrl,
            originalName: data.originalName ?? fileName,
            size: data.size ?? 0,
          });
        } catch (e) {
          reject(new Error('Sunucu yanıtı okunamadı'));
        }
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          msg = JSON.parse(xhr.responseText)?.message ?? msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Ağ hatası — dosya gönderilemedi'));
    xhr.ontimeout = () => reject(new Error('Zaman aşımı'));
    xhr.timeout = 60000;
    xhr.send(form);
  });
}
