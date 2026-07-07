// ── EMVCo QR Parser Utility ──────────────────────────────────────────
// Parses Merchant-Presented QR codes following the EMVCo standard.
// Supports: QRIS (Indonesia), VietQR (Vietnam), PHQR (Philippines), etc.
// ──────────────────────────────────────────────────────────────────────

export interface EMVCoQRData {
  merchantName: string;
  merchantCity: string;
  postalCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string | null;
  transactionId: string | null;
  acquirerName: string;
  merchantPan: string;
  raw: string;
}

/** Numeric Currency Codes mapping to ISO symbols */
const EMV_CURRENCIES: { [code: string]: string } = {
  "360": "IDR", // Indonesia
  "704": "VND", // Vietnam
  "608": "PHP", // Philippines
  "702": "SGD", // Singapore
  "458": "MYR", // Malaysia
  "840": "USD", // USA
};

/**
 * Checks if a string is a standard EMVCo QR code payload.
 * Typically starts with "000201" (Payload Format Indicator Tag 00, Length 02, Value 01).
 */
export const isEMVCoQR = (payload: string): boolean => {
  return payload.startsWith("000201");
};

/**
 * Parse an EMVCo QR code payload string into structured details.
 */
export const parseEMVCoQR = (payload: string): EMVCoQRData | null => {
  if (!isEMVCoQR(payload)) return null;

  const tags: { [tag: string]: string } = {};
  let index = 0;

  try {
    while (index < payload.length) {
      if (index + 4 > payload.length) break;

      const tag = payload.substring(index, index + 2);
      const lengthStr = payload.substring(index + 2, index + 4);
      const length = parseInt(lengthStr, 10);

      if (isNaN(length)) break;

      index += 4;
      if (index + length > payload.length) break;

      const value = payload.substring(index, index + length);
      tags[tag] = value;
      index += length;
    }

    // Extract basic fields
    const countryCode = tags["58"] || "ID";
    const currencyNum = tags["53"] || "360";
    const currencyCode = EMV_CURRENCIES[currencyNum] || "IDR";
    const amount = tags["54"] || null;
    const merchantName = tags["59"] || "Local Merchant";
    const merchantCity = tags["60"] || "Unknown City";
    const postalCode = tags["61"] || "";

    // Extract Additional Data (Tag 62)
    let transactionId = null;
    if (tags["62"]) {
      const additionalData = tags["62"];
      let subIndex = 0;
      while (subIndex < additionalData.length) {
        if (subIndex + 4 > additionalData.length) break;
        const subTag = additionalData.substring(subIndex, subIndex + 2);
        const subLen = parseInt(additionalData.substring(subIndex + 2, subIndex + 4), 10);
        if (isNaN(subLen)) break;

        subIndex += 4;
        if (subIndex + subLen > additionalData.length) break;
        const subVal = additionalData.substring(subIndex, subIndex + subLen);
        if (subTag === "01") {
          transactionId = subVal;
          break;
        }
        subIndex += subLen;
      }
    }

    // Determine Acquirer / PAN from Merchant Account Info (Tags 26 to 51)
    let acquirerName = "QRIS";
    let merchantPan = "";

    // Map acquirer name by country defaults if not found
    if (countryCode === "VN") acquirerName = "VietQR";
    else if (countryCode === "PH") acquirerName = "PHQR";
    else if (countryCode === "SG") acquirerName = "NETS";
    else if (countryCode === "MY") acquirerName = "DuitNow";

    // Scan tags 26-51 for acquirer details
    for (let t = 26; t <= 51; t++) {
      const tagKey = t.toString();
      if (tags[tagKey]) {
        const info = tags[tagKey];
        // Parse sub-tags of Merchant Account Information
        let subIndex = 0;
        while (subIndex < info.length) {
          if (subIndex + 4 > info.length) break;
          const subTag = info.substring(subIndex, subIndex + 2);
          const subLen = parseInt(info.substring(subIndex + 2, subIndex + 4), 10);
          if (isNaN(subLen)) break;

          subIndex += 4;
          if (subIndex + subLen > info.length) break;
          const subVal = info.substring(subIndex, subIndex + subLen);

          // Subtag 00 usually identifies the global ID / acquirer (e.g. ID.DANA.WWW)
          if (subTag === "00") {
            if (subVal.toLowerCase().includes("dana")) acquirerName = "DANA";
            else if (subVal.toLowerCase().includes("gopay")) acquirerName = "GoPay";
            else if (subVal.toLowerCase().includes("ovo")) acquirerName = "OVO";
            else if (subVal.toLowerCase().includes("shopeepay")) acquirerName = "ShopeePay";
            else if (subVal.toLowerCase().includes("gcash")) acquirerName = "GCash";
            else if (subVal.toLowerCase().includes("maya")) acquirerName = "Maya";
          }
          // Subtag 01 or 02 usually holds the Merchant PAN / Account ID
          if (subTag === "01" || subTag === "02") {
            merchantPan = subVal;
          }
          subIndex += subLen;
        }
        if (merchantPan) break;
      }
    }

    // Default mock PAN if empty
    if (!merchantPan) {
      merchantPan = "93600" + Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    }

    return {
      merchantName,
      merchantCity,
      postalCode,
      countryCode,
      currencyCode,
      amount,
      transactionId: transactionId || "2317" + Math.floor(10000000 + Math.random() * 90000000).toString(),
      acquirerName,
      merchantPan,
      raw: payload,
    };
  } catch (err) {
    console.warn("Failed to parse EMVCo QR code:", err);
    return null;
  }
};

