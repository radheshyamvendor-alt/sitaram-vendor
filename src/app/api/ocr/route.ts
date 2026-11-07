import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Enforce 5MB file size limit
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          success: false,
          error: `File is too large (${fileSizeMB} MB). Maximum allowed size is 5 MB. Please compress the image or use a smaller PDF.`,
        },
        { status: 413 }
      );
    }

    const serviceUrl =
      process.env.PADDLEOCR_SERVICE_URL || "https://paddle-ocr-dwox.onrender.com/ocr";
    if (!process.env.PADDLEOCR_SERVICE_URL) {
      console.warn(
        "PADDLEOCR_SERVICE_URL is not defined in environment variables, falling back to default Render service URL."
      );
    }

    // Forward file to the external PaddleOCR service
    const ocrFormData = new FormData();
    ocrFormData.append("file", file);

    let ocrResult: any;
    try {
      const ocrResponse = await fetch(serviceUrl, {
        method: "POST",
        body: ocrFormData,
      });

      if (!ocrResponse.ok) {
        throw new Error(`PaddleOCR service returned status ${ocrResponse.status}`);
      }

      ocrResult = await ocrResponse.json();
      if (!ocrResult.success) {
        throw new Error(ocrResult.error || "PaddleOCR service failed");
      }
    } catch (err) {
      console.error("External PaddleOCR request failed:", err);
      return NextResponse.json(
        { success: false, error: "OCR service unavailable" },
        { status: 500 }
      );
    }

    // OCR service returns structured data directly:
    // { success, prescriptionNumber, patient: { name, address, mobile, gender, age }, medicines: [{ name, quantity, confidence }] }
    const prescriptionNumber: string = ocrResult.prescriptionNumber || "";
    const ocrPatient = ocrResult.patient || {};
    const ocrMedicines: any[] = ocrResult.medicines || [];

    // Deduplicate medicines by name
    const verifiedMedicines: any[] = [];
    for (const ocrMed of ocrMedicines) {
      const ocrName: string = (ocrMed.name || "").trim();
      if (ocrName.length < 2) continue;
      const alreadyAdded = verifiedMedicines.some((item) => item.name === ocrName);
      if (!alreadyAdded) {
        verifiedMedicines.push({
          id: null,
          name: ocrName,
          price: null,
          stock: null,
          quantity: ocrMed.quantity || 1,
          confidence: ocrMed.confidence ?? 1,
        });
      }
    }

    // Build patient object — only include non-null fields
    const patientObj: Record<string, any> = {};
    if (ocrPatient.name) patientObj.name = ocrPatient.name;
    if (ocrPatient.address) patientObj.address = ocrPatient.address;
    if (ocrPatient.mobile) patientObj.mobile = ocrPatient.mobile;
    if (ocrPatient.gender) patientObj.gender = ocrPatient.gender;
    if (ocrPatient.age != null) patientObj.age = ocrPatient.age;

    return NextResponse.json({
      success: true,
      prescriptionNumber,
      patient: patientObj,
      medicines: verifiedMedicines,
    });
  } catch (error) {
    console.error("OCR API route error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to scan prescription" },
      { status: 500 }
    );
  }
}
