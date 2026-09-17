import symptomAnalysisModel from "../models/symptomAnalysisModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import { analyzeSymptoms } from "../utils/symptomAnalyzer.js";
import { analyzeSymptomsWithGemini } from "../utils/geminiAnalyzer.js";

// Step 1: Analyze Symptoms using AI
const analyzeUserSymptoms = async (req, res) => {
    try {
        const userId = req.body.userId;
        const symptoms = req.body.symptoms;

        // Validation
        if (!symptoms || symptoms.length === 0) {
            return res.json({ success: false, message: 'Please provide at least one symptom' });
        }

        // Check user exists
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Analyze symptoms using AI (Try Gemini first, fall back to rule-based)
        let analysisResult = await analyzeSymptomsWithGemini(symptoms);
        let usedGemini = true;

        if (!analysisResult) {
            console.log("Gemini API analysis failed. Using fallback rule-based analyzer.");
            analysisResult = analyzeSymptoms(symptoms);
            usedGemini = false;
        }
        
        if (!analysisResult.success) {
            return res.json({ success: false, message: analysisResult.message });
        }

        // Create record in database
        const symptomAnalysis = new symptomAnalysisModel({
            userId,
            symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
            predictionResult: {
                disease: analysisResult.analysis.disease,
                confidence: analysisResult.analysis.confidence,
                severity: analysisResult.analysis.severity,
                description: analysisResult.analysis.description
            },
            recommendedSpecialists: analysisResult.analysis.recommendedSpecialists,
            status: 'analyzed'
        });

        await symptomAnalysis.save();

        res.json({
            success: true,
            message: `Symptoms analyzed successfully (${usedGemini ? 'AI' : 'Fallback Engine'})`,
            analysisId: symptomAnalysis._id,
            analysis: analysisResult.analysis
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Step 2: Get Recommended Doctors based on specialists
const getRecommendedDoctors = async (req, res) => {
    try {
        const { analysisId } = req.body;

        // Get analysis record
        const analysis = await symptomAnalysisModel.findById(analysisId);
        if (!analysis) {
            return res.json({ success: false, message: 'Analysis not found' });
        }

        // Find doctors matching recommended specialists
        const recommendedSpecialists = analysis.recommendedSpecialists;
        
        const doctors = await doctorModel.find({
            speciality: { $in: recommendedSpecialists },
            available: true
        }).select('-password');

        if (!doctors || doctors.length === 0) {
            return res.json({ success: false, message: 'No specialists available for this condition' });
        }

        // Update analysis with recommended doctors
        analysis.recommendedDoctors = doctors.map(doc => doc._id);
        await analysis.save();

        res.json({
            success: true,
            message: 'Recommended doctors found',
            disease: analysis.predictionResult.disease,
            specialists: recommendedSpecialists,
            doctors: doctors.map(doc => ({
                _id: doc._id,
                name: doc.name,
                speciality: doc.speciality,
                experience: doc.experience,
                fees: doc.fees,
                image: doc.image
            }))
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Step 3: Get Analysis Details
const getAnalysisDetails = async (req, res) => {
    try {
        const { analysisId } = req.body;

        const analysis = await symptomAnalysisModel.findById(analysisId)
            .populate('recommendedDoctors', 'name speciality experience fees image');

        if (!analysis) {
            return res.json({ success: false, message: 'Analysis not found' });
        }

        res.json({
            success: true,
            analysis: {
                id: analysis._id,
                symptoms: analysis.symptoms,
                disease: analysis.predictionResult.disease,
                confidence: analysis.predictionResult.confidence,
                severity: analysis.predictionResult.severity,
                description: analysis.predictionResult.description,
                recommendedSpecialists: analysis.recommendedSpecialists,
                recommendedDoctors: analysis.recommendedDoctors,
                status: analysis.status
            }
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Step 4: Complete Flow - Symptoms to Appointment
const completeSymptomAnalysisFlow = async (req, res) => {
    try {
        const userId = req.body.userId;
        const symptoms = req.body.symptoms;

        if (!symptoms || symptoms.length === 0) {
            return res.json({ success: false, message: 'Please provide at least one symptom' });
        }

        // Step 1: Analyze symptoms using Gemini or fallback
        let analysisResult = await analyzeSymptomsWithGemini(symptoms);
        let usedGemini = true;

        if (!analysisResult) {
            console.log("Gemini API analysis failed in complete-flow. Using fallback rule-based analyzer.");
            analysisResult = analyzeSymptoms(symptoms);
            usedGemini = false;
        }
        
        if (!analysisResult.success) {
            return res.json({ success: false, message: analysisResult.message });
        }

        // Step 2: Create analysis record
        const symptomAnalysis = new symptomAnalysisModel({
            userId,
            symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
            predictionResult: {
                disease: analysisResult.analysis.disease,
                confidence: analysisResult.analysis.confidence,
                severity: analysisResult.analysis.severity,
                description: analysisResult.analysis.description
            },
            recommendedSpecialists: analysisResult.analysis.recommendedSpecialists,
            status: 'analyzed'
        });

        await symptomAnalysis.save();

        // Step 3: Find recommended doctors
        const doctors = await doctorModel.find({
            speciality: { $in: analysisResult.analysis.recommendedSpecialists },
            available: true
        }).select('-password').limit(5);

        if (doctors.length > 0) {
            symptomAnalysis.recommendedDoctors = doctors.map(doc => doc._id);
            await symptomAnalysis.save();
        }

        // Step 4: Prepare response for appointment booking
        res.json({
            success: true,
            message: 'Analysis complete. Ready for appointment booking.',
            flow: {
                step1: { status: 'completed', data: 'Symptoms analyzed' },
                step2: { status: 'completed', data: `Disease predicted: ${analysisResult.analysis.disease}` },
                step3: { status: 'completed', data: `${doctors.length} specialist doctors found` },
                step4: { status: 'ready', action: 'Book appointment' }
            },
            analysisData: {
                analysisId: symptomAnalysis._id,
                disease: analysisResult.analysis.disease,
                confidence: analysisResult.analysis.confidence,
                severity: analysisResult.analysis.severity,
                specialists: analysisResult.analysis.recommendedSpecialists,
                doctors: doctors.map(doc => ({
                    _id: doc._id,
                    name: doc.name,
                    speciality: doc.speciality,
                    experience: doc.experience,
                    fees: doc.fees,
                    image: doc.image
                }))
            }
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get user's analysis history
const getUserAnalysisHistory = async (req, res) => {
    try {
        const userId = req.body.userId;

        const analyses = await symptomAnalysisModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('recommendedDoctors', 'name speciality');

        res.json({
            success: true,
            analyses
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    analyzeUserSymptoms,
    getRecommendedDoctors,
    getAnalysisDetails,
    completeSymptomAnalysisFlow,
    getUserAnalysisHistory
};
