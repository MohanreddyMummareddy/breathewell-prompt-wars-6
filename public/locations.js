// Curated city centres for a reliable, no-typing fallback; not neighbourhood sensors.
export const cities = [
 ['New Delhi','Delhi',28.6139,77.209],['Mumbai','Maharashtra',19.076,72.8777],
 ['Bengaluru','Karnataka',12.9716,77.5946],['Hyderabad','Telangana',17.385,78.4867],
 ['Chennai','Tamil Nadu',13.0827,80.2707],['Kolkata','West Bengal',22.5726,88.3639],
 ['Ahmedabad','Gujarat',23.0225,72.5714],['Pune','Maharashtra',18.5204,73.8567],
 ['Jaipur','Rajasthan',26.9124,75.7873],['Lucknow','Uttar Pradesh',26.8467,80.9462],
 ['Kanpur','Uttar Pradesh',26.4499,80.3319],['Varanasi','Uttar Pradesh',25.3176,82.9739],
 ['Agra','Uttar Pradesh',27.1767,78.0081],['Noida','Uttar Pradesh',28.5355,77.391],
 ['Gurugram','Haryana',28.4595,77.0266],['Faridabad','Haryana',28.4089,77.3178],
 ['Chandigarh','Chandigarh',30.7333,76.7794],['Amritsar','Punjab',31.634,74.8723],
 ['Ludhiana','Punjab',30.901,75.8573],['Dehradun','Uttarakhand',30.3165,78.0322],
 ['Shimla','Himachal Pradesh',31.1048,77.1734],['Srinagar','Jammu and Kashmir',34.0837,74.7973],
 ['Jammu','Jammu and Kashmir',32.7266,74.857],['Leh','Ladakh',34.1526,77.5771],
 ['Bhopal','Madhya Pradesh',23.2599,77.4126],['Indore','Madhya Pradesh',22.7196,75.8577],
 ['Patna','Bihar',25.5941,85.1376],['Ranchi','Jharkhand',23.3441,85.3096],
 ['Raipur','Chhattisgarh',21.2514,81.6296],['Bhubaneswar','Odisha',20.2961,85.8245],
 ['Guwahati','Assam',26.1445,91.7362],['Shillong','Meghalaya',25.5788,91.8933],
 ['Agartala','Tripura',23.8315,91.2868],['Imphal','Manipur',24.817,93.9368],
 ['Aizawl','Mizoram',23.7271,92.7176],['Kohima','Nagaland',25.6751,94.1086],
 ['Itanagar','Arunachal Pradesh',27.0844,93.6053],['Gangtok','Sikkim',27.3389,88.6065],
 ['Visakhapatnam','Andhra Pradesh',17.6868,83.2185],['Vijayawada','Andhra Pradesh',16.5062,80.648],
 ['Tirupati','Andhra Pradesh',13.6288,79.4192],['Guntur','Andhra Pradesh',16.3067,80.4365],
 ['Coimbatore','Tamil Nadu',11.0168,76.9558],['Madurai','Tamil Nadu',9.9252,78.1198],
 ['Kochi','Kerala',9.9312,76.2673],['Thiruvananthapuram','Kerala',8.5241,76.9366],
 ['Mysuru','Karnataka',12.2958,76.6394],['Mangaluru','Karnataka',12.9141,74.856],
 ['Nagpur','Maharashtra',21.1458,79.0882],['Surat','Gujarat',21.1702,72.8311],
 ['Panaji','Goa',15.4909,73.8278],['Puducherry','Puducherry',11.9416,79.8083],
 ['Port Blair','Andaman and Nicobar Islands',11.6234,92.7265],['Kavaratti','Lakshadweep',10.5593,72.6358]
].map(([name,state,latitude,longitude])=>({name,state,latitude,longitude,source:'City centre'})).sort((a,b)=>a.name.localeCompare(b.name));

export function validCoordinates(place) {
 return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude) && place.latitude>=6 && place.latitude<=38 && place.longitude>=68 && place.longitude<=98;
}
