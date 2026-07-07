import { Request, Response } from "express";
import { Jimp } from "jimp";
import jsQR from "jsqr";

export const decodeQRFromImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    // Strip base64 metadata headers if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Read image bitmap using Jimp
    const jimpImage = await Jimp.read(buffer);
    const { data, width, height } = jimpImage.bitmap;

    // Decode using jsQR
    const qrCode = jsQR(new Uint8ClampedArray(data), width, height);

    if (!qrCode) {
      return res.status(422).json({ error: "No QR code detected in the selected image." });
    }

    return res.status(200).json({ data: qrCode.data });
  } catch (error: any) {
    console.error("QR decode error:", error);
    return res.status(500).json({ error: "Failed to read image or decode QR code." });
  }
};
