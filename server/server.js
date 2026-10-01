require('dotenv').config()

const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')

const app = express()
const port = Number(process.env.PORT) || 5000
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/', (_request, response) => {
  response.json({
    name: 'Student Registration API',
    status: 'ok',
    endpoints: ['/api/health', '/api/students'],
  })
})

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, trim: true, unique: true },
  department: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  bloodGroup: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  motherName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  arrears: { type: Number, required: true, min: 0 },
  eligible: { type: Boolean, required: true },
  companies: { type: [String], default: [] },
  registeredAt: { type: Date, default: Date.now },
})

const Student = mongoose.model('Student', studentSchema)

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

app.get('/api/students', async (_request, response) => {
  try {
    const students = await Student.find().sort({ registeredAt: -1 })
    response.json(students)
  } catch (error) {
    console.error('Unable to load students:', error.message)
    response.status(500).json({ message: 'Unable to load student registrations.' })
  }
})

app.post('/api/students', async (request, response) => {
  const body = request.body || {}
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  const arrears = Number(body.arrears)

  try {
    const student = await Student.create({
      name: body.name,
      studentId,
      department: body.department,
      year: body.year,
      section: body.section,
      bloodGroup: body.bloodGroup,
      fatherName: body.fatherName,
      motherName: body.motherName,
      phone: body.phone,
      email: body.email,
      arrears,
      eligible: arrears === 0,
      companies: arrears === 0 && Array.isArray(body.companies) ? body.companies : [],
    })
    response.status(201).json(student)
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: 'That student ID is already registered. Check the ID and try again.' })
      return
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      response.status(400).json({ message: 'Please check the student details and try again.' })
      return
    }
    console.error('Unable to save student:', error.message)
    response.status(500).json({ message: 'Unable to save the student registration.' })
  }
})

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing from the server .env file.')
  process.exit(1)
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Registration API listening on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  })
