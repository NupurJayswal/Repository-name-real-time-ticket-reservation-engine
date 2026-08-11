import sequelize from "../config/database.js";
import {
  Reservation,
  ReservationSeat,
  Seat,
} from "../models/index.js";
import {
  emitSeatUpdate,
  emitReservationUpdate,
} from "./socket.service.js";

let expiryInterval: NodeJS.Timeout | null = null;

export const releaseExpiredReservations = async () => {
  try {
    const now = new Date();

    /*
     * Find reservations whose server-side hold has expired.
     */
    const expiredReservations =
      await Reservation.findAll({
        where: {
          status: "HOLDING",
        },
      });

    for (const candidate of expiredReservations) {
      if (
        !candidate.expiresAt ||
        candidate.expiresAt.getTime() > now.getTime()
      ) {
        continue;
      }

      const transaction =
        await sequelize.transaction();

      try {
        /*
         * Lock the reservation first.
         */
        const reservation =
          await Reservation.findByPk(
            candidate.id,
            {
              transaction,
              lock: transaction.LOCK.UPDATE,
            }
          );

        if (!reservation) {
          await transaction.rollback();
          continue;
        }

        const currentTime = new Date();

        /*
         * Re-check after acquiring the lock.
         */
        if (
          reservation.status !== "HOLDING" ||
          !reservation.expiresAt ||
          reservation.expiresAt.getTime() >
            currentTime.getTime()
        ) {
          await transaction.rollback();
          continue;
        }

        /*
         * Lock all seats belonging to this reservation.
         */
        const reservationSeats =
          await ReservationSeat.findAll({
            where: {
              reservationId: reservation.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

        /*
         * Mark reservation expired.
         */
        await reservation.update(
          {
            status: "EXPIRED",
          },
          {
            transaction,
          }
        );

        /*
         * Release seats.
         */
        for (const reservationSeat of reservationSeats) {
          const seat = await Seat.findByPk(
            reservationSeat.seatId,
            {
              transaction,
              lock: transaction.LOCK.UPDATE,
            }
          );

          if (
            seat &&
            seat.status === "HELD"
          ) {
            await seat.update(
              {
                status: "AVAILABLE",
                heldUntil: null,
              },
              {
                transaction,
              }
            );
          }
        }

       await transaction.commit();

const seatIds = reservationSeats.map(
  (item) => item.seatId
);

emitSeatUpdate(seatIds);

emitReservationUpdate(reservation.id);

console.log(
  `Reservation ${reservation.id} expired`
);
      } catch (error) {
        await transaction.rollback();

        console.error(
          `Failed to expire reservation ${candidate.id}`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "Expiry worker failed:",
      error
    );
  }
};

export const startExpiryWorker = () => {
  if (expiryInterval) {
    return;
  }

  expiryInterval = setInterval(
    releaseExpiredReservations,
    1000
  );

  console.log(
    "Expiry worker started"
  );
};