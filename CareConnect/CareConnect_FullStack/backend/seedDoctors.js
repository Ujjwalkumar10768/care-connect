import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },
    lat: { type: Number },
    lon: { type: Number }
}, { minimize: false })

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

const seedDoctors = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/prescripto');
        console.log("Connected to MongoDB.");

        const passwordHash = await bcrypt.hash('password123', 10);

        const moreDoctors = [
            // ----- DELHI DOCTORS -----
            {
                name: 'Dr. Sameer Khan',
                email: 'sameer.khan@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Sameer+Khan&background=random&color=fff&size=200',
                speciality: 'General physician',
                degree: 'MBBS, MD',
                experience: '10 Years',
                about: 'Experienced General Physician in Central Delhi treating all viral fevers and chronic diseases.',
                fees: 600,
                address: { line1: 'Connaught Place', line2: 'New Delhi' },
                date: Date.now(), lat: 28.6304, lon: 77.2177
            },
            {
                name: 'Dr. Ritu Ahuja',
                email: 'ritu.ahuja@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Ritu+Ahuja&background=random&color=fff&size=200',
                speciality: 'General physician',
                degree: 'MBBS, DNB',
                experience: '14 Years',
                about: 'Senior physician at Fortis Escorts focusing on comprehensive internal medicine.',
                fees: 800,
                address: { line1: 'Okhla', line2: 'New Delhi' },
                date: Date.now(), lat: 28.5606, lon: 77.2804
            },
            {
                name: 'Dr. Preeti Sharma',
                email: 'preeti.sharma@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Preeti+Sharma&background=random&color=fff&size=200',
                speciality: 'Gynecologist',
                degree: 'MBBS, MS',
                experience: '9 Years',
                about: 'Expert in maternal fetal medicine and high risk pregnancies.',
                fees: 900,
                address: { line1: 'Vasant Kunj', line2: 'New Delhi' },
                date: Date.now(), lat: 28.5298, lon: 77.1531
            },
            {
                name: 'Dr. Anita Desai',
                email: 'anita.desai@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Anita+Desai&background=random&color=fff&size=200',
                speciality: 'Gynecologist',
                degree: 'MBBS, DGO',
                experience: '22 Years',
                about: 'Senior Gynecologist treating PCOS, endometriosis, and providing menopause management.',
                fees: 1200,
                address: { line1: 'Lajpat Nagar', line2: 'New Delhi' },
                date: Date.now(), lat: 28.5677, lon: 77.2433
            },
            {
                name: 'Dr. Rohan Mehra',
                email: 'rohan.mehra@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Rohan+Mehra&background=random&color=fff&size=200',
                speciality: 'Dermatologist',
                degree: 'MBBS, MD',
                experience: '7 Years',
                about: 'Specialist in clinical dermatology, skin surgeries, and chemical peeling.',
                fees: 700,
                address: { line1: 'Rohini Sector 9', line2: 'New Delhi' },
                date: Date.now(), lat: 28.7158, lon: 77.1180
            },
            {
                name: 'Dr. Arvind Sen',
                email: 'arvind.sen@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Arvind+Sen&background=random&color=fff&size=200',
                speciality: 'Pediatricians',
                degree: 'MBBS, DCH',
                experience: '16 Years',
                about: 'Compassionate pediatric care focusing on newborn care and childhood infections.',
                fees: 850,
                address: { line1: 'Dwarka Sector 12', line2: 'New Delhi' },
                date: Date.now(), lat: 28.5921, lon: 77.0460
            },
            {
                name: 'Dr. Siddharth Jain',
                email: 'siddharth.jain@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Siddharth+Jain&background=random&color=fff&size=200',
                speciality: 'Gastroenterologist',
                degree: 'MBBS, DM',
                experience: '11 Years',
                about: 'Expert in Endoscopy, Colonoscopy, and Liver disorders.',
                fees: 1100,
                address: { line1: 'Hauz Khas', line2: 'New Delhi' },
                date: Date.now(), lat: 28.5494, lon: 77.2001
            },

            // ----- NOIDA DOCTORS -----
            {
                name: 'Dr. Kavita Singh',
                email: 'kavita.singh@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Kavita+Singh&background=random&color=fff&size=200',
                speciality: 'General physician',
                degree: 'MBBS',
                experience: '5 Years',
                about: 'Treats diabetes, hypertension, and family medicine cases.',
                fees: 400,
                address: { line1: 'Sector 18', line2: 'Noida' },
                date: Date.now(), lat: 28.5708, lon: 77.3271
            },
            {
                name: 'Dr. Megha Bansal',
                email: 'megha.bansal@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Megha+Bansal&background=random&color=fff&size=200',
                speciality: 'Gynecologist',
                degree: 'MBBS, MS',
                experience: '12 Years',
                about: 'Provides holistic care for women including antenatal care and IVF consulting.',
                fees: 900,
                address: { line1: 'Sector 50', line2: 'Noida' },
                date: Date.now(), lat: 28.5746, lon: 77.3653
            },
            {
                name: 'Dr. Varun Reddy',
                email: 'varun.reddy@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Varun+Reddy&background=random&color=fff&size=200',
                speciality: 'Dermatologist',
                degree: 'MBBS, DDVL',
                experience: '9 Years',
                about: 'Provides advanced hair transplant procedures and cosmetic dermatology.',
                fees: 600,
                address: { line1: 'Sector 62', line2: 'Noida' },
                date: Date.now(), lat: 28.6189, lon: 77.3725
            },
            {
                name: 'Dr. Aman Chawla',
                email: 'aman.chawla@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Aman+Chawla&background=random&color=fff&size=200',
                speciality: 'Neurologist',
                degree: 'MBBS, DM',
                experience: '18 Years',
                about: 'Top-rated neurologist for epilepsy, migraines, and Parkinson\'s disease.',
                fees: 1400,
                address: { line1: 'Sector 137', line2: 'Noida' },
                date: Date.now(), lat: 28.5034, lon: 77.4069
            },
            {
                name: 'Dr. Rajesh Nair',
                email: 'rajesh.nair@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Rajesh+Nair&background=random&color=fff&size=200',
                speciality: 'Gastroenterologist',
                degree: 'MBBS, MD, DM',
                experience: '20 Years',
                about: 'Senior Consultant dealing with severe pancreatic and biliary disorders.',
                fees: 1500,
                address: { line1: 'Sector 110', line2: 'Noida' },
                date: Date.now(), lat: 28.5355, lon: 77.3824
            },

            // ----- GREATER NOIDA DOCTORS -----
            {
                name: 'Dr. Deepak Tandon',
                email: 'deepak.tandon@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Deepak+Tandon&background=random&color=fff&size=200',
                speciality: 'General physician',
                degree: 'MBBS, MD',
                experience: '13 Years',
                about: 'Specializes in infectious diseases and general internal medicine.',
                fees: 600,
                address: { line1: 'Beta II', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4744, lon: 77.5097
            },
            {
                name: 'Dr. Pooja Bhatt',
                email: 'pooja.bhatt@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Pooja+Bhatt&background=random&color=fff&size=200',
                speciality: 'Gynecologist',
                degree: 'MBBS, DGO',
                experience: '8 Years',
                about: 'Dedicated to women\'s wellness, adolescent gynecology, and safe deliveries.',
                fees: 700,
                address: { line1: 'Alpha I', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4682, lon: 77.5133
            },
            {
                name: 'Dr. Nikhil Roy',
                email: 'nikhil.roy@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Nikhil+Roy&background=random&color=fff&size=200',
                speciality: 'Dermatologist',
                degree: 'MBBS, MD',
                experience: '5 Years',
                about: 'Young and dynamic dermatologist well-versed in modern aesthetic procedures.',
                fees: 500,
                address: { line1: 'Knowledge Park II', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4593, lon: 77.5028
            },
            {
                name: 'Dr. Sanjay Mishra',
                email: 'sanjay.mishra@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Sanjay+Mishra&background=random&color=fff&size=200',
                speciality: 'Pediatricians',
                degree: 'MBBS, MD',
                experience: '19 Years',
                about: 'Highly experienced in treating complex pediatric asthma and allergies.',
                fees: 800,
                address: { line1: 'Gamma II', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4816, lon: 77.5144
            },
            {
                name: 'Dr. Tarun Bajaj',
                email: 'tarun.bajaj@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Tarun+Bajaj&background=random&color=fff&size=200',
                speciality: 'Neurologist',
                degree: 'MBBS, DM',
                experience: '8 Years',
                about: 'Providing advanced care for chronic daily headaches and nerve damage.',
                fees: 900,
                address: { line1: 'Pari Chowk', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4601, lon: 77.5065
            },
            {
                name: 'Dr. Kriti Sanon', // Just a placeholder realistic name
                email: 'kriti.gastro@careconnect.com',
                password: passwordHash,
                image: 'https://ui-avatars.com/api/?name=Dr+Kriti+Sanon&background=random&color=fff&size=200',
                speciality: 'Gastroenterologist',
                degree: 'MBBS, DM',
                experience: '6 Years',
                about: 'Specialist in IBS, acid reflux, and dietary management of GI disorders.',
                fees: 800,
                address: { line1: 'Omicron II', line2: 'Greater Noida' },
                date: Date.now(), lat: 28.4354, lon: 77.5273
            }
        ];

        let addedCount = 0;
        for (const docData of moreDoctors) {
            const exists = await doctorModel.findOne({ email: docData.email });
            if (!exists) {
                const newDoc = new doctorModel(docData);
                await newDoc.save();
                addedCount++;
            }
        }

        console.log("Database seeded successfully! Added " + addedCount + " new doctors.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDoctors();
