# Facility Condition Assessor - Version 1.0

Professional Architectural Assessment Generator designed to produce clinical, technical, and forensic reports for facility assets.

## 🚀 Introduction

This application utilizes advanced AI (Groq / Llama 3.3 70B) to transform simple asset data strings into professional architectural reports. It integrates localized data from `Systems.xlsx` to ensure technical accuracy and adheres to strict forensic reporting standards.

## 📋 Features

- **XLSX Data Integration**: Matches input strings against a localized database of systems for high-priority technical definitions and EUL (Expected Useful Life) data.
- **Dynamic Assessment Logic**: Automatically adjusts report weighting based on the Observed Years Remaining (OYR).
- **Custom Assessment Year**: Users can define the assessment year (e.g., 2024, 2025) directly in the UI.
- **Forensic Tone**: Produces reports that are clinical, professional, and free of conversational "fluff."

## ⚖️ Assessment Rules

The engine follows a strict set of internal logic for every generation:

### 1. Data Separation
- **Description**: Technical definition of the system's physical components ONLY. No condition or age status.
- **Condition**: Technical findings based on observed state and operational status.

### 2. Rating Logic (OYR Scale)
The generator maps the "Years Observed Remaining" (OYR) to specific technical states:
- **10**: Excellent / As-new state.
- **7-9**: Good / Normal deterioration.
- **5-6**: Stable / Monitoring required.
- **3-4**: Fair / Minor repairs required within 5 years.
- **2**: Poor / Significant repairs required.
- **0-1**: Critical / Failure imminent or occurred.

### 3. Dynamic Weighting
- **OYR > 5**: AI relies 95% on standard rating definitions and relaxes reliance on template-provided deterioration examples.
- **OYR ≤ 5**: AI relies 70% on technical forensic templates from the local database to ensure detailed deterioration descriptions.

### 4. Restricted Words
The following labels are **FORBIDDEN** from appearing in the output text to ensure forensic neutrality:
- *Excellent, Good, Stable, Fair, Poor, Critical-B, Critical-A*

## 🛠️ How to Use

### Input String Format
The system expects a specific string format in the input field:
`[System Name/Description] / [OYR] / [EUL] / [Install Year]`

*Example:* `Exterior Doors / 0 / 15 / 1987`

### Execution
1.  Enter the **System String**.
2.  Set the **Assessment Year**.
3.  Click **Generate Technical Report**.
4.  Copy the output directly to your clipboard using the built-in copy button.

## 📦 Deployment

### Prerequisites
- Node.js 18+
- Groq API Key (Llama 3.3 70B Versatile)

### Environment Variables
Create a `.env.local` file in the root directory:
```text
GROQ_API_KEY=your_groq_api_key_here
```

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

---
Built by Fahim Yaqoobi & Claude. Ready for deployment to GitHub and Vercel.
