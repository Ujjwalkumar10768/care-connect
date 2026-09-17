// Symptom to Disease Mapping Database
const symptomDiseaseDatabase = {
    // Cardiovascular Diseases
    'chest pain': {
        diseases: ['Angina', 'Heart Attack', 'Acid Reflux'],
        specialists: ['Cardiologist'],
        severity: 'high'
    },
    'shortness of breath': {
        diseases: ['Asthma', 'Heart Failure', 'Pneumonia'],
        specialists: ['Pulmonologist', 'Cardiologist'],
        severity: 'high'
    },
    'rapid heartbeat': {
        diseases: ['Arrhythmia', 'Anxiety', 'Hyperthyroidism'],
        specialists: ['Cardiologist'],
        severity: 'medium'
    },

    // Respiratory Diseases
    'cough': {
        diseases: ['Common Cold', 'Bronchitis', 'Asthma', 'Pneumonia'],
        specialists: ['Pulmonologist', 'General Practitioner'],
        severity: 'medium'
    },
    'sore throat': {
        diseases: ['Pharyngitis', 'Strep Throat', 'Common Cold'],
        specialists: ['ENT', 'General Practitioner'],
        severity: 'low'
    },
    'runny nose': {
        diseases: ['Common Cold', 'Allergies', 'Sinusitis'],
        specialists: ['ENT', 'Allergist'],
        severity: 'low'
    },

    // Neurological Diseases
    'headache': {
        diseases: ['Migraine', 'Tension Headache', 'Fever'],
        specialists: ['Neurologist', 'General Practitioner'],
        severity: 'medium'
    },
    'dizziness': {
        diseases: ['Vertigo', 'Blood Pressure Issue', 'Ear Infection'],
        specialists: ['Neurologist', 'ENT'],
        severity: 'medium'
    },
    'numbness': {
        diseases: ['Neuropathy', 'Stroke', 'Multiple Sclerosis'],
        specialists: ['Neurologist'],
        severity: 'high'
    },

    // Gastrointestinal Diseases
    'stomach pain': {
        diseases: ['Gastritis', 'Ulcer', 'IBS', 'Food Poisoning'],
        specialists: ['Gastroenterologist', 'General Practitioner'],
        severity: 'medium'
    },
    'nausea': {
        diseases: ['Food Poisoning', 'Gastritis', 'Migraine'],
        specialists: ['Gastroenterologist', 'General Practitioner'],
        severity: 'medium'
    },
    'vomiting': {
        diseases: ['Food Poisoning', 'Viral Infection', 'Gastritis'],
        specialists: ['Gastroenterologist', 'General Practitioner'],
        severity: 'medium'
    },
    'diarrhea': {
        diseases: ['Food Poisoning', 'IBS', 'Viral Infection'],
        specialists: ['Gastroenterologist'],
        severity: 'medium'
    },

    // General Symptoms
    'fever': {
        diseases: ['Common Cold', 'Flu', 'Infection', 'Malaria'],
        specialists: ['General Practitioner', 'Infectious Disease Specialist'],
        severity: 'medium'
    },
    'body ache': {
        diseases: ['Flu', 'Common Cold', 'Muscle Strain'],
        specialists: ['General Practitioner', 'Physiotherapist'],
        severity: 'low'
    },
    'fatigue': {
        diseases: ['Anemia', 'Thyroid Issue', 'Depression'],
        specialists: ['General Practitioner', 'Hematologist'],
        severity: 'medium'
    },

    // Skin Diseases
    'rash': {
        diseases: ['Allergy', 'Eczema', 'Psoriasis'],
        specialists: ['Dermatologist'],
        severity: 'low'
    },
    'itching': {
        diseases: ['Allergy', 'Eczema', 'Scabies'],
        specialists: ['Dermatologist'],
        severity: 'low'
    }
};

