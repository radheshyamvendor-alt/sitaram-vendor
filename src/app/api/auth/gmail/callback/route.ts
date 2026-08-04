import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, registerGmailWatch } from "@/lib/gmail";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/auth/gmail/callback
// Google redirects here after user approves OAuth consent
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const chemistEmail = searchParams.get("state"); // passed via state param in connect route
  const error = searchParams.get("error");

  console.log("[Gmail Callback] Received query params:", {
    hasCode: !!code,
    chemistEmail,
    error,
  });

  // User denied access
  if (error) {
    console.warn("User denied Google OAuth access:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?gmail=denied&reason=${encodeURIComponent(error)}`
    );
  }

  if (!code || !chemistEmail) {
    console.error("Missing code or chemistEmail in callback:", { code: !!code, chemistEmail });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?gmail=error&reason=missing_code_or_email`
    );
  }

  try {
    // Exchange auth code for tokens
    console.log("[Gmail Callback] Exchanging code for tokens...");
    const tokens = await exchangeCodeForTokens(code);
    console.log("[Gmail Callback] Tokens received:", {
      hasRefreshToken: !!tokens.refresh_token,
      hasAccessToken: !!tokens.access_token,
      hasIdToken: !!tokens.id_token,
    });

    const refreshTokenToSave = tokens.refresh_token || tokens.access_token;
    if (!refreshTokenToSave) {
      console.error("No token returned by Google");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/profile?gmail=error&reason=no_token`
      );
    }

    // Get the Gmail address from the ID token
    let gmailAddress = chemistEmail; // fallback
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
        );
        if (payload.email) gmailAddress = payload.email;
      } catch (e) {
        console.warn("Failed to parse id_token payload:", e);
      }
    }

    console.log("[Gmail Callback] Saving GmailConnection to DB for:", chemistEmail, "gmailAddress:", gmailAddress);

    // Store connection in database (upsert)
    await prisma.gmailConnection.upsert({
      where: { chemistEmail },
      update: {
        gmailAddress,
        encryptedRefreshToken: refreshTokenToSave,
        isActive: true,
        watchExpiry: null,
        historyId: null,
      },
      create: {
        chemistEmail,
        gmailAddress,
        encryptedRefreshToken: refreshTokenToSave,
        isActive: true,
      },
    });

    console.log("[Gmail Callback] GmailConnection saved successfully!");

    // Try registering Pub/Sub watch safely — don't fail OAuth if watch has PubSub issues
    try {
      await registerGmailWatch(chemistEmail);
      console.log("[Gmail Callback] Pub/Sub watch registered successfully!");
    } catch (watchErr: any) {
      console.error("Failed to register Gmail Pub/Sub watch (connection still saved):", watchErr?.message || watchErr);
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?gmail=connected`
    );
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("Gmail OAuth callback fatal error:", errMsg, err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/profile?gmail=error&reason=${encodeURIComponent(errMsg)}`
    );
  }
}
