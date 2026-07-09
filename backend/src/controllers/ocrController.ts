import { Request, Response } from "express";

/**
 * OCR Receipt Scanner using Google Gemini API.
 * Receives a base64 image and returns extracted items + total from a receipt.
 */
export const scanReceipt = async (req: Request, res: Response) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server" });
    }

    // Strip base64 metadata headers if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const resolvedMimeType = mimeType || "image/jpeg";

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: base64Data,
              },
            },
            {
              text: `You are an expert receipt scanner. Analyze this receipt image carefully.
Extract the following information:
1. Each individual item with its name and price.
2. The total bill amount.

Return ONLY a valid JSON object in this exact format, with no other text:
{
  "items": [
    { "name": "Item Name", "price": 12.50 }
  ],
  "total": 125.00,
  "currency": "USD"
}

Rules:
- Prices must be numbers, not strings.
- If the currency is not USD, detect it from the receipt (e.g. "IDR", "PHP", "VND").
- If you can't detect a total, sum up all the items.
- If the image is not a receipt, return: { "error": "Not a receipt", "items": [], "total": 0 }`,
            },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errBody);
      return res.status(502).json({ error: "Gemini API request failed" });
    }

    const geminiData = await geminiResponse.json();

    // Extract the text content from Gemini response
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON from the response text (Gemini sometimes wraps in ```json blocks)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({
        error: "Could not parse receipt data from the image",
        raw: textContent,
      });
    }

    const parsedReceipt = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      success: true,
      receipt: parsedReceipt,
    });
  } catch (error: any) {
    console.error("OCR scan error:", error);
    return res.status(500).json({ error: "Failed to process receipt image" });
  }
};