// AI Symptom Analysis Engine
const analyzeSymptoms = (symptomsInput) => {
    try {
        if (!symptomsInput || (Array.isArray(symptomsInput) && symptomsInput.length === 0)) {
            return {
                success: false,
                message: 'No symptoms provided'
            };
        }

        let symptomsArray = [];
        let isNaturalLanguage = false;

        if (typeof symptomsInput === 'string') {
            isNaturalLanguage = true;
            const normalizedInput = symptomsInput.toLowerCase();
            // Match symptom keys from the database against the user input string
            Object.keys(symptomDiseaseDatabase).forEach(key => {
                if (normalizedInput.includes(key)) {
                    symptomsArray.push(key);
                }
            });

            if (symptomsArray.length === 0) {
                // If no matching keywords found, return general practitioner consultation
                return {
                    success: true,
                    analysis: {
                        disease: 'General Consultation Needed',
                        confidence: 40,
                        severity: 'low',
                        description: 'Your symptoms require a general medical consultation. We could not match any specific conditions in our local database.',
                        recommendedSpecialists: ['General Practitioner']
                    }
                };
            }
        } else if (Array.isArray(symptomsInput)) {
            symptomsArray = symptomsInput;
        } else {
            return {
                success: false,
                message: 'Invalid symptoms format'
            };
        }

        // Convert to lowercase for matching
        const normalizedSymptoms = symptomsArray.map(s => s.toLowerCase());

        // Collect all possible diseases and specialists
        const diseaseSet = new Set();
        const specialistSet = new Set();
        let severityLevel = 'low';

        // Match symptoms with database
        normalizedSymptoms.forEach(symptom => {
            Object.keys(symptomDiseaseDatabase).forEach(key => {
                if (symptom.includes(key) || key.includes(symptom)) {
                    const data = symptomDiseaseDatabase[key];
                    data.diseases.forEach(d => diseaseSet.add(d));
                    data.specialists.forEach(s => specialistSet.add(s));
                    
                    if (data.severity === 'high') {
                        severityLevel = 'high';
                    } else if (data.severity === 'medium' && severityLevel !== 'high') {
                        severityLevel = 'medium';
                    }
                }
            });
        });

        const diseases = Array.from(diseaseSet);
        const specialists = Array.from(specialistSet);

        // If no match found in database, provide generic response
        if (diseases.length === 0) {
            return {
                success: true,
                analysis: {
                    disease: 'General Consultation Needed',
                    confidence: 50,
                    severity: severityLevel,
                    description: 'Your symptoms require a general medical consultation',
                    recommendedSpecialists: ['General Practitioner'],
                    foodsToEat: ['Stay well hydrated with clean water', 'Light soups', 'Fresh fruits', 'Vegetables'],
                    foodsToAvoid: ['Spicy foods', 'Alcohol', 'Deep-fried foods', 'Excessive sugar/caffeine']
                }
            };
        }

        // Calculate confidence score (0-100)
        let confidence;
        if (isNaturalLanguage) {
            // For natural language text fallback, confidence is lower since it's keyword matching
            confidence = Math.min(80, (symptomsArray.length * 20));
        } else {
            const matchedSymptoms = normalizedSymptoms.filter(s => 
                Object.keys(symptomDiseaseDatabase).some(key => 
                    s.includes(key) || key.includes(s)
                )
            ).length;
            confidence = (matchedSymptoms / normalizedSymptoms.length) * 100;
        }

        return {
            success: true,
            analysis: {
                disease: diseases[0], // Primary disease
                allDiseases: diseases,
                confidence: Math.round(confidence),
                severity: severityLevel,
                description: `Based on detected symptoms (${symptomsArray.join(', ')}), you may have ${diseases[0]}. Please consult a specialist for proper diagnosis.`,
                recommendedSpecialists: specialists,
                foodsToEat: getFoodsToEatForDisease(diseases[0]),
                foodsToAvoid: getFoodsToAvoidForDisease(diseases[0])
            }
        };

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};

const getFoodsToEatForDisease = (disease) => {
    const d = disease.toLowerCase();
    if (d.includes('cold') || d.includes('flu') || d.includes('pharyngitis') || d.includes('strep') || d.includes('bronchitis') || d.includes('pneumonia') || d.includes('sinusitis')) {
        return ['Warm chicken soup', 'Herbal tea with honey', 'Garlic and ginger broth', 'Citrus fruits (Vitamin C)', 'Steamed vegetables'];
    }
    if (d.includes('angina') || d.includes('heart') || d.includes('arrhythmia') || d.includes('pressure')) {
        return ['Oatmeal/Whole grains', 'Leafy greens (spinach, kale)', 'Fatty fish (salmon, mackerel)', 'Walnuts and almonds', 'Fresh berries'];
    }
    if (d.includes('migraine') || d.includes('headache') || d.includes('fever')) {
        return ['Plenty of water and electrolyte fluids', 'Watermelon and cucumber (hydrating)', 'Spinach (magnesium-rich)', 'Bananas', 'Ginger tea'];
    }
    if (d.includes('gastritis') || d.includes('ulcer') || d.includes('ibs') || d.includes('poisoning') || d.includes('diarrhea') || d.includes('nausea') || d.includes('vomiting')) {
        return ['Bananas', 'White rice', 'Applesauce', 'Dry toast or crackers', 'Oatmeal', 'Ginger or chamomile tea'];
    }
    if (d.includes('rash') || d.includes('allergy') || d.includes('eczema') || d.includes('psoriasis') || d.includes('itching')) {
        return ['Turmeric and ginger (anti-inflammatory)', 'Fatty fish', 'Flaxseeds/Chia seeds', 'Green tea', 'Blueberries'];
    }
    if (d.includes('anemia') || d.includes('fatigue')) {
        return ['Iron-rich foods (spinach, red meat, lentils)', 'Vitamin C rich foods (assists iron absorption)', 'Eggs', 'Pumpkin seeds'];
    }
    return ['Stay well hydrated with clean water', 'Light soups', 'Fresh fruits', 'Vegetables'];
};

const getFoodsToAvoidForDisease = (disease) => {
    const d = disease.toLowerCase();
    if (d.includes('cold') || d.includes('flu') || d.includes('pharyngitis') || d.includes('strep') || d.includes('bronchitis') || d.includes('pneumonia') || d.includes('sinusitis')) {
        return ['Ice cream and very cold drinks', 'Dairy products (may thicken mucus)', 'Sugary treats', 'Spicy foods (irritates throat)'];
    }
    if (d.includes('angina') || d.includes('heart') || d.includes('arrhythmia') || d.includes('pressure')) {
        return ['Highly salty foods (canned soups, chips)', 'Caffeine (heavy coffee/energy drinks)', 'Alcohol', 'Deep-fried foods', 'Processed meats'];
    }
    if (d.includes('migraine') || d.includes('headache') || d.includes('fever')) {
        return ['Aged cheese', 'Processed meats (containing nitrates)', 'Excessive caffeine', 'Artificial sweeteners', 'Alcohol (especially red wine)'];
    }
    if (d.includes('gastritis') || d.includes('ulcer') || d.includes('ibs') || d.includes('poisoning') || d.includes('diarrhea') || d.includes('nausea') || d.includes('vomiting')) {
        return ['Milk and dairy products', 'Spicy and peppery foods', 'Deep-fried/greasy items', 'Alcohol and caffeine', 'Highly acidic foods (lemons, tomatoes)'];
    }
    if (d.includes('rash') || d.includes('allergy') || d.includes('eczema') || d.includes('psoriasis') || d.includes('itching')) {
        return ['Common allergens (peanuts, tree nuts, shellfish)', 'Dairy products', 'Refined sugar', 'Alcohol', 'Highly processed snacks'];
    }
    if (d.includes('anemia') || d.includes('fatigue')) {
        return ['Drinking tea/coffee alongside meals (blocks iron absorption)', 'Excessive sweets/refined sugar (causes energy crashes)', 'Alcohol'];
    }
    return ['Deep-fried oily items', 'Alcohol', 'Highly spicy foods', 'Excessive sugar or caffeine'];
};

export { analyzeSymptoms, symptomDiseaseDatabase };
