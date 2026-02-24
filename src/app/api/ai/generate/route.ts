import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const disputeResponseTemplates: Record<string, string> = {
  duplicate: `You are a Stripe dispute expert. The customer has filed a duplicate dispute claim for a charge. Write a professional, persuasive response to dispute this chargeback. Include: 1) Explanation that this is a single, legitimate charge, 2) Original transaction ID and timestamp, 3) Evidence that the customer received the product/service, 4) Any relevant customer communications. Keep it concise but compelling.`,
  
  fraud: `You are a Stripe dispute expert. The customer has filed a fraud claim, claiming they did not authorize this charge. Write a professional, persuasive response to dispute this chargeback. Include: 1) Evidence of cardholder verification (AVS/CVV matches), 2) IP address and location data if available, 3) Account history showing previous legitimate charges, 4) Any proof of delivery or service completion. Be factual and thorough.`,
  
  product_not_received: `You are a Stripe dispute expert. The customer claims they did not receive the product/service. Write a professional, persuasive response to dispute this chargeback. Include: 1) Delivery confirmation/shipping proof, 2) Tracking information, 3) Signature confirmation if available, 4) Communication history showing customer satisfaction. Be specific and evidence-based.`,
  
  product_unacceptable: `You are a Stripe dispute expert. The customer claims the product/service was not as described. Write a professional, persuasive response to dispute this chargeback. Include: 1) Detailed product/service description from time of purchase, 2) Evidence the delivered product matched description, 3) Any customer communications or acknowledgments, 4) Return/refund policy if applicable. Be diplomatic but firm.`,
  
  subscription_canceled: `You are a Stripe dispute expert. The customer claims they canceled a subscription. Write a professional, persuasive response to dispute this chargeback. Include: 1) Subscription terms and cancellation policy, 2) Proof of service delivery after supposed cancellation date, 3) Customer's billing history showing continued access, 4) Any cancellation confirmations or lack thereof.`,
  
  uncategorized: `You are a Stripe dispute expert. Write a professional, persuasive response to dispute this chargeback. Include: 1) Transaction details and proof of legitimate charge, 2) Evidence the customer received the product/service, 3) Any relevant communications, 4) Any additional context that supports keeping the charge.`
}

export async function POST(request: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
  }

  const { dispute } = await request.json()

  if (!dispute) {
    return NextResponse.json({ error: 'Dispute data required' }, { status: 400 })
  }

  const reason = dispute.reason || 'uncategorized'
  const template = disputeResponseTemplates[reason] || disputeResponseTemplates.uncategorized

  const prompt = `${template}

Dispute Details:
- Charge Amount: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency?.toUpperCase() || 'USD'}
- Dispute Reason: ${reason.replace(/_/g, ' ')}
- Charge ID: ${dispute.charge_id || 'N/A'}
- Transaction Date: ${dispute.created_at ? new Date(dispute.created_at).toLocaleDateString() : 'N/A'}
- Customer Payment Method: ${dispute.payment_method_details?.card?.brand || 'card'} ending in ${dispute.payment_method_details?.card?.last4 || '****'}

Write a compelling dispute response (200-400 words) that addresses all relevant points. Use a professional but firm tone.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'DisputeKit'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ response: generatedText })
  } catch (err) {
    console.error('Error generating response:', err)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}