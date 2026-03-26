import axios from "axios";

const BASE = "http://localhost:3000";

// Check what QR codes exist via the API
const res = await axios.get(`${BASE}/api/v1/qr-codes?page=1&page_size=20`, {
  validateStatus: () => true,
  timeout: 5000,
});
console.log("QR codes status:", res.status);
if (res.status === 200) {
  console.log("QR codes:", JSON.stringify(res.data.items?.slice(0,5).map(q => ({
    id: q.id, qrCodeId: q.qr_code_id, status: q.status, accessType: q.access_type
  })), null, 2));
} else {
  console.log("Response:", JSON.stringify(res.data));
}

// Check stay tokens
const tokRes = await axios.get(`${BASE}/api/v1/front-office/stay-tokens?page=1&page_size=5`, {
  validateStatus: () => true,
  timeout: 5000,
});
console.log("Tokens status:", tokRes.status, JSON.stringify(tokRes.data).slice(0, 200));
