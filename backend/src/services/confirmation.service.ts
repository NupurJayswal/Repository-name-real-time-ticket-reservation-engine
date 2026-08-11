import sequelize from "../config/database.js";
import {
  Payment,
  Reservation,
  ReservationSeat,
  Seat,
  IdempotencyKey,
} from "../models/index.js";
import { simulatePayment } from "./payment.service.js";

interface ConfirmReservationInput {
  reservationId: number;
  idempotencyKey: string;
}

export const confirmReservation = async ({
  reservationId,
  idempotencyKey,
}: ConfirmReservationInput) => {
  const transaction =
    await sequelize.transaction();

  try {
    /*
     * Check if this idempotency key has
     * already been used.
     */
    const existingKey =
      await IdempotencyKey.findOne({
        where: {
          key: idempotencyKey,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (existingKey) {
      /*
       * Same request was already processed.
       */
      await transaction.commit();

      return {
        duplicate: true,
        reservationId:
          existingKey.reservationId,
        response: existingKey.response
          ? JSON.parse(existingKey.response)
          : null,
      };
    }

    /*
     * Lock reservation.
     */
    const reservation =
      await Reservation.findByPk(
        reservationId,
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }
      );

    if (!reservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    /*
     * Reservation must still be HOLDING.
     */
    if (
      reservation.status !== "HOLDING"
    ) {
      throw new Error(
        `Reservation cannot be confirmed from ${reservation.status}`
      );
    }

    /*
     * Server-side expiry check.
     */
    const now = new Date();

    if (
      reservation.expiresAt &&
      reservation.expiresAt.getTime() <=
        now.getTime()
    ) {
      /*
       * Lock seats.
       */
      const reservationSeats =
        await ReservationSeat.findAll({
          where: {
            reservationId,
          },
          order: [["seatId", "ASC"]],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

      /*
       * Expire reservation.
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

      throw new Error(
        "Reservation has expired"
      );
    }

    /*
     * Lock seats in consistent order.
     */
    const reservationSeats =
      await ReservationSeat.findAll({
        where: {
          reservationId,
        },
        order: [["seatId", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    /*
     * Verify all seats are still HELD.
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
        !seat ||
        seat.status !== "HELD"
      ) {
        throw new Error(
          "One or more reserved seats are no longer held"
        );
      }
    }

    /*
     * Change reservation state BEFORE
     * starting asynchronous payment.
     */
    await reservation.update(
      {
        status: "PAYMENT_PROCESSING",
      },
      {
        transaction,
      }
    );

    /*
     * Create exactly ONE payment.
     *
     * reservationId is UNIQUE in the database.
     */
    const payment = await Payment.create(
      {
        reservationId,
        amount: reservation.total,
        status: "PROCESSING",
      },
      {
        transaction,
      }
    );

    const response = {
      reservationId,
      paymentId: payment.id,
      status: "PAYMENT_PROCESSING",
      total: reservation.total,
    };

    /*
     * Save idempotency result.
     */
    await IdempotencyKey.create(
      {
        key: idempotencyKey,
        reservationId,
        response: JSON.stringify(response),
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    /*
     * Start asynchronous payment AFTER
     * the database transaction commits.
     */
    simulatePayment(reservationId);

    return {
      duplicate: false,
      ...response,
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};