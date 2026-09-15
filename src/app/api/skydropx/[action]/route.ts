import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SKYDROPX_API_URL = process.env.SKYDROPX_API_URL!; // https://api-pro.skydropx.com/api/v1
const CLIENT_ID = process.env.SKYDROPX_API_KEY!;
const CLIENT_SECRET = process.env.SKYDROPX_API_SECRET!;

// ---------- Autenticación con cache en Supabase ----------
async function getValidToken(): Promise<string> {
  const supabase = getSupabase();

  const { data: cached } = await supabase
    .from('skydropx_tokens')
    .select('access_token, expires_at')
    .eq('id', 1)
    .single();

  if (cached && new Date(cached.expires_at).getTime() - Date.now() > 5 * 60 * 1000) {
    return cached.access_token;
  }

  const res = await fetch(`${SKYDROPX_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error obteniendo token de Skydropx: ${errText}`);
  }

  const tokenData = await res.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await supabase.from('skydropx_tokens').upsert({
    id: 1,
    access_token: tokenData.access_token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  });

  return tokenData.access_token;
}

// ---------- Helper para llamar a Skydropx ----------
async function skydropxFetch(path: string, options: RequestInit = {}) {
  const token = await getValidToken();

  const res = await fetch(`${SKYDROPX_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error_description || data?.message || 'Error en Skydropx API');
  }

  return data;
}

// ---------- POST /api/skydropx/quote ----------
async function handleQuote(body: any) {
  const { warehouse, destination, parcel, declaredAmount } = body;

  const quotationBody = {
    quotation: {
      address_from: {
        country_code: 'CO',
        postal_code: warehouse.postal_code,
        area_level1: warehouse.state,
        area_level2: warehouse.city,
      },
      address_to: {
        country_code: 'CO',
        postal_code: destination.postal_code || undefined,
        area_level1: destination.state,
        area_level2: destination.city,
      },
      parcels: [
        {
          weight: parcel.weight,
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
          quantity: 1,
        },
      ],
      declared_amount: declaredAmount,
    },
  };

  const created = await skydropxFetch('/quotations', {
    method: 'POST',
    body: JSON.stringify(quotationBody),
  });

  const quotationId = created.data?.id || created.id;

  let quotation = created;
  for (let i = 0; i < 8; i++) {
    const isCompleted = quotation.data?.attributes?.is_completed ?? quotation.is_completed;
    if (isCompleted) break;
    await new Promise((r) => setTimeout(r, 1500));
    quotation = await skydropxFetch(`/quotations/${quotationId}`);
  }

  return quotation;
}

// ---------- POST /api/skydropx/ship ----------
async function handleShip(body: any) {
  const { quotationId, rateId } = body;

  return skydropxFetch('/shipments', {
    method: 'POST',
    body: JSON.stringify({
      shipment: {
        quotation_id: quotationId,
        rate_id: rateId,
      },
    }),
  });
}

// ---------- Router ----------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();

    switch (action) {
      case 'quote': {
        const result = await handleQuote(body);
        return NextResponse.json(result);
      }
      case 'ship': {
        const result = await handleShip(body);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Skydropx API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
