import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { assetData, assessmentYear = '2025' } = await req.json();

    if (!assetData) {
      return NextResponse.json({ error: 'Missing asset data' }, { status: 400 });
    }

    // 1. Parse assetData string [Asset Name] / [OYR] / [EUL] / [Install Year]
    const parts = assetData.split('/').map((p: string) => p.trim());
    const inputAssetName = parts[0] || assetData;
    const oyrValue = parseInt(parts[1]) || 0;
    const eulInput = parts[2] || '0';
    const installYear = parts[3] || 'Unknown';

    // 2. Load Systems Data and Find Match
    let matchedSystem = null;
    try {
      const filePath = path.join(process.cwd(), 'lib', 'systemsData.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      const systems = JSON.parse(fileData);

      matchedSystem = systems.find((s: any) =>
        s["System NAME"].toLowerCase().includes(inputAssetName.toLowerCase()) ||
        inputAssetName.toLowerCase().includes(s["System NAME"].toLowerCase().split(' - ')[0].toLowerCase())
      );
    } catch (err) {
      console.error('Error loading systems data:', err);
    }

    const priorityDescription = matchedSystem ? matchedSystem.Description : 'No direct template found.';
    const assetLifetime = matchedSystem ? matchedSystem.LIFETIME : eulInput;

    // 3. Dynamic Weighting Logic
    const isHealthy = oyrValue > 5;
    const templateWeight = isHealthy ? "5%" : "70%";
    const ratingWeight = isHealthy ? "95%" : "30%";

    // 4. Construct the Dynamic Prompt
    const systemPrompt = `
      You are a professional architectural facility assessor. 
      Your task is to generate a concise, two-part technical assessment report.
      
      BACKGROUND LOGIC (INTERNAL ONLY):
      - System: ${inputAssetName}
      - OYR (Years Observed Remaining): ${oyrValue}
      - EUL (Expected Lifetime): ${assetLifetime}
      - Reference Context: ${priorityDescription}

      RESTRICTED WORDS (NEVER USE IN OUTPUT):
      - Excellent, Good, Stable, Fair, Poor, Critical-B, Critical-A.

      CONDITION RATING RULES (Internal Guidance for Content):
      - 10: State as functioning as intended, as new condition, limited deterioration.
      - 7-9: State as functioning as intended with normal deterioration, no repairs anticipated.
      - 5-6: State as functioning as intended but monitoring required as system is near end of life.
      - 3-4: State as functioning as intended but minor distress observed; minor repairs required within next 5 years.
      - 2: State as not functioning as intended; significant deterioration; significant repairs required.
      - 0-1: State as not functioning as intended; significant deterioration/major distress; failure occurred or imminent.

      DYNAMIC CONSTRAINTS:
      - Since OYR is ${oyrValue}, current state is: ${isHealthy ? 'HEALTHY' : 'AGED'}.
      - Weighting: Use Only ${templateWeight} of terminology from "Reference Context" and ${ratingWeight} of "Condition Rating Rules".
      - Tonality: Clinical, forensic. 
      - Length: Exactly 2-3 sentences per section. Max 2 lines per section.
      
      STRICT SEPARATION RULES:
      1. Section 'Description:' MUST ONLY contain the technical definition and physical components of the system. NEVER mention condition, defects, or age-related status here.
      2. Section 'Condition:' MUST ONLY contain the assessment of the system's operational and physical state.

      OUTPUT REQUIREMENTS:
      1. Format: Exactly "Description:" and "Condition:" headers.
      2. Content: NEVER mention OYR numbers, EUL/Year numbers, or the RESTRICTED WORDS.

      Description:
      ${assessmentYear} - [Technical definition of the system's physical components ONLY. No condition info.]

      Condition:
      ${assessmentYear} - [Technical condition finding based on the rating rules. No system definition.]
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Process: ${assetData}` }
        ],
        max_tokens: 500,
        temperature: 0.5
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error(data.error?.message || 'Invalid response from Groq');
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}