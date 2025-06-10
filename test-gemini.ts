import 'dotenv/config';
import { geminiModel } from "./src/utils/vertexClient";

async function testGemini() {
  try {
    const prompt = `Jelaskan siapa itu Albert Einstein dalam 3 kalimat.`;
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const output = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("✅ Output Gemini:\n", output);
  } catch (err) {
    console.error("❌ Error saat memanggil Gemini:", err);
  }
}

testGemini();
