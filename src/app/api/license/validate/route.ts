import { NextResponse } from 'next/server'

/**
 * POST /api/license/validate
 * 
 * Validates a ProjoFlow license key.
 * License keys are checked against Gumroad's API.
 */
export async function POST(request: Request) {
  try {
    const { licenseKey } = await request.json()

    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      )
    }

    // Clean up the license key (remove spaces, convert to uppercase)
    const cleanKey = licenseKey.trim().toUpperCase().replace(/\s/g, '')

    // Validate format: PJ-XXXXX-XXXXX-XXXXX (or similar patterns)
    const formatRegex = /^PJ-[A-Z0-9]{5,8}-[A-Z0-9]{5,8}-[A-Z0-9]{5,8}$/
    if (!formatRegex.test(cleanKey)) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid license key format. Expected: PJ-XXXXX-XXXXX-XXXXX' 
        },
        { status: 400 }
      )
    }

    // For now, we'll use Gumroad's license verification API
    // You'll need to set GUMROAD_PRODUCT_ID in your env vars
    const gumroadProductId = process.env.GUMROAD_PRODUCT_ID
    
    if (!gumroadProductId) {
      // Fallback: If Gumroad is not configured, accept any properly formatted key
      // (You can remove this in production once Gumroad is set up)
      console.warn('GUMROAD_PRODUCT_ID not set, accepting all formatted keys')
      return NextResponse.json({
        valid: true,
        message: 'License key accepted',
        productName: 'ProjoFlow Self-Hosted',
      })
    }

    // Verify with Gumroad
    const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        product_id: gumroadProductId,
        license_key: cleanKey,
      }),
    })

    const gumroadData = await gumroadResponse.json()

    if (!gumroadResponse.ok || !gumroadData.success) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid or expired license key. Please check your purchase email.' 
        },
        { status: 401 }
      )
    }

    // Check if license has been used (optional - remove if you want to allow multiple installs)
    // if (gumroadData.uses > 1) {
    //   return NextResponse.json(
    //     { valid: false, error: 'This license has already been used' },
    //     { status: 401 }
    //   )
    // }

    return NextResponse.json({
      valid: true,
      message: 'License key verified successfully',
      productName: gumroadData.purchase?.product_name || 'ProjoFlow Self-Hosted',
      purchaseEmail: gumroadData.purchase?.email,
    })
  } catch (error: any) {
    console.error('License validation error:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: 'License validation failed. Please try again or contact support.' 
      },
      { status: 500 }
    )
  }
}
