import mongoose from "mongoose";

const symptomAnalysisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    symptoms: { type: [String], required: true },
    predictionResult: {
        disease: { type: String },
        confidence: { type: Number },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        description: String,
        foodsToEat: { type: [String], default: [] },
        foodsToAvoid: { type: [String], default: [] }
    },
    recommendedSpecialists: { type: [String] }, // e.g., ['Cardiologist', 'Neurologist']
    recommendedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'doctor' }],
    status: { type: String, enum: ['analyzed', 'doctor_selected', 'appointment_booked'], default: 'analyzed' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

const symptomAnalysisModel = mongoose.models.symptomAnalysis || mongoose.model("symptomAnalysis", symptomAnalysisSchema);
export default symptomAnalysisModel;
