import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            apiUrl: process.env.API_INTERNAL_URL
        }
    });
}
