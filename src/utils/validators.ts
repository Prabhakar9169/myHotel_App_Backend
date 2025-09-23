export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const validateObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export const validateDateRange = (checkIn: string, checkOut: string): boolean => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const today = new Date();
  
  return checkInDate >= today && checkOutDate > checkInDate;
};

export const validatePrice = (price: number): boolean => {
  return price > 0 && price <= 100000; // Max 1 lakh per night
};

export const validateGuests = (guests: number, maxGuests: number): boolean => {
  return guests >= 1 && guests <= maxGuests;
};
