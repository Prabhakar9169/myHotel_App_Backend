import { Request, Response } from 'express';
import Room from '../models/Room';
import { IRoomInput } from '../types/room';
import { asyncHandler, getPagination, getTotalPages } from '../utils/helpers';
import { validateObjectId, validatePrice, validateGuests } from '../utils/validators';

// Get all rooms with pagination and filters
export const getAllRooms = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    // Build filter object
    const filter: any = { isAvailable: true };
    
    if (req.query.roomType) {
      filter.roomType = req.query.roomType;
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }
    
    if (req.query.maxGuests) {
      filter.maxGuests = { $gte: Number(req.query.maxGuests) };
    }

    if (req.query.city) {
      filter['address.city'] = new RegExp(req.query.city as string, 'i');
    }

    const rooms = await Room.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        pages: getTotalPages(total, limit)
      }
    });
  }
);

// Get single room by ID
export const getRoomById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    const room = await Room.findById(id).select('-__v');

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.json({
      success: true,
      data: room
    });
  }
);

// Create new room (Admin only)
export const createRoom = asyncHandler(
  async (req: Request<{}, {}, IRoomInput>, res: Response): Promise<void> => {
    const { title, description, price, maxGuests, roomType, amenities, images, address } = req.body;

    // Validation
    if (!title || !description || !price || !maxGuests || !roomType || !address) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
      return;
    }

    if (!validatePrice(price)) {
      res.status(400).json({
        success: false,
        message: 'Price must be between 1 and 100000'
      });
      return;
    }

    if (!validateGuests(maxGuests, 10)) {
      res.status(400).json({
        success: false,
        message: 'Maximum guests must be between 1 and 10'
      });
      return;
    }

    const room = await Room.create({
      title: title.trim(),
      description: description.trim(),
      price,
      maxGuests,
      roomType,
      amenities: amenities || [],
      images: images || [],
      address
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  }
);

// Update room (Admin only)
export const updateRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    const room = await Room.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  }
);

// Delete room (Admin only)
export const deleteRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    const room = await Room.findByIdAndDelete(id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  }
);

// Search rooms
export const searchRooms = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { q, checkIn, checkOut, guests } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { skip } = getPagination(page, limit);

    let filter: any = { isAvailable: true };

    // Text search
    if (q) {
      filter.$text = { $search: q as string };
    }

    // Guest capacity
    if (guests) {
      filter.maxGuests = { $gte: Number(guests) };
    }

    // Date availability (simplified - in production, check against bookings)
    // TODO: Add booking overlap check

    const rooms = await Room.find(filter)
      .select('-__v')
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        pages: getTotalPages(total, limit)
      }
    });
  }
);
