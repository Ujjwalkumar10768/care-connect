import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const Dashboard = () => {
    const { backendUrl, token, userData } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [analyses, setAnalyses] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAnalysis, setSelectedAnalysis] = useState(null)
    const [payment, setPayment] = useState('')

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const slotDateFormat = (slotDate) => {
        if (!slotDate) return '';
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    const formatAnalysisDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    const fetchData = async () => {
        try {
            setLoading(true)
            const headers = { token }
            
            // Fetch appointments
            const resAppt = await axios.get(backendUrl + '/api/user/appointments', { headers })
            if (resAppt.data.success) {
                setAppointments(resAppt.data.appointments.reverse())
            }

            // Fetch symptom analyses history
            const resHistory = await axios.get(backendUrl + '/api/symptoms/history', { headers })
            if (resHistory.data.success) {
                setAnalyses(resHistory.data.analyses)
            }

        } catch (error) {
            console.log(error)
            toast.error("Error loading dashboard data")
        } finally {
            setLoading(false)
        }
    }

    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
                fetchData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {
                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
                    if (data.success) {
                        toast.success("Payment Successful")
                        fetchData()
                    }
                } catch (error) {
                    console.log(error)
                    toast.error(error.message)
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) {
                initPay(data.order)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                const { session_url } = data
                window.location.replace(session_url)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (token) {
            fetchData()
        } else {
            toast.warning("Please login to access the dashboard")
            navigate('/login')
        }
    }, [token])

    if (loading) {
        return (
            <div className='min-h-[70vh] flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary'></div>
            </div>
        )
    }

    // Active (non-cancelled, non-completed) appointments
    const activeAppointments = appointments.filter(a => !a.cancelled && !a.isCompleted)
    
    return (
        <div className='min-h-[85vh] py-8 px-2 sm:px-6 bg-gray-50 rounded-xl mt-6'>
            {/* Top Greeting Section */}
            <div className='bg-gradient-to-r from-green-500 to-cyan-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6'>
                <div className='flex items-center gap-4'>
                    <img 
                        src={userData?.image || assets.profile_pic} 
                        alt="Profile" 
                        className='w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white/30 object-cover bg-white'
                    />
                    <div>
                        <h1 className='text-2xl sm:text-3xl font-bold'>Welcome, {userData?.name || 'User'}!</h1>
                        <p className='text-white/80 text-sm sm:text-base mt-1'>Keep track of your health journey, upcoming appointments, and AI diagnoses.</p>
                    </div>
                </div>
                <div className='flex gap-3'>
                    <button 
                        onClick={() => navigate('/symptom-analyzer')} 
                        className='bg-white text-cyan-600 hover:bg-cyan-50 font-semibold px-4 py-2.5 rounded-xl transition shadow text-sm'
                    >
                        Analyze Symptoms
                    </button>
                    <button 
                        onClick={() => navigate('/doctors')} 
                        className='bg-cyan-700/40 text-white border border-white/30 hover:bg-cyan-700/60 font-semibold px-4 py-2.5 rounded-xl transition text-sm'
                    >
                        Find Doctors
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8'>
                <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition'>
                    <div>
                        <p className='text-sm text-gray-500 font-medium'>Upcoming Bookings</p>
                        <h3 className='text-2xl font-bold text-gray-800 mt-1'>{activeAppointments.length}</h3>
                    </div>
                    <div className='w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xl'>
                        📅
                    </div>
                </div>

                <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition'>
                    <div>
                        <p className='text-sm text-gray-500 font-medium'>Symptom Analysis Reports</p>
                        <h3 className='text-2xl font-bold text-gray-800 mt-1'>{analyses.length}</h3>
                    </div>
                    <div className='w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-semibold text-xl'>
                        🩺
                    </div>
                </div>

                <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition'>
                    <div>
                        <p className='text-sm text-gray-500 font-medium'>Completed Visits</p>
                        <h3 className='text-2xl font-bold text-gray-800 mt-1'>{appointments.filter(a => a.isCompleted).length}</h3>
                    </div>
                    <div className='w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-semibold text-xl'>
                        ✅
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                {/* Upcoming Appointments (Left Side - 2 Cols) */}
                <div className='lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100'>
                    <div className='flex justify-between items-center mb-6 border-b pb-4'>
                        <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                            <span className='text-blue-500'>📅</span> Upcoming Appointments
                        </h2>
                        <button 
                            onClick={() => navigate('/my-appointments')} 
                            className='text-primary hover:text-cyan-700 text-sm font-semibold'
                        >
                            View All
                        </button>
                    </div>

                    {activeAppointments.length === 0 ? (
                        <div className='text-center py-12 text-gray-500'>
                            <p className='text-lg font-medium'>No upcoming appointments</p>
                            <p className='text-sm text-gray-400 mt-1'>Book a slot with recommended doctors near you.</p>
                            <button 
                                onClick={() => navigate('/symptom-analyzer')} 
                                className='mt-4 bg-primary text-white font-semibold px-4 py-2 rounded-xl text-sm shadow hover:bg-cyan-700 transition'
                            >
                                Book with Symptom Analysis
                            </button>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-6'>
                            {activeAppointments.slice(0, 3).map((item, index) => (
                                <div key={index} className='flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/60 transition'>
                                    <div className='flex gap-4'>
                                        <img 
                                            className='w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-xl object-cover' 
                                            src={item.docData.image} 
                                            alt={item.docData.name} 
                                        />
                                        <div>
                                            <h4 className='font-bold text-gray-800 text-base'>{item.docData.name}</h4>
                                            <p className='text-xs text-primary font-semibold uppercase tracking-wider mt-0.5'>{item.docData.speciality}</p>
                                            <p className='text-xs text-gray-500 mt-1'>
                                                <span className='font-medium text-gray-700'>Date:</span> {slotDateFormat(item.slotDate)} | {item.slotTime}
                                            </p>
                                            <p className='text-xs text-gray-500 mt-0.5'>
                                                <span className='font-medium text-gray-700'>Fee:</span> ₹{item.amount}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex sm:flex-col justify-end gap-2 text-xs'>
                                        {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && (
                                            <button 
                                                onClick={() => setPayment(item._id)} 
                                                className='bg-primary text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-700 transition'
                                            >
                                                Pay Online
                                            </button>
                                        )}
                                        {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && (
                                            <div className='flex flex-col gap-1.5'>
                                                <button 
                                                    onClick={() => appointmentStripe(item._id)} 
                                                    className='bg-white border hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center justify-center'
                                                >
                                                    <img className='max-w-16 max-h-4' src={assets.stripe_logo} alt="Stripe" />
                                                </button>
                                                <button 
                                                    onClick={() => appointmentRazorpay(item._id)} 
                                                    className='bg-white border hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center justify-center'
                                                >
                                                    <img className='max-w-16 max-h-4' src={assets.razorpay_logo} alt="Razorpay" />
                                                </button>
                                            </div>
                                        )}
                                        {!item.cancelled && item.payment && (
                                            <span className='bg-green-100 text-green-700 text-center font-bold px-3 py-1.5 rounded-lg block'>
                                                Paid
                                            </span>
                                        )}
                                        {!item.cancelled && (
                                            <button 
                                                onClick={() => cancelAppointment(item._id)} 
                                                className='border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition font-medium'
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Symptom History (Right Side - 1 Col) */}
                <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100'>
                    <div className='flex justify-between items-center mb-6 border-b pb-4'>
                        <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                            <span className='text-teal-500'>🩺</span> AI Diagnoses
                        </h2>
                    </div>

                    {analyses.length === 0 ? (
                        <div className='text-center py-12 text-gray-500'>
                            <p className='text-base font-medium'>No symptom reports yet</p>
                            <p className='text-xs text-gray-400 mt-1'>Analyze your health symptoms via AI.</p>
                            <button 
                                onClick={() => navigate('/symptom-analyzer')} 
                                className='mt-4 bg-teal-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow hover:bg-teal-700 transition'
                            >
                                Start Analysis
                            </button>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1'>
                            {analyses.map((item, index) => {
                                const severity = item.predictionResult?.severity || 'low';
                                return (
                                    <div 
                                        key={index} 
                                        onClick={() => setSelectedAnalysis(item)}
                                        className='p-4 rounded-xl border border-gray-100 hover:border-teal-200 cursor-pointer bg-gray-50 hover:bg-teal-50/20 transition flex items-center justify-between gap-3'
                                    >
                                        <div className='flex-1 min-w-0'>
                                            <h4 className='font-bold text-gray-800 text-sm truncate'>{item.predictionResult?.disease || 'General Diagnosis'}</h4>
                                            <p className='text-xs text-gray-500 mt-0.5 truncate'>
                                                Symptoms: {item.symptoms.join(', ')}
                                            </p>
                                            <p className='text-[10px] text-gray-400 mt-1'>
                                                {formatAnalysisDate(item.createdAt)}
                                            </p>
                                        </div>
                                        <div className='flex flex-col items-end gap-1.5'>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                severity === 'high' ? 'bg-red-100 text-red-700' : 
                                                severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {severity}
                                            </span>
                                            <span className='text-[11px] font-semibold text-gray-600'>
                                                {item.predictionResult?.confidence || 0}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Detail Modal */}
            {selectedAnalysis && (
                <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in'>
                    <div className='bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto'>
                        <button 
                            onClick={() => setSelectedAnalysis(null)} 
                            className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none'
                        >
                            &times;
                        </button>
                        
                        <div className='text-center border-b pb-4 mb-5'>
                            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${
                                selectedAnalysis.predictionResult?.severity === 'high' ? 'bg-red-100 text-red-700' : 
                                selectedAnalysis.predictionResult?.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-700'
                            }`}>
                                {selectedAnalysis.predictionResult?.severity?.toUpperCase()} SEVERITY
                            </span>
                            <h3 className='text-2xl font-bold text-gray-800'>{selectedAnalysis.predictionResult?.disease}</h3>
                            <p className='text-sm text-gray-500 mt-1'>AI analysis report details</p>
                        </div>

                        <div className='space-y-4 text-sm text-gray-700'>
                            <div>
                                <h5 className='font-bold text-gray-800 mb-1'>Submitted Symptoms:</h5>
                                <div className='flex flex-wrap gap-1.5 mt-1.5'>
                                    {selectedAnalysis.symptoms.map((s, idx) => (
                                        <span key={idx} className='bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium'>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h5 className='font-bold text-gray-800 mb-1'>Prediction Confidence:</h5>
                                <div className='flex items-center gap-2'>
                                    <div className='flex-1 bg-gray-200 rounded-full h-2'>
                                        <div 
                                            className='bg-primary h-2 rounded-full' 
                                            style={{ width: `${selectedAnalysis.predictionResult?.confidence || 0}%` }}
                                        ></div>
                                    </div>
                                    <span className='font-bold text-gray-800 min-w-8 text-right'>
                                        {selectedAnalysis.predictionResult?.confidence || 0}%
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h5 className='font-bold text-gray-800 mb-0.5'>Medical Explanation:</h5>
                                <p className='text-gray-600 leading-relaxed'>{selectedAnalysis.predictionResult?.description}</p>
                            </div>

                            <div>
                                <h5 className='font-bold text-gray-800 mb-1'>Recommended Specialist Categories:</h5>
                                <div className='flex flex-wrap gap-1.5 mt-1'>
                                    {selectedAnalysis.recommendedSpecialists?.map((spec, idx) => (
                                        <span key={idx} className='bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-1 rounded-md text-xs font-semibold'>
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Dietary recommendations in history report modal */}
                            <div className='grid grid-cols-2 gap-4 border-t pt-3 mt-3'>
                                <div>
                                    <h5 className='font-bold text-green-700 text-xs uppercase tracking-wider mb-1.5'>🟢 Recommended (Eat):</h5>
                                    <ul className='text-xs text-gray-600 bg-green-50/70 p-2.5 rounded-lg list-disc list-inside space-y-0.5 border border-green-100'>
                                        {selectedAnalysis.predictionResult?.foodsToEat && selectedAnalysis.predictionResult.foodsToEat.length > 0 ? (
                                            selectedAnalysis.predictionResult.foodsToEat.map((food, idx) => (
                                                <li key={idx} className='leading-normal truncate'>{food}</li>
                                            ))
                                        ) : (
                                            <li className='list-none text-gray-400 italic'>None listed</li>
                                        )}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className='font-bold text-red-700 text-xs uppercase tracking-wider mb-1.5'>🔴 Avoid:</h5>
                                    <ul className='text-xs text-gray-600 bg-red-50/70 p-2.5 rounded-lg list-disc list-inside space-y-0.5 border border-red-100'>
                                        {selectedAnalysis.predictionResult?.foodsToAvoid && selectedAnalysis.predictionResult.foodsToAvoid.length > 0 ? (
                                            selectedAnalysis.predictionResult.foodsToAvoid.map((food, idx) => (
                                                <li key={idx} className='leading-normal truncate'>{food}</li>
                                            ))
                                        ) : (
                                            <li className='list-none text-gray-400 italic'>None listed</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {selectedAnalysis.createdAt && (
                                <p className='text-[11px] text-gray-400 pt-3 border-t text-right'>
                                    Analyzed on {new Date(selectedAnalysis.createdAt).toLocaleString()}
                                </p>
                            )}
                        </div>

                        <div className='mt-6 flex gap-3'>
                            <button 
                                onClick={() => {
                                    setSelectedAnalysis(null);
                                    navigate('/symptom-analyzer');
                                }} 
                                className='flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-cyan-700 transition'
                            >
                                Start New Analysis
                            </button>
                            <button 
                                onClick={() => setSelectedAnalysis(null)} 
                                className='flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-2.5 rounded-xl font-semibold transition'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
