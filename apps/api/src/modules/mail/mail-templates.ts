// Basit HTML e-posta şablonları. Renk paleti Bindi kurumsal ile uyumlu.
// Kullanım: renderTemplate('welcome', { name: 'Ali', ... })

interface BaseVars {
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
}

const SITE_NAME = 'Bindi';
const SITE_URL = 'https://bindi.com.tr';
const LOGO_URL = 'https://bindi.com.tr/images/bindi-logo.jpg';

function wrap(bodyHtml: string, vars: BaseVars = {}) {
  const siteName = vars.siteName ?? SITE_NAME;
  const siteUrl = vars.siteUrl ?? SITE_URL;
  const logoUrl = vars.logoUrl ?? LOGO_URL;
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${siteName}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#F5EDE3; color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDE3;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #eee;">
              <a href="${siteUrl}" style="text-decoration:none; color:inherit; display:inline-flex; align-items:center;">
                <img src="${logoUrl}" alt="${siteName}" width="80" height="auto" style="display:block; max-height:56px;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background:#F5EDE3; color:#666; font-size:12px; text-align:center;">
              © ${new Date().getFullYear()} ${siteName} — Okul Servisi Marketi<br/>
              <a href="${siteUrl}" style="color:#E07856; text-decoration:none;">bindi.com.tr</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, url: string): string {
  return `<div style="text-align:center; margin: 24px 0;">
    <a href="${url}" style="display:inline-block; background:#E07856; color:#ffffff; padding:12px 28px; border-radius:12px; text-decoration:none; font-weight:700; font-size:14px;">${label}</a>
  </div>`;
}

function h2(text: string) {
  return `<h2 style="margin: 0 0 12px; font-size: 22px; color:#1A1A1A;">${text}</h2>`;
}
function p(text: string) {
  return `<p style="margin: 0 0 16px; font-size:14px; line-height:1.6; color:#333;">${text}</p>`;
}
function box(text: string, kind: 'info' | 'ok' | 'warn' | 'err' = 'info') {
  const bg = kind === 'ok' ? '#ECFDF5' : kind === 'warn' ? '#FFFBEB' : kind === 'err' ? '#FEF2F2' : '#EEF2FF';
  const border = kind === 'ok' ? '#A7F3D0' : kind === 'warn' ? '#FDE68A' : kind === 'err' ? '#FECACA' : '#C7D2FE';
  const color = kind === 'ok' ? '#065F46' : kind === 'warn' ? '#92400E' : kind === 'err' ? '#991B1B' : '#3730A3';
  return `<div style="background:${bg}; border:1px solid ${border}; color:${color}; padding:14px 16px; border-radius:10px; font-size:13px; margin: 16px 0;">${text}</div>`;
}

export const MailTemplates = {
  wrap,

  contactForm(params: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  }) {
    const rows: string[] = [];
    rows.push(`<tr><td style="padding:6px 8px; color:#666; width:100px;">Ad</td><td style="padding:6px 8px;">${escape(params.name)}</td></tr>`);
    rows.push(`<tr><td style="padding:6px 8px; color:#666;">E-posta</td><td style="padding:6px 8px;">${escape(params.email)}</td></tr>`);
    if (params.phone) rows.push(`<tr><td style="padding:6px 8px; color:#666;">Telefon</td><td style="padding:6px 8px;">${escape(params.phone)}</td></tr>`);
    if (params.subject) rows.push(`<tr><td style="padding:6px 8px; color:#666;">Konu</td><td style="padding:6px 8px;">${escape(params.subject)}</td></tr>`);
    const body =
      h2('Yeni İletişim Formu Mesajı') +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:16px; font-size:14px;">${rows.join('')}</table>` +
      box(`<b>Mesaj:</b><br/><br/><div style="white-space:pre-wrap;">${escape(params.message)}</div>`);
    return wrap(body);
  },

  providerApproved(params: { companyName: string; phone: string; password?: string }) {
    const body =
      h2('Hesabınız onaylandı 🎉') +
      p(`Merhaba <b>${escape(params.companyName)}</b>, hesabınız onaylandı ve aktif. Panelinize giriş yapabilirsiniz.`) +
      (params.password
        ? box(`Giriş Bilgileri:<br/>Telefon: <b>${escape(params.phone)}</b><br/>Şifre: <b>${escape(params.password)}</b><br/><br/>Girişten sonra şifrenizi değiştirmenizi öneririz.`, 'ok')
        : '') +
      button('Panele Giriş', `${SITE_URL}/servisci/giris`);
    return wrap(body);
  },

  providerDocsRejected(params: { companyName: string; rejectedList: string[]; password?: string; phone: string }) {
    const body =
      h2('Bazı belgeleriniz reddedildi') +
      p(`Merhaba <b>${escape(params.companyName)}</b>, aşağıdaki belgeleri tekrar yüklemeniz gerekiyor:`) +
      box('<ul style="margin:0; padding-left:20px;">' + params.rejectedList.map((n) => `<li>${escape(n)}</li>`).join('') + '</ul>', 'warn') +
      (params.password
        ? box(`Giriş Bilgileri:<br/>Telefon: <b>${escape(params.phone)}</b><br/>Şifre: <b>${escape(params.password)}</b>`, 'info')
        : '') +
      button('Belgelerimi Aç', `${SITE_URL}/servisci/belgelerim`);
    return wrap(body);
  },

  paymentReceiptSubmitted(params: { studentName: string; period: string; amount: number; parentName: string }) {
    const body =
      h2('Dekont yüklendi') +
      p(`<b>${escape(params.parentName)}</b> velisi <b>${escape(params.studentName)}</b> için <b>${escape(params.period)}</b> dönemine ait <b>₺${params.amount.toLocaleString('tr-TR')}</b> tutarında dekontu panele yükledi.`) +
      button('Ödemeler Sayfasını Aç', `${SITE_URL}/servisci/odemeler`);
    return wrap(body);
  },

  paymentReminder(params: { studentName: string; period: string; amount: number; daysLeft: number }) {
    const late = params.daysLeft < 0;
    const body =
      h2(late ? `${params.period} ödemesi ${Math.abs(params.daysLeft)} gün gecikti` : `${params.period} ödeme hatırlatması`) +
      p(`<b>${escape(params.studentName)}</b> için <b>₺${params.amount.toLocaleString('tr-TR')}</b> tutarındaki ödeme ${late ? `${Math.abs(params.daysLeft)} gün gecikti` : `${params.daysLeft} gün içinde son`}.`) +
      button('Ödemeyi Görüntüle', `${SITE_URL}/veli/odemeler`);
    return wrap(body);
  },
};

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
