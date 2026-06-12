require('dotenv').config();
const { getDemoResult } = require('../server/gemini-news');
const { previewReportEmail, sendReportEmail, getEmailStatus } = require('../server/email');

async function run() {
  console.log('News_AI 이메일 기능 검증\n');

  const status = getEmailStatus();
  console.log(`발송 모드: ${status.mode} (${status.message})\n`);

  const sample = getDemoResult('AI');
  const payload = {
    keyword: sample.keyword,
    searchedAt: sample.searchedAt,
    articles: sample.articles,
    report: sample.report,
  };

  console.log('1) HTML 미리보기');
  const preview = previewReportEmail(payload);
  console.log(`   ✅ subject: ${preview.subject}`);
  console.log(`   ✅ html length: ${preview.html.length} chars`);

  if (!status.configured) {
    console.log('\n2) 발송 — 설정 없음');
    return;
  }

  console.log('\n2) 테스트 발송 → test@example.com');
  const result = await sendReportEmail('test@example.com', payload);
  console.log(`   ✅ mode: ${result.mode}`);
  console.log(`   ✅ message: ${result.message}`);
  if (result.previewUrl) console.log(`   ✅ preview: ${result.previewUrl}`);
}

run().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
