import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary'
import stripe from "stripe";
import razorpay from 'razorpay';
import crypto from 'crypto';
import { sendUserEmail, sendHospitalEmail } from '../utils/emailService.js';

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)


// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to book appointment 
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body
        console.log('BookAppointment request:', { userId, docId, slotDate, slotTime })
        if (!slotTime) return res.json({ success: false, message: 'Slot time is required' })

        let targetDocId = docId;

        // Check if this is an OpenStreetMap doctor (starts with 'osm_')
        if (typeof docId === 'string' && docId.startsWith('osm_')) {
            const osmId = docId;
            const osmEmail = `${osmId.toLowerCase()}@careconnect.com`;
            
            // Check if the OSM doctor already exists in MongoDB
            let osmDoc = await doctorModel.findOne({ email: osmEmail });
            
            if (!osmDoc) {
                // Register this doctor on-the-fly
                const { osmName, osmSpeciality, osmAddress } = req.body;
                
                // Construct a default doctor profile
                const hashedPassword = await bcrypt.hash("OsmDoctorDefaultPassword123!", 10);
                
                const newDoc = new doctorModel({
                    name: osmName || 'Nearby Medical Facility',
                    email: osmEmail,
                    password: hashedPassword,
                    speciality: osmSpeciality || 'General physician',
                    degree: 'MBBS / Clinic',
                    experience: '5 Years',
                    about: 'Healthcare provider recommended near you via OpenStreetMap.',
                    available: true,
                    fees: 500, // Standard fee in INR
                    address: typeof osmAddress === 'object' ? osmAddress : { line1: osmAddress || 'OpenStreetMap Address', line2: '' },
                    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=250&auto=format&fit=crop',
                    slots_booked: {},
                    date: Date.now()
                });
                
                osmDoc = await newDoc.save();
                console.log('Registered new OSM doctor on-the-fly:', osmDoc._id, osmDoc.name);
            }
            
            targetDocId = osmDoc._id;
        }

        const docData = await doctorModel.findById(targetDocId).select("-password")
        if (!docData) return res.json({ success: false, message: 'Doctor not found' })
        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        // ensure slots_booked is an object
        let slots_booked = docData.slots_booked || {}

        // checking for slot availability
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot Not Available' })
            } else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = [slotTime]
        }

        const userData = await userModel.findById(userId).select("-password")
        if (!userData) return res.json({ success: false, message: 'User not found' })

        // use plain objects for storage to avoid Mongoose document quirks
        const docDataObj = docData.toObject()
        delete docDataObj.slots_booked

        const appointmentData = {
            userId,
            docId: targetDocId,
            userData,
            docData: docDataObj,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()
        console.log('Appointment created:', { appointmentId: newAppointment._id, docId: targetDocId, userId })

        // save new slots data in docData (atomic replace)
        await doctorModel.findByIdAndUpdate(targetDocId, { $set: { slots_booked } })
        console.log('Updated slots_booked for doctor:', targetDocId)

        // Send Notification Emails
        const userHtml = `<h3>Appointment Confirmed</h3><p>Dear ${userData.name},</p><p>Your appointment with <b>${docData.name}</b> on ${slotDate} at ${slotTime} has been booked successfully.</p><p>You can pay online or at the clinic.</p>`;
        const hospitalHtml = `<h3>New Booking Alert</h3><p>A new appointment has been booked.</p><p><b>Patient:</b> ${userData.name} (${userData.email})</p><p><b>Doctor:</b> ${docData.name}</p><p><b>Date & Time:</b> ${slotDate} at ${slotTime}</p>`;
        
        await sendUserEmail(userData.email, "Appointment Confirmed - CareConnect", userHtml);
        await sendHospitalEmail(`New Appointment: ${docData.name}`, hospitalHtml);

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        // creating options for razorpay payment
        const options = {
            amount: 50 * 100, // TEST MODE: Hardcoded to 50 to meet minimum limits
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        // Verify signature to ensure payment authenticity
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex')

        if (generated_signature !== razorpay_signature) {
            return res.json({ success: false, message: 'Invalid signature' })
        }

        // Fetch order to get the receipt (appointment id) and double-check status
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo && (orderInfo.status === 'paid' || orderInfo.status === 'captured' || orderInfo.status === 'authorized')) {
            const updatedAppt = await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true }, { new: true })
            
            if (updatedAppt && updatedAppt.userData && updatedAppt.docData) {
                const userHtml = `<h3>Payment Successful</h3><p>Dear ${updatedAppt.userData.name},</p><p>Your payment of <b>₹${updatedAppt.amount}</b> for your appointment with ${updatedAppt.docData.name} on ${updatedAppt.slotDate} is successfully processed.</p><p>Thank you for using CareConnect.</p>`;
                const hospitalHtml = `<h3>Payment Received Alert</h3><p>An online payment has been received for an appointment.</p><p><b>Patient:</b> ${updatedAppt.userData.name}</p><p><b>Amount:</b> ₹${updatedAppt.amount}</p><p><b>Doctor:</b> ${updatedAppt.docData.name}</p><p><b>Date:</b> ${updatedAppt.slotDate}</p>`;
                
                await sendUserEmail(updatedAppt.userData.email, "Payment Successful - CareConnect", userHtml);
                await sendHospitalEmail(`Payment Received: ₹${updatedAppt.amount}`, hospitalHtml);
            }

            return res.json({ success: true, message: "Payment Successful" })
        }

        res.json({ success: false, message: 'Payment not completed yet' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const { origin } = req.headers

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: "Appointment Fees"
                },
                unit_amount: 50 * 100 // TEST MODE: Hardcoded to 50 to meet minimum limits
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyStripe = async (req, res) => {
    try {

        const { appointmentId, success } = req.body

        if (success === "true") {
            const updatedAppt = await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true }, { new: true })
            
            if (updatedAppt && updatedAppt.userData && updatedAppt.docData) {
                const userHtml = `<h3>Payment Successful</h3><p>Dear ${updatedAppt.userData.name},</p><p>Your payment of <b>₹${updatedAppt.amount}</b> for your appointment with ${updatedAppt.docData.name} on ${updatedAppt.slotDate} is successfully processed.</p><p>Thank you for using CareConnect.</p>`;
                const hospitalHtml = `<h3>Payment Received Alert</h3><p>An online payment has been received for an appointment.</p><p><b>Patient:</b> ${updatedAppt.userData.name}</p><p><b>Amount:</b> ₹${updatedAppt.amount}</p><p><b>Doctor:</b> ${updatedAppt.docData.name}</p><p><b>Date:</b> ${updatedAppt.slotDate}</p>`;
                
                await sendUserEmail(updatedAppt.userData.email, "Payment Successful - CareConnect", userHtml);
                await sendHospitalEmail(`Payment Received: ₹${updatedAppt.amount}`, hospitalHtml);
            }

            return res.json({ success: true, message: 'Payment Successful' })
        }

        res.json({ success: false, message: 'Payment Failed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe
}