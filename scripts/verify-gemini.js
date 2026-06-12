require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

async function main() {
  console.log('News_AI Gemini 연동 검증\n');

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY가 .env에 없습니다.');
    process.exit(1);
  }

  console.log(`모델: ${modelName}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }],
  });

  try {
    const result = await model.generateContent(
      '오늘 날짜를 한국어로 한 문장만 답하세요.'
    );
    const text = result.response.text().trim();
    console.log('✅ Gemini 응답:', text.slice(0, 120));
    console.log('\n검증 완료 — npm start 후 http://localhost:' + (process.env.PORT || 3001));
  } catch (err) {
    console.error('❌ Gemini 오류:', err.message);
    process.exit(1);
  }
}

main();
