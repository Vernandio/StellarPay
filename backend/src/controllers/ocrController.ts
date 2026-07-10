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
1. Each individual line item with its name, unit price, and quantity (if indicated).
2. The subtotal of the items (must equal the sum of all positive items).
3. The calculated/explicit Tax amount (if not present, default to 0.00).
4. The calculated/explicit Service Charge amount (e.g., service charge, service tax; if not present, default to 0.00).
5. The calculated/explicit Tips amount (if not present, default to 0.00).
6. The calculated/explicit Discount amount (if not present, default to 0.00). Include any voucher deductions, coupons, or promo discounts in this field.
7. The total bill amount.
8. The detected currency symbol or code (e.g. "USD", "IDR", "PHP", "SGD").

Return ONLY a valid JSON object in this exact format, with no markdown wrappers or other text:
{
  "items": [
    { "name": "Item Name", "price": 12.50, "qty": 1 }
  ],
  "tax": 1.50,
  "service": 0.00,
  "tips": 0.00,
  "discount": 0.00,
  "total": 14.00,
  "currency": "USD"
}

Strict Rules:
- Prices, tax, service, tips, discount, total, and qty must be numeric values, not strings.
- Sum up items correctly. Ensure tax, service charge, tips, and discount are captured accurately.
- DO NOT list subtotal, tax, cash paid (e.g., "Tunai", "Cash"), change (e.g., "Kembali", "Change"), or card validation numbers as line items.
- Vouchers and Discounts: Any row indicating a discount, coupon, promo, or voucher (e.g. starting with "VC ", "VOUCHER", "DISC", or having values in parentheses like "(10,100)" or "-10,100") MUST be excluded from the "items" list, and instead added to the "discount" value.
- Thousand Separators: In Rupiah/IDR and similar currencies, dots or commas are thousands separators. For example, "21.500" or "21,500" must be parsed as the number 21500, NOT 21.50. Be very careful with this!
- If the image is not a receipt, return: { "error": "Not a receipt", "items": [], "tax": 0, "service": 0, "tips": 0, "discount": 0, "total": 0, "currency": "USD" }`,
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
