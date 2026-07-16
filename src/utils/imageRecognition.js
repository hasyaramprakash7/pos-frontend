/**
 * imageRecognition.js
 * Uses Google Cloud Vision API (or a compatible endpoint) to detect labels
 * from a base64 image. Returns an array of label descriptions.
 */
export async function recognizeProductFromImage(base64Image, apiKey, endpoint = 'https://vision.googleapis.com/v1/images:annotate') {
  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
      },
    ],
  };
  const url = `${endpoint}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const labels =
    data.responses?.[0]?.labelAnnotations?.map((label) => label.description) || [];
  return labels;
}