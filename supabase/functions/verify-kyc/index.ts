import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const QUICKEKYC_API_KEY = "d94a9e6a-3784-42ae-9eb0-7e719f93a43e";
const QUICKEKYC_BASE_URL = "https://api.quickekyc.com";

interface VerificationRequest {
  verificationType: "aadhaar" | "pan" | "company_pan" | "gst";
  documentNumber: string;
  name?: string;
  dob?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VerificationRequest = await req.json();
    const { verificationType, documentNumber, name, dob } = body;

    let apiEndpoint = "";
    let requestBody: any = {};

    switch (verificationType) {
      case "aadhaar":
        apiEndpoint = `${QUICKEKYC_BASE_URL}/v1/aadhaar/verify`;
        requestBody = { aadhaar_number: documentNumber };
        break;
      case "pan":
        apiEndpoint = `${QUICKEKYC_BASE_URL}/v1/pan/verify`;
        requestBody = { pan_number: documentNumber, name, dob };
        break;
      case "company_pan":
        apiEndpoint = `${QUICKEKYC_BASE_URL}/v1/company/pan/verify`;
        requestBody = { pan_number: documentNumber };
        break;
      case "gst":
        apiEndpoint = `${QUICKEKYC_BASE_URL}/v1/gst/verify`;
        requestBody = { gstin: documentNumber };
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid verification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log("Calling QuickeKYC API:", apiEndpoint);
    console.log("Request body:", requestBody);

    const verificationResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": QUICKEKYC_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("API Response status:", verificationResponse.status);
    const responseText = await verificationResponse.text();
    console.log("API Response text:", responseText);

    let verificationData: any;
    try {
      verificationData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "QuickeKYC API returned invalid response", 
          details: "The verification service is not responding correctly. Please check your API configuration or try again later.",
          responsePreview: responseText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (verificationResponse.ok && verificationData.verified) {
      const kycData: any = {
        verificationType,
        documentNumber,
        verifiedAt: new Date().toISOString(),
        apiResponse: verificationData,
      };

      await supabaseClient
        .from("profiles")
        .update({
          kyc_status: "verified",
          kyc_verified_at: new Date().toISOString(),
          kyc_data: kycData,
        })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({ success: true, verified: true, data: verificationData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await supabaseClient
        .from("profiles")
        .update({ kyc_status: "rejected" })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          verified: false, 
          error: verificationData.message || verificationData.error || "Verification failed",
          details: verificationData
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("KYC Verification Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});