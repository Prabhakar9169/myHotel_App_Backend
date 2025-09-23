import mongoose from 'mongoose';
import Room from '../models/Room';

const sampleRooms = [
  {
    title: "Luxury Suite at Grand Hotel Mumbai",
    description: "Experience ultimate luxury in our premium suite with stunning city views, king-size bed, and world-class amenities.",
    roomType: "suite",
    price: 8500,
    originalPrice: 10000,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"
    ],
    amenities: ["Free WiFi", "Air Conditioning", "Room Service", "Mini Bar", "City View", "King Bed", "Jacuzzi", "Balcony"],
    maxGuests: 2,
    bedType: "King Size",
    roomSize: 450,
    hotelName: "Grand Hotel Mumbai",
    address: {
      street: "123 Marine Drive",
      city: "Mumbai",
      state: "Maharashtra", 
      country: "India",
      pincode: "400001",
      coordinates: { lat: 18.9220, lng: 72.8347 }
    },
    rating: 4.8,
    totalReviews: 234,
    contact: {
      phone: "+91 22 1234 5678",
      email: "reservations@grandmumbai.com",
      website: "https://grandmumbai.com"
    },
    tags: ["luxury", "business", "city-center", "premium"],
    featured: true
  },
  
  {
    title: "Cozy Deluxe Room at Hotel Sunshine Delhi",
    description: "Comfortable and well-appointed deluxe room perfect for business travelers and tourists alike.",
    roomType: "deluxe",
    price: 3500,
    originalPrice: 4000,
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"
    ],
    amenities: ["Free WiFi", "Air Conditioning", "TV", "Tea/Coffee", "Attached Bathroom", "Queen Bed"],
    maxGuests: 2,
    bedType: "Queen Size",
    roomSize: 280,
    hotelName: "Hotel Sunshine Delhi",
    address: {
      street: "45 Connaught Place",
      city: "Delhi",
      state: "Delhi",
      country: "India", 
      pincode: "110001",
      coordinates: { lat: 28.6315, lng: 77.2167 }
    },
    rating: 4.2,
    totalReviews: 156,
    contact: {
      phone: "+91 11 2345 6789",
      email: "booking@sunshindelhi.com"
    },
    tags: ["budget-friendly", "business", "central-location"],
    featured: false
  },

  {
    title: "Beach Resort Villa - Goa Paradise",
    description: "Wake up to ocean views in this beautiful beach resort villa with private beach access.",
    roomType: "premium",
    price: 12000,
    originalPrice: 15000,
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
      "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=800",
      "https://images.unsplash.com/photo-1574690129004-bc2b8fc7b92e?w=800"
    ],
    amenities: ["Beach Access", "Free WiFi", "Pool", "Spa", "Restaurant", "Bar", "Parking", "Room Service"],
    maxGuests: 4,
    bedType: "King + Sofa Bed",
    roomSize: 600,
    hotelName: "Goa Paradise Resort",
    address: {
      street: "Beach Road, Baga",
      city: "Goa",
      state: "Goa",
      country: "India",
      pincode: "403516",
      coordinates: { lat: 15.5557, lng: 73.7516 }
    },
    rating: 4.6,
    totalReviews: 89,
    contact: {
      phone: "+91 832 123 4567",
      email: "resort@goaparadise.com",
      website: "https://goaparadise.com"
    },
    tags: ["beach", "resort", "vacation", "family"],
    featured: true
  },

  {
    title: "Budget Single Room - Backpacker's Den",
    description: "Clean and comfortable single room perfect for solo travelers on a budget.",
    roomType: "single",
    price: 1200,
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
    ],
    amenities: ["Free WiFi", "Fan", "Shared Bathroom", "Common Area", "Luggage Storage"],
    maxGuests: 1,
    bedType: "Single",
    roomSize: 120,
    hotelName: "Backpacker's Den",
    address: {
      street: "Paharganj Main Road",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      pincode: "110055"
    },
    rating: 3.8,
    totalReviews: 67,
    contact: {
      phone: "+91 11 9876 5432",
      email: "stay@backpackersden.com"
    },
    tags: ["budget", "backpacker", "solo-travel"],
    featured: false
  },

  // Add more rooms for different cities...
  {
    title: "Heritage Palace Suite - Jaipur Royal",
    description: "Experience royal treatment in this heritage palace suite with traditional Rajasthani decor.",
    roomType: "suite",
    price: 6500,
    images: [
      "https://images.unsplash.com/photo-1578774204375-826dc5d996ed?w=800",
      "https://images.unsplash.com/photo-1596596477851-5e2c7bb15319?w=800"
    ],
    amenities: ["Heritage Architecture", "Royal Decor", "Free WiFi", "Cultural Shows", "Traditional Food", "Courtyard View"],
    maxGuests: 3,
    bedType: "King Size",
    roomSize: 400,
    hotelName: "Jaipur Royal Palace Hotel",
    address: {
      street: "Pink City Heritage Area",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      pincode: "302001"
    },
    rating: 4.7,
    totalReviews: 178,
    contact: {
      phone: "+91 141 234 5678",
      email: "royal@jaipurpalace.com"
    },
    tags: ["heritage", "royal", "cultural", "traditional"],
    featured: true
  }
];

export async function seedRooms() {
  try {
    // Clear existing rooms
    await Room.deleteMany({});
    console.log('Cleared existing rooms');
    
    // Insert sample rooms
    await Room.insertMany(sampleRooms);
    console.log(`✅ Successfully seeded ${sampleRooms.length} rooms`);
    
    return true;
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-booking')
    .then(() => {
      console.log('Connected to MongoDB');
      return seedRooms();
    })
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
