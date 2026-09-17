import express from 'express';
import { 
    analyzeUserSymptoms, 
    getRecommendedDoctors, 
    getAnalysisDetails, 
    completeSymptomAnalysisFlow,
    getUserAnalysisHistory 
} from '../controllers/symptomAnalysisController.js';
import authUser from '../middleware/authUser.js';

const symptomRouter = express.Router();

// Step 1: Analyze symptoms
symptomRouter.post("/analyze-symptoms", authUser, analyzeUserSymptoms);

// Step 2: Get recommended doctors
symptomRouter.post("/get-recommended-doctors", authUser, getRecommendedDoctors);

// Step 3: Get analysis details
symptomRouter.post("/get-analysis", authUser, getAnalysisDetails);

// Complete flow: symptoms → prediction → doctors → ready for booking
symptomRouter.post("/complete-flow", authUser, completeSymptomAnalysisFlow);

// Get user analysis history
symptomRouter.get("/history", authUser, getUserAnalysisHistory);

export default symptomRouter;
