import { io } from "../server.js";

export const emitSeatUpdate = (
  seatIds: number[]
) => {
  io.emit("seats:updated", {
    seatIds,
  });
};

export const emitReservationUpdate = (
  reservationId: number
) => {
  io.emit("reservation:updated", {
    reservationId,
  });
};