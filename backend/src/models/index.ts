import Seat from "./Seat.js";
import Reservation from "./Reservation.js";
import ReservationSeat from "./ReservationSeat.js";
import Payment from "./Payment.js";
import IdempotencyKey from "./IdempotencyKey.js";

Reservation.belongsToMany(Seat, {
  through: ReservationSeat,
  foreignKey: "reservationId",
  otherKey: "seatId",
});

Seat.belongsToMany(Reservation, {
  through: ReservationSeat,
  foreignKey: "seatId",
  otherKey: "reservationId",
});

Reservation.hasMany(ReservationSeat, {
  foreignKey: "reservationId",
});

ReservationSeat.belongsTo(Reservation, {
  foreignKey: "reservationId",
});

ReservationSeat.belongsTo(Seat, {
  foreignKey: "seatId",
});

Seat.hasMany(ReservationSeat, {
  foreignKey: "seatId",
});

Reservation.hasOne(Payment, {
  foreignKey: "reservationId",
});

Payment.belongsTo(Reservation, {
  foreignKey: "reservationId",
});

export {
  Seat,
  Reservation,
  ReservationSeat,
  Payment,
  IdempotencyKey,
};