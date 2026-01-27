import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PASS2U_API_KEY = Deno.env.get('PASS2U_API_KEY');
    const PASS2U_MODEL_ID = Deno.env.get('PASS2U_MODEL_ID');

    if (!PASS2U_API_KEY || !PASS2U_MODEL_ID) {
      console.log('Pass2U not configured, returning placeholder response');
      return new Response(
        JSON.stringify({ 
          success: true, 
          passUrl: null,
          message: 'Pass2U integration not configured. Gift card created without wallet pass.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { giftCardId, code, balance, expiresAt } = await req.json();

    // Create pass via Pass2U API
    const passResponse = await fetch(`https://api.pass2u.net/v2/models/${PASS2U_MODEL_ID}/passes`, {
      method: 'POST',
      headers: {
        'x-api-key': PASS2U_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Dynamic fields for the pass template
        fields: {
          balance: `$${balance}`,
          code: code,
          expiry: expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never',
        },
        // Optional barcode with the gift card code
        barcode: {
          message: code,
          format: 'PKBarcodeFormatQR',
        },
      }),
    });

    if (!passResponse.ok) {
      const error = await passResponse.text();
      console.error('Pass2U API error:', error);
      return new Response(
        JSON.stringify({ 
          success: true, 
          passUrl: null,
          message: 'Could not create wallet pass, but gift card is active.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passData = await passResponse.json();
    const passId = passData.passId;
    const passUrl = `https://www.pass2u.net/d/${passId}`;

    // Update the gift card with Pass2U data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('gift_cards')
      .update({
        pass2u_pass_id: passId,
        pass2u_model_id: PASS2U_MODEL_ID,
      })
      .eq('id', giftCardId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        passUrl,
        passId,
        message: 'Wallet pass created successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating Pass2U card:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: 'Failed to create wallet pass'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});