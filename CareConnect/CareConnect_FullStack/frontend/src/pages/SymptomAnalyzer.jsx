import React, { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const SymptomAnalyzer = () => {
    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    // States
    const [step, setStep] = useState(1) // 1: input, 2: analysis & geolocation/OSM doctors
    const [symptoms, setSymptoms] = useState([])
    const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
    const [symptomInput, setSymptomInput] = useState('')
    const [loading, setLoading] = useState(false)

    // Analysis & Geolocation Results
    const [analysis, setAnalysis] = useState(null)
    const [userCoords, setUserCoords] = useState(null)
    const [geoLoading, setGeoLoading] = useState(false)
    const [osmLoading, setOsmLoading] = useState(false)
    const [osmDoctors, setOsmDoctors] = useState([])
    const [isFallbackUsed, setIsFallbackUsed] = useState(false)

    // Booking Modal States
    const [bookingDoctor, setBookingDoctor] = useState(null)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedTime, setSelectedTime] = useState('')
    const [bookingLoading, setBookingLoading] = useState(false)

    // Common symptoms list
    const commonSymptoms = [
        'Fever', 'Cough', 'Headache', 'Fatigue', 'Sore Throat', 'Nausea',
        'Dizziness', 'Body Ache', 'Chest Pain', 'Shortness of Breath',
        'Stomach Pain', 'Vomiting', 'Rash', 'Itching', 'Rapid Heartbeat',
        'Runny Nose', 'Numbness', 'Diarrhea'
    ]

    // Time slots available for booking
    const availableTimeSlots = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
        '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ]

    // Generate next 7 days for slot selection
    const getNext7Days = () => {
        const days = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = dayNames[date.getDay()];
            const dateNum = date.getDate();
            const monthNum = date.getMonth();
            const year = date.getFullYear();
            const slotDateKey = `${dateNum}_${monthNum}_${year}`;
            days.push({ dayName, dateNum, slotDateKey, fullDate: date });
        }
        return days;
    }

    // Add/Remove quick tags
    const addSymptom = (symptom) => {
        if (!symptoms.includes(symptom)) {
            setSymptoms([...symptoms, symptom])
        }
    }

    const removeSymptom = (symptom) => {
        setSymptoms(symptoms.filter(s => s !== symptom))
    }

    const addCustomSymptom = () => {
        if (symptomInput.trim() && !symptoms.includes(symptomInput)) {
            setSymptoms([...symptoms, symptomInput])
            setSymptomInput('')
        }
    }

    // Analyze Symptoms Flow
    const handleAnalyzeSymptoms = async () => {
        const hasNaturalLanguage = naturalLanguageInput.trim().length > 0;
        const hasTags = symptoms.length > 0;

        if (!hasNaturalLanguage && !hasTags) {
            toast.error('Please describe your symptoms in writing or select quick tags')
            return
        }

        if (!token) {
            toast.warning('Please login to continue')
            return navigate('/login')
        }

        try {
            setLoading(true)
            
            // If they entered natural language, we send that. Otherwise, we send the array of selected tags.
            const queryData = hasNaturalLanguage ? naturalLanguageInput : symptoms;

            const { data } = await axios.post(
                backendUrl + '/api/symptoms/analyze-symptoms',
                { symptoms: queryData },
                { headers: { token } }
            )

            if (data.success) {
                setAnalysis(data.analysis)
                setIsFallbackUsed(data.message.includes('Fallback'))
                setStep(2)
                toast.success('Symptoms analyzed successfully!')
                
                // Automatically request geolocation & fetch OSM clinics
                detectLocationAndFetchDoctors(data.analysis.recommendedSpecialists?.[0])
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.message || 'Error analyzing symptoms')
        } finally {
            setLoading(false)
        }
    }

    // Geolocation and OpenStreetMap (Overpass API) Fetching
    const detectLocationAndFetchDoctors = (speciality) => {
        if (!navigator.geolocation) {
            toast.warning("Geolocation is not supported by your browser. Using fallback coordinates.")
            fetchNearbyDoctorsFromOSM(28.6139, 77.2090, speciality); // New Delhi fallback
            return;
        }

        setGeoLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserCoords({ lat: latitude, lon: longitude });
                await fetchNearbyDoctorsFromOSM(latitude, longitude, speciality);
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.warning("Location access denied. Finding clinics near New Delhi.");
                setUserCoords({ lat: 28.6139, lon: 77.2090 });
                fetchNearbyDoctorsFromOSM(28.6139, 77.2090, speciality);
            }
        );
    }

    const fetchNearbyDoctorsFromOSM = async (lat, lon, specialistType) => {
        try {
            setOsmLoading(true)
            // Query OSM Overpass API for clinics, hospitals, and doctors within 10km (10000m)
            const query = `[out:json][timeout:25];(node["amenity"="doctors"](around:10000,${lat},${lon});node["amenity"="clinic"](around:10000,${lat},${lon});node["amenity"="hospital"](around:10000,${lat},${lon});way["amenity"="doctors"](around:10000,${lat},${lon});way["amenity"="clinic"](around:10000,${lat},${lon});way["amenity"="hospital"](around:10000,${lat},${lon}););out body 15;`;
            
            // Try multiple endpoints to avoid 504 timeouts
            const endpoints = [
                'https://lz4.overpass-api.de/api/interpreter',
                'https://overpass-api.de/api/interpreter',
                'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
            ];

            let response;
            for (let i = 0; i < endpoints.length; i++) {
                try {
                    response = await axios.post(
                        endpoints[i],
                        query,
                        { headers: { 'Content-Type': 'text/plain' }, timeout: 15000 }
                    );
                    if (response?.data?.elements) break;
                } catch (err) {
                    console.warn(`Overpass API endpoint ${endpoints[i]} failed.`, err.message);
                    if (i === endpoints.length - 1) throw err;
                }
            }

            if (response?.data?.elements) {
                const elements = response.data.elements;
                
                const formatted = elements.map(el => {
                    const name = el.tags.name || (el.tags.amenity === 'hospital' ? 'General Hospital' : el.tags.amenity === 'clinic' ? 'Community Clinic' : 'Medical Center');
                    
                    // Construct address string
                    const addrParts = [];
                    if (el.tags['addr:street']) addrParts.push(el.tags['addr:street']);
                    if (el.tags['addr:suburb']) addrParts.push(el.tags['addr:suburb']);
                    if (el.tags['addr:city']) addrParts.push(el.tags['addr:city']);
                    
                    const addressStr = addrParts.join(', ') || 'District Medical Area';
                    const elLat = el.lat || (el.center && el.center.lat) || lat;
                    const elLon = el.lon || (el.center && el.center.lon) || lon;
                    const dist = calculateHaversineDistance(lat, lon, elLat, elLon);

                    return {
                        id: el.id,
                        name,
                        amenity: el.tags.amenity,
                        lat: elLat,
                        lon: elLon,
                        address: addressStr,
                        distance: dist
                    }
                })

                // Sort by distance (nearest first)
                formatted.sort((a, b) => a.distance - b.distance);
                setOsmDoctors(formatted);
            }
        } catch (error) {
            console.error("OSM Overpass API failure:", error);
            // Fallback to local mock doctors if API fails or times out
            setOsmDoctors([
                { id: 'mock1', name: 'CareConnect Community Clinic', amenity: 'clinic', address: '12 Medical Plaza, Sector 15', distance: 1.2, lat: lat + 0.005, lon: lon + 0.005 },
                { id: 'mock2', name: 'City General Hospital', amenity: 'hospital', address: '45 Hospital Road, Central District', distance: 2.5, lat: lat - 0.01, lon: lon + 0.01 },
                { id: 'mock3', name: 'Metro Family Practice', amenity: 'doctors', address: 'Suite 201, Green Mall Complex', distance: 3.1, lat: lat + 0.015, lon: lon - 0.015 },
            ]);
        } finally {
            setOsmLoading(false)
            setGeoLoading(false)
        }
    }

    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1)); // 1 decimal place
    }

    // Modal Booking Actions
    const openBookingModal = (doc) => {
        setBookingDoctor(doc)
        setSelectedDate(null)
        setSelectedTime('')
    }

    const handleConfirmBooking = async () => {
        if (!selectedDate || !selectedTime) {
            toast.error("Please select both date and time slot");
            return;
        }

        try {
            setBookingLoading(true)
            
            const bookingPayload = {
                docId: `osm_${bookingDoctor.id}`,
                slotDate: selectedDate.slotDateKey,
                slotTime: selectedTime,
                osmName: bookingDoctor.name,
                osmSpeciality: analysis?.recommendedSpecialists?.[0] || 'General physician',
                osmAddress: { line1: bookingDoctor.address, line2: 'OpenStreetMap Location' }
            }

            const { data } = await axios.post(
                backendUrl + '/api/user/book-appointment',
                bookingPayload,
                { headers: { token } }
            )

            if (data.success) {
                toast.success("Appointment booked successfully!")
                navigate('/dashboard')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error("Booking error:", error)
            toast.error("Failed to book appointment")
        } finally {
            setBookingLoading(false)
            setBookingDoctor(null)
        }
    }

    // Reset workflow
    const resetFlow = () => {
        setStep(1)
        setSymptoms([])
        setNaturalLanguageInput('')
        setSymptomInput('')
        setAnalysis(null)
        setOsmDoctors([])
        setUserCoords(null)
    }

    return (
        <div className='min-h-[85vh] py-10 px-2 sm:px-4'>
            <div className='max-w-6xl mx-auto'>
                {/* Header */}
                <div className='text-center mb-10'>
                    <h1 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-cyan-700 mb-2'>AI Symptom Analyzer</h1>
                    <p className='text-gray-600 text-base sm:text-lg max-w-xl mx-auto'>Enter your symptoms to analyze potential conditions and instantly find medical facilities near you.</p>
                </div>

                {/* Progress Indicators */}
                <div className='flex justify-between max-w-md mx-auto mb-10 relative'>
                    <div className='absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10'></div>
                    {[1, 2].map((s) => (
                        <div key={s} className='flex flex-col items-center bg-white px-4'>
                            <div className={`flex items-center justify-center rounded-full w-10 h-10 font-bold transition shadow ${
                                s <= step ? 'bg-gradient-to-r from-green-500 to-cyan-600 text-whiteScale text-white' : 'bg-gray-100 text-gray-400 border'
                            }`}>
                                {s === 1 ? '🩺' : '📍'}
                            </div>
                            <span className='text-xs font-semibold text-gray-500 mt-2'>
                                {s === 1 ? 'Analyze Symptoms' : 'Doctor Recommendation'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* STEP 1: SYMPTOM DETAILS ENTRY */}
                {step === 1 && (
                    <div className='bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 animate-fade-in'>
                        <h2 className='text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2'>
                            <span>1.</span> Explain How You Are Feeling
                        </h2>

                        {/* Natural Language Box */}
                        <div className='mb-6'>
                            <label className='block text-gray-700 font-semibold mb-2'>Describe symptoms in your own words (Recommended):</label>
                            <textarea
                                value={naturalLanguageInput}
                                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                                placeholder="Describe symptoms (e.g. 'I have had a throbbing migraine for 3 days and feel slightly nauseous...')"
                                className='w-full h-32 border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm sm:text-base'
                            />
                        </div>

                        <div className='relative flex py-2 items-center mb-4'>
                            <div className='flex-grow border-t border-gray-200'></div>
                            <span className='flex-shrink mx-4 text-gray-400 font-bold text-xs uppercase tracking-wider'>OR SELECT TAGS</span>
                            <div className='flex-grow border-t border-gray-200'></div>
                        </div>

                        {/* Common Symptoms Grid */}
                        <div className='mb-6'>
                            <p className='text-gray-700 font-semibold mb-3'>Select quick tags:</p>
                            <div className='flex flex-wrap gap-2.5 max-h-48 overflow-y-auto pr-1'>
                                {commonSymptoms.map((symptom) => {
                                    const isSelected = symptoms.includes(symptom);
                                    return (
                                        <button
                                            key={symptom}
                                            onClick={() => isSelected ? removeSymptom(symptom) : addSymptom(symptom)}
                                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm border transition font-medium ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-green-500 to-cyan-600 text-white border-transparent'
                                                    : 'bg-gray-50 text-gray-700 hover:border-cyan-500 border-gray-200'
                                            }`}
                                        >
                                            {symptom} {isSelected ? '✓' : '+'}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Custom Symptom Tags Input */}
                        <div className='mb-6'>
                            <p className='text-gray-700 font-semibold mb-2'>Type other symptoms:</p>
                            <div className='flex gap-2 max-w-md'>
                                <input
                                    type='text'
                                    value={symptomInput}
                                    onChange={(e) => setSymptomInput(e.target.value)}
                                    placeholder='Add specific symptom'
                                    className='flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm'
                                    onKeyPress={(e) => e.key === 'Enter' && addCustomSymptom()}
                                />
                                <button
                                    onClick={addCustomSymptom}
                                    className='bg-gray-800 text-white font-semibold text-xs px-5 rounded-xl hover:bg-gray-700 transition'
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Selected Tags List */}
                        {symptoms.length > 0 && (
                            <div className='mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100'>
                                <p className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5'>Selected Symptoms Tags:</p>
                                <div className='flex flex-wrap gap-1.5'>
                                    {symptoms.map((s) => (
                                        <span
                                            key={s}
                                            className='bg-cyan-50 text-cyan-800 border border-cyan-100 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5'
                                        >
                                            {s}
                                            <button
                                                onClick={() => removeSymptom(s)}
                                                className='text-red-500 hover:text-red-700 font-bold ml-0.5'
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleAnalyzeSymptoms}
                            disabled={loading || (naturalLanguageInput.trim().length === 0 && symptoms.length === 0)}
                            className='w-full bg-gradient-to-r from-green-500 to-cyan-600 hover:from-green-600 hover:to-cyan-700 text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {loading ? 'Analyzing Symptoms with AI...' : 'Analyze Symptoms'}
                        </button>
                    </div>
                )}

                {/* STEP 2: DIAGNOSIS & NEARBY CLINICS */}
                {step === 2 && analysis && (
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in'>
                        {/* Diagnosis Report Section (Left - 1 Col) */}
                        <div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-fit'>
                            <h3 className='text-lg font-bold text-gray-800 border-b pb-3 mb-4 flex items-center gap-2'>
                                🩺 AI Diagnosis Report
                            </h3>
                            
                            {isFallbackUsed && (
                                <div className='bg-yellow-50 border border-yellow-100 rounded-xl p-3.5 mb-4 text-xs text-yellow-800'>
                                    ⚠️ **Fallback Mode:** Unable to connect to main AI. Local rule matching was used for this diagnosis.
                                </div>
                            )}

                            {/* Condition Card */}
                            <div className='bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-cyan-100 p-5 rounded-2xl mb-5 text-center'>
                                <p className='text-[10px] text-cyan-600 font-bold uppercase tracking-wider mb-1'>Condition Identified</p>
                                <h4 className='text-2xl font-extrabold text-cyan-800 leading-tight'>{analysis.disease}</h4>
                                
                                <div className='mt-4 flex items-center justify-between text-xs border-t pt-3 border-cyan-100/50'>
                                    <div>
                                        <p className='text-gray-500 font-medium'>Severity</p>
                                        <span className={`inline-block font-bold mt-1 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] ${
                                            analysis.severity === 'high' ? 'bg-red-100 text-red-700' :
                                            analysis.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {analysis.severity}
                                        </span>
                                    </div>
                                    <div className='text-right'>
                                        <p className='text-gray-500 font-medium'>Confidence</p>
                                        <span className='font-bold text-gray-800 block mt-1'>{analysis.confidence}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className='mb-5'>
                                <h5 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5'>Explanation:</h5>
                                <p className='text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100'>{analysis.description}</p>
                            </div>

                            {/* Specialists Recommended */}
                            <div className='mb-5'>
                                <h5 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-2'>Specialists to consult:</h5>
                                <div className='flex flex-wrap gap-1.5'>
                                    {analysis.recommendedSpecialists?.map((spec) => (
                                        <span key={spec} className='bg-cyan-50 text-cyan-700 border border-cyan-100 text-xs font-semibold px-2.5 py-1 rounded-md'>
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Dietary Guidelines (Foods to eat or not) */}
                            <div className='mb-6 space-y-4 border-t pt-4 border-gray-100'>
                                <div>
                                    <h5 className='text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                                        🟢 Recommended Foods (Eat):
                                    </h5>
                                    <ul className='text-xs text-gray-700 space-y-1 bg-green-50/70 p-3.5 rounded-xl border border-green-100 list-disc list-inside'>
                                        {analysis.foodsToEat && analysis.foodsToEat.length > 0 ? (
                                            analysis.foodsToEat.map((food, idx) => (
                                                <li key={idx} className='font-medium leading-relaxed'>{food}</li>
                                            ))
                                        ) : (
                                            <li className='list-none text-gray-400 italic'>No recommendations</li>
                                        )}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className='text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5'>
                                        🔴 Foods to Avoid (Do Not Eat):
                                    </h5>
                                    <ul className='text-xs text-gray-700 space-y-1 bg-red-50/70 p-3.5 rounded-xl border border-red-100 list-disc list-inside'>
                                        {analysis.foodsToAvoid && analysis.foodsToAvoid.length > 0 ? (
                                            analysis.foodsToAvoid.map((food, idx) => (
                                                <li key={idx} className='font-medium leading-relaxed'>{food}</li>
                                            ))
                                        ) : (
                                            <li className='list-none text-gray-400 italic'>No warnings listed</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={resetFlow}
                                className='w-full border border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-xl font-semibold text-sm transition'
                            >
                                Start New Diagnosis
                            </button>
                        </div>

                        {/* Geolocation & OSM Doctors (Right - 2 Cols) */}
                        <div className='lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8'>
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-6 gap-3'>
                                <h3 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                                    📍 Nearby Recommended Clinicians
                                </h3>
                                {userCoords && (
                                    <button 
                                        onClick={() => detectLocationAndFetchDoctors(analysis.recommendedSpecialists?.[0])}
                                        className='text-xs font-bold text-primary hover:text-cyan-700 flex items-center gap-1'
                                        disabled={osmLoading}
                                    >
                                        🔄 Refresh Location
                                    </button>
                                )}
                            </div>

                            {/* Geolocation & Loader States */}
                            {(geoLoading || osmLoading) ? (
                                <div className='flex flex-col items-center justify-center py-20 text-center'>
                                    <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4'></div>
                                    <p className='text-gray-700 font-semibold text-base'>
                                        {geoLoading ? 'Detecting your coordinates...' : 'Searching OpenStreetMap for nearby healthcare providers...'}
                                    </p>
                                    <p className='text-gray-400 text-xs mt-1'>Please allow location access in your browser if prompted.</p>
                                </div>
                            ) : osmDoctors.length === 0 ? (
                                <div className='text-center py-16 text-gray-500'>
                                    <span className='text-4xl block mb-2'>📍</span>
                                    <p className='font-bold text-lg text-gray-700'>No Nearby Doctors Found</p>
                                    <p className='text-sm text-gray-400 mt-1 max-w-sm mx-auto'>We couldn't retrieve facilities nearby. Enable browser location services and refresh.</p>
                                    <button 
                                        onClick={() => detectLocationAndFetchDoctors(analysis.recommendedSpecialists?.[0])}
                                        className='mt-4 bg-primary text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-cyan-700 transition'
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className='space-y-4'>
                                    <p className='text-sm text-gray-500 mb-2'>Recommended facilities for <strong>{analysis.recommendedSpecialists?.[0] || 'General Practitioner'}</strong> consultation, sorted by proximity:</p>
                                    
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1'>
                                        {osmDoctors.map((doc) => (
                                            <div 
                                                key={doc.id}
                                                className='border border-gray-100 bg-white hover:bg-gray-50 rounded-2xl overflow-hidden hover:border-cyan-200 transition-all shadow-sm flex flex-col'
                                            >
                                                <div className='h-32 bg-gray-100 w-full relative border-b'>
                                                    <img 
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=random&color=fff&size=400&bold=true`}
                                                        alt={doc.name}
                                                        className='w-full h-full object-cover'
                                                    />
                                                </div>
                                                <div className='p-5 flex flex-col justify-between flex-1'>
                                                    <div>
                                                        <div className='flex justify-between items-start gap-2 mb-2'>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                                doc.amenity === 'hospital' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                doc.amenity === 'clinic' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            }`}>
                                                                {doc.amenity || 'clinic'}
                                                            </span>
                                                            <span className='text-xs font-bold text-gray-700 bg-white px-2 py-0.5 border rounded-lg shadow-sm'>
                                                                🚗 {doc.distance} km
                                                            </span>
                                                        </div>
                                                        
                                                        <h4 className='font-bold text-gray-800 text-base leading-snug'>{doc.name}</h4>
                                                        <p className='text-xs text-gray-500 mt-1.5 font-medium leading-relaxed'>{doc.address}</p>
                                                    </div>

                                                    <div className='flex gap-2.5 mt-5'>
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${doc.lat},${doc.lon}`}
                                                        target='_blank'
                                                        rel='noreferrer'
                                                        className='flex-1 border bg-white border-gray-200 text-gray-700 text-center py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-100 transition'
                                                    >
                                                        🗺️ Map
                                                    </a>
                                                    <button
                                                        onClick={() => openBookingModal(doc)}
                                                        className='flex-[2] bg-gradient-to-r from-green-500 to-cyan-600 hover:from-green-600 hover:to-cyan-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow transition-all'
                                                    >
                                                        Book Visit
                                                    </button>
                                                </div>
                                            </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* BOOKING MODAL */}
                {bookingDoctor && (
                    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in'>
                        <div className='bg-white rounded-3xl max-w-md w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto'>
                            <button 
                                onClick={() => setBookingDoctor(null)} 
                                className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none'
                            >
                                &times;
                            </button>

                            <div className='text-center border-b pb-4 mb-5'>
                                <span className='text-3xl block mb-2'>📅</span>
                                <h3 className='text-xl font-bold text-gray-800'>Book Appointment</h3>
                                <p className='text-xs text-primary font-semibold uppercase tracking-wider mt-1'>
                                    {analysis?.recommendedSpecialists?.[0] || 'General Practitioner'} Consultation
                                </p>
                            </div>

                            {/* Doctor Summary */}
                            <div className='bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-5 text-sm'>
                                <h4 className='font-bold text-gray-800'>{bookingDoctor.name}</h4>
                                <p className='text-xs text-gray-500 mt-1 leading-snug'>{bookingDoctor.address}</p>
                                <div className='mt-2.5 pt-2.5 border-t flex justify-between font-bold text-gray-700 text-xs'>
                                    <span>Booking Fee:</span>
                                    <span className='text-primary'>₹500</span>
                                </div>
                            </div>

                            {/* Date Selector */}
                            <div className='mb-5'>
                                <p className='text-sm font-semibold text-gray-700 mb-2.5'>Select Date:</p>
                                <div className='flex gap-2 overflow-x-auto pb-2 pr-1'>
                                    {getNext7Days().map((day) => {
                                        const isSelected = selectedDate?.slotDateKey === day.slotDateKey;
                                        return (
                                            <button
                                                key={day.slotDateKey}
                                                onClick={() => setSelectedDate(day)}
                                                className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border text-xs transition font-semibold ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-br from-green-500 to-cyan-600 text-white border-transparent shadow' 
                                                        : 'bg-white text-gray-700 hover:border-cyan-500'
                                                }`}
                                            >
                                                <span>{day.dayName}</span>
                                                <span className='text-base font-bold mt-1'>{day.dateNum}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Time Slot Selector */}
                            <div className='mb-6'>
                                <p className='text-sm font-semibold text-gray-700 mb-2.5'>Select Time Slot:</p>
                                <div className='grid grid-cols-3 gap-2'>
                                    {availableTimeSlots.map((time) => {
                                        const isSelected = selectedTime === time;
                                        return (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-2 rounded-xl text-xs font-semibold border text-center transition ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-br from-green-500 to-cyan-600 text-white border-transparent' 
                                                        : 'bg-white text-gray-600 hover:border-cyan-500'
                                                }`}
                                            >
                                                {time}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className='flex gap-3'>
                                <button
                                    onClick={handleConfirmBooking}
                                    disabled={bookingLoading || !selectedDate || !selectedTime}
                                    className='flex-[2] bg-gradient-to-r from-green-500 to-cyan-600 text-white py-3 rounded-xl font-bold text-sm shadow hover:shadow-lg disabled:opacity-50 transition'
                                >
                                    {bookingLoading ? 'Booking...' : 'Confirm Appointment'}
                                </button>
                                <button
                                    onClick={() => setBookingDoctor(null)}
                                    className='flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition'
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SymptomAnalyzer
