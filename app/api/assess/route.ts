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
    let templateWeight = "50%";
    let ratingWeight = "50%";

    if (oyrValue >= 0 && oyrValue <= 3) {
      templateWeight = "80%";
      ratingWeight = "20%"; // Total 100%
    } else if (oyrValue >= 4 && oyrValue <= 6) {
      templateWeight = "70%";
      ratingWeight = "30%";
    } else if (oyrValue >= 7) {
      templateWeight = "50%";
      ratingWeight = "50%";
    }

    const isHealthy = oyrValue > 5;

    // 4. Construct the Dynamic Prompt
    const systemPrompt = `
      You are a professional architectural facility assessor. 
      Your task is to generate a concise, two-part technical assessment report.
      
      BACKGROUND LOGIC (INTERNAL ONLY):
      - System: ${inputAssetName}
      - OYR (Years Observed Remaining): ${oyrValue}
      - EUL (Expected Lifetime): ${assetLifetime}
      - Install Year: ${installYear}
      - Reference Context: ${priorityDescription}

      RESTRICTED WORDS (NEVER USE IN OUTPUT):
      - Excellent, Good, Stable, Fair, Poor, Critical-B, Critical-A.

      CONDITION RATING RULES (Internal Guidance for Content):
      - 10: Functioning as intended, as new condition. Describe visual/physical state without defects.
      - 7-9: Functioning as intended with normal deterioration. Describe expected minor wear specific to this system type (e.g., superficial scuffs, minor fading).
      - 5-6: Functioning as intended but monitoring required. Describe physical signs of aging based on system type (e.g., worn components, dulling finish).
      - 3-4: Functioning as intended but minor distress observed. Describe specific minor distress signs based on system type (e.g., localized cracking, minor leaks, increased operating noise).
      - 2: Not functioning as intended; significant deterioration. Describe significant failures (e.g., widespread cracking, compromised seals, frequent breakdowns).
      - 0-1: Not functioning as intended; failure occurred or imminent. Describe severe distress or structural compromise.

      DYNAMIC CONSTRAINTS:
      - Since OYR is ${oyrValue}, current state is: ${isHealthy ? 'HEALTHY' : 'AGED'}.
      ${oyrValue > 10 ? '- OYR is above 10: keep the Condition section to a single short sentence; it will be replaced with a standard "outside the planning window" note.' : ''}
      - Weighting: Rely heavily on reasoning based on OYR (${oyrValue}), EUL (${assetLifetime}), and Install Year (${installYear}). Use ${templateWeight} of terminology from "Reference Context" and ${ratingWeight} of "Condition Rating Rules".
      - Tonality: Clinical, forensic. 
      - Length: Exactly 1-2 descriptive sentences per section. Max 2 lines per section.
      
      STRICT SEPARATION RULES:
      1. Section 'Description:' MUST ONLY contain the technical definition and physical components of the system. NEVER mention condition, defects, or age-related status here.
      2. Section 'Condition:' MUST NOT just parrot the rating definitions verbatim. Based on the system type, OYR, EUL, and Install Year, provide practical reasoning that includes specific visual, physical, or operational signs of wear or health. Give a clear, tangible description of what this specific asset looks/feels like in its current state.

      OUTPUT REQUIREMENTS:
      1. Format: Exactly "Description:" and "Condition:" headers. DO NOT include the assessment year (e.g., "2025 - ") at the start of your descriptions. We will add that manually.
      2. Content: NEVER mention OYR numbers, EUL/Year numbers, or the RESTRICTED WORDS.

      Description:
      [Technical definition of the system's physical components ONLY. No condition info.]

      Condition:
      [Visual and practical condition finding based on the rating rules. Describe the specific physical state of this system type without just reciting the rules.]
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Process: ${assetData}` }
        ],
        // gpt-oss is a reasoning model: reasoning tokens draw from the same
        // budget, so keep effort low and leave enough room for the answer.
        reasoning_effort: 'low',
        max_completion_tokens: 1500,
        temperature: 0.5
      })
    });

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error(data.error?.message || 'Invalid response from Groq');
    }

    // Collapse each section into a single line and add ONE dynamic year prefix.
    const clean = (text: string) =>
      text
        .replace(/\*+/g, '') // strip markdown bold/italic markers
        .split('\n')
        .map((l) =>
          l
            .replace(/^[\s\-:•]+/, '') // leading bullets / dashes / colons
            .replace(/^\d{4}\s*-\s*/, '') // stray "2026 - " prefixes from the model
            .trim()
        )
        .filter((l) => l.length > 0)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const raw = result.replace(/\r/g, '');
    const descMatch = raw.match(/description:\s*([\s\S]*?)(?=condition:|$)/i);
    const condMatch = raw.match(/condition:\s*([\s\S]*)/i);

    const descriptionText = descMatch ? clean(descMatch[1]) : clean(raw);
    let conditionText = condMatch ? clean(condMatch[1]) : '';

    // Assets with more than 10 years remaining are outside the planning window.
    if (oyrValue > 10) {
      conditionText = 'The System is outside the planning window.';
    }

    result = [
      'Description:',
      `${assessmentYear} - ${descriptionText}`,
      '',
      'Condition:',
      `${assessmentYear} - ${conditionText}`,
    ].join('\n');

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}