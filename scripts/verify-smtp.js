require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.error('❌ .env에 SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM을 모두 입력하세요.');
    process.exit(1);
  }

  console.log('Gmail SMTP 연결 확인...\n');
  console.log(`  HOST: ${SMTP_HOST}`);
  console.log(`  USER: ${SMTP_USER}`);
  console.log(`  FROM: ${EMAIL_FROM}\n`);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP 연결 성공 — npm start 후 실제 발송 가능');
  } catch (err) {
    console.error('❌ SMTP 연결 실패:', err.message);
    console.error('\n확인 사항:');
    console.error('  1. Google 2단계 인증 켜짐');
    console.error('  2. SMTP_PASS = 일반 비밀번호 아님 → 앱 비밀번호 16자');
    console.error('  3. SMTP_USER / EMAIL_FROM 의 @gmail.com 주소 동일');
    process.exit(1);
  }
}

main();
