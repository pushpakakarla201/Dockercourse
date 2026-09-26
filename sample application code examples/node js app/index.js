const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- IN-MEMORY DATA ----------
const movies = [
  { id: 'm1', title: 'Dune: Part Two', rating: 8.7, duration: '2h 46m', genre: 'Sci-Fi', price: 15.00 },
  { id: 'm2', title: 'Oppenheimer', rating: 8.5, duration: '3h 0m', genre: 'Drama', price: 14.00 },
  { id: 'm3', title: 'Barbie', rating: 7.2, duration: '1h 54m', genre: 'Comedy', price: 12.50 },
  { id: 'm4', title: 'The Batman', rating: 7.8, duration: '2h 56m', genre: 'Action', price: 14.50 },
  { id: 'm5', title: 'Interstellar', rating: 8.7, duration: '2h 49m', genre: 'Sci-Fi', price: 13.00 },
];

const theaters = [
  { id: 't1', name: 'Grand Cinema • Downtown', times: ['10:30', '13:45', '17:20', '20:40'] },
  { id: 't2', name: 'Starlight IMAX • Mall', times: ['11:00', '14:30', '18:00', '21:15'] },
  { id: 't3', name: 'Indie Screen • Arts District', times: ['12:15', '16:00', '19:30'] },
];

const dates = [
  { value: '2025-10-12', label: 'Today', sub: 'Oct 12' },
  { value: '2025-10-13', label: 'Tomorrow', sub: 'Oct 13' },
  { value: '2025-10-14', label: 'Tue', sub: 'Oct 14' },
  { value: '2025-10-15', label: 'Wed', sub: 'Oct 15' },
];

// Seat configuration
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 8;

// Occupied seats stored per showtime key: `${date}|${theaterId}|${time}` -> Set of seatIds
const occupiedSeats = new Map();

// Pre-populate some occupied seats for demo
const prepopulateOccupied = () => {
  const sampleKey = '2025-10-12|t1|10:30';
  occupiedSeats.set(sampleKey, new Set(['A3', 'A4', 'B1', 'B2', 'B7', 'C5', 'C6', 'D2', 'D3', 'D8']));
};
prepopulateOccupied();

// Bookings storage
const bookings = [];

// ---------- HELPERS ----------
const getShowtimeKey = (date, theaterId, time) => `${date}|${theaterId}|${time}`;

const getOccupiedSet = (date, theaterId, time) => {
  const key = getShowtimeKey(date, theaterId, time);
  if (!occupiedSeats.has(key)) {
    occupiedSeats.set(key, new Set());
  }
  return occupiedSeats.get(key);
};

const findMovie = (id) => movies.find((m) => m.id === id);
const findTheater = (id) => theaters.find((t) => t.id === id);

// ---------- ROUTES ----------

// Health check
app.get('/', (req, res) => {
  res.json({
    message: '🎬 MovieTix Booking API',
    version: '1.0.0',
    endpoints: {
      movies: 'GET /api/movies',
      theaters: 'GET /api/theaters',
      dates: 'GET /api/dates',
      seats: 'GET /api/seats?date=...&theaterId=...&time=...',
      book: 'POST /api/bookings',
      bookings: 'GET /api/bookings',
      bookingById: 'GET /api/bookings/:id',
    },
  });
});

// GET all movies
app.get('/api/movies', (req, res) => {
  res.json({ success: true, count: movies.length, data: movies });
});

// GET movie by id
app.get('/api/movies/:id', (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) {
    return res.status(404).json({ success: false, error: 'Movie not found' });
  }
  res.json({ success: true, data: movie });
});

// GET all theaters
app.get('/api/theaters', (req, res) => {
  res.json({ success: true, count: theaters.length, data: theaters });
});

// GET all dates
app.get('/api/dates', (req, res) => {
  res.json({ success: true, count: dates.length, data: dates });
});

