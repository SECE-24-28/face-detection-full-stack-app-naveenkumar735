import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const apiKey = process.env.FACEPP_API_KEY;
    const apiSecret = process.env.FACEPP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Face++ API credentials are not configured" },
        { status: 500 }
      );
    }

    // Construct request body for Face++ Detect API
    const faceppFormData = new FormData();
    faceppFormData.append("api_key", apiKey);
    faceppFormData.append("api_secret", apiSecret);
    faceppFormData.append("image_file", file);

    const faceppResponse = await fetch("https://api-us.faceplusplus.com/facepp/v3/detect", {
      method: "POST",
      body: faceppFormData,
    });

    if (!faceppResponse.ok) {
      const errorText = await faceppResponse.text();
      return NextResponse.json(
        { error: `Face++ API error: ${errorText}` },
        { status: faceppResponse.status }
      );
    }

    const data = await faceppResponse.json();
    const faces = data.faces || [];
    const isHuman = faces.length > 0;

    // Save detection outcome to database
    const detection = await prisma.detection.create({
      data: {
        imageName: file.name || "uploaded_image",
        isHuman: isHuman,
      },
    });

    return NextResponse.json({
      success: true,
      detection,
      faceCount: faces.length,
      facesDetails: faces,
    });
  } catch (error: any) {
    console.error("Error in detect endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
