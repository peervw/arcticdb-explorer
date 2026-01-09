import { NextRequest, NextResponse } from "next/server";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://backend:8000/api";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const pathStr = path.join("/");
    const url = `${API_INTERNAL_URL}/${pathStr}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const finalUrl = searchParams ? `${url}?${searchParams}` : url;

    console.log(`[Proxy] Forwarding ${request.method} request to: ${finalUrl}`);

    try {
        // Clone headers to avoid mutating the original request headers
        const headers = new Headers(request.headers);

        // Crucial: remove Host header so the backend doesn't get confused (or receives the correct container host)
        headers.delete("host");
        headers.delete("connection");

        // Forward the request
        const response = await fetch(finalUrl, {
            method: request.method,
            headers: headers,
            body: request.body, // Pass the readable stream directly
            // @ts-ignore - duplex is needed for node fetch with body, though next.js fetch usually handles it
            duplex: request.body ? "half" : undefined,
        });

        console.log(`[Proxy] Response from backend: ${response.status}`);

        if (!response.ok) {
            // Log error text if possible
            try {
                const errorText = await response.clone().text();
                console.error(`[Proxy] Backend error body: ${errorText}`);
            } catch { }
        }

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch (error: any) {
        console.error(`[Proxy] Error forwarding request to ${finalUrl}:`, error);
        return NextResponse.json(
            { error: "Internal Proxy Error", details: error.message },
            { status: 500 }
        );
    }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
