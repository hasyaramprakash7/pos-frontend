import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateUpiUri } from '../utils/qrGenerator';

export default function QRCodeDisplay({ upiId, amount, shopName }) {
  const uri = generateUpiUri(upiId, amount, shopName);
  return <div className="bg-white p-4 rounded-lg inline-block"><QRCodeSVG value={uri} size={200} level="H" /></div>;
}