import sequelize from "../config/database.js";
import {
  Payment,
  Reservation,
  ReservationSeat,
  Seat,
} from "../models/index.js";
import {
  emitSeatUpdate,
  emitReservationUpdate,
} from "./socket.service.js";

const randomDelay = () => {
  return Math.floor(Math.random() * 3000) + 2000;
};

const randomPaymentResult = () => {
  return Math.random() >= 0.2;
};

export const simulatePayment = async (
  reservationId: number
) => {
  const delay = randomDelay();

  console.log(
    `Payment ${reservationId} will complete in ${delay}ms`
  );

  setTimeout(async () => {
    const paymentTransaction =
      await sequelize.transaction();

    try {
      /*
       * Lock the reservation.
       *
       * This is critical for the
       * payment vs expiry race.
       */
      const reservation =
        await Reservation.findByPk(
          reservationId,
          {
            transaction: paymentTransaction,
            lock: paymentTransaction.LOCK.UPDATE,
          }
        );

      if (!reservation) {
        await paymentTransaction.rollback();
        return;
      }

      /*
       * Lock payment record.
       */
      const payment = await Payment.findOne({
        where: {
          reservationId,
        },
        transaction: paymentTransaction,
        lock: paymentTransaction.LOCK.UPDATE,
      });

      if (!payment) {
        await paymentTransaction.rollback();
        return;
      }

      /*
       * Idempotency at the payment-processing level.
       *
       * If payment is already completed,
       * do absolutely nothing.
       */
      if (
        payment.status === "SUCCESS" ||
        payment.status === "FAILED"
      ) {
        await paymentTransaction.rollback();
        return;
      }

      /*
       * Reservation must still be
       * PAYMENT_PROCESSING.
       */
      if (
        reservation.status !==
        "PAYMENT_PROCESSING"
      ) {
        await paymentTransaction.rollback();
        return;
      }

      /*
       * Lock all seats associated with
       * this reservation.
       */
      const reservationSeats =
        await ReservationSeat.findAll({
          where: {
            reservationId,
          },
          order: [["seatId", "ASC"]],
          transaction: paymentTransaction,
          lock: paymentTransaction.LOCK.UPDATE,
        });

      /*
       * Decide payment result.
       */
      const success = randomPaymentResult();

      if (!success) {
        /*
         * PAYMENT FAILED
         */

        await payment.update(
          {
            status: "FAILED",
          },
          {
            transaction: paymentTransaction,
          }
        );

        await reservation.update(
          {
            status: "PAYMENT_FAILED",
          },
          {
            transaction: paymentTransaction,
          }
        );

        /*
         * Release seats.
         */
        for (const reservationSeat of reservationSeats) {
          const seat = await Seat.findByPk(
            reservationSeat.seatId,
            {
              transaction: paymentTransaction,
              lock: paymentTransaction.LOCK.UPDATE,
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
                transaction: paymentTransaction,
              }
            );
          }
        }

        await paymentTransaction.commit();

const seatIds = reservationSeats.map(
  (item) => item.seatId
);

emitSeatUpdate(seatIds);

emitReservationUpdate(reservationId);

console.log(
  `Payment FAILED for reservation ${reservationId}`
);
        return;
      }

      /*
       * PAYMENT SUCCESS
       *
       * Before booking the seats, verify that
       * the reservation has not expired.
       */

      const now = new Date();

      if (
        reservation.expiresAt &&
        reservation.expiresAt.getTime() <=
          now.getTime()
      ) {
        /*
         * The hold expired while payment
         * was processing.
         *
         * Payment cannot book the seats.
         */
        await payment.update(
          {
            status: "FAILED",
          },
          {
            transaction: paymentTransaction,
          }
        );

        await reservation.update(
          {
            status: "EXPIRED",
          },
          {
            transaction: paymentTransaction,
          }
        );

        for (const reservationSeat of reservationSeats) {
          const seat = await Seat.findByPk(
            reservationSeat.seatId,
            {
              transaction: paymentTransaction,
              lock: paymentTransaction.LOCK.UPDATE,
            }
          );

          if (seat) {
            await seat.update(
              {
                status: "AVAILABLE",
                heldUntil: null,
              },
              {
                transaction: paymentTransaction,
              }
            );
          }
        }

        await paymentTransaction.commit();

        console.log(
          `Reservation ${reservationId} expired before payment completion`
        );

        return;
      }

      /*
       * Payment succeeded and hold is still valid.
       */

      await payment.update(
        {
          status: "SUCCESS",
        },
        {
          transaction: paymentTransaction,
        }
      );

      await reservation.update(
        {
          status: "CONFIRMED",
          expiresAt: null,
        },
        {
          transaction: paymentTransaction,
        }
      );

      /*
       * HELD → BOOKED
       */
      for (const reservationSeat of reservationSeats) {
        const seat = await Seat.findByPk(
          reservationSeat.seatId,
          {
            transaction: paymentTransaction,
            lock: paymentTransaction.LOCK.UPDATE,
          }
        );

        if (
          seat &&
          seat.status === "HELD"
        ) {
          await seat.update(
            {
              status: "BOOKED",
              heldUntil: null,
            },
            {
              transaction: paymentTransaction,
            }
          );
        }
      }

      await paymentTransaction.commit();

      console.log(
        `Payment SUCCESS for reservation ${reservationId}`
      );
    } catch (error) {
      await paymentTransaction.rollback();

      console.error(
        `Payment processing failed for reservation ${reservationId}`,
        error
      );
    }
  }, delay);
};