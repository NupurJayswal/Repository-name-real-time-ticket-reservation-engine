export type SeatStatus =
  | "AVAILABLE"
  | "HELD"
  | "BOOKED";

export interface Seat {
  id: number;
  seatNumber: string;
  price: number;
  status: SeatStatus;
  heldUntil: string | null;
}