// GET seat availability for a showtime
app.get('/api/seats', (req, res) => {
  const { date, theaterId, time } = req.query;

  if (!date || !theaterId || !time) {
    return res.status(400).json({
      success: false,
      error: 'Query params required: date, theaterId, time',
    });
  }

  const theater = findTheater(theaterId);
  if (!theater) {
    return res.status(404).json({ success: false, error: 'Theater not found' });
  }

  if (!theater.times.includes(time)) {
    return res.status(404).json({ success: false, error: 'Showtime not available' });
  }

  const occupiedSet = getOccupiedSet(date, theaterId, time);
  const seatMap = [];

  ROWS.forEach((row) => {
    const rowSeats = [];
    for (let i = 1; i <= SEATS_PER_ROW; i++) {
      const seatId = `${row}${i}`;
      rowSeats.push({
        id: seatId,
        row,
        number: i,
        occupied: occupiedSet.has(seatId),
      });
    }
    seatMap.push({ row, seats: rowSeats });
  });

  res.json({
    success: true,
    data: {
      date,
      theaterId,
      time,
      rows: seatMap,
      price: 14.5,
      totalOccupied: occupiedSet.size,
    },
  });
});

// POST create a booking
app.post('/api/bookings', (req, res) => {
  const { movieId, date, theaterId, time, seats, customerName, customerEmail } = req.body;

  // Validation
  if (!movieId || !date || !theaterId || !time || !seats) {
    return res.status(400).json({
      success: false,
      error: 'Required fields: movieId, date, theaterId, time, seats',
    });
  }

  if (!Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ success: false, error: 'seats must be a non-empty array' });
  }

  if (seats.length > 6) {
    return res.status(400).json({ success: false, error: 'Maximum 6 seats per booking' });
  }

  const movie = findMovie(movieId);
  if (!movie) {
    return res.status(404).json({ success: false, error: 'Movie not found' });
  }

  const theater = findTheater(theaterId);
  if (!theater) {
    return res.status(404).json({ success: false, error: 'Theater not found' });
  }

  if (!theater.times.includes(time)) {
    return res.status(404).json({ success: false, error: 'Showtime not available' });
  }

  // Check seat validity and availability
  const occupiedSet = getOccupiedSet(date, theaterId, time);
  const invalidSeats = [];
  const alreadyBookedSeats = [];

  for (const seatId of seats) {
    if (!/^[A-F][1-8]$/.test(seatId)) {
      invalidSeats.push(seatId);
    } else if (occupiedSet.has(seatId)) {
      alreadyBookedSeats.push(seatId);
    }
  }

  if (invalidSeats.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Invalid seat IDs: ${invalidSeats.join(', ')}`,
    });
  }

  if (alreadyBookedSeats.length > 0) {
    return res.status(409).json({
      success: false,
      error: `Seats already booked: ${alreadyBookedSeats.join(', ')}`,
    });
  }

  // Mark seats as occupied
  seats.forEach((seatId) => occupiedSet.add(seatId));

  // Create booking
  const booking = {
    id: uuidv4(),
    movie: { id: movie.id, title: movie.title },
    theater: { id: theater.id, name: theater.name },
    date,
    time,
    seats,
    seatCount: seats.length,
    pricePerSeat: 14.5,
    totalPrice: parseFloat((seats.length * 14.5).toFixed(2)),
    customerName: customerName || 'Guest',
    customerEmail: customerEmail || null,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);

  res.status(201).json({ success: true, data: booking });
});

// GET all bookings
app.get('/api/bookings', (req, res) => {
  res.json({ success: true, count: bookings.length, data: bookings });
});

// GET booking by id
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }
  res.json({ success: true, data: booking });
});

// DELETE a booking (cancel)
app.delete('/api/bookings/:id', (req, res) => {
  const index = bookings.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const booking = bookings[index];

  // Free up the seats
  const occupiedSet = getOccupiedSet(booking.date, booking.theater.id, booking.time);
  booking.seats.forEach((seatId) => occupiedSet.delete(seatId));

  bookings.splice(index, 1);
  res.json({ success: true, message: 'Booking cancelled', data: booking });
});

// ---------- 404 HANDLER ----------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`\n🎬 MovieTix Booking API running on http://localhost:${PORT}`);
  console.log(`📽️  Movies available: ${movies.length}`);
  console.log(`🎭 Theaters available: ${theaters.length}`);
  console.log(`\nTry: curl http://localhost:${PORT}/api/movies\n`);
});

module.exports = app;
