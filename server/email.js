const nodemailer = require('nodemailer');
const { buildReportHtml, buildReportText } = require('./report-builder');

let etherealAccountPromise = null;

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getEmailMode() {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM
  ) {
    return 'smtp';
  }
  if (process.env.EMAIL_USE_ETHEREAL !== 'false') return 'ethereal';
  return 'none';
}

function isEmailConfigured() {
  return getEmailMode() !== 'none';
}

function getEmailStatus() {
  const mode = getEmailMode();
  return {
    configured: mode !== 'none',
    mode,
    isTestMode: mode === 'ethereal',
    message:
      mode === 'resend'
        ? 'Resend API로 실제 이메일 발송 가능'
        : mode === 'smtp'
          ? 'SMTP로 실제 이메일 발송 가능'
          : mode === 'ethereal'
            ? '테스트 발송(Ethereal) — 미리보기 링크 제공. 실제 수신함 발송은 SMTP/Resend 설정'
            : '이메일 발송 미설정',
  };
}

function buildEmailPayload(payload) {
  const { keyword, searchedAt, articles, report } = payload;
  if (!keyword || !report) {
    const err = new Error('발송할 보고서 데이터가 없습니다. 먼저 검색을 실행해 주세요.');
    err.status = 400;
    throw err;
  }
  return { keyword, searchedAt, articles, report };
}

async function getEtherealAccount() {
  if (!etherealAccountPromise) {
    etherealAccountPromise = nodemailer.createTestAccount();
  }
  return etherealAccountPromise;
}

async function sendViaResend(to, subject, html, text) {
  const from = process.env.EMAIL_FROM || 'News_AI <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to.trim()], subject, html, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Resend 발송 실패');
    err.status = res.status >= 500 ? 502 : 400;
    throw err;
  }
  return { provider: 'resend', id: data.id };
}

async function sendViaSmtp(to, subject, html, text) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: to.trim(),
    subject,
    html,
    text,
  });

  return { provider: 'smtp', messageId: info.messageId };
}

async function sendViaEthereal(to, subject, html, text) {
  const account = await getEtherealAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"News_AI" <${account.user}>`,
    to: to.trim(),
    subject: `[테스트] ${subject}`,
    html,
    text,
  });

  return {
    provider: 'ethereal',
    previewUrl: nodemailer.getTestMessageUrl(info),
    messageId: info.messageId,
  };
}

async function sendReportEmail(to, payload) {
  if (!validateEmail(to)) {
    const err = new Error('올바른 이메일 주소를 입력해 주세요.');
    err.status = 400;
    throw err;
  }

  const mode = getEmailMode();
  if (mode === 'none') {
    const err = new Error(
      '이메일 발송 설정이 없습니다. .env에 RESEND_API_KEY 또는 SMTP 설정을 추가해 주세요.'
    );
    err.status = 503;
    throw err;
  }

  const data = buildEmailPayload(payload);
  const subject = `[News_AI] ${data.keyword} 전략 이슈 보고서 (최근 7일)`;
  const html = buildReportHtml(data);
  const text = buildReportText(data);

  let result;
  if (mode === 'resend') {
    result = await sendViaResend(to, subject, html, text);
  } else if (mode === 'smtp') {
    result = await sendViaSmtp(to, subject, html, text);
  } else {
    result = await sendViaEthereal(to, subject, html, text);
  }

  return {
    ok: true,
    to: to.trim(),
    mode: result.provider,
    testMode: result.provider === 'ethereal',
    previewUrl: result.previewUrl || null,
    message:
      result.provider === 'ethereal'
        ? '테스트 메일이 발송되었습니다. 아래 미리보기 링크에서 확인하세요. 실제 수신함 발송은 SMTP/Resend 설정이 필요합니다.'
        : `${to.trim()}(으)로 보고서를 발송했습니다.`,
  };
}

function previewReportEmail(payload) {
  const data = buildEmailPayload(payload);
  const status = getEmailStatus();
  return {
    ok: true,
    ...status,
    subject: `[News_AI] ${data.keyword} 전략 이슈 보고서 (최근 7일)`,
    html: buildReportHtml(data),
    text: buildReportText(data),
  };
}

module.exports = {
  sendReportEmail,
  previewReportEmail,
  validateEmail,
  isEmailConfigured,
  getEmailStatus,
};
