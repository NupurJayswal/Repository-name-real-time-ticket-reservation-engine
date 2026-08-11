import type { Seat } from "../types/seat";

const API_URL = "http://localhost:5000/api";

export const fetchSeats = async (): Promise<Seat[]> => {
  const response = await fetch(
    `${API_URL}/seats`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch seats");
  }

  return response.json();
};

interface HoldSeatsResponse {
  reservationId: number;
  status: string;
  seatIds: number[];
  subtotal: number;
  discount: number;
  total: number;
  expiresAt: string;
}

export const holdSeats = async (
  seatIds: number[]
): Promise<HoldSeatsResponse> => {
  const response = await fetch(
    `${API_URL}/reservations/hold`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  seatIds,
  clientId: getClientId(),
}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to hold seats"
    );
  }

  return data;
};

interface ConfirmReservationResponse {
  duplicate: boolean;
  reservationId: number;
  paymentId: number;
  status: string;
  total: number;
}

export const confirmReservation = async (
  reservationId: number,
  idempotencyKey: string
): Promise<ConfirmReservationResponse> => {
  const response = await fetch(
    `${API_URL}/reservations/${reservationId}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to confirm reservation"
    );
  }

  return data;
};

const getClientId = () => {
  let clientId =
    localStorage.getItem("clientId");

  if (!clientId) {
    clientId =
      `browser-${crypto.randomUUID()}`;

    localStorage.setItem(
      "clientId",
      clientId
    );
  }

  return clientId;
};

export const fetchReservation = async (
  reservationId: number
) => {
  const response = await fetch(
    `${API_URL}/reservations/${reservationId}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch reservation"
    );
  }

  return data;
};

