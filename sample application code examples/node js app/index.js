const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- IN-MEMORY DATA ----------
const movies = [
  {
    id: 'm1',
    title: 'Dune: Part Two',
    rating: 8.7,
    duration: '2h 46m',
    genre: 'Sci-Fi',
    price: 15.0,
    language: 'English',
    poster: 'https://example.com/dune.jpg',
  },
  {
    id: 'm2',
    title: 'Oppenheimer',
    rating: 8.5,
    duration: '3h 0m',
    genre: 'Drama',
    price: 14.0,
    language: 'English',
    poster: 'https://example.com/oppenheimer.jpg',
  },
  {
    id: 'm3',
    title: 'Barbie',
    rating: 7.2,
    duration: '1h 54m',
    genre: 'Comedy',
    price: 12.5,
    language: 'English',
    poster: 'https://example.com/barbie.jpg',
  },
  {
    id: 'm4',
    title: 'The Batman',
    rating: 7.8,
    duration: '2h 56m',
    genre: 'Action',
    price: 14.5,
    language: 'English',
    poster: 'https://example.com/batman.jpg',
  },
  {
    id: 'm5',
    title: 'Interstellar',
    rating: 8.7,
    duration: '2h 49m',
    genre: 'Sci-Fi',
    price: 13.0,
    language: 'English',
    poster: 'https://example.com/interstellar.jpg',
  },
];

const theaters = [
  {
    id: 't1',
    name: 'Grand Cinema • Downtown',
    location: 'Downtown',
    screens: 4,
    times: ['10:30', '13:45', '17:20', '20:40'],
  },
  {
    id: 't2',
    name: 'Starlight IMAX • Mall',
    location: 'City Mall',
    screens: 6,
    times: ['11:00', '14:30', '18:00', '21:15'],
  },
  {
    id: 't3',
    name: 'Indie Screen • Arts District',
    location: 'Arts District',
    screens: 2,
    times: ['12:15', '16:00', '19:30'],
  },
];

const dates = [
  { value: '2025-10-12', label: 'Today', sub: 'Oct 12' },
  { value: '2025-10-13', label: 'Tomorrow', sub: 'Oct 13' },
  { value: '2025-10-14', label: 'Tue', sub: 'Oct 14' },
  { value: '2025-10-15', label: 'Wed', sub: 'Oct 15' },
];

// ---------- SEAT CONFIGURATION ----------
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 8;
const MAX_SEATS_PER_BOOKING = 6;
const BASE_PRICE = 14.5;

// Occupied seats per showtime: key = `${date}|${theaterId}|${time}`
const occupiedSeats = new Map();

// Pre-populate some occupied seats for demo realism
function prepopulateOccupied() {
  const key1 = '2025-10-12|t1|10:30';
  occupiedSeats.set(
    key1,
    new Set(['A3', 'A4', 'B1', 'B2', 'B7', 'C5', 'C6', 'D2', 'D3', 'D8'])
  );

  const key2 = '2025-10-12|t2|14:30';
  occupiedSeats.set(key2, new Set(['A1', 'A2', 'A5', 'B3', 'B4', 'C7', 'C8']));

  const key3 = '2025-10-13|t1|13:45';
  occupiedSeats.set(key3, new Set(['E1', 'E2', 'E3', 'F5', 'F6']));
}
prepopulateOccupied();

// Bookings storage
const bookings = [];

// ---------- HELPERS ----------
const getShowtimeKey = (date, theaterId, time) =>
  `${date}|${theaterId}|${time}`;

const getOccupiedSet = (date, theaterId, time) => {
  const key = getShowtimeKey(date, theaterId, time);
  if (!occupiedSeats.has(key)) {
    occupiedSeats.set(key, new Set());
  }
  return occupiedSeats.get(key);
};

const findMovie = (id) => movies.find((m) => m.id === id);
const findTheater = (id) => theaters.find((t) => t.id === id);
const isValidSeatId = (seatId) => /^[A-F][1-8]$/.test(seatId);

// ---------- ROUTES ----------

// Health check / API info
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎬 MovieTix Booking API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      movies: 'GET /api/movies',
      movieById: 'GET /api/movies/:id',
      theaters: 'GET /api/theaters',
      dates: 'GET /api/dates',
      seats: 'GET /api/seats?date=YYYY-MM-DD&theaterId=ID&time=HH:MM',
      createBooking: 'POST /api/bookings',
      listBookings: 'GET /api/bookings',
      getBooking: 'GET /api/bookings/:id',
      cancelBooking: 'DELETE /api/bookings/:id',
    },
  });
});

