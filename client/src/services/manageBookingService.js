// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
const API_URL = "https://car-rental-server-b0p7.onrender.com/api";


export const findReservationByNumber = async (payload) => {
  const res = await fetch(`${API_URL}/managebookings/reservation-number`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No reservation found");
  return data; // { results: [...] }
};
