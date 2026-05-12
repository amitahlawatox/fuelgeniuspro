import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { registrationNumber } = body
    if (!registrationNumber) return NextResponse.json({ error: 'Registration number required' }, { status: 400 })

    const apiKey = process.env.DVLA_API_KEY
    const apiBase = process.env.DVLA_API_BASE || 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1'

    if (!apiKey) {
      // Return mock data when no API key
      return NextResponse.json({
        registrationNumber: registrationNumber.toUpperCase(),
        make: 'FORD',
        colour: 'BLUE',
        fuelType: 'PETROL',
        yearOfManufacture: 2018,
        engineCapacity: 1498,
        co2Emissions: 118,
        motStatus: 'Valid',
        taxStatus: 'Taxed',
        taxDueDate: '2025-01-01',
        motExpiryDate: '2025-06-15',
        monthOfFirstRegistration: '2018-03',
        wheelplan: 'NON STANDARD',
      })
    }

    const res = await fetch(`${apiBase}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ registrationNumber: registrationNumber.replace(/\s/g, '').toUpperCase() }),
    })

    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 404) return NextResponse.json({ error: 'Vehicle not found. Check the registration plate and try again.' }, { status: 404 })
      return NextResponse.json({ error: `DVLA API error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('DVLA route error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
