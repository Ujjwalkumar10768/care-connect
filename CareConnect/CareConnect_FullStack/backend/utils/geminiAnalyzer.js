import { GoogleGenerativeAI } from "@google/generative-ai";

const analyzeSymptomsWithGemini = async (symptoms) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.includes('your_')) {
            console.warn("Gemini API key is not set or placeholder. Using fallback rule-based analyzer.");
            return null;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-1.5-flash as it is fast, cost-effective, and fully capable of this task
        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        // Symptoms can be a string (natural language) or array of strings. We format it accordingly.
        const symptomsText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;

        const systemPrompt = `You are an expert medical diagnostic AI assistant.
Analyze the following patient symptoms: "${symptomsText}".
Provide a diagnosis and return a JSON object with the exact keys:
{
  "disease": "Predicted primary disease/condition name",
  "severity": "low" | "medium" | "high",
  "confidence": number (from 0 to 100),
  "description": "Clear medical explanation of the disease and why symptoms match.",
  "recommendedSpecialists": ["SpecialistCategory1", "SpecialistCategory2"],
  "foodsToEat": ["List of recommended foods or drinks to consume for this condition"],
  "foodsToAvoid": ["List of foods, drinks, or substances to avoid for this condition"]
}
Supported Specialist Categories MUST be one or more of: "Cardiologist", "Neurologist", "Pulmonologist", "Gastroenterologist", "Dermatologist", "ENT", "General Practitioner", "Physiotherapist", "Infectious Disease Specialist", "Hematologist", "Allergist".
Return ONLY the raw JSON object. Do not include markdown code block syntax (like \`\`\`json).`;

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();
        
        console.log("Gemini API raw response:", responseText);
        
        const parsed = JSON.parse(responseText.trim());

        // Validate structure and values
        if (!parsed.disease || !parsed.severity || parsed.confidence === undefined || !parsed.description || !parsed.recommendedSpecialists) {
            console.error("Gemini response is missing required fields:", parsed);
            return null;
        }

        // Handle default foods arrays if they are missing
        if (!Array.isArray(parsed.foodsToEat)) {
            parsed.foodsToEat = parsed.foodsToEat ? [parsed.foodsToEat] : [];
        }
        if (!Array.isArray(parsed.foodsToAvoid)) {
            parsed.foodsToAvoid = parsed.foodsToAvoid ? [parsed.foodsToAvoid] : [];
        }

        // Standardize severity case
        const severity = parsed.severity.toLowerCase();
        if (!['low', 'medium', 'high'].includes(severity)) {
            parsed.severity = 'medium';
        } else {
            parsed.severity = severity;
        }

        // Standardize specialists to match available ones
        const validSpecialists = [
            "Cardiologist", "Neurologist", "Pulmonologist", "Gastroenterologist", 
            "Dermatologist", "ENT", "General Practitioner", "Physiotherapist", 
            "Infectious Disease Specialist", "Hematologist", "Allergist"
        ];
        
        parsed.recommendedSpecialists = parsed.recommendedSpecialists.map(spec => {
            // Find fuzzy matches or default to General Practitioner
            const match = validSpecialists.find(vs => vs.toLowerCase() === spec.toLowerCase() || vs.toLowerCase().includes(spec.toLowerCase()) || spec.toLowerCase().includes(vs.toLowerCase()));
            return match || "General Practitioner";
        });

        // Ensure we don't have duplicate specialists
        parsed.recommendedSpecialists = Array.from(new Set(parsed.recommendedSpecialists));

        if (parsed.recommendedSpecialists.length === 0) {
            parsed.recommendedSpecialists = ["General Practitioner"];
        }

        return {
            success: true,
            analysis: parsed
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return null;
    }
};

export { analyzeSymptomsWithGemini };