/**
 * Generate a simulated EMVCo QR code string for development and testing.
 * Perfect for Indonesian QRIS, VietQR, and PHQR simulations.
 */
export const generateSimulatedEMVCo = (
  name: string,
  city: string,
  currency: string,
  amount?: string,
  acquirer: string = "DANA",
  country: string = "ID"
): string => {
  const currencyMap: { [key: string]: string } = {
    IDR: "360",
    VND: "704",
    PHP: "608",
    SGD: "702",
    MYR: "458",
    USD: "840",
  };

  const currencyNum = currencyMap[currency] || "360";

  // Build Tag 26 (Merchant Account Information)
  // Subtag 00: Acquirer ID, Subtag 01: PAN
  const sub00 = `00${acquirer.length.toString().padStart(2, "0")}${acquirer}`;
  const mockPan = "936009153" + Math.floor(100000 + Math.random() * 900000).toString();
  const sub01 = `01${mockPan.length.toString().padStart(2, "0")}${mockPan}`;
  const tag26Val = sub00 + sub01;
  const tag26 = `26${tag26Val.length.toString().padStart(2, "0")}${tag26Val}`;

  // Build basic tags
  const tag00 = "000201";
  const tag52 = "52045812"; // MCC
  const tag53 = `5303${currencyNum}`;
  const tag54 = amount ? `54${amount.length.toString().padStart(2, "0")}${amount}` : "";
  const tag58 = `5802${country}`;
  const tag59 = `59${name.length.toString().padStart(2, "0")}${name}`;
  const tag60 = `60${city.length.toString().padStart(2, "0")}${city}`;

  // Additional Data (Tag 62)
  const txId = "231725" + Math.floor(100000 + Math.random() * 900000).toString();
  const sub62_01 = `01${txId.length.toString().padStart(2, "0")}${txId}`;
  const tag62 = `62${sub62_01.length.toString().padStart(2, "0")}${sub62_01}`;

  // Concatenate (excluding checksum Tag 63)
  const payloadWithoutChecksum = tag00 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62;

  // Simple CRC16 Checksum (simplification for simulation)
  const checksum = "6304ABCD";

  return payloadWithoutChecksum + checksum;
};
