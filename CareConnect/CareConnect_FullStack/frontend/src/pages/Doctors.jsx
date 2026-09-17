import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate, useParams } from 'react-router-dom'

const Doctors = () => {
  const { speciality } = useParams()
  const [filterDoc, setFilterDoc] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const navigate = useNavigate()

  const { doctors } = useContext(AppContext)
  
  // Geolocation states
  const [userCoords, setUserCoords] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)

  // Distance calculation using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  // Resolve doctor coordinates
  const getDocCoords = (doc, userLat, userLon) => {
    // If doctor already has lat/lon coordinates (e.g. OSM-registered clinicians)
    if (doc.lat && doc.lon) {
      return { lat: doc.lat, lon: doc.lon };
    }
    // Else generate a deterministic, stable coordinate offset near the user for mock database doctors
    const hash = (doc._id || doc.email || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Lat & Lon offsets between -0.04 and +0.04 degrees (~4.5km)
    const latOffset = (((hash % 37) / 37) - 0.5) * 0.08;
    const lonOffset = ((((hash >> 2) % 43) / 43) - 0.5) * 0.08;
    return {
      lat: userLat + latOffset,
      lon: userLon + lonOffset
    };
  }

  // Query browser location
  const detectLocation = () => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setGeoLoading(false);
        },
        (error) => {
          console.log("Geolocation error in Doctors.jsx:", error);
          setGeoLoading(false);
        }
      );
    }
  }

  // Filter and sort doctors list
  const applyFilter = () => {
    let tempDocs = [...doctors];
    
    if (speciality) {
      tempDocs = tempDocs.filter(doc => doc.speciality === speciality)
    }

    if (userCoords) {
      tempDocs = tempDocs.map(doc => {
        const coords = getDocCoords(doc, userCoords.lat, userCoords.lon);
        const dist = calculateDistance(userCoords.lat, userCoords.lon, coords.lat, coords.lon);
        return { ...doc, distance: dist };
      });
      // Sort by proximity ascending
      tempDocs.sort((a, b) => a.distance - b.distance);
    }

    setFilterDoc(tempDocs)
  }

  useEffect(() => {
    detectLocation()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [doctors, speciality, userCoords])

  return (
    <div>
      {/* Header section with Location status indicators */}
      <div className='flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 mb-4 gap-2'>
        <div>
          <h2 className='text-2xl font-bold text-gray-800'>All Doctors</h2>
          <p className='text-gray-500 text-sm'>Browse through our registered medical specialists.</p>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          {geoLoading && (
            <span className='text-gray-500 animate-pulse bg-gray-100 px-3 py-1.5 rounded-full border flex items-center gap-1.5'>
              📍 Detecting your coordinates...
            </span>
          )}
          {userCoords && (
            <span className='text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 font-semibold flex items-center gap-1'>
              📍 Proximity Sorting Active (Closest First)
            </span>
          )}
          {!userCoords && !geoLoading && (
            <button 
              onClick={detectLocation}
              className='text-primary hover:text-cyan-700 font-bold border px-3 py-1.5 rounded-full hover:bg-gray-50 transition'
            >
              📍 Sort by Proximity
            </button>
          )}
        </div>
      </div>

      <div className='flex flex-col sm:flex-row items-start gap-5 mt-5'>
        <button onClick={() => setShowFilter(!showFilter)} className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}>Filters</button>
        <div className={`flex-col gap-4 text-sm text-gray-600 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          <p onClick={() => speciality === 'General physician' ? navigate('/doctors') : navigate('/doctors/General physician')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'General physician' ? 'bg-[#E2E5FF] text-black ' : ''}`}>General physician</p>
          <p onClick={() => speciality === 'Gynecologist' ? navigate('/doctors') : navigate('/doctors/Gynecologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gynecologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Gynecologist</p>
          <p onClick={() => speciality === 'Dermatologist' ? navigate('/doctors') : navigate('/doctors/Dermatologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Dermatologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Dermatologist</p>
          <p onClick={() => speciality === 'Pediatricians' ? navigate('/doctors') : navigate('/doctors/Pediatricians')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Pediatricians' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Pediatricians</p>
          <p onClick={() => speciality === 'Neurologist' ? navigate('/doctors') : navigate('/doctors/Neurologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Neurologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Neurologist</p>
          <p onClick={() => speciality === 'Gastroenterologist' ? navigate('/doctors') : navigate('/doctors/Gastroenterologist')} className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-[#E2E5FF] text-black ' : ''}`}>Gastroenterologist</p>
        </div>
        
        <div className='w-full grid grid-cols-auto gap-4 gap-y-6'>
          {filterDoc.map((item, index) => (
            <div onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }} className='border border-[#C9D8FF] rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500 bg-white' key={index}>
              <img className='bg-[#EAEFFF] w-full h-48 object-cover' src={item.image} alt={item.name} />
              <div className='p-4'>
                <div className='flex items-center justify-between gap-2 text-sm mb-1.5'>
                  <div className={`flex items-center gap-2 ${item.available ? 'text-green-500' : "text-gray-500"}`}>
                    <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : "bg-gray-500"}`}></p>
                    <p className='text-xs font-semibold'>{item.available ? 'Available' : "Not Available"}</p>
                  </div>
                  {item.distance !== undefined && (
                    <span className='text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100 px-2 py-0.5 rounded-full'>
                      🚗 {item.distance} km
                    </span>
                  )}
                </div>
                <p className='text-[#262626] text-lg font-bold leading-snug'>{item.name}</p>
                <p className='text-[#5C5C5C] text-xs font-semibold uppercase tracking-wider mt-0.5'>{item.speciality}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Doctors