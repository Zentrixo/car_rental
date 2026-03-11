// client/src/utils/generateAgreementPdf.js
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Unicode-enabled PDF filling using a template:
 * - Template PDF must exist at: /public/templates/rental_agreement.pdf
 * - Unicode font must exist at: /public/fonts/DejaVuSans.ttf
 *
 * Supports arrows (→), smart quotes, em dashes, accented names, etc.
 */
export async function generateAgreementPdf({ booking, customer, signature }) {
  // 1) Load template PDF from /public
  const templateUrl = "/templates/rental_agreement.pdf";
  const templateBytes = await fetch(templateUrl).then(async (r) => {
    if (!r.ok) {
      throw new Error(
        "Template PDF not found. Put it at /public/templates/rental_agreement.pdf"
      );
    }
    return r.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);

  // 2) Register fontkit + embed Unicode TTF
  pdfDoc.registerFontkit(fontkit);

  const fontUrl = "/fonts/DejaVuSans.ttf";
  const fontBytes = await fetch(fontUrl).then(async (r) => {
    if (!r.ok) {
      throw new Error(
        "Unicode font not found. Put it at /public/fonts/DejaVuSans.ttf"
      );
    }
    return r.arrayBuffer();
  });

  const unicodeFont = await pdfDoc.embedFont(fontBytes, { subset: true });

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const { height: h1 } = page1.getSize();

  // 3) Helpers (now fully Unicode-safe)
  const draw = (page, text, x, y, size = 10) => {
    page.drawText(String(text ?? ""), {
      x,
      y,
      size,
      font: unicodeFont,
      color: rgb(0, 0, 0),
    });
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

  // 4) Build values (keep arrows if you want now)
  const fullName =
    customer?.fullName ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    customer?.lastName ||
    "";

  const reservationNumber = booking?.reservationNumber || "";
  const dl = customer?.driversLicense || customer?.dlNumber || "";
  const renterAddress = customer?.address || "";
  const renterEmail = customer?.email || "";

  const vehicleType = booking?.car?.type || "";
  const yearMakeModel = booking?.car?.makeModel || "";
  const color = booking?.car?.color || "";
  const vin = booking?.car?.vin || "";
  const plate = booking?.car?.plate || "";

  const pickupDate = fmtDate(booking?.pickupDate);
  const returnDate = fmtDate(booking?.returnDate);
  const pickupTime = booking?.pickupTime || "";
  const returnTime = booking?.returnTime || "";

  const pickupLocation = booking?.pickupLocation || "";
  const returnLocation = booking?.returnLocation || "";
  const rateMonthly = booking?.monthlyRate ?? "";
  const perDiem = booking?.dailyRate ?? "";

  // ============================================================
  // 5) PLACE TEXT ON TEMPLATE
  //
  // IMPORTANT: These coordinates are starter points.
  // Your PDF layout determines exact X/Y.
  //
  // Tip: If a field appears a bit off, just tweak X/Y.
  // ============================================================

  // --- PAGE 1: RENTER INFO (Section 1.2 area)
  // Example placements (adjust to match your blanks):
  draw(page1, fullName, 120, h1 - 195, 11);
  draw(page1, dl, 210, h1 - 235, 10);
  draw(page1, renterAddress, 205, h1 - 255, 9);
  draw(page1, renterEmail, 205, h1 - 270, 9);

  // --- PAGE 1: Vehicle snippet (if you want it on page 1)
  draw(page1, vehicleType, 130, h1 - 325, 10);
  draw(page1, yearMakeModel, 175, h1 - 345, 10);
  draw(page1, color, 90, h1 - 365, 10);

  // If VIN/Plate should be on page 2 (often), draw there.
  if (pages[1]) {
    const page2 = pages[1];
    const { height: h2 } = page2.getSize();

    // --- PAGE 2: Rental period (Section 5)
    draw(page2, pickupDate, 140, h2 - 180, 10);
    draw(page2, pickupTime, 360, h2 - 180, 10);

    draw(page2, returnDate, 140, h2 - 205, 10);
    draw(page2, returnTime, 360, h2 - 205, 10);

    // --- PAGE 2: Rate fields (Section 6) (optional)
    if (rateMonthly !== "") draw(page2, String(rateMonthly), 265, h2 - 255, 10);
    if (perDiem !== "") draw(page2, String(perDiem), 420, h2 - 255, 10);

    // --- PAGE 2: VIN / Plate (optional)
    if (vin) draw(page2, vin, 120, h2 - 320, 10);
    if (plate) draw(page2, plate, 360, h2 - 320, 10);
  }

  // --- PAGE 6: Signatures (usually last page; your template looks like signatures near end)
  // Your uploaded agreement is multi-page; signature page might be pages[5] or last page.
  // We'll try last page safely:
  const signaturePage = pages[pages.length - 1];
  const { height: hs } = signaturePage.getSize();

  // Printed name + date near signature line (adjust)
  draw(signaturePage, fullName, 105, hs - 120, 10);
  draw(signaturePage, fmtDate(new Date()), 330, hs - 120, 10);

  // Optional signature image (PNG/JPG) from backend
  if (signature?.dataUrl || signature?.url) {
    const bytes = signature?.dataUrl
      ? dataUrlToUint8Array(signature.dataUrl)
      : await fetch(signature.url).then((r) => r.arrayBuffer());

    let sigImg;
    try {
      sigImg = await pdfDoc.embedPng(bytes);
    } catch {
      sigImg = await pdfDoc.embedJpg(bytes);
    }

    signaturePage.drawImage(sigImg, {
      x: 105,
      y: hs - 155,
      width: 160,
      height: 45,
    });
  }

  // 6) Save + download
  const outBytes = await pdfDoc.save();
  downloadBytes(
    outBytes,
    `CampusCarRentals_Agreement_${reservationNumber || "Reservation"}.pdf`
  );
}

/* =========================
   helpers
========================= */

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}