// Health check for Docker HEALTHCHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ---------- MOVIES ----------
app.get('/api/movies', (req, res) => {
  res.json({ success: true, count: movies.length, data: movies });
});

app.get('/api/movies/:id', (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) {
    return res.status(404).json({ success: false, error: 'Movie not found' });
  }
  res.json({ success: true, data: movie });
});

// ---------- THEATERS ----------
app.get('/api/theaters', (req, res) => {
  res.json({ success: true, count: theaters.length, data: theaters });
});

// ---------- DATES ----------
app.get('/api/dates', (req, res) => {
  res.json({ success: true, count: dates.length, data: dates });
});

// ---------- SEAT MAP ----------
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
    return res
      .status(404)
      .json({ success: false, error: 'Showtime not available for this theater' });
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

  const totalSeats = ROWS.length * SEATS_PER_ROW;

  res.json({
    success: true,
    data: {
      date,
      theaterId,
      time,
      pricePerSeat: BASE_PRICE,
      totalSeats,
      availableSeats: totalSeats - occupiedSet.size,
      occupiedCount: occupiedSet.size,
      rows: seatMap,
    },
  });
});

// ---------- CREATE BOOKING ----------
app.post('/api/bookings', (req, res) => {
  const {
    movieId,
    date,
    theaterId,
    time,
    seats,
    customerName,
    customerEmail,
    customerPhone,
  } = req.body;

  // Validate required fields
  if (!movieId || !date || !theaterId || !time || !seats) {
    return res.status(400).json({
      success: false,
      error: 'Required fields: movieId, date, theaterId, time, seats',
    });
  }

  if (!Array.isArray(seats) || seats.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: 'seats must be a non-empty array' });
  }

  if (seats.length > MAX_SEATS_PER_BOOKING) {
    return res.status(400).json({
      success: false,
      error: `Maximum ${MAX_SEATS_PER_BOOKING} seats per booking`,
    });
  }

  // Validate movie
  const movie = findMovie(movieId);
  if (!movie) {
    return res.status(404).json({ success: false, error: 'Movie not found' });
  }

  // Validate theater
  const theater = findTheater(theaterId);
  if (!theater) {
    return res.status(404).json({ success: false, error: 'Theater not found' });
  }

  if (!theater.times.includes(time)) {
    return res
      .status(404)
      .json({ success: false, error: 'Showtime not available for this theater' });
  }

  // Validate seats
  const occupiedSet = getOccupiedSet(date, theaterId, time);
  const invalidSeats = [];
  const alreadyBookedSeats = [];

  for (const seatId of seats) {
    if (!isValidSeatId(seatId)) {
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
    movie: { id: movie.id, title: movie.title, genre: movie.genre },
    theater: { id: theater.id, name: theater.name, location: theater.location },
    date,
    time,
    seats: seats.sort(),
    seatCount: seats.length,
    pricePerSeat: BASE_PRICE,
    totalPrice: parseFloat((seats.length * BASE_PRICE).toFixed(2)),
    customer: {
      name: customerName || 'Guest',
      email: customerEmail || null,
      phone: customerPhone || null,
    },
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);

  console.log(`✅ Booking created: ${booking.id} (${seats.length} seats)`);

  res.status(201).json({ success: true, data: booking });
});

// ---------- LIST BOOKINGS ----------
app.get('/api/bookings', (req, res) => {
  res.json({ success: true, count: bookings.length, data: bookings });
});

// ---------- GET BOOKING BY ID ----------
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }
  res.json({ success: true, data: booking });
});

// ---------- CANCEL BOOKING ----------
app.delete('/api/bookings/:id', (req, res) => {
  const index = bookings.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }

  const booking = bookings[index];

  // Free up seats
  const occupiedSet = getOccupiedSet(
    booking.date,
    booking.theater.id,
    booking.time
  );
  booking.seats.forEach((seatId) => occupiedSet.delete(seatId));

  bookings.splice(index, 1);

  console.log(`❌ Booking cancelled: ${booking.id}`);

  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

// ---------- 404 HANDLER ----------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ---------- START SERVER ----------
const server = app.listen(PORT, () => {
  console.log(`\n🎬 MovieTix Booking API`);
  console.log(`🚀 Server running on http://54.209.251.132:${PORT}`);
  console.log(`📽️  Movies available: ${movies.length}`);
  console.log(`🎭 Theaters available: ${theaters.length}`);
  console.log(`📅 Dates available: ${dates.length}`);
  console.log(`\nTry: curl http://54.209.251.132:${PORT}/api/movies\n`);
});

// ---------- GRACEFUL SHUTDOWN ----------
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
