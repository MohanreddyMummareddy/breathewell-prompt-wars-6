export function category(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0 || aqi > 500) throw new Error('AQI must be between 0 and 500');
  return aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for sensitive groups' : aqi <= 200 ? 'Unhealthy' : aqi <= 300 ? 'Very unhealthy' : 'Hazardous';
}
export function savings(km, days) { return Math.round(km * days * 0.17 * 10) / 10; }
export function guidance(profile, question = '') {
 const bad = profile.aqi > 100;
 const q = question.toLowerCase();
 if (/breath|chest|emergency/.test(q)) return 'If you have severe breathlessness, chest pain, confusion, or rapidly worsening symptoms, seek urgent local medical help. Follow your clinician’s existing care plan. I cannot diagnose symptoms.';
 if (/plant/.test(q)) return 'Houseplants are lovely, but they are not a substitute for particle filtration. Use a properly sized, ozone-free HEPA air cleaner, reduce indoor smoke sources, and monitor indoor PM2.5 if a sensor is available.';
 if (/window|ventilat/.test(q)) return 'When outdoor particle pollution is high, keep windows closed if you can remain comfortably cool, and run a properly sized particle filter. Ventilate when outdoor air improves. Never compromise gas-appliance ventilation or carbon-monoxide safety.';
 if (/child|school|kid/.test(q)) return 'Children are more sensitive to air pollution. On polluted days, move energetic play indoors to a cleaner-air space, coordinate indoor activities with school, and follow local advisories. Respirator fit and suitability for children need individual guidance.';
 if (/commut|travel|metro|car/.test(q)) return `For your ${profile.commute} km daily commute in ${profile.city}, consider ${bad ? 'enclosed public transport, if practical; avoid strenuous roadside cycling while pollution is high' : 'public transport or a quieter walking route when local conditions allow'}. Replacing a solo petrol-car trip for 5 days could avoid about ${savings(profile.commute,5)} kg CO₂, using an illustrative net saving of 0.17 kg/km. Actual savings depend on vehicle, occupancy, and route.`;
 return `For your household in ${profile.city}, with a US AQI of ${profile.aqi}: ${bad ? 'move strenuous outdoor activities into a cleaner-air room and minimize time near busy roads' : 'check local readings before outdoor activities'}. ${profile.sensitive ? 'Prioritize children, older adults, and anyone with heart or lung conditions. ' : ''}Reduce incense and candle burning, damp-dust surfaces, and use an ozone-free particle filter if available. ${profile.budget === 'low' ? 'Start with no-cost source reduction and one cleaner-air room.' : 'Choose filtration sized for your room, and maintain its filters.'} These choices reduce exposure; they cannot guarantee a particular health outcome.`;
